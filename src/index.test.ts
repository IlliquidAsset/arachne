import { describe, test, expect } from "bun:test"
import AmandaOrchestratorPlugin from "./index"

const EXPECTED_TOOLS = [
  "amanda_dispatch",
  "amanda_projects",
  "amanda_project_status",
  "amanda_server_control",
  "amanda_sessions",
  "amanda_abort",
] as const

const mockCtx = {
  client: {} as any,
  project: {} as any,
  directory: "/tmp/test",
  worktree: "/tmp/test",
  serverUrl: new URL("http://localhost:3000"),
  $: {} as any,
}

describe("AmandaOrchestratorPlugin", () => {
  test("factory returns a valid plugin interface", async () => {
    const hooks = await AmandaOrchestratorPlugin(mockCtx)
    expect(hooks).toBeDefined()
    expect(hooks.tool).toBeDefined()
    expect(typeof hooks.tool).toBe("object")
  })

  test("registers all 6 tools", async () => {
    const hooks = await AmandaOrchestratorPlugin(mockCtx)
    const toolNames = Object.keys(hooks.tool!)

    expect(toolNames).toHaveLength(6)
    for (const name of EXPECTED_TOOLS) {
      expect(toolNames).toContain(name)
    }
  })

  test("each tool has description, args, and execute", async () => {
    const hooks = await AmandaOrchestratorPlugin(mockCtx)
    for (const [name, def] of Object.entries(hooks.tool!)) {
      expect(def.description).toBeTypeOf("string")
      expect(def.description.length).toBeGreaterThan(0)
      expect(def.args).toBeDefined()
      expect(def.execute).toBeTypeOf("function")
    }
  })
})
