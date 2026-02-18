import type { OpencodeClient } from "@opencode-ai/sdk"
import { clientPool, type ClientPool } from "../client/pool"
import {
  createSession,
  listSessions,
  sendMessageAsync,
} from "../client/operations"
import type { SessionInfo } from "../client/types"
import { loadAmandaConfig, type AmandaConfig } from "../config"
import { projectRegistry, type ProjectRegistry } from "../discovery/registry"
import { startServer } from "../server/lifecycle"
import { serverRegistry, type ServerRegistry } from "../server/registry"
import { dispatchTracker, type DispatchTracker } from "./tracker"
import type { DispatchOptions, DispatchRecord, DispatchResult } from "./types"

interface ResolvedProject {
  name: string
  absolutePath: string
}

export interface DispatchDependencies {
  projects: Pick<ProjectRegistry, "findByName">
  servers: Pick<ServerRegistry, "get">
  clientPool: Pick<ClientPool, "getClient">
  tracker: DispatchTracker
  startServerFn: typeof startServer
  listSessionsFn: typeof listSessions
  createSessionFn: typeof createSession
  sendMessageAsyncFn: typeof sendMessageAsync
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

function selectMostRecentSession(sessions: SessionInfo[]): SessionInfo | undefined {
  return sessions.reduce<SessionInfo | undefined>((latest, current) => {
    if (!latest) return current
    return current.time.updated > latest.time.updated ? current : latest
  }, undefined)
}

function getApiKey(config: AmandaConfig): string | undefined {
  if (!config.auth.enabled) return undefined
  return config.auth.apiKey || undefined
}

async function resolveSessionId(
  client: OpencodeClient,
  opts: DispatchOptions | undefined,
  dependencies: DispatchDependencies,
): Promise<string> {
  if (opts?.session) {
    return opts.session
  }

  if (opts?.newSession) {
    const created = await dependencies.createSessionFn(client)
    return created.id
  }

  const sessions = await dependencies.listSessionsFn(client)
  const latest = selectMostRecentSession(sessions)
  if (latest) {
    return latest.id
  }

  const created = await dependencies.createSessionFn(client)
  return created.id
}

function resolveProject(
  registry: Pick<ProjectRegistry, "findByName">,
  projectName: string,
): ResolvedProject {
  const project = registry.findByName(projectName)
  if (!project) {
    throw new Error(`Project not found: ${projectName}`)
  }

  return {
    name: project.name,
    absolutePath: project.absolutePath,
  }
}

export function createDispatch(dependencies: DispatchDependencies) {
  return async function dispatch(
    projectName: string,
    message: string,
    opts?: DispatchOptions,
    config?: AmandaConfig,
  ): Promise<DispatchResult> {
    const resolvedConfig = config ?? loadAmandaConfig(process.cwd())
    const project = resolveProject(dependencies.projects, projectName)

    if (
      dependencies.tracker.getActiveCount(project.absolutePath) >=
      resolvedConfig.dispatch.maxConcurrent
    ) {
      throw new Error("Max concurrent dispatches reached")
    }

    const dispatchTime = new Date()
    const dispatchId = crypto.randomUUID()
    const record: DispatchRecord = {
      id: dispatchId,
      projectPath: project.absolutePath,
      projectName: project.name,
      sessionId: opts?.session ?? "pending",
      message,
      status: "pending",
      dispatchedAt: dispatchTime,
    }

    dependencies.tracker.record(record)

    try {
      const existingServer = dependencies.servers.get(project.absolutePath)
      const apiKey = getApiKey(resolvedConfig)

      const serverInfo =
        existingServer && existingServer.status === "running"
          ? existingServer
          : await dependencies.startServerFn(project.absolutePath, {
              portRange: resolvedConfig.servers.portRange,
              apiKey,
            })

      const client = dependencies.clientPool.getClient(
        project.absolutePath,
        serverInfo.url,
        project.absolutePath,
        apiKey,
      )

      const sessionId = await resolveSessionId(client, opts, dependencies)

      await dependencies.sendMessageAsyncFn(client, sessionId, {
        parts: [{ type: "text", text: message }],
      })

      dependencies.tracker.record({
        ...record,
        sessionId,
        status: "sent",
      })

      return {
        projectName: project.name,
        sessionId,
        dispatchId,
        dispatchTime,
      }
    } catch (error) {
      dependencies.tracker.markFailed(dispatchId, toErrorMessage(error))
      throw error
    }
  }
}

const defaultDependencies: DispatchDependencies = {
  projects: projectRegistry,
  servers: serverRegistry,
  clientPool,
  tracker: dispatchTracker,
  startServerFn: startServer,
  listSessionsFn: listSessions,
  createSessionFn: createSession,
  sendMessageAsyncFn: sendMessageAsync,
}

export const dispatch = createDispatch(defaultDependencies)
