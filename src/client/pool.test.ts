import { describe, test, expect, beforeEach, mock } from "bun:test"
import { ClientPool } from "./pool"

mock.module("@opencode-ai/sdk", () => {
  let callCount = 0
  return {
    createOpencodeClient: (config: Record<string, unknown>) => {
      callCount++
      return { __mock: true, __id: callCount, __config: config } as any
    },
  }
})

describe("ClientPool", () => {
  let pool: ClientPool

  beforeEach(() => {
    pool = new ClientPool()
  })

  test("creates a new client when cache is empty", () => {
    const client = pool.getClient("/projects/foo", "http://localhost:3000", "/projects/foo")
    expect(client).toBeDefined()
    expect((client as any).__mock).toBe(true)
    expect(pool.size).toBe(1)
  })

  test("returns cached client for same projectPath and url", () => {
    const first = pool.getClient("/projects/foo", "http://localhost:3000", "/projects/foo")
    const second = pool.getClient("/projects/foo", "http://localhost:3000", "/projects/foo")
    expect(first).toBe(second)
    expect(pool.size).toBe(1)
  })

  test("creates separate clients for different projects", () => {
    const a = pool.getClient("/projects/a", "http://localhost:3000", "/projects/a")
    const b = pool.getClient("/projects/b", "http://localhost:3001", "/projects/b")
    expect(a).not.toBe(b)
    expect(pool.size).toBe(2)
  })

  test("invalidates and recreates when server URL changes", () => {
    const first = pool.getClient("/projects/foo", "http://localhost:3000", "/projects/foo")
    const second = pool.getClient("/projects/foo", "http://localhost:4000", "/projects/foo")
    expect(first).not.toBe(second)
    expect(pool.size).toBe(1)
  })

  test("invalidate removes a specific project", () => {
    pool.getClient("/projects/foo", "http://localhost:3000", "/projects/foo")
    pool.getClient("/projects/bar", "http://localhost:3001", "/projects/bar")
    expect(pool.size).toBe(2)

    pool.invalidate("/projects/foo")
    expect(pool.size).toBe(1)
    expect(pool.has("/projects/foo")).toBe(false)
    expect(pool.has("/projects/bar")).toBe(true)
  })

  test("invalidateAll clears entire cache", () => {
    pool.getClient("/projects/a", "http://localhost:3000", "/projects/a")
    pool.getClient("/projects/b", "http://localhost:3001", "/projects/b")
    expect(pool.size).toBe(2)

    pool.invalidateAll()
    expect(pool.size).toBe(0)
  })

  test("passes password as authorization header", () => {
    const client = pool.getClient(
      "/projects/foo",
      "http://localhost:3000",
      "/projects/foo",
      "secret123",
    )
    const config = (client as any).__config
    expect(config.baseUrl).toBe("http://localhost:3000")
    expect(config.directory).toBe("/projects/foo")
    expect(config.headers.authorization).toBe("Bearer secret123")
  })

  test("passes baseUrl and directory to createOpencodeClient", () => {
    const client = pool.getClient("/projects/foo", "http://localhost:5555", "/projects/foo")
    const config = (client as any).__config
    expect(config.baseUrl).toBe("http://localhost:5555")
    expect(config.directory).toBe("/projects/foo")
  })

  test("has returns false for unknown project", () => {
    expect(pool.has("/unknown")).toBe(false)
  })
})
