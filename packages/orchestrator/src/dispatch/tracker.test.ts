import { describe, expect, test } from "bun:test"
import { DispatchTracker } from "./tracker"
import type { DispatchRecord } from "./types"

function makeRecord(overrides: Partial<DispatchRecord> = {}): DispatchRecord {
  return {
    id: "dispatch-1",
    projectPath: "/tmp/project-a",
    projectName: "project-a",
    sessionId: "session-1",
    message: "hello",
    status: "pending",
    dispatchedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  }
}

describe("DispatchTracker", () => {
  test("records dispatches and returns active entries", () => {
    const tracker = new DispatchTracker()
    tracker.record(makeRecord())

    const active = tracker.getActive()
    expect(active).toHaveLength(1)
    expect(active[0]?.id).toBe("dispatch-1")
  })

  test("returns active count per project path", () => {
    const tracker = new DispatchTracker()
    tracker.record(makeRecord({ id: "a-1", projectPath: "/tmp/project-a" }))
    tracker.record(makeRecord({ id: "a-2", projectPath: "/tmp/project-a" }))
    tracker.record(makeRecord({ id: "b-1", projectPath: "/tmp/project-b" }))

    expect(tracker.getActiveCount("/tmp/project-a")).toBe(2)
    expect(tracker.getActiveCount("/tmp/project-b")).toBe(1)
  })

  test("markCompleted sets completed status and timestamp", () => {
    const tracker = new DispatchTracker()
    tracker.record(makeRecord())

    tracker.markCompleted("dispatch-1")

    const completed = tracker.get("dispatch-1")
    expect(completed?.status).toBe("completed")
    expect(completed?.completedAt).toBeInstanceOf(Date)
    expect(tracker.getActive()).toHaveLength(0)
  })

  test("markFailed sets failed status and error", () => {
    const tracker = new DispatchTracker()
    tracker.record(makeRecord())

    tracker.markFailed("dispatch-1", "network error")

    const failed = tracker.get("dispatch-1")
    expect(failed?.status).toBe("failed")
    expect(failed?.error).toBe("network error")
    expect(failed?.completedAt).toBeInstanceOf(Date)
    expect(tracker.getActive()).toHaveLength(0)
  })
})
