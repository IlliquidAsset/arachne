import { describe, test, expect } from "bun:test"
import type { PluginInput } from "@opencode-ai/plugin"
import ArachneOrchestratorPlugin from "./index"

const EXPECTED_TOOLS = [
  "arachne_dispatch",
  "arachne_projects",
  "arachne_project_status",
  "arachne_server_control",
  "arachne_sessions",
  "arachne_abort",
] as const

const mockCtx: PluginInput = {
  client: {} as PluginInput["client"],
  project: {} as PluginInput["project"],
  directory: "/tmp/test-arachne-plugin",
  worktree: "/tmp/test-arachne-plugin",
  serverUrl: new URL("http://localhost:3000"),
  $: {} as PluginInput["$"],
}

describe("ArachneOrchestratorPlugin", () => {
  test("factory returns a valid plugin interface", async () => {
    const hooks = await ArachneOrchestratorPlugin(mockCtx)
    expect(hooks).toBeDefined()
    expect(hooks.tool).toBeDefined()
    expect(typeof hooks.tool).toBe("object")
  })

  test("registers all 6 tools", async () => {
    const hooks = await ArachneOrchestratorPlugin(mockCtx)
    const toolNames = Object.keys(hooks.tool!)

    expect(toolNames).toHaveLength(6)
    for (const name of EXPECTED_TOOLS) {
      expect(toolNames).toContain(name)
    }
  })

  test("each tool has description, args, and execute", async () => {
    const hooks = await ArachneOrchestratorPlugin(mockCtx)
    for (const [_name, def] of Object.entries(hooks.tool!)) {
      expect(def.description).toBeTypeOf("string")
      expect(def.description.length).toBeGreaterThan(0)
      expect(def.args).toBeDefined()
      expect(def.execute).toBeTypeOf("function")
    }
  })

  test("arachne_dispatch has project, message, session, newSession args", async () => {
    const hooks = await ArachneOrchestratorPlugin(mockCtx)
    const args = hooks.tool!.arachne_dispatch.args
    expect(args.project).toBeDefined()
    expect(args.message).toBeDefined()
    expect(args.session).toBeDefined()
    expect(args.newSession).toBeDefined()
  })

  test("arachne_server_control has action and project args", async () => {
    const hooks = await ArachneOrchestratorPlugin(mockCtx)
    const args = hooks.tool!.arachne_server_control.args
    expect(args.action).toBeDefined()
    expect(args.project).toBeDefined()
  })

  test("arachne_sessions has project arg", async () => {
    const hooks = await ArachneOrchestratorPlugin(mockCtx)
    const args = hooks.tool!.arachne_sessions.args
    expect(args.project).toBeDefined()
  })

  test("arachne_abort has project and sessionId args", async () => {
    const hooks = await ArachneOrchestratorPlugin(mockCtx)
    const args = hooks.tool!.arachne_abort.args
    expect(args.project).toBeDefined()
    expect(args.sessionId).toBeDefined()
  })

  test("all tools execute and return human-readable strings", async () => {
    const hooks = await ArachneOrchestratorPlugin(mockCtx)
    const toolCtx = {
      sessionID: "test",
      messageID: "test",
      agent: "test",
      directory: "/tmp",
      worktree: "/tmp",
      abort: new AbortController().signal,
      metadata: () => {},
      ask: async () => {},
    }

    const missingProject = "missing-project-id-for-plugin-test"

    const dispatchResult = await hooks.tool!.arachne_dispatch.execute(
      { project: missingProject, message: "test" },
      toolCtx,
    )
    const projectsResult = await hooks.tool!.arachne_projects.execute(
      { filter: "" },
      toolCtx,
    )
    const projectStatusResult = await hooks.tool!.arachne_project_status.execute(
      { project: missingProject },
      toolCtx,
    )
    const serverControlResult = await hooks.tool!.arachne_server_control.execute(
      { action: "status", project: missingProject },
      toolCtx,
    )
    const sessionsResult = await hooks.tool!.arachne_sessions.execute(
      { project: missingProject },
      toolCtx,
    )
    const abortResult = await hooks.tool!.arachne_abort.execute(
      { project: missingProject, sessionId: "session-1" },
      toolCtx,
    )

    const results = [
      dispatchResult,
      projectsResult,
      projectStatusResult,
      serverControlResult,
      sessionsResult,
      abortResult,
    ]

    for (const result of results) {
      expect(result).toBeTypeOf("string")
      expect(result.length).toBeGreaterThan(0)
    }
  })
})
