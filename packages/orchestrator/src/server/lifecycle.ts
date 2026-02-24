import { spawn as nodeSpawn } from "node:child_process"
import { EventEmitter } from "node:events"
import { createConnection } from "node:net"
import { ServerRegistry, serverRegistry } from "./registry"
import type { ServerInfo } from "./types"

export interface ServerLifecycleConfig {
  portRange: [number, number]
  apiKey?: string
}

interface SpawnOptions {
  cwd: string
  env: NodeJS.ProcessEnv
}

export interface SpawnedServerProcess {
  pid: number | null
  kill(signal?: NodeJS.Signals | number): boolean | void
  exited: Promise<number | null>
}

type SpawnServer = (
  command: string[],
  options: SpawnOptions,
) => SpawnedServerProcess

export interface ServerLifecycleDependencies {
  fetchFn?: typeof fetch
  spawnServer?: SpawnServer
  sleep?: (ms: number) => Promise<void>
  signalProcess?: (pid: number, signal: NodeJS.Signals) => boolean
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function spawnWithNode(command: string[], options: SpawnOptions): SpawnedServerProcess {
  const child = nodeSpawn(command[0], command.slice(1), {
    cwd: options.cwd,
    env: options.env,
    stdio: "ignore",
  })

  // bun-types ChildProcess omits EventEmitter methods present at runtime
  const emitter = child as unknown as EventEmitter
  const exited = new Promise<number | null>((resolve) => {
    emitter.once("exit", (code: number | null) => resolve(code))
    emitter.once("error", () => resolve(null))
  })

  return {
    pid: child.pid ?? null,
    kill(signal?: NodeJS.Signals | number): boolean {
      return child.kill(signal)
    },
    exited,
  }
}

function spawnWithBun(command: string[], options: SpawnOptions): SpawnedServerProcess {
  const proc = Bun.spawn(command, {
    cwd: options.cwd,
    env: options.env,
    stdout: "ignore",
    stderr: "ignore",
  })

  return {
    pid: proc.pid ?? null,
    kill(signal?: NodeJS.Signals | number): boolean | void {
      return proc.kill(signal)
    },
    exited: proc.exited.then((code) => code ?? null),
  }
}

function spawnDefault(command: string[], options: SpawnOptions): SpawnedServerProcess {
  if (typeof Bun !== "undefined" && typeof Bun.spawn === "function") {
    return spawnWithBun(command, options)
  }

  return spawnWithNode(command, options)
}

function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

export class ServerLifecycleManager {
  private readonly registry: ServerRegistry
  private readonly dependencies: ServerLifecycleDependencies

  constructor(
    registry: ServerRegistry = serverRegistry,
    dependencies: ServerLifecycleDependencies = {},
  ) {
    this.registry = registry
    this.dependencies = dependencies
  }

  async startServer(
    projectPath: string,
    config: ServerLifecycleConfig,
  ): Promise<ServerInfo> {
    const existing = this.registry.get(projectPath)
    if (
      existing &&
      (existing.status === "running" ||
        existing.status === "starting" ||
        existing.status === "restarting")
    ) {
      return existing
    }

    const port = await this.findAvailablePort(config.portRange)
    const url = `http://localhost:${port}/`
    const startedAt = new Date()

    const initialInfo: ServerInfo = {
      projectPath,
      pid: null,
      port,
      url,
      status: "starting",
      lastHealthCheck: null,
      consecutiveFailures: 0,
      startedAt,
    }
    this.registry.register(initialInfo)

    const spawnServer = this.dependencies.spawnServer ?? spawnDefault
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      OPENCODE_SERVER_PASSWORD: config.apiKey,
    }

    let processRef: SpawnedServerProcess | null = null

    try {
      processRef = spawnServer(
        [
          "opencode",
          "serve",
          "--port",
          String(port),
          "--hostname",
          "127.0.0.1",
        ],
        { cwd: projectPath, env },
      )

      const withPid: ServerInfo = { ...initialInfo, pid: processRef.pid }
      this.registry.register(withPid)

      await this.waitForServerReady(url, 30_000, 500)

      const runningInfo: ServerInfo = {
        ...withPid,
        status: "running",
        lastHealthCheck: new Date(),
      }
      this.registry.register(runningInfo)
      return runningInfo
    } catch (error) {
      if (processRef) {
        try {
          processRef.kill("SIGTERM")
        } catch {}
      }

      this.registry.updateStatus(projectPath, "error")
      throw error
    }
  }

  async stopServer(projectPath: string): Promise<void> {
    const server = this.registry.get(projectPath)
    if (!server) return

    this.registry.updateStatus(projectPath, "stopping")

    if (server.pid !== null) {
      const signalProcess = this.dependencies.signalProcess ?? process.kill

      try {
        signalProcess(server.pid, "SIGTERM")
      } catch {}

      const stoppedGracefully = await this.waitForProcessExit(server.pid, 5_000)
      if (!stoppedGracefully) {
        try {
          signalProcess(server.pid, "SIGKILL")
        } catch {}
        await this.waitForProcessExit(server.pid, 1_000)
      }
    }

    this.registry.remove(projectPath)
  }

  async restartServer(
    projectPath: string,
    config: ServerLifecycleConfig,
  ): Promise<ServerInfo> {
    const existing = this.registry.get(projectPath)
    if (existing) {
      this.registry.updateStatus(projectPath, "restarting")
    }

    await this.stopServer(projectPath)
    return this.startServer(projectPath, config)
  }

  getServerUrl(projectPath: string): string | null {
    return this.registry.get(projectPath)?.url ?? null
  }

  async isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = createConnection({ host: "127.0.0.1", port })

      socket.once("connect", () => {
        socket.destroy()
        resolve(false)
      })

      socket.once("error", (error) => {
        const err = error as NodeJS.ErrnoException
        resolve(err.code === "ECONNREFUSED")
      })
    })
  }

  async findAvailablePort(range: [number, number]): Promise<number> {
    const [start, end] = range
    for (let port = start; port <= end; port += 1) {
      if (await this.isPortAvailable(port)) {
        return port
      }
    }

    throw new Error(`No available ports in range ${start}-${end}`)
  }

  private async waitForServerReady(
    url: string,
    timeoutMs: number,
    intervalMs: number,
  ): Promise<void> {
    const fetchFn = this.dependencies.fetchFn ?? fetch
    const wait = this.dependencies.sleep ?? sleep
    const deadline = Date.now() + timeoutMs

    while (Date.now() < deadline) {
      try {
        const response = await fetchFn(url)
        if (response.status === 200) {
          return
        }
      } catch {}

      await wait(intervalMs)
    }

    throw new Error(`Timed out waiting for server to become healthy at ${url}`)
  }

  private async waitForProcessExit(
    pid: number,
    timeoutMs: number,
  ): Promise<boolean> {
    const wait = this.dependencies.sleep ?? sleep
    const deadline = Date.now() + timeoutMs

    while (Date.now() < deadline) {
      if (!isProcessRunning(pid)) {
        return true
      }

      await wait(100)
    }

    return !isProcessRunning(pid)
  }
}

const lifecycleManager = new ServerLifecycleManager()

export const startServer = lifecycleManager.startServer.bind(lifecycleManager)
export const stopServer = lifecycleManager.stopServer.bind(lifecycleManager)
export const restartServer = lifecycleManager.restartServer.bind(lifecycleManager)
export const getServerUrl = lifecycleManager.getServerUrl.bind(lifecycleManager)
export const isPortAvailable = lifecycleManager.isPortAvailable.bind(lifecycleManager)
export const findAvailablePort =
  lifecycleManager.findAvailablePort.bind(lifecycleManager)
