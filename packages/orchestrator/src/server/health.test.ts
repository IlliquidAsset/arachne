import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { ServerHealthChecker } from "./health"
import { ServerRegistry } from "./registry"
import type { ServerInfo } from "./types"

function makeServer(overrides: Partial<ServerInfo> = {}): ServerInfo {
  return {
    projectPath: "/tmp/project-health",
    pid: 1234,
    port: 4100,
    url: "http://localhost:4100/",
    status: "running",
    lastHealthCheck: null,
    consecutiveFailures: 0,
    startedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  }
}

describe("ServerHealthChecker", () => {
  let fixtureDir: string
  let persistencePath: string
  let registry: ServerRegistry

  beforeEach(() => {
    fixtureDir = mkdtempSync(join(tmpdir(), "arachne-server-health-"))
    persistencePath = join(fixtureDir, "servers.json")
    registry = new ServerRegistry(persistencePath)
  })

  afterEach(() => {
    rmSync(fixtureDir, { recursive: true, force: true })
  })

  test("healthy checks reset consecutive failures", async () => {
    const server = makeServer({ consecutiveFailures: 2 })
    registry.register(server)

    const events: string[] = []
    const checker = new ServerHealthChecker(registry, {
      fetchFn: async () => new Response("ok", { status: 200 }),
      restartServerFn: async () => server,
    })

    checker.onEvent((event) => events.push(event.type))
    await checker.runHealthChecks()

    const updated = registry.get(server.projectPath)
    expect(updated?.consecutiveFailures).toBe(0)
    expect(updated?.status).toBe("running")
    expect(events).toEqual(["healthy"])
  })

  test("three failures emit unhealthy and trigger restart", async () => {
    const server = makeServer({ consecutiveFailures: 2 })
    registry.register(server)

    const events: string[] = []
    const restartCalls: Array<{
      projectPath: string
      portRange: [number, number]
    }> = []

    const checker = new ServerHealthChecker(registry, {
      fetchFn: async () => {
        throw new Error("server unreachable")
      },
      restartServerFn: async (projectPath, config) => {
        restartCalls.push({ projectPath, portRange: config.portRange })
        const restarted = makeServer({
          projectPath,
          port: config.portRange[0],
          url: `http://localhost:${config.portRange[0]}/`,
          consecutiveFailures: 0,
        })
        registry.register(restarted)
        return restarted
      },
    })

    checker.onEvent((event) => events.push(event.type))
    await checker.runHealthChecks()

    expect(restartCalls).toEqual([
      {
        projectPath: server.projectPath,
        portRange: [server.port, server.port],
      },
    ])
    expect(events).toEqual(["unhealthy", "restarting"])
    expect(registry.get(server.projectPath)?.consecutiveFailures).toBe(0)
  })

  test("startHealthChecks and stopHealthChecks can be toggled", () => {
    const checker = new ServerHealthChecker(registry, {
      fetchFn: async () => new Response("ok", { status: 200 }),
    })

    checker.startHealthChecks(10)
    checker.stopHealthChecks()
    checker.stopHealthChecks()
  })
})
