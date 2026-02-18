import { describe, expect, test } from "bun:test"
import { parseOverrides } from "./override-parser"

describe("parseOverrides", () => {
  test("detects 'in a new session' and strips it", () => {
    const result = parseOverrides("in a new session, check auth")
    expect(result.options.newSession).toBe(true)
    expect(result.cleanedMessage).toBe("check auth")
  })

  test("detects 'new session' at end of message", () => {
    const result = parseOverrides("check auth in a new session")
    expect(result.options.newSession).toBe(true)
    expect(result.cleanedMessage).toBe("check auth")
  })

  test("detects 'start fresh'", () => {
    const result = parseOverrides("start fresh and review the PR")
    expect(result.options.newSession).toBe(true)
    expect(result.cleanedMessage).toBeTruthy()
  })

  test("detects 'continue where we left off'", () => {
    const result = parseOverrides("continue where we left off on the wizard")
    expect(result.options.strategyHint).toBe("most_recent")
    expect(result.cleanedMessage).toBe("on the wizard")
  })

  test("detects 'pick up where I left off'", () => {
    const result = parseOverrides("pick up where I left off with the migration")
    expect(result.options.strategyHint).toBe("most_recent")
    expect(result.cleanedMessage).toBe("with the migration")
  })

  test("detects explicit session ID", () => {
    const result = parseOverrides("in session ses_abc123")
    expect(result.options.sessionId).toBe("ses_abc123")
  })

  test("detects session ID with remaining message", () => {
    const result = parseOverrides("in session ses_abc123, check the auth")
    expect(result.options.sessionId).toBe("ses_abc123")
    expect(result.cleanedMessage).toBe("check the auth")
  })

  test("detects title keyword via 'in the X session'", () => {
    const result = parseOverrides("in the auth session, fix the bug")
    expect(result.options.titleKeyword).toBe("auth")
    expect(result.cleanedMessage).toBe("fix the bug")
  })

  test("detects title keyword via 'in session about X'", () => {
    const result = parseOverrides("fix the bug in session about auth")
    expect(result.options.titleKeyword).toBe("auth")
    expect(result.cleanedMessage).toBe("fix the bug")
  })

  test("returns empty options and unchanged message when no override", () => {
    const result = parseOverrides("fix the auth bug")
    expect(result.options).toEqual({})
    expect(result.cleanedMessage).toBe("fix the auth bug")
  })

  test("only matches first override pattern", () => {
    const result = parseOverrides("new session, continue where we left off")
    expect(result.options.newSession).toBe(true)
    expect(result.options.strategyHint).toBeUndefined()
  })
})
