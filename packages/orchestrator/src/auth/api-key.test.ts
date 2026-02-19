import { describe, test, expect } from "bun:test"
import { generateApiKey, storeApiKey, loadApiKey, validateApiKey } from "./api-key"
import type { ApiKeyFileOperations } from "./api-key"

describe("generateApiKey", () => {
  test("produces a 64-character hex string", () => {
    const key = generateApiKey()
    expect(key).toHaveLength(64)
    expect(key).toMatch(/^[0-9a-f]{64}$/)
  })

  test("produces unique keys on each call", () => {
    const key1 = generateApiKey()
    const key2 = generateApiKey()
    expect(key1).not.toBe(key2)
  })
})

describe("storeApiKey / loadApiKey", () => {
  function createMockFs() {
    const files = new Map<string, string>()
    const modes = new Map<string, number>()
    const dirs = new Set<string>()

    const ops: ApiKeyFileOperations = {
      readFile: (path: string) => {
        const content = files.get(path)
        if (content === undefined) throw new Error(`ENOENT: ${path}`)
        return content
      },
      writeFile: (path: string, data: string) => {
        files.set(path, data)
      },
      mkdir: (path: string) => {
        dirs.add(path)
      },
      chmod: (path: string, mode: number) => {
        modes.set(path, mode)
      },
    }

    return { ops, files, modes, dirs }
  }

  test("round-trips a key through store and load", () => {
    const { ops } = createMockFs()
    const key = generateApiKey()
    const dir = "/mock/.config/arachne"
    const file = "/mock/.config/arachne/auth.json"

    storeApiKey(key, ops, dir, file)
    const loaded = loadApiKey(ops, file)

    expect(loaded).toBe(key)
  })

  test("creates directory and sets chmod 600", () => {
    const { ops, modes, dirs } = createMockFs()
    const dir = "/mock/.config/arachne"
    const file = "/mock/.config/arachne/auth.json"

    storeApiKey("test-key", ops, dir, file)

    expect(dirs.has(dir)).toBe(true)
    expect(modes.get(file)).toBe(0o600)
  })

  test("stores key with createdAt timestamp", () => {
    const { ops, files } = createMockFs()
    const file = "/mock/.config/arachne/auth.json"

    storeApiKey("test-key", ops, "/mock/.config/arachne", file)

    const stored = JSON.parse(files.get(file)!)
    expect(stored.apiKey).toBe("test-key")
    expect(stored.createdAt).toBeDefined()
  })

  test("returns null when file does not exist", () => {
    const { ops } = createMockFs()
    const loaded = loadApiKey(ops, "/nonexistent/auth.json")
    expect(loaded).toBeNull()
  })

  test("returns null for malformed JSON", () => {
    const ops: Pick<ApiKeyFileOperations, "readFile"> = {
      readFile: () => "not valid json",
    }
    expect(loadApiKey(ops, "/any")).toBeNull()
  })

  test("returns null when apiKey field is empty string", () => {
    const ops: Pick<ApiKeyFileOperations, "readFile"> = {
      readFile: () => JSON.stringify({ apiKey: "" }),
    }
    expect(loadApiKey(ops, "/any")).toBeNull()
  })
})

describe("validateApiKey", () => {
  test("returns true for matching keys", () => {
    const key = generateApiKey()
    expect(validateApiKey(key, key)).toBe(true)
  })

  test("returns false for non-matching keys", () => {
    const key1 = generateApiKey()
    const key2 = generateApiKey()
    expect(validateApiKey(key1, key2)).toBe(false)
  })

  test("returns false for different-length keys", () => {
    expect(validateApiKey("short", "muchlongerkey")).toBe(false)
  })

  test("returns false for empty strings", () => {
    expect(validateApiKey("", "stored")).toBe(false)
    expect(validateApiKey("provided", "")).toBe(false)
    expect(validateApiKey("", "")).toBe(false)
  })

  test("returns false for non-string inputs", () => {
    expect(validateApiKey(null as any, "stored")).toBe(false)
    expect(validateApiKey("provided", undefined as any)).toBe(false)
  })
})
