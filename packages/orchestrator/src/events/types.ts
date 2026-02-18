export interface SSEEvent {
  type: string
  data: unknown
  timestamp: Date
}

export interface DispatchNotification {
  projectName: string
  sessionId: string
  dispatchId: string
  summary: string
  fullResponseAvailable: boolean
  timestamp: Date
}

export type NotificationCallback = (notification: DispatchNotification) => void
