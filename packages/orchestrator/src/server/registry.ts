import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join } from "node:path"
import type { ServerInfo, ServerStatus } from "./types"

interface PersistedServerInfo {
  projectPath: string
  pid: number | null
  port: number
  url: string
  status: ServerStatus
  lastHealthCheck: string | null
  consecutiveFailures: number
  startedAt: string | null
}

export interface ServerStatusChangeEvent {
  projectPath: string
  previousStatus: ServerStatus
  server: ServerInfo
}

export type ServerStatusChangeCallback = (event: ServerStatusChangeEvent) => void

function isServerStatus(value: unknown): value is ServerStatus {
  return (
    value === "starting" ||
    value === "running" ||
    value === "stopping" ||
    value === "stopped" ||
    value === "error" ||
    value === "restarting"
  )
}

function toPersisted(server: ServerInfo): PersistedServerInfo {
  return {
    ...server,
    lastHealthCheck: server.lastHealthCheck?.toISOString() ?? null,
    startedAt: server.startedAt?.toISOString() ?? null,
  }
}

function fromPersisted(data: unknown): ServerInfo | null {
  if (!data || typeof data !== "object") return null

  const candidate = data as Record<string, unknown>
  if (
    typeof candidate.projectPath !== "string" ||
    (candidate.pid !== null && typeof candidate.pid !== "number") ||
    typeof candidate.port !== "number" ||
    typeof candidate.url !== "string" ||
    !isServerStatus(candidate.status) ||
    (candidate.lastHealthCheck !== null &&
      typeof candidate.lastHealthCheck !== "string") ||
    typeof candidate.consecutiveFailures !== "number" ||
    (candidate.startedAt !== null && typeof candidate.startedAt !== "string")
  ) {
    return null
  }

  return {
    projectPath: candidate.projectPath,
    pid: candidate.pid,
    port: candidate.port,
    url: candidate.url,
    status: candidate.status,
    lastHealthCheck: candidate.lastHealthCheck
      ? new Date(candidate.lastHealthCheck)
      : null,
    consecutiveFailures: candidate.consecutiveFailures,
    startedAt: candidate.startedAt ? new Date(candidate.startedAt) : null,
  }
}

function getDefaultRegistryPath(): string {
  return join(homedir(), ".config", "amanda", "servers.json")
}

export class ServerRegistry {
  private servers = new Map<string, ServerInfo>()
  private listeners: ServerStatusChangeCallback[] = []
  private readonly persistencePath: string

  constructor(persistencePath = getDefaultRegistryPath()) {
    this.persistencePath = persistencePath
    this.load()
  }

  register(info: ServerInfo): void {
    const existing = this.servers.get(info.projectPath)
    this.servers.set(info.projectPath, info)
    this.save()

    if (existing && existing.status !== info.status) {
      this.emit({
        projectPath: info.projectPath,
        previousStatus: existing.status,
        server: info,
      })
    }
  }

  get(projectPath: string): ServerInfo | undefined {
    return this.servers.get(projectPath)
  }

  getAll(): ServerInfo[] {
    return [...this.servers.values()]
  }

  remove(projectPath: string): void {
    if (!this.servers.has(projectPath)) return
    this.servers.delete(projectPath)
    this.save()
  }

  updateStatus(projectPath: string, status: ServerStatus): void {
    const existing = this.servers.get(projectPath)
    if (!existing) return

    const updated: ServerInfo = { ...existing, status }
    this.servers.set(projectPath, updated)
    this.save()

    if (existing.status !== status) {
      this.emit({
        projectPath,
        previousStatus: existing.status,
        server: updated,
      })
    }
  }

  onStatusChange(callback: ServerStatusChangeCallback): () => void {
    this.listeners.push(callback)
    return () => {
      this.listeners = this.listeners.filter((listener) => listener !== callback)
    }
  }

  private load(): void {
    if (!existsSync(this.persistencePath)) return

    try {
      const raw = readFileSync(this.persistencePath, "utf-8")
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return

      for (const item of parsed) {
        const server = fromPersisted(item)
        if (server) {
          this.servers.set(server.projectPath, server)
        }
      }
    } catch {}
  }

  private save(): void {
    mkdirSync(dirname(this.persistencePath), { recursive: true })
    const payload = this.getAll().map(toPersisted)
    writeFileSync(this.persistencePath, JSON.stringify(payload, null, 2), "utf-8")
  }

  private emit(event: ServerStatusChangeEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event)
      } catch {}
    }
  }
}

export const serverRegistry = new ServerRegistry()
