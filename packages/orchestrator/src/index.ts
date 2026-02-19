import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin/tool"
import { dirname } from "node:path"
import { abortSession, clientPool, listSessions } from "./client"
import { loadArachneConfig, type ArachneConfig } from "./config"
import { dispatch, dispatchTracker, routeMessage } from "./dispatch"
import { projectRegistry, scanProjects, type ProjectInfo } from "./discovery"
import { buildAllProfiles, clearProfiles, getProfile } from "./knowledge"
import {
  restartServer,
  serverRegistry,
  startServer,
  stopServer,
  type ServerInfo,
} from "./server"
import { startVoice } from "./voice"

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

function toIsoString(value: number): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return date.toISOString()
}

function getApiKey(config: ArachneConfig): string | undefined {
  if (!config.auth.enabled) return undefined
  return config.auth.apiKey || undefined
}

function resolveProject(projectQuery: string): ProjectInfo {
  const project = projectRegistry.findByName(projectQuery)
  if (!project) {
    throw new Error(`Project not found: ${projectQuery}`)
  }

  return project
}

async function ensureServerRunning(
  projectPath: string,
  config: ArachneConfig,
): Promise<ServerInfo> {
  const existing = serverRegistry.get(projectPath)
  if (existing && existing.status === "running") {
    return existing
  }

  if (!config.servers.autoStart) {
    throw new Error("Server is not running and auto-start is disabled")
  }

  return startServer(projectPath, {
    portRange: config.servers.portRange,
    apiKey: getApiKey(config),
  })
}

function updateProjectState(project: ProjectInfo): void {
  const server = serverRegistry.get(project.absolutePath)
  if (!server) {
    return
  }

  if (server.status === "running") {
    projectRegistry.updateState(project.id, "server-running")
    return
  }

  if (server.status === "error") {
    projectRegistry.updateState(project.id, "error")
    return
  }

  projectRegistry.updateState(project.id, "server-stopped")
}

