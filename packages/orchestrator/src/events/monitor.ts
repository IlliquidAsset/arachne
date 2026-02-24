import type { SSEEvent } from "./types"

type TimeoutHandle = ReturnType<typeof setTimeout>
type IntervalHandle = ReturnType<typeof setInterval>

export type EventMonitorCallback = (projectPath: string, event: SSEEvent) => void

export interface EventMonitorDependencies {
  fetchFn?: typeof fetch
  scheduleTimeout?: (callback: () => void, delayMs: number) => TimeoutHandle
  clearScheduledTimeout?: (timeout: TimeoutHandle) => void
  scheduleInterval?: (callback: () => void, intervalMs: number) => IntervalHandle
  clearScheduledInterval?: (interval: IntervalHandle) => void
  now?: () => number
}

interface SSEFrame {
  event?: string
  id?: string
  dataLines: string[]
}

interface SubscriptionState {
  projectPath: string
  serverUrl: string
  reconnectAttempt: number
  reconnectTimer: TimeoutHandle | null
  heartbeatTimer: IntervalHandle | null
  abortController: AbortController | null
  shouldReconnect: boolean
  isConnecting: boolean
  lastEventId?: string
  lastHeartbeatAt: number
}

const HEARTBEAT_CHECK_INTERVAL_MS = 5_000
const HEARTBEAT_STALE_THRESHOLD_MS = 65_000
const MAX_RECONNECT_DELAY_MS = 30_000

