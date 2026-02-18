import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { ServerRegistry } from "./registry"
import type { ServerInfo } from "./types"

function makeServer(overrides: Partial<ServerInfo> = {}): ServerInfo {
  return {
    projectPath: "/tmp/project-a",
    pid: 12345,
    port: 4100,
    url: "http://localhost:4100/",
    status: "running",
    lastHealthCheck: null,
    consecutiveFailures: 0,
    startedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  }
}

describe("ServerRegistry", () => {
  let fixtureDir: string
  let persistencePath: string
  let registry: ServerRegistry

  beforeEach(() => {
    fixtureDir = mkdtempSync(join(tmpdir(), "amanda-server-registry-"))
    persistencePath = join(fixtureDir, "servers.json")
    registry = new ServerRegistry(persistencePath)
  })

  afterEach(() => {
    rmSync(fixtureDir, { recursive: true, force: true })
  })

  test("register, get, getAll, remove", () => {
    const server = makeServer()
    registry.register(server)

    expect(registry.get(server.projectPath)).toEqual(server)
    expect(registry.getAll()).toHaveLength(1)

    registry.remove(server.projectPath)
    expect(registry.get(server.projectPath)).toBeUndefined()
    expect(registry.getAll()).toEqual([])
  })

  test("updateStatus emits status change events", () => {
    const server = makeServer({ status: "starting" })
    const events: Array<{ previous: string; next: string }> = []

    registry.onStatusChange((event) => {
      events.push({ previous: event.previousStatus, next: event.server.status })
    })

    registry.register(server)
    registry.updateStatus(server.projectPath, "running")

    expect(events).toEqual([{ previous: "starting", next: "running" }])
  })

  test("persists server state to file and restores on init", () => {
    const startedAt = new Date("2026-01-01T01:00:00.000Z")
    const lastHealthCheck = new Date("2026-01-01T02:00:00.000Z")

    registry.register(
      makeServer({
        projectPath: "/tmp/project-persisted",
        port: 4188,
        url: "http://localhost:4188/",
        startedAt,
        lastHealthCheck,
      }),
    )

    const restoredRegistry = new ServerRegistry(persistencePath)
    const restored = restoredRegistry.get("/tmp/project-persisted")

    expect(restored).toBeDefined()
    expect(restored?.port).toBe(4188)
    expect(restored?.url).toBe("http://localhost:4188/")
    expect(restored?.startedAt?.toISOString()).toBe(startedAt.toISOString())
    expect(restored?.lastHealthCheck?.toISOString()).toBe(
      lastHealthCheck.toISOString(),
    )
  })
})
