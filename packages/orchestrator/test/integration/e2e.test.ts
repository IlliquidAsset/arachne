import type { PluginInput } from "@opencode-ai/plugin"
import AmandaOrchestratorPlugin from "../../src/index"

declare const describe: (name: string, fn: () => void | Promise<void>) => void
declare const test: (name: string, fn: () => void | Promise<void>) => void
declare const expect: (value: unknown) => any

const EXPECTED_TOOLS = [
  "amanda_dispatch",
  "amanda_projects",
  "amanda_project_status",
  "amanda_server_control",
  "amanda_sessions",
  "amanda_abort",
] as const

const pluginCtx: PluginInput = {
  client: {} as PluginInput["client"],
  project: {} as PluginInput["project"],
  directory: "/Users/kendrick/Documents/dev",
  worktree: "/Users/kendrick/Documents/dev",
  serverUrl: new URL("http://localhost:4099"),
  $: {} as PluginInput["$"],
}

const toolCtx = {
  sessionID: "integration-e2e",
  messageID: "integration-e2e",
  agent: "integration",
  directory: "/Users/kendrick/Documents/dev",
  worktree: "/Users/kendrick/Documents/dev",
  abort: new AbortController().signal,
  metadata: () => {},
  ask: async () => {},
}

describe("integration: e2e lifecycle", () => {
  test("discovers projects and exposes lifecycle tools", async () => {
    const hooks = await AmandaOrchestratorPlugin(pluginCtx)
    const toolNames = Object.keys(hooks.tool ?? {})

    expect(toolNames).toHaveLength(6)
    for (const name of EXPECTED_TOOLS) {
      expect(toolNames).toContain(name)
    }

    const projectsOutput = await hooks.tool!.amanda_projects.execute({}, toolCtx)
    expect(projectsOutput).toContain("northstarpro")
    expect(projectsOutput).toContain("watserface")
    expect(projectsOutput).toContain("oh-my-opencode")

    const statusOutput = await hooks.tool!.amanda_project_status.execute(
      { project: "northstarpro" },
      toolCtx,
    )
    expect(statusOutput).toContain("Project:")
    expect(statusOutput).toContain("northstarpro")
    expect(statusOutput).toContain("Profile:")
  })
})
