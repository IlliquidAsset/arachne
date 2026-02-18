import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin/tool"
import { loadAmandaConfig } from "./config"

const AmandaOrchestratorPlugin: Plugin = async (ctx) => {
  const _config = loadAmandaConfig(ctx.directory)

  return {
    tool: {
      amanda_dispatch: tool({
        description:
          "Dispatch a task to an Amanda agent instance in a specific project",
        args: {
          project: tool.schema
            .string()
            .describe("Project identifier to dispatch to"),
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
        async execute(_args) {
          return "amanda_dispatch: Not yet implemented"
        },
      }),

      amanda_projects: tool({
        description:
          "List available Amanda projects and their configurations",
        args: {
          filter: tool.schema
            .string()
            .optional()
            .describe("Optional filter pattern for project names"),
        },
        async execute(_args) {
          return "amanda_projects: Not yet implemented"
        },
      }),

      amanda_project_status: tool({
        description: "Get the status of a specific Amanda project",
        args: {
          project: tool.schema.string().describe("Project identifier"),
        },
        async execute(_args) {
          return "amanda_project_status: Not yet implemented"
        },
      }),

      amanda_server_control: tool({
        description:
          "Control Amanda server instances (start, stop, restart, status)",
        args: {
          action: tool.schema
            .enum(["start", "stop", "restart", "status"])
            .describe("Server control action"),
          project: tool.schema.string().describe("Project identifier"),
        },
        async execute(_args) {
          return "amanda_server_control: Not yet implemented"
        },
      }),

      amanda_sessions: tool({
        description: "List active Amanda sessions for a project",
        args: {
          project: tool.schema.string().describe("Project identifier"),
        },
        async execute(_args) {
          return "amanda_sessions: Not yet implemented"
        },
      }),

      amanda_abort: tool({
        description: "Abort a running Amanda task or session",
        args: {
          project: tool.schema.string().describe("Project identifier"),
          sessionId: tool.schema.string().describe("Session ID to abort"),
        },
        async execute(_args) {
          return "amanda_abort: Not yet implemented"
        },
      }),
    },
  }
}

export default AmandaOrchestratorPlugin
