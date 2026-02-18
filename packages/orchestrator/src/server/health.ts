import { restartServer } from "./lifecycle"
import { ServerRegistry, serverRegistry } from "./registry"
import type { ServerInfo } from "./types"

export type HealthEventType = "healthy" | "unhealthy" | "restarting"

export interface HealthEvent {
  type: HealthEventType
  server: ServerInfo
  consecutiveFailures: number
}

export type HealthEventCallback = (event: HealthEvent) => void

export interface ServerHealthDependencies {
  fetchFn?: typeof fetch
  restartServerFn?: (
    projectPath: string,
    config: { portRange: [number, number]; apiKey?: string },
  ) => Promise<ServerInfo>
}

export class ServerHealthChecker {
  private readonly registry: ServerRegistry
  private readonly dependencies: ServerHealthDependencies
  private intervalId: ReturnType<typeof setInterval> | null = null
  private listeners: HealthEventCallback[] = []
  private isChecking = false

  constructor(
    registry: ServerRegistry = serverRegistry,
    dependencies: ServerHealthDependencies = {},
  ) {
    this.registry = registry
    this.dependencies = dependencies
  }

  startHealthChecks(intervalMs: number): void {
    if (this.intervalId) return

    this.intervalId = setInterval(() => {
      void this.runHealthChecks()
    }, intervalMs)

    this.intervalId.unref?.()
  }

  stopHealthChecks(): void {
    if (!this.intervalId) return
    clearInterval(this.intervalId)
    this.intervalId = null
  }

  onEvent(callback: HealthEventCallback): () => void {
    this.listeners.push(callback)
    return () => {
      this.listeners = this.listeners.filter((listener) => listener !== callback)
    }
  }

  async runHealthChecks(): Promise<void> {
    await this.checkAllServers()
  }

  private async checkAllServers(): Promise<void> {
    if (this.isChecking) return
    this.isChecking = true

    try {
      const runningServers = this.registry
        .getAll()
        .filter((server) => server.status === "running")

      for (const server of runningServers) {
        await this.checkServer(server)
      }
    } finally {
      this.isChecking = false
    }
  }

  private async checkServer(server: ServerInfo): Promise<void> {
    const fetchFn = this.dependencies.fetchFn ?? fetch

    try {
      const response = await fetchFn(server.url)
      if (!response.ok) {
        throw new Error(`Health check failed with status ${response.status}`)
      }

      const healthyServer: ServerInfo = {
        ...server,
        lastHealthCheck: new Date(),
        consecutiveFailures: 0,
      }
      this.registry.register(healthyServer)
      this.emit({
        type: "healthy",
        server: healthyServer,
        consecutiveFailures: healthyServer.consecutiveFailures,
      })
      return
    } catch {}

    const unhealthyServer: ServerInfo = {
      ...server,
      lastHealthCheck: new Date(),
      consecutiveFailures: server.consecutiveFailures + 1,
    }
    this.registry.register(unhealthyServer)
    this.emit({
      type: "unhealthy",
      server: unhealthyServer,
      consecutiveFailures: unhealthyServer.consecutiveFailures,
    })

    if (unhealthyServer.consecutiveFailures < 3) {
      return
    }

    this.emit({
      type: "restarting",
      server: unhealthyServer,
      consecutiveFailures: unhealthyServer.consecutiveFailures,
    })

    const restartServerFn = this.dependencies.restartServerFn ?? restartServer

    try {
      await restartServerFn(unhealthyServer.projectPath, {
        portRange: [unhealthyServer.port, unhealthyServer.port],
      })
    } catch {
      this.registry.updateStatus(unhealthyServer.projectPath, "error")
    }
  }

  private emit(event: HealthEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event)
      } catch {}
    }
  }
}

const healthChecker = new ServerHealthChecker()

export const startHealthChecks =
  healthChecker.startHealthChecks.bind(healthChecker)
export const stopHealthChecks = healthChecker.stopHealthChecks.bind(healthChecker)
export const onHealthEvent = healthChecker.onEvent.bind(healthChecker)
