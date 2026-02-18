export type ServerStatus =
  | "starting"
  | "running"
  | "stopping"
  | "stopped"
  | "error"
  | "restarting"

export interface ServerInfo {
  projectPath: string
  pid: number | null
  port: number
  url: string
  status: ServerStatus
  lastHealthCheck: Date | null
  consecutiveFailures: number
  startedAt: Date | null
}
