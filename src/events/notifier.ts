import { dispatchTracker, type DispatchTracker } from "../dispatch/tracker"
import type { DispatchRecord } from "../dispatch/types"
import type { DispatchNotification, NotificationCallback, SSEEvent } from "./types"

const SUMMARY_MAX_LENGTH = 500

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function extractErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error
  }

  if (!isRecord(error)) {
    return "Unknown session error"
  }

  if (typeof error.message === "string" && error.message.length > 0) {
    return error.message
  }

  if (isRecord(error.data) && typeof error.data.message === "string") {
    return error.data.message
  }

  if (typeof error.name === "string" && error.name.length > 0) {
    return error.name
  }

  return "Unknown session error"
}

interface AssistantResponse {
  sessionId: string
  text: string
}

export interface NotificationRelayDependencies {
  tracker?: DispatchTracker
  now?: () => Date
}

export class NotificationRelay {
  private readonly tracker: DispatchTracker
  private readonly now: () => Date

  private listeners: NotificationCallback[] = []
  private pendingNotifications: DispatchNotification[] = []
  private readonly sessionTitles = new Map<string, string>()

  constructor(dependencies: NotificationRelayDependencies = {}) {
    this.tracker = dependencies.tracker ?? dispatchTracker
    this.now = dependencies.now ?? (() => new Date())
  }

  onNotification(callback: NotificationCallback): void {
    this.listeners.push(callback)
  }

  handleEvent(projectPath: string, event: SSEEvent): void {
    this.captureSessionTitle(event)
    this.handleSessionError(projectPath, event)

    const response = this.extractAssistantResponse(event)
    if (!response) {
      return
    }

    const dispatch = this.findTrackedDispatch(projectPath, response.sessionId)
    if (!dispatch) {
      return
    }

    const truncated = this.truncateResponse(response.text)

    const notification: DispatchNotification = {
      projectName: dispatch.projectName,
      sessionId: dispatch.sessionId,
      dispatchId: dispatch.id,
      summary: truncated.summary,
      fullResponseAvailable: truncated.fullResponseAvailable,
      timestamp: this.now(),
    }

    this.pendingNotifications.push(notification)
    this.tracker.markCompleted(dispatch.id)

    for (const listener of this.listeners) {
      try {
        listener(notification)
      } catch {}
    }
  }

  formatNotification(notification: DispatchNotification): string {
    const title = this.sessionTitles.get(notification.sessionId) ?? notification.sessionId
    return `📋 [${notification.projectName}] Response ready — session '${title}': ${notification.summary}`
  }

  getPendingNotifications(): DispatchNotification[] {
    return [...this.pendingNotifications]
  }

  clearNotification(dispatchId: string): void {
    this.pendingNotifications = this.pendingNotifications.filter(
      (notification) => notification.dispatchId !== dispatchId,
    )
  }

  private captureSessionTitle(event: SSEEvent): void {
    if (event.type !== "session.created" && event.type !== "session.updated") {
      return
    }

    if (!isRecord(event.data) || !isRecord(event.data.info)) {
      return
    }

    const sessionId = event.data.info.id
    const title = event.data.info.title

    if (typeof sessionId !== "string" || typeof title !== "string") {
      return
    }

    if (title.length === 0) {
      return
    }

    this.sessionTitles.set(sessionId, title)
  }

  private handleSessionError(projectPath: string, event: SSEEvent): void {
    if (event.type !== "session.error") {
      return
    }

    if (!isRecord(event.data)) {
      return
    }

    const sessionId = event.data.sessionID
    if (typeof sessionId !== "string") {
      return
    }

    const dispatch = this.findTrackedDispatch(projectPath, sessionId)
    if (!dispatch) {
      return
    }

    this.tracker.markFailed(dispatch.id, extractErrorMessage(event.data.error))
  }

  private findTrackedDispatch(
    projectPath: string,
    sessionId: string,
  ): DispatchRecord | undefined {
    return this.tracker
      .getActive(projectPath)
      .find((dispatch) => dispatch.sessionId === sessionId)
  }

  private extractAssistantResponse(event: SSEEvent): AssistantResponse | null {
    if (event.type === "message.part.updated") {
      return this.extractFromPartUpdated(event.data)
    }

    if (event.type === "message.updated") {
      return this.extractFromMessageUpdated(event.data)
    }

    return null
  }

  private extractFromPartUpdated(data: unknown): AssistantResponse | null {
    if (!isRecord(data) || !isRecord(data.part)) {
      return null
    }

    if (data.part.type !== "text") {
      return null
    }

    if (typeof data.part.sessionID !== "string") {
      return null
    }

    if (typeof data.part.text !== "string") {
      return null
    }

    if (!isRecord(data.part.time) || typeof data.part.time.end !== "number") {
      return null
    }

    const text = data.part.text.trim()
    if (text.length === 0) {
      return null
    }

    return {
      sessionId: data.part.sessionID,
      text,
    }
  }

  private extractFromMessageUpdated(data: unknown): AssistantResponse | null {
    if (!isRecord(data) || !isRecord(data.info)) {
      return null
    }

    if (data.info.role !== "assistant") {
      return null
    }

    if (typeof data.info.sessionID !== "string") {
      return null
    }

    if (!Array.isArray(data.parts)) {
      return null
    }

    const texts: string[] = []

    for (const part of data.parts) {
      if (!isRecord(part)) {
        continue
      }

      if (part.type !== "text") {
        continue
      }

      if (typeof part.text !== "string") {
        continue
      }

      const text = part.text.trim()
      if (text.length > 0) {
        texts.push(text)
      }
    }

    if (texts.length === 0) {
      return null
    }

    return {
      sessionId: data.info.sessionID,
      text: texts.join("\n"),
    }
  }

  private truncateResponse(text: string): {
    summary: string
    fullResponseAvailable: boolean
  } {
    const normalized = text.replace(/\s+/g, " ").trim()
    if (normalized.length <= SUMMARY_MAX_LENGTH) {
      return {
        summary: normalized,
        fullResponseAvailable: false,
      }
    }

    const shortened = normalized
      .slice(0, SUMMARY_MAX_LENGTH - 3)
      .trimEnd()

    return {
      summary: `${shortened}...`,
      fullResponseAvailable: true,
    }
  }
}
