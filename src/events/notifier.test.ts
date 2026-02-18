import { DispatchTracker } from "../dispatch/tracker"
import type { DispatchRecord } from "../dispatch/types"
import { NotificationRelay } from "./notifier"
import type { SSEEvent } from "./types"

declare const describe: (name: string, fn: () => void | Promise<void>) => void
declare const test: (name: string, fn: () => void | Promise<void>) => void
declare const expect: (value: unknown) => any

function makeRecord(overrides: Partial<DispatchRecord> = {}): DispatchRecord {
  return {
    id: "dispatch-1",
    projectPath: "/tmp/project-a",
    projectName: "project-a",
    sessionId: "sess-1",
    message: "build feature",
    status: "sent",
    dispatchedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  }
}

function makeEvent(type: string, data: unknown): SSEEvent {
  return {
    type,
    data,
    timestamp: new Date("2026-01-01T12:00:00.000Z"),
  }
}

describe("NotificationRelay", () => {
  test("matches tracked dispatch and queues completion notification", () => {
    const tracker = new DispatchTracker()
    tracker.record(makeRecord())

    const relay = new NotificationRelay({ tracker })
    const observed = relay.getPendingNotifications()
    expect(observed).toHaveLength(0)

    relay.handleEvent(
      "/tmp/project-a",
      makeEvent("session.updated", {
        info: {
          id: "sess-1",
          title: "Refactor auth flow",
        },
      }),
    )

    relay.handleEvent(
      "/tmp/project-a",
      makeEvent("message.part.updated", {
        part: {
          type: "text",
          sessionID: "sess-1",
          text: "Finished the refactor and updated tests.",
          time: { end: 123 },
        },
      }),
    )

    const pending = relay.getPendingNotifications()
    expect(pending).toHaveLength(1)
    expect(pending[0]).toMatchObject({
      projectName: "project-a",
      sessionId: "sess-1",
      dispatchId: "dispatch-1",
      summary: "Finished the refactor and updated tests.",
      fullResponseAvailable: false,
    })
    expect(tracker.get("dispatch-1")?.status).toBe("completed")

    const formatted = relay.formatNotification(pending[0]!)
    expect(formatted).toBe(
      "📋 [project-a] Response ready — session 'Refactor auth flow': Finished the refactor and updated tests.",
    )
  })

  test("truncates long assistant responses at 500 characters", () => {
    const tracker = new DispatchTracker()
    tracker.record(makeRecord())

    const relay = new NotificationRelay({ tracker })
    const longText = "x".repeat(900)

    relay.handleEvent(
      "/tmp/project-a",
      makeEvent("message.part.updated", {
        part: {
          type: "text",
          sessionID: "sess-1",
          text: longText,
          time: { end: 456 },
        },
      }),
    )

    const pending = relay.getPendingNotifications()
    expect(pending).toHaveLength(1)
    expect(pending[0]?.summary.length).toBe(500)
    expect(pending[0]?.summary.endsWith("...")).toBe(true)
    expect(pending[0]?.fullResponseAvailable).toBe(true)
  })

  test("queues notifications and clears by dispatch ID", () => {
    const tracker = new DispatchTracker()
    tracker.record(makeRecord({ id: "dispatch-1", sessionId: "sess-1" }))
    tracker.record(makeRecord({ id: "dispatch-2", sessionId: "sess-2" }))

    const relay = new NotificationRelay({ tracker })
    const callbacks: string[] = []

    relay.onNotification((notification) => {
      callbacks.push(notification.dispatchId)
    })

    relay.handleEvent(
      "/tmp/project-a",
      makeEvent("message.part.updated", {
        part: {
          type: "text",
          sessionID: "sess-1",
          text: "First response",
          time: { end: 1 },
        },
      }),
    )

    relay.handleEvent(
      "/tmp/project-a",
      makeEvent("message.part.updated", {
        part: {
          type: "text",
          sessionID: "sess-2",
          text: "Second response",
          time: { end: 2 },
        },
      }),
    )

    expect(callbacks).toEqual(["dispatch-1", "dispatch-2"])
    expect(relay.getPendingNotifications()).toHaveLength(2)

    relay.clearNotification("dispatch-1")
    const remaining = relay.getPendingNotifications()
    expect(remaining).toHaveLength(1)
    expect(remaining[0]?.dispatchId).toBe("dispatch-2")
  })

  test("marks tracked dispatch failed on session.error", () => {
    const tracker = new DispatchTracker()
    tracker.record(makeRecord({ id: "dispatch-error", sessionId: "sess-error" }))

    const relay = new NotificationRelay({ tracker })

    relay.handleEvent(
      "/tmp/project-a",
      makeEvent("session.error", {
        sessionID: "sess-error",
        error: {
          name: "APIError",
          data: {
            message: "provider timeout",
          },
        },
      }),
    )

    const failed = tracker.get("dispatch-error")
    expect(failed?.status).toBe("failed")
    expect(failed?.error).toBe("provider timeout")
  })
})
