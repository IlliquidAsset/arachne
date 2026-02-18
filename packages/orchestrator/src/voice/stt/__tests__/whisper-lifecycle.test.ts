import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { WhisperLifecycleManager } from "../whisper-lifecycle"
import type {
  WhisperConfig,
  WhisperLifecycleDependencies,
  SpawnedProcess,
} from "../types"

function makeConfig(overrides: Partial<WhisperConfig> = {}): WhisperConfig {
  return {
    binaryPath: "/usr/local/bin/whisper-server",
    modelPath: "/models/ggml-base.en.bin",
    serverPort: 8178,
    language: "en",
    useCoreML: false,
    ...overrides,
  }
}

function makeMockProcess(overrides: Partial<SpawnedProcess> = {}): SpawnedProcess {
  return {
    pid: 12345,
    kill: () => true,
    exited: new Promise(() => {}), // never resolves by default
    ...overrides,
  }
}

describe("WhisperLifecycleManager", () => {
  let manager: WhisperLifecycleManager

  afterEach(async () => {
    try {
      manager.stopHealthCheck()
      await manager.stop()
    } catch {}
  })

  describe("start()", () => {
    test("spawns process with correct args", async () => {
      const spawnCalls: Array<{ command: string[] }> = []

      const deps: WhisperLifecycleDependencies = {
        fetchFn: async () => new Response("ok", { status: 200 }),
        sleep: async () => {},
        spawnProcess: (command) => {
          spawnCalls.push({ command })
          return makeMockProcess()
        },
        signalProcess: () => true,
      }

      manager = new WhisperLifecycleManager(deps)
      const config = makeConfig()
      await manager.start(config)

      expect(spawnCalls).toHaveLength(1)
      expect(spawnCalls[0]!.command).toEqual([
        "/usr/local/bin/whisper-server",
        "--model",
        "/models/ggml-base.en.bin",
        "--port",
        "8178",
        "--language",
        "en",
        "--no-timestamps",
      ])
    })

    test("waits for /health 200 before resolving", async () => {
      let healthCallCount = 0

      const deps: WhisperLifecycleDependencies = {
        fetchFn: async (input) => {
          const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url
          if (url.includes("/health")) {
            healthCallCount++
            if (healthCallCount < 3) {
              throw new Error("connection refused")
            }
            return new Response("ok", { status: 200 })
          }
          return new Response("not found", { status: 404 })
        },
        sleep: async () => {},
        spawnProcess: () => makeMockProcess(),
        signalProcess: () => true,
      }

      manager = new WhisperLifecycleManager(deps)
      await manager.start(makeConfig())

      expect(healthCallCount).toBe(3)
      expect(manager.getStatus()).toBe("running")
    })

    test("throws if /health never returns 200 within timeout", async () => {
      const deps: WhisperLifecycleDependencies = {
        fetchFn: async () => {
          throw new Error("connection refused")
        },
        sleep: async () => {},
        spawnProcess: () => makeMockProcess(),
        signalProcess: () => true,
      }

      manager = new WhisperLifecycleManager(deps)

      expect(
        manager.start(makeConfig(), { healthTimeoutMs: 500, healthIntervalMs: 100 }),
      ).rejects.toThrow("Timed out waiting for whisper-server")
    })

    test("sets status to 'running' after successful start", async () => {
      const deps: WhisperLifecycleDependencies = {
        fetchFn: async () => new Response("ok", { status: 200 }),
        sleep: async () => {},
        spawnProcess: () => makeMockProcess(),
        signalProcess: () => true,
      }

      manager = new WhisperLifecycleManager(deps)
      expect(manager.getStatus()).toBe("stopped")

      await manager.start(makeConfig())
      expect(manager.getStatus()).toBe("running")
    })

    test("stores correct URL from config port", async () => {
      const deps: WhisperLifecycleDependencies = {
        fetchFn: async () => new Response("ok", { status: 200 }),
        sleep: async () => {},
        spawnProcess: () => makeMockProcess(),
        signalProcess: () => true,
      }

      manager = new WhisperLifecycleManager(deps)
      expect(manager.getUrl()).toBeNull()

      await manager.start(makeConfig({ serverPort: 9999 }))
      expect(manager.getUrl()).toBe("http://127.0.0.1:9999")
    })

    test("isRunning() returns true after start", async () => {
      const deps: WhisperLifecycleDependencies = {
        fetchFn: async () => new Response("ok", { status: 200 }),
        sleep: async () => {},
        spawnProcess: () => makeMockProcess(),
        signalProcess: () => true,
      }

      manager = new WhisperLifecycleManager(deps)
      expect(manager.isRunning()).toBe(false)

      await manager.start(makeConfig())
      expect(manager.isRunning()).toBe(true)
    })
  })

  describe("stop()", () => {
    test("sends SIGTERM first", async () => {
      const signals: Array<{ pid: number; signal: NodeJS.Signals }> = []

      const deps: WhisperLifecycleDependencies = {
        fetchFn: async () => new Response("ok", { status: 200 }),
        sleep: async () => {},
        spawnProcess: () => makeMockProcess({ exited: Promise.resolve(0) }),
        signalProcess: (pid, signal) => {
          signals.push({ pid, signal })
          return true
        },
      }

      manager = new WhisperLifecycleManager(deps)
      await manager.start(makeConfig())
      await manager.stop()

      expect(signals[0]).toEqual({ pid: 12345, signal: "SIGTERM" })
      const sigKills = signals.filter((s) => s.signal === "SIGKILL")
      expect(sigKills).toHaveLength(0)
    })

    test("sends SIGKILL after timeout if process still alive", async () => {
      const signals: Array<{ pid: number; signal: NodeJS.Signals }> = []

      const deps: WhisperLifecycleDependencies = {
        fetchFn: async () => new Response("ok", { status: 200 }),
        sleep: async () => {},
        spawnProcess: () => makeMockProcess(),
        signalProcess: (pid, signal) => {
          signals.push({ pid, signal })
          return true
        },
      }

      manager = new WhisperLifecycleManager(deps)
      await manager.start(makeConfig())
      await manager.stop()

      const sigTerms = signals.filter((s) => s.signal === "SIGTERM")
      const sigKills = signals.filter((s) => s.signal === "SIGKILL")

      expect(sigTerms.length).toBeGreaterThanOrEqual(1)
      expect(sigKills.length).toBeGreaterThanOrEqual(1)
    })

    test("sets status to 'stopped' after stop", async () => {
      const deps: WhisperLifecycleDependencies = {
        fetchFn: async () => new Response("ok", { status: 200 }),
        sleep: async () => {},
        spawnProcess: () => makeMockProcess(),
        signalProcess: () => true,
      }

      manager = new WhisperLifecycleManager(deps)
      await manager.start(makeConfig())
      expect(manager.getStatus()).toBe("running")

      await manager.stop()
      expect(manager.getStatus()).toBe("stopped")
    })

    test("is idempotent when already stopped", async () => {
      const deps: WhisperLifecycleDependencies = {
        fetchFn: async () => new Response("ok", { status: 200 }),
        sleep: async () => {},
        spawnProcess: () => makeMockProcess(),
        signalProcess: () => true,
      }

      manager = new WhisperLifecycleManager(deps)
      await manager.stop()
      expect(manager.getStatus()).toBe("stopped")
    })
  })

  describe("health monitoring", () => {
    test("detects health check failure", async () => {
      let healthCallCount = 0
      let fetchFnImpl: (input: RequestInfo | URL) => Promise<Response> = async () =>
        new Response("ok", { status: 200 })

      const deps: WhisperLifecycleDependencies = {
        fetchFn: async (input, init) => fetchFnImpl(input as RequestInfo | URL),
        sleep: async () => {},
        spawnProcess: () => makeMockProcess(),
        signalProcess: () => true,
      }

      manager = new WhisperLifecycleManager(deps)
      await manager.start(makeConfig())
      expect(manager.getStatus()).toBe("running")

      fetchFnImpl = async () => {
        healthCallCount++
        return new Response("error", { status: 500 })
      }

      await (manager as any).performHealthCheck()

      expect(manager.getStatus()).toBe("running")
    })

    test("auto-restart triggered after 3 consecutive health failures", async () => {
      let spawnCount = 0
      let healthCallCount = 0

      const deps: WhisperLifecycleDependencies = {
        fetchFn: async () => {
          healthCallCount++
          if (healthCallCount >= 2 && healthCallCount <= 4) {
            return new Response("error", { status: 500 })
          }
          return new Response("ok", { status: 200 })
        },
        sleep: async () => {},
        spawnProcess: () => {
          spawnCount++
          return makeMockProcess()
        },
        signalProcess: () => true,
      }

      manager = new WhisperLifecycleManager(deps)
      await manager.start(makeConfig())
      expect(spawnCount).toBe(1)

      await (manager as any).performHealthCheck()
      await (manager as any).performHealthCheck()
      await (manager as any).performHealthCheck()

      expect(spawnCount).toBe(2)
      expect(manager.getStatus()).toBe("running")
    })
  })

  describe("getStatus()", () => {
    test("returns correct state at each lifecycle stage", async () => {
      const deps: WhisperLifecycleDependencies = {
        fetchFn: async () => new Response("ok", { status: 200 }),
        sleep: async () => {},
        spawnProcess: () => makeMockProcess(),
        signalProcess: () => true,
      }

      manager = new WhisperLifecycleManager(deps)

      expect(manager.getStatus()).toBe("stopped")

      await manager.start(makeConfig())
      expect(manager.getStatus()).toBe("running")

      await manager.stop()
      expect(manager.getStatus()).toBe("stopped")
    })
  })
})
