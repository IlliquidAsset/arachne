import { spawn as nodeSpawn } from "node:child_process"
import { EventEmitter } from "node:events"
import type {
  WhisperConfig,
  WhisperLifecycleDependencies,
  WhisperStatus,
  SpawnedProcess,
  SpawnProcess,
} from "./types"

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function spawnWithNode(
  command: string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv },
): SpawnedProcess {
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

function spawnWithBun(
  command: string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv },
): SpawnedProcess {
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

function spawnDefault(
  command: string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv },
): SpawnedProcess {
  if (typeof Bun !== "undefined" && typeof Bun.spawn === "function") {
    return spawnWithBun(command, options)
  }
  return spawnWithNode(command, options)
}

export interface WhisperStartOptions {
  healthTimeoutMs?: number
  healthIntervalMs?: number
}

const MAX_CONSECUTIVE_FAILURES = 3

export class WhisperLifecycleManager {
  private readonly deps: WhisperLifecycleDependencies
  private status: WhisperStatus = "stopped"
  private processRef: SpawnedProcess | null = null
  private pid: number | null = null
  private url: string | null = null
  private config: WhisperConfig | null = null
  private consecutiveFailures = 0
  private healthInterval: ReturnType<typeof setInterval> | null = null
  private restarting = false

  constructor(dependencies: WhisperLifecycleDependencies = {}) {
    this.deps = dependencies
  }

  async start(
    config: WhisperConfig,
    options: WhisperStartOptions = {},
  ): Promise<void> {
    if (this.status === "running" || this.status === "starting") {
      return
    }

    this.config = config
    this.status = "starting"
    this.consecutiveFailures = 0

    const spawnProcess: SpawnProcess = this.deps.spawnProcess ?? spawnDefault
    const url = `http://127.0.0.1:${config.serverPort}`
    this.url = url

    const command = [
      config.binaryPath,
      "--model",
      config.modelPath,
      "--port",
      String(config.serverPort),
      "--language",
      config.language,
      "--no-timestamps",
    ]

    try {
      this.processRef = spawnProcess(command, {
        cwd: undefined,
        env: process.env,
      })
      this.pid = this.processRef.pid

      const timeoutMs = options.healthTimeoutMs ?? 30_000
      const intervalMs = options.healthIntervalMs ?? 500
      await this.waitForHealth(url, timeoutMs, intervalMs)

      this.status = "running"
    } catch (error) {
      this.status = "error"
      if (this.processRef) {
        try {
          this.processRef.kill("SIGTERM")
        } catch {}
      }
      throw error
    }
  }

  async stop(): Promise<void> {
    this.stopHealthCheck()

    if (this.status === "stopped" || this.pid === null) {
      this.status = "stopped"
      this.cleanup()
      return
    }

    const signalProcess = this.deps.signalProcess ?? process.kill

    try {
      signalProcess(this.pid, "SIGTERM")
    } catch {}

    const graceful = await this.waitForProcessExit(5_000)

    if (!graceful) {
      try {
        signalProcess(this.pid, "SIGKILL")
      } catch {}
      await this.waitForProcessExit(1_000)
    }

    this.status = "stopped"
    this.cleanup()
  }

  getUrl(): string | null {
    return this.url
  }

  isRunning(): boolean {
    return this.status === "running" && this.pid !== null
  }

  getStatus(): WhisperStatus {
    return this.status
  }

  startHealthCheck(intervalMs: number = 30_000): void {
    this.stopHealthCheck()
    this.healthInterval = setInterval(() => {
      this.performHealthCheck().catch(() => {})
    }, intervalMs)
  }

  stopHealthCheck(): void {
    if (this.healthInterval !== null) {
      clearInterval(this.healthInterval)
      this.healthInterval = null
    }
  }

  private async performHealthCheck(): Promise<void> {
    if (this.status !== "running" || this.url === null || this.restarting) {
      return
    }

    const fetchFn = this.deps.fetchFn ?? fetch

    try {
      const response = await fetchFn(`${this.url}/health`)
      if (response.status === 200) {
        this.consecutiveFailures = 0
        return
      }
    } catch {}

    this.consecutiveFailures++

    if (this.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      await this.autoRestart()
    }
  }

  private async autoRestart(): Promise<void> {
    if (!this.config || this.restarting) return

    this.restarting = true
    const config = this.config

    try {
      await this.stop()
      await this.start(config)
    } catch {
      this.status = "error"
    } finally {
      this.restarting = false
    }
  }

  private async waitForHealth(
    url: string,
    timeoutMs: number,
    intervalMs: number,
  ): Promise<void> {
    const fetchFn = this.deps.fetchFn ?? fetch
    const sleep = this.deps.sleep ?? defaultSleep
    const maxAttempts = Math.max(1, Math.ceil(timeoutMs / intervalMs))

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetchFn(`${url}/health`)
        if (response.status === 200) {
          return
        }
      } catch {}

      await sleep(intervalMs)
    }

    throw new Error(
      `Timed out waiting for whisper-server to become healthy at ${url}`,
    )
  }

  private async waitForProcessExit(timeoutMs: number): Promise<boolean> {
    if (!this.processRef) return true

    const sleep = this.deps.sleep ?? defaultSleep

    return new Promise<boolean>((resolve) => {
      let settled = false

      this.processRef!.exited.then(() => {
        if (!settled) {
          settled = true
          resolve(true)
        }
      })

      sleep(timeoutMs).then(() => {
        if (!settled) {
          settled = true
          resolve(false)
        }
      })
    })
  }

  private cleanup(): void {
    this.processRef = null
    this.pid = null
    this.url = null
    this.consecutiveFailures = 0
  }
}

const whisperLifecycle = new WhisperLifecycleManager()

export const startSTT = whisperLifecycle.start.bind(whisperLifecycle)
export const stopSTT = whisperLifecycle.stop.bind(whisperLifecycle)
export const getSTTUrl = whisperLifecycle.getUrl.bind(whisperLifecycle)
export const isSTTRunning = whisperLifecycle.isRunning.bind(whisperLifecycle)
export const getSTTStatus = whisperLifecycle.getStatus.bind(whisperLifecycle)
export const startSTTHealthCheck =
  whisperLifecycle.startHealthCheck.bind(whisperLifecycle)
export const stopSTTHealthCheck =
  whisperLifecycle.stopHealthCheck.bind(whisperLifecycle)
