import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { createServer, type Server } from "node:net"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  ServerLifecycleManager,
  type ServerLifecycleDependencies,
} from "./lifecycle"
import { ServerRegistry } from "./registry"
import type { ServerInfo } from "./types"

function makeServer(overrides: Partial<ServerInfo> = {}): ServerInfo {
  return {
    projectPath: "/tmp/project-a",
    pid: 999999,
    port: 4100,
    url: "http://localhost:4100/",
    status: "running",
    lastHealthCheck: null,
    consecutiveFailures: 0,
    startedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  }
}

async function listen(server: Server): Promise<number> {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject)
    server.listen(0, "127.0.0.1", () => resolve())
  })

  const address = server.address()
  if (!address || typeof address === "string") {
    throw new Error("Failed to resolve server port")
  }

  return address.port
}

async function close(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error)
        return
      }

      resolve()
    })
  })
}

describe("ServerLifecycleManager", () => {
  let fixtureDir: string
  let persistencePath: string
  let registry: ServerRegistry

  beforeEach(() => {
    fixtureDir = mkdtempSync(join(tmpdir(), "arachne-server-lifecycle-"))
    persistencePath = join(fixtureDir, "servers.json")
    registry = new ServerRegistry(persistencePath)
  })

  afterEach(() => {
    rmSync(fixtureDir, { recursive: true, force: true })
  })

  test("isPortAvailable detects used and free ports", async () => {
    const manager = new ServerLifecycleManager(registry)
    const server = createServer()
    const port = await listen(server)

    const usedPortAvailable = await manager.isPortAvailable(port)
    expect(usedPortAvailable).toBe(false)

    await close(server)

    const freePortAvailable = await manager.isPortAvailable(port)
    expect(freePortAvailable).toBe(true)
  })

  test("findAvailablePort scans range for first free port", async () => {
    class TestLifecycleManager extends ServerLifecycleManager {
      override async isPortAvailable(port: number): Promise<boolean> {
        return port === 4102
      }
    }

    const manager = new TestLifecycleManager(registry)
    const port = await manager.findAvailablePort([4100, 4104])
    expect(port).toBe(4102)
  })

  test("startServer and stopServer use spawn and signals", async () => {
    const spawnCalls: Array<{ command: string[]; envPassword: string | undefined }> =
      []
    const signals: Array<{ pid: number; signal: NodeJS.Signals }> = []

    class TestLifecycleManager extends ServerLifecycleManager {
      override async findAvailablePort(): Promise<number> {
        return 4123
      }
    }

    const dependencies: ServerLifecycleDependencies = {
      fetchFn: async () => new Response("ok", { status: 200 }),
      sleep: async () => {},
      spawnServer: (command, options) => {
        spawnCalls.push({
          command,
          envPassword: options.env.OPENCODE_SERVER_PASSWORD,
        })

        return {
          pid: 999999,
          kill: () => true,
          exited: Promise.resolve(0),
        }
      },
      signalProcess: (pid, signal) => {
        signals.push({ pid, signal })
        return true
      },
    }

    const manager = new TestLifecycleManager(registry, dependencies)

    const serverInfo = await manager.startServer("/tmp/project-one", {
      portRange: [4100, 4200],
      apiKey: "secret-key",
    })

    expect(serverInfo.status).toBe("running")
    expect(serverInfo.port).toBe(4123)
    expect(serverInfo.url).toBe("http://localhost:4123/")
    expect(spawnCalls).toHaveLength(1)
    expect(spawnCalls[0]?.command).toEqual([
      "opencode",
      "serve",
      "--port",
      "4123",
      "--hostname",
      "127.0.0.1",
    ])
    expect(spawnCalls[0]?.envPassword).toBe("secret-key")

    await manager.stopServer("/tmp/project-one")
    expect(signals[0]).toEqual({ pid: 999999, signal: "SIGTERM" })
    expect(registry.get("/tmp/project-one")).toBeUndefined()
  })

  test("startServer returns existing running server for same project", async () => {
    const existing = makeServer({ projectPath: "/tmp/project-existing", port: 4111 })
    registry.register(existing)

    const manager = new ServerLifecycleManager(registry, {
      spawnServer: () => {
        throw new Error("spawn should not be called for existing running server")
      },
    })

    const result = await manager.startServer("/tmp/project-existing", {
      portRange: [4100, 4200],
    })

    expect(result).toEqual(existing)
  })
})