const DISPATCH_RELEVANT_TYPES = new Set([
  "message.updated",
  "message.removed",
  "message.part.updated",
  "message.part.delta",
  "message.part.removed",
  "session.created",
  "session.updated",
  "session.deleted",
  "session.status",
  "session.idle",
  "session.error",
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function createFrame(): SSEFrame {
  return { dataLines: [] }
}

function normalizeServerUrl(serverUrl: string): string {
  return new URL(serverUrl).toString()
}

function toEventUrl(serverUrl: string): string {
  return new URL("/event", serverUrl).toString()
}

function unwrapPayload(data: unknown): unknown {
  if (!isRecord(data)) return data
  if (!("payload" in data)) return data
  return data.payload
}

function resolveEventType(payload: unknown, eventName?: string): string {
  if (isRecord(payload) && typeof payload.type === "string") {
    return payload.type
  }

  if (eventName && eventName.length > 0) {
    return eventName
  }

  return "message"
}

function resolveEventData(payload: unknown): unknown {
  if (isRecord(payload) && "properties" in payload) {
    return payload.properties
  }

  return payload
}

function isDispatchRelevantType(type: string): boolean {
  if (DISPATCH_RELEVANT_TYPES.has(type)) {
    return true
  }

  return type.startsWith("message.")
}

export class EventMonitor {
  private readonly subscriptions = new Map<string, SubscriptionState>()
  private listeners: EventMonitorCallback[] = []

  private readonly fetchFn: typeof fetch
  private readonly scheduleTimeout: (
    callback: () => void,
    delayMs: number,
  ) => TimeoutHandle
  private readonly clearScheduledTimeout: (timeout: TimeoutHandle) => void
  private readonly scheduleInterval: (
    callback: () => void,
    intervalMs: number,
  ) => IntervalHandle
  private readonly clearScheduledInterval: (interval: IntervalHandle) => void
  private readonly now: () => number

  constructor(dependencies: EventMonitorDependencies = {}) {
    this.fetchFn = dependencies.fetchFn ?? fetch
    this.scheduleTimeout = dependencies.scheduleTimeout ?? setTimeout
    this.clearScheduledTimeout = dependencies.clearScheduledTimeout ?? clearTimeout
    this.scheduleInterval = dependencies.scheduleInterval ?? setInterval
    this.clearScheduledInterval =
      dependencies.clearScheduledInterval ?? clearInterval
    this.now = dependencies.now ?? Date.now
  }

  onEvent(callback: EventMonitorCallback): () => void {
    this.listeners.push(callback)
    return () => {
      this.listeners = this.listeners.filter((listener) => listener !== callback)
    }
  }

  subscribe(serverUrl: string, projectPath: string): void {
    const normalizedServerUrl = normalizeServerUrl(serverUrl)
    const existing = this.subscriptions.get(projectPath)
    if (existing && existing.serverUrl === normalizedServerUrl) {
      return
    }

    if (existing) {
      this.unsubscribe(projectPath)
    }

    const state: SubscriptionState = {
      projectPath,
      serverUrl: normalizedServerUrl,
      reconnectAttempt: 0,
      reconnectTimer: null,
      heartbeatTimer: null,
      abortController: null,
      shouldReconnect: true,
      isConnecting: false,
      lastHeartbeatAt: this.now(),
    }

    this.subscriptions.set(projectPath, state)
    this.connect(state)
  }

  unsubscribe(projectPath: string): void {
    const state = this.subscriptions.get(projectPath)
    if (!state) {
      return
    }

    state.shouldReconnect = false

    if (state.reconnectTimer) {
      this.clearScheduledTimeout(state.reconnectTimer)
      state.reconnectTimer = null
    }

    this.stopHeartbeatMonitor(state)
    state.abortController?.abort()
    this.subscriptions.delete(projectPath)
  }

  unsubscribeAll(): void {
    for (const projectPath of this.subscriptions.keys()) {
      this.unsubscribe(projectPath)
    }
  }

  private connect(state: SubscriptionState): void {
    if (!state.shouldReconnect || state.isConnecting) {
      return
    }

    if (this.subscriptions.get(state.projectPath) !== state) {
      return
    }

    state.isConnecting = true
    void this.openStream(state)
  }

  private async openStream(state: SubscriptionState): Promise<void> {
    const controller = new AbortController()
    state.abortController = controller
    state.lastHeartbeatAt = this.now()
    this.startHeartbeatMonitor(state)

    let shouldScheduleReconnect = false

    try {
      const headers: Record<string, string> = {
        accept: "text/event-stream",
      }

      if (state.lastEventId) {
        headers["Last-Event-ID"] = state.lastEventId
      }

      const response = await this.fetchFn(toEventUrl(state.serverUrl), {
        method: "GET",
        headers,
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`SSE request failed: ${response.status}`)
      }

      if (!response.body) {
        throw new Error("SSE response body is not readable")
      }

      state.reconnectAttempt = 0
      await this.consumeStream(response.body as ReadableStream<Uint8Array>, state, controller.signal)

      shouldScheduleReconnect = true
    } catch {
      shouldScheduleReconnect = state.shouldReconnect
    } finally {
      state.isConnecting = false

      if (state.abortController === controller) {
        state.abortController = null
      }

      this.stopHeartbeatMonitor(state)

      if (state.shouldReconnect && shouldScheduleReconnect) {
        this.scheduleReconnect(state)
      }
    }
  }

  private async consumeStream(
    stream: ReadableStream<Uint8Array>,
    state: SubscriptionState,
    signal: AbortSignal,
  ): Promise<void> {
    const reader = stream.getReader()
    const decoder = new TextDecoder()

    let buffer = ""
    let frame = createFrame()

    try {
      while (!signal.aborted) {
        const { done, value } = await reader.read()
        if (done) {
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const processed = this.processBufferedLines(buffer, frame, state)
        buffer = processed.buffer
        frame = processed.frame
      }

      buffer += decoder.decode()
      if (buffer.length > 0) {
        const processed = this.processBufferedLines(buffer, frame, state)
        buffer = processed.buffer
        frame = processed.frame
      }

      if (buffer.length > 0) {
        frame = this.processLine(buffer, frame, state)
      }

      this.flushFrame(frame, state)
    } finally {
      reader.releaseLock()
    }
  }

  private processBufferedLines(
    input: string,
    frame: SSEFrame,
    state: SubscriptionState,
  ): { buffer: string; frame: SSEFrame } {
    let buffer = input
    let workingFrame = frame

    while (true) {
      const newlineIndex = buffer.indexOf("\n")
      if (newlineIndex === -1) {
        break
      }

      let line = buffer.slice(0, newlineIndex)
      buffer = buffer.slice(newlineIndex + 1)
      if (line.endsWith("\r")) {
        line = line.slice(0, -1)
      }

      workingFrame = this.processLine(line, workingFrame, state)
    }

    return { buffer, frame: workingFrame }
  }

  private processLine(
    line: string,
    frame: SSEFrame,
    state: SubscriptionState,
  ): SSEFrame {
    if (line.length === 0) {
      this.flushFrame(frame, state)
      return createFrame()
    }

    if (line.startsWith(":")) {
      state.lastHeartbeatAt = this.now()
      return frame
    }

    const separatorIndex = line.indexOf(":")
    const field = separatorIndex === -1 ? line : line.slice(0, separatorIndex)
    let value = separatorIndex === -1 ? "" : line.slice(separatorIndex + 1)
    if (value.startsWith(" ")) {
      value = value.slice(1)
    }

    if (field === "event") {
      frame.event = value
      return frame
    }

    if (field === "id") {
      frame.id = value
      state.lastEventId = value
      return frame
    }

    if (field === "data") {
      frame.dataLines.push(value)
      return frame
    }

    return frame
  }

  private flushFrame(frame: SSEFrame, state: SubscriptionState): void {
    if (frame.dataLines.length === 0) {
      return
    }

    state.lastHeartbeatAt = this.now()

    const text = frame.dataLines.join("\n")
    let payload: unknown = text

    try {
      payload = JSON.parse(text)
    } catch {}

    const normalizedPayload = unwrapPayload(payload)
    const eventType = resolveEventType(normalizedPayload, frame.event)

    if (eventType === "server.heartbeat") {
      state.lastHeartbeatAt = this.now()
      return
    }

    if (!isDispatchRelevantType(eventType)) {
      return
    }

    const event: SSEEvent = {
      type: eventType,
      data: resolveEventData(normalizedPayload),
      timestamp: new Date(),
    }

    this.emit(state.projectPath, event)
  }

  private startHeartbeatMonitor(state: SubscriptionState): void {
    this.stopHeartbeatMonitor(state)

    const timer = this.scheduleInterval(() => {
      if (!state.shouldReconnect) {
        return
      }

      const ageMs = this.now() - state.lastHeartbeatAt
      if (ageMs <= HEARTBEAT_STALE_THRESHOLD_MS) {
        return
      }

      state.abortController?.abort()
    }, HEARTBEAT_CHECK_INTERVAL_MS)

    timer.unref?.()
    state.heartbeatTimer = timer
  }

  private stopHeartbeatMonitor(state: SubscriptionState): void {
    if (!state.heartbeatTimer) {
      return
    }

    this.clearScheduledInterval(state.heartbeatTimer)
    state.heartbeatTimer = null
  }

  private scheduleReconnect(state: SubscriptionState): void {
    if (!state.shouldReconnect) {
      return
    }

    if (this.subscriptions.get(state.projectPath) !== state) {
      return
    }

    if (state.reconnectTimer) {
      return
    }

    const delayMs = Math.min(
      1_000 * 2 ** state.reconnectAttempt,
      MAX_RECONNECT_DELAY_MS,
    )
    state.reconnectAttempt += 1

    const timer = this.scheduleTimeout(() => {
      state.reconnectTimer = null
      this.connect(state)
    }, delayMs)

    timer.unref?.()
    state.reconnectTimer = timer
  }

  private emit(projectPath: string, event: SSEEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(projectPath, event)
      } catch {}
    }
  }
}
