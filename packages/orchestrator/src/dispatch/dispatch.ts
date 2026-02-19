import type { OpencodeClient } from "@opencode-ai/sdk"
import { clientPool, type ClientPool } from "../client/pool"
import {
  createSession,
  listSessions,
  sendMessageAsync,
} from "../client/operations"
import type { SessionInfo } from "../client/types"
import { loadArachneConfig, type ArachneConfig } from "../config"
import { projectRegistry, type ProjectRegistry } from "../discovery/registry"
import { startServer } from "../server/lifecycle"
import { serverRegistry, type ServerRegistry } from "../server/registry"
import { parseOverrides } from "../session/override-parser"
import { findBestSession } from "../session/targeting"
import type { TargetingOptions } from "../session/types"
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

function getApiKey(config: ArachneConfig): string | undefined {
  if (!config.auth.enabled) return undefined
  return config.auth.apiKey || undefined
}

interface ResolvedSession {
  sessionId: string
  cleanedMessage: string
}

async function resolveSessionId(
  client: OpencodeClient,
  message: string,
  opts: DispatchOptions | undefined,
  dependencies: DispatchDependencies,
): Promise<ResolvedSession> {
  const { options: nlOpts, cleanedMessage } = parseOverrides(message)

  const targetingOpts: TargetingOptions = {
    sessionId: opts?.session ?? nlOpts.sessionId,
    newSession: opts?.newSession ?? nlOpts.newSession,
    titleKeyword: nlOpts.titleKeyword,
    strategyHint: nlOpts.strategyHint,
  }

  if (targetingOpts.sessionId) {
    return { sessionId: targetingOpts.sessionId, cleanedMessage }
  }

  if (targetingOpts.newSession) {
    const created = await dependencies.createSessionFn(client)
    return { sessionId: created.id, cleanedMessage }
  }

  const sessions = await dependencies.listSessionsFn(client)
  const result = findBestSession(sessions, message, targetingOpts)

  if (result.needsCreate || !result.sessionId) {
    const created = await dependencies.createSessionFn(client)
    return { sessionId: created.id, cleanedMessage }
  }

  return { sessionId: result.sessionId, cleanedMessage }
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
    config?: ArachneConfig,
  ): Promise<DispatchResult> {
    const resolvedConfig = config ?? loadArachneConfig(process.cwd())
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

      const { sessionId, cleanedMessage } = await resolveSessionId(
        client,
        message,
        opts,
        dependencies,
      )

      await dependencies.sendMessageAsyncFn(client, sessionId, {
        parts: [{ type: "text", text: cleanedMessage }],
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