const ArachneOrchestratorPlugin: Plugin = async (ctx) => {
  const config = loadArachneConfig(ctx.directory)
  const configuredRoots = config.discovery.paths.filter(
    (path): path is string => typeof path === "string" && path.trim().length > 0,
  )
  const scanRoots =
    configuredRoots.length > 0
      ? configuredRoots
      : [ctx.directory, dirname(ctx.directory)]

  let discoveredProjects: ProjectInfo[] = []
  for (const scanRoot of scanRoots) {
    const projects = await scanProjects(scanRoot, config.discovery.ignore)
    if (projects.length > 0) {
      discoveredProjects = projects
      break
    }
  }

  projectRegistry.clear()
  for (const project of discoveredProjects) {
    projectRegistry.register(project)
    updateProjectState(project)
  }

  clearProfiles()
  await buildAllProfiles(
    discoveredProjects.map((project) => ({
      id: project.id,
      absolutePath: project.absolutePath,
    })),
  )

  serverRegistry.getAll()
  const apiKey = getApiKey(config)

  if (config.voice.enabled) {
    startVoice(config.voice).catch((error) => {
      console.error(
        `[arachne:voice] Failed to start: ${error instanceof Error ? error.message : String(error)}`,
      )
    })
  }

  return {
    tool: {
      arachne_dispatch: tool({
        description:
          "Dispatch a task to an Arachne agent instance in a specific project",
        args: {
          project: tool.schema
            .string()
            .optional()
            .describe("Project identifier to dispatch to (optional when routable)"),
          message: tool.schema
            .string()
            .describe("Task message to dispatch to the agent"),
          session: tool.schema
            .string()
            .optional()
            .describe("Existing session ID to continue"),
          newSession: tool.schema
            .boolean()
            .optional()
            .describe("Force create a new session"),
        },
        async execute(args) {
          try {
            let projectName = args.project?.trim()
            let message = args.message

            if (!projectName) {
              const routing = routeMessage(args.message)
              if (!routing.projectId) {
                const options = routing.candidates?.join(", ") || "none"
                return `Which project? Options: ${options}`
              }

              projectName = routing.projectId
              if (routing.cleanedMessage && routing.cleanedMessage.length > 0) {
                message = routing.cleanedMessage
              }
            }

            const result = await dispatch(
              projectName,
              message,
              {
                session: args.session,
                newSession: args.newSession,
              },
              config,
            )

            return [
              `Dispatched message to ${result.projectName}.`,
              `Session: ${result.sessionId}`,
              `Dispatch ID: ${result.dispatchId}`,
              `Dispatch time: ${result.dispatchTime.toISOString()}`,
            ].join("\n")
          } catch (error) {
            return `Failed to dispatch message: ${toErrorMessage(error)}`
          }
        },
      }),

      arachne_projects: tool({
        description:
          "List available Arachne projects and their configurations",
        args: {
          filter: tool.schema
            .string()
            .optional()
            .describe("Optional filter pattern for project names"),
        },
        async execute(args) {
          const filter = args.filter?.toLowerCase().trim()
          const projects = projectRegistry.getAll().filter((project) => {
            if (!filter) return true

            return (
              project.name.toLowerCase().includes(filter) ||
              project.id.toLowerCase().includes(filter)
            )
          })

          if (projects.length === 0) {
            return "No Arachne projects found."
          }

          const lines = projects.map((project) => {
            const server = serverRegistry.get(project.absolutePath)
            const profile = getProfile(project.id)
            const stack = profile?.techStack.slice(0, 3).join(", ") || "unknown"
            const activeDispatches = dispatchTracker.getActiveCount(
              project.absolutePath,
            )

            return [
              `${project.name} (${project.id})`,
              `state=${project.state}`,
              `server=${server ? `${server.status} ${server.url}` : "stopped"}`,
              `activeDispatches=${activeDispatches}`,
              `stack=${stack}`,
            ].join(" | ")
          })

          return `Projects (${projects.length}):\n${lines.join("\n")}`
        },
      }),

      arachne_project_status: tool({
        description: "Get the status of a specific Arachne project",
        args: {
          project: tool.schema.string().describe("Project identifier"),
        },
        async execute(args) {
          try {
            const project = resolveProject(args.project)
            const server = serverRegistry.get(project.absolutePath)
            const profile = getProfile(project.id)
            const activeDispatches = dispatchTracker.getActive(project.absolutePath)

            let sessionsSummary = "unavailable (server not running)"
            if (server && server.status === "running") {
              const client = clientPool.getClient(
                project.absolutePath,
                server.url,
                project.absolutePath,
                apiKey,
              )

              const sessions = await listSessions(client)
              const latest = [...sessions].sort(
                (a, b) => b.time.updated - a.time.updated,
              )[0]
              sessionsSummary =
                latest === undefined
                  ? "0 sessions"
                  : `${sessions.length} sessions, latest=${latest.id} (${toIsoString(
                      latest.time.updated,
                    )})`
            }

            return [
              `Project: ${project.name} (${project.id})`,
              `Path: ${project.absolutePath}`,
              `Server: ${server ? `${server.status} ${server.url}` : "stopped"}`,
              `Sessions: ${sessionsSummary}`,
              `Active dispatches: ${activeDispatches.length}`,
              `Profile: ${profile ? profile.description || profile.name : "not available"}`,
            ].join("\n")
          } catch (error) {
            return `Failed to read project status: ${toErrorMessage(error)}`
          }
        },
      }),

      arachne_server_control: tool({
        description:
          "Control Arachne server instances (start, stop, restart, status)",
        args: {
          action: tool.schema
            .enum(["start", "stop", "restart", "status"])
            .describe("Server control action"),
          project: tool.schema.string().describe("Project identifier"),
        },
        async execute(args) {
          try {
            const project = resolveProject(args.project)

            if (args.action === "status") {
              const server = serverRegistry.get(project.absolutePath)
              if (!server) {
                return `Server for ${project.name} is stopped.`
              }

              return [
                `Server for ${project.name}:`,
                `status=${server.status}`,
                `url=${server.url}`,
                `pid=${server.pid ?? "none"}`,
              ].join("\n")
            }

            if (args.action === "start") {
              const started = await startServer(project.absolutePath, {
                portRange: config.servers.portRange,
                apiKey,
              })
              projectRegistry.updateState(project.id, "server-running")
              return `Started server for ${project.name} at ${started.url}`
            }

            if (args.action === "stop") {
              await stopServer(project.absolutePath)
              clientPool.invalidate(project.absolutePath)
              projectRegistry.updateState(project.id, "server-stopped")
              return `Stopped server for ${project.name}.`
            }

            const restarted = await restartServer(project.absolutePath, {
              portRange: config.servers.portRange,
              apiKey,
            })
            clientPool.invalidate(project.absolutePath)
            projectRegistry.updateState(project.id, "server-running")
            return `Restarted server for ${project.name} at ${restarted.url}`
          } catch (error) {
            return `Failed to ${args.action} server: ${toErrorMessage(error)}`
          }
        },
      }),

      arachne_sessions: tool({
        description: "List active Arachne sessions for a project",
        args: {
          project: tool.schema.string().describe("Project identifier"),
        },
        async execute(args) {
          try {
            const project = resolveProject(args.project)
            const server = await ensureServerRunning(project.absolutePath, config)
            projectRegistry.updateState(project.id, "server-running")

            const client = clientPool.getClient(
              project.absolutePath,
              server.url,
              project.absolutePath,
              apiKey,
            )
            const sessions = await listSessions(client)
            const sortedSessions = [...sessions].sort(
              (a, b) => b.time.updated - a.time.updated,
            )

            if (sortedSessions.length === 0) {
              return `No sessions found for ${project.name}.`
            }

            const lines = sortedSessions.map(
              (session) =>
                `${session.id} | ${session.title || "Untitled"} | updated=${toIsoString(
                  session.time.updated,
                )}`,
            )
            return `Sessions for ${project.name} (${sortedSessions.length}):\n${lines.join(
              "\n",
            )}`
          } catch (error) {
            return `Failed to list sessions: ${toErrorMessage(error)}`
          }
        },
      }),

      arachne_abort: tool({
        description: "Abort a running Arachne task or session",
        args: {
          project: tool.schema.string().describe("Project identifier"),
          sessionId: tool.schema.string().describe("Session ID to abort"),
        },
        async execute(args) {
          try {
            const project = resolveProject(args.project)
            const server = await ensureServerRunning(project.absolutePath, config)
            projectRegistry.updateState(project.id, "server-running")

            const client = clientPool.getClient(
              project.absolutePath,
              server.url,
              project.absolutePath,
              apiKey,
            )
            await abortSession(client, args.sessionId)
            return `Abort signal sent for session ${args.sessionId} in ${project.name}.`
          } catch (error) {
            return `Failed to abort session: ${toErrorMessage(error)}`
          }
        },
      }),
    },
  }
}

export default ArachneOrchestratorPlugin
