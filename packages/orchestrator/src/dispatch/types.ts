export type DispatchStatus =
  | "pending"
  | "sent"
  | "completed"
  | "failed"
  | "aborted"

export interface DispatchRecord {
  id: string
  projectPath: string
  projectName: string
  sessionId: string
  message: string
  status: DispatchStatus
  dispatchedAt: Date
  completedAt?: Date
  error?: string
}

export interface DispatchOptions {
  session?: string
  newSession?: boolean
  loadSkills?: string[]
}

export interface DispatchResult {
  projectName: string
  sessionId: string
  dispatchId: string
  dispatchTime: Date
}
