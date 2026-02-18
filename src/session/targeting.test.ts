import { describe, expect, test } from "bun:test"
import { findBestSession, ACTIVE_THRESHOLD_MS } from "./targeting"
import type { SessionInfo } from "../client/types"

function makeSession(
  id: string,
  title: string,
  updated: number,
): SessionInfo {
  return {
    id,
    title,
    version: "1",
    projectID: "proj-test",
    directory: "/tmp/test",
    time: { created: updated, updated },
  }
}

describe("findBestSession", () => {
  test("user-specified session ID is used directly", () => {
    const sessions = [makeSession("s1", "Chat", 100)]
    const result = findBestSession(sessions, "hello", { sessionId: "s1" })
    expect(result.sessionId).toBe("s1")
    expect(result.strategy).toBe("user_specified")
    expect(result.confidence).toBe(1.0)
    expect(result.needsCreate).toBe(false)
  })

  test("newSession returns needsCreate", () => {
    const sessions = [makeSession("s1", "Chat", 100)]
    const result = findBestSession(sessions, "hello", { newSession: true })
    expect(result.sessionId).toBeNull()
    expect(result.strategy).toBe("new_session")
    expect(result.confidence).toBe(1.0)
    expect(result.needsCreate).toBe(true)
  })

  test("active session preferred over idle", () => {
    const now = Date.now()
    const sessions = [
      makeSession("idle-1", "Old chat", now - 3_600_000),
      makeSession("active-1", "Current work", now - 60_000),
    ]
    const result = findBestSession(sessions, "check status", {}, now)
    expect(result.sessionId).toBe("active-1")
    expect(result.strategy).toBe("active_session")
    expect(result.confidence).toBe(0.9)
  })

  test("most recent active session wins when multiple are active", () => {
    const now = Date.now()
    const sessions = [
      makeSession("a1", "Work A", now - 120_000),
      makeSession("a2", "Work B", now - 30_000),
    ]
    const result = findBestSession(sessions, "anything", {}, now)
    expect(result.sessionId).toBe("a2")
    expect(result.strategy).toBe("active_session")
  })

  test("topic match: 'fix the auth bug' matches 'Authentication flow fixes'", () => {
    const now = Date.now()
    const sessions = [
      makeSession("s1", "Authentication flow fixes", now - ACTIVE_THRESHOLD_MS - 1000),
      makeSession("s2", "Database migrations", now - ACTIVE_THRESHOLD_MS - 1000),
    ]
    const result = findBestSession(sessions, "fix the auth bug", {}, now)
    expect(result.sessionId).toBe("s1")
    expect(result.strategy).toBe("topic_match")
    expect(result.confidence).toBe(0.7)
  })

  test("title keyword override targets matching session", () => {
    const now = Date.now()
    const sessions = [
      makeSession("s1", "Auth debugging", now - ACTIVE_THRESHOLD_MS - 1000),
      makeSession("s2", "Deploy pipeline", now - ACTIVE_THRESHOLD_MS - 500),
    ]
    const result = findBestSession(
      sessions,
      "fix the bug",
      { titleKeyword: "auth" },
      now,
    )
    expect(result.sessionId).toBe("s1")
    expect(result.strategy).toBe("topic_match")
    expect(result.confidence).toBe(0.85)
  })

  test("falls back to most recent when no topic match", () => {
    const now = Date.now()
    const sessions = [
      makeSession("s1", "General chat", now - ACTIVE_THRESHOLD_MS - 2000),
      makeSession("s2", "Random stuff", now - ACTIVE_THRESHOLD_MS - 1000),
    ]
    const result = findBestSession(sessions, "deploy the lambda function", {}, now)
    expect(result.sessionId).toBe("s2")
    expect(result.strategy).toBe("most_recent")
    expect(result.confidence).toBe(0.5)
  })

  test("empty session list returns create_new", () => {
    const result = findBestSession([], "hello world")
    expect(result.sessionId).toBeNull()
    expect(result.strategy).toBe("create_new")
    expect(result.confidence).toBe(0.3)
    expect(result.needsCreate).toBe(true)
  })

  test("strategyHint most_recent skips active and goes to most recent", () => {
    const now = Date.now()
    const sessions = [
      makeSession("old", "Old session", now - ACTIVE_THRESHOLD_MS - 5000),
      makeSession("newer", "Newer session", now - ACTIVE_THRESHOLD_MS - 1000),
    ]
    const result = findBestSession(
      sessions,
      "anything",
      { strategyHint: "most_recent" },
      now,
    )
    expect(result.sessionId).toBe("newer")
    expect(result.strategy).toBe("most_recent")
    expect(result.confidence).toBe(0.8)
  })

  test("topic match requires >= 2 word overlap", () => {
    const now = Date.now()
    const sessions = [
      makeSession("s1", "Authentication setup", now - ACTIVE_THRESHOLD_MS - 1000),
    ]
    const result = findBestSession(sessions, "fix the bug", {}, now)
    expect(result.strategy).toBe("most_recent")
  })
})
