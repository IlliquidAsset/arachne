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


interface ResolvedSkill {
  name: string
  content: string
}

async function resolveSkillSystem(
  loadSkills: string[] | undefined,
  projectPath: string,
): Promise<string | undefined> {
  if (!loadSkills || loadSkills.length === 0) return undefined

  const { readFile, readdir } = await import("node:fs/promises")
  const { existsSync } = await import("node:fs")
  const { homedir } = await import("node:os")

  const home = homedir()
  const skillDirs = [
    `${projectPath}/.opencode/skills`,
    `${home}/.config/opencode/oh-my-opencode/skills`,
    `${projectPath}/.claude/skills`,
    `${home}/.config/opencode/skills`,
  ]

  const found = new Map<string, ResolvedSkill>()

  for (const dir of skillDirs) {
    if (!existsSync(dir)) continue
    try {
      const entries = await readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        const skillPath = `${dir}/${entry.name}/SKILL.md`
        try {
          const raw = await readFile(skillPath, "utf-8")
          const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
          if (!match) continue
          const lines = match[1].split("\n")
          const nameLine = lines.find((l: string) => l.startsWith("name:"))
          if (!nameLine) continue
          const name = nameLine.replace("name:", "").trim().replace(/^["']|["']$/g, "")
          if (!found.has(name)) {
            found.set(name, { name, content: match[2].trim() })
          }
        } catch {
          // skip unreadable
        }
      }
    } catch {
      // skip unreadable dirs
    }
  }

  const matched = loadSkills
    .map(name => found.get(name))
    .filter((s): s is ResolvedSkill => s != null)

  if (matched.length === 0) return undefined

  return matched
    .map(s => `<skill name="${s.name}">\n${s.content}\n</skill>`)
    .join("\n\n")
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

      const skillSystem = await resolveSkillSystem(opts?.loadSkills, project.absolutePath)

      await dependencies.sendMessageAsyncFn(client, sessionId, {
        parts: [{ type: "text", text: cleanedMessage }],
        ...(skillSystem ? { system: skillSystem } : {}),
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
