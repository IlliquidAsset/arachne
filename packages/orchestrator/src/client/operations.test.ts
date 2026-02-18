import { describe, test, expect } from "bun:test"
import {
  listSessions,
  createSession,
  getSession,
  sendMessage,
  sendMessageAsync,
  abortSession,
  getMessages,
  deleteSession,
} from "./operations"
import type { OpencodeClient } from "@opencode-ai/sdk"

const mockSession = {
  id: "sess-1",
  title: "Test Session",
  version: "1",
  projectID: "proj-1",
  directory: "/projects/test",
  parentID: undefined,
  time: { created: 1000, updated: 2000, compacting: undefined },
}

function makeClient(overrides: Record<string, any> = {}): OpencodeClient {
  return {
    session: {
      list: async () => ({ data: [mockSession], error: undefined }),
      create: async () => ({ data: mockSession, error: undefined }),
      get: async () => ({ data: mockSession, error: undefined }),
      prompt: async () => ({
        data: { info: { role: "assistant" }, parts: [{ type: "text" }] },
        error: undefined,
      }),
      promptAsync: async () => ({ data: undefined, error: undefined }),
      abort: async () => ({ data: true, error: undefined }),
      messages: async () => ({
        data: [{ info: { role: "user" }, parts: [{ type: "text", text: "hi" }] }],
        error: undefined,
      }),
      delete: async () => ({ data: true, error: undefined }),
      ...overrides,
    },
  } as unknown as OpencodeClient
}

describe("listSessions", () => {
  test("returns mapped session info", async () => {
    const client = makeClient()
    const sessions = await listSessions(client)
    expect(sessions).toHaveLength(1)
    expect(sessions[0].id).toBe("sess-1")
    expect(sessions[0].title).toBe("Test Session")
    expect(sessions[0].time.created).toBe(1000)
  })

  test("throws on error", async () => {
    const client = makeClient({
      list: async () => ({ data: undefined, error: { message: "fail" } }),
    })
    expect(listSessions(client)).rejects.toThrow("Failed to list sessions")
  })
})

describe("createSession", () => {
  test("returns created session info", async () => {
    const client = makeClient()
    const session = await createSession(client, "My Session")
    expect(session.id).toBe("sess-1")
    expect(session.projectID).toBe("proj-1")
  })

  test("passes title in body", async () => {
    let capturedArgs: any
    const client = makeClient({
      create: async (opts: any) => {
        capturedArgs = opts
        return { data: mockSession, error: undefined }
      },
    })
    await createSession(client, "Custom Title")
    expect(capturedArgs.body.title).toBe("Custom Title")
  })

  test("throws on error", async () => {
    const client = makeClient({
      create: async () => ({ data: undefined, error: { message: "fail" } }),
    })
    expect(createSession(client)).rejects.toThrow("Failed to create session")
  })
})

describe("getSession", () => {
  test("passes session id in path", async () => {
    let capturedArgs: any
    const client = makeClient({
      get: async (opts: any) => {
        capturedArgs = opts
        return { data: mockSession, error: undefined }
      },
    })
    await getSession(client, "sess-42")
    expect(capturedArgs.path.id).toBe("sess-42")
  })

  test("throws on error", async () => {
    const client = makeClient({
      get: async () => ({ data: undefined, error: { message: "not found" } }),
    })
    expect(getSession(client, "bad")).rejects.toThrow("Failed to get session")
  })
})

describe("sendMessage", () => {
  test("passes session id and parts correctly", async () => {
    let capturedArgs: any
    const client = makeClient({
      prompt: async (opts: any) => {
        capturedArgs = opts
        return {
          data: { info: { role: "assistant" }, parts: [] },
          error: undefined,
        }
      },
    })
    await sendMessage(client, "sess-1", {
      parts: [{ type: "text", text: "hello" }],
      agent: "coder",
    })
    expect(capturedArgs.path.id).toBe("sess-1")
    expect(capturedArgs.body.parts[0].text).toBe("hello")
    expect(capturedArgs.body.agent).toBe("coder")
  })

  test("throws on error", async () => {
    const client = makeClient({
      prompt: async () => ({ data: undefined, error: { message: "fail" } }),
    })
    expect(
      sendMessage(client, "s", { parts: [{ type: "text", text: "x" }] }),
    ).rejects.toThrow("Failed to send message")
  })
})

describe("sendMessageAsync", () => {
  test("passes session id and parts correctly", async () => {
    let capturedArgs: any
    const client = makeClient({
      promptAsync: async (opts: any) => {
        capturedArgs = opts
        return { data: undefined, error: undefined }
      },
    })
    await sendMessageAsync(client, "sess-2", {
      parts: [{ type: "text", text: "async hello" }],
    })
    expect(capturedArgs.path.id).toBe("sess-2")
    expect(capturedArgs.body.parts[0].text).toBe("async hello")
  })

  test("throws on error", async () => {
    const client = makeClient({
      promptAsync: async () => ({ data: undefined, error: { message: "fail" } }),
    })
    expect(
      sendMessageAsync(client, "s", { parts: [{ type: "text", text: "x" }] }),
    ).rejects.toThrow("Failed to send async message")
  })
})

describe("abortSession", () => {
  test("passes session id in path", async () => {
    let capturedArgs: any
    const client = makeClient({
      abort: async (opts: any) => {
        capturedArgs = opts
        return { data: true, error: undefined }
      },
    })
    await abortSession(client, "sess-99")
    expect(capturedArgs.path.id).toBe("sess-99")
  })

  test("throws on error", async () => {
    const client = makeClient({
      abort: async () => ({ data: undefined, error: { message: "fail" } }),
    })
    expect(abortSession(client, "s")).rejects.toThrow("Failed to abort session")
  })
})

describe("getMessages", () => {
  test("passes session id and optional limit", async () => {
    let capturedArgs: any
    const client = makeClient({
      messages: async (opts: any) => {
        capturedArgs = opts
        return { data: [], error: undefined }
      },
    })
    await getMessages(client, "sess-1", 50)
    expect(capturedArgs.path.id).toBe("sess-1")
    expect(capturedArgs.query.limit).toBe(50)
  })

  test("omits query when no limit", async () => {
    let capturedArgs: any
    const client = makeClient({
      messages: async (opts: any) => {
        capturedArgs = opts
        return { data: [], error: undefined }
      },
    })
    await getMessages(client, "sess-1")
    expect(capturedArgs.path.id).toBe("sess-1")
    expect(capturedArgs.query).toBeUndefined()
  })

  test("throws on error", async () => {
    const client = makeClient({
      messages: async () => ({ data: undefined, error: { message: "fail" } }),
    })
    expect(getMessages(client, "s")).rejects.toThrow("Failed to get messages")
  })
})

describe("deleteSession", () => {
  test("passes session id in path", async () => {
    let capturedArgs: any
    const client = makeClient({
      delete: async (opts: any) => {
        capturedArgs = opts
        return { data: true, error: undefined }
      },
    })
    await deleteSession(client, "sess-del")
    expect(capturedArgs.path.id).toBe("sess-del")
  })

  test("throws on error", async () => {
    const client = makeClient({
      delete: async () => ({ data: undefined, error: { message: "fail" } }),
    })
    expect(deleteSession(client, "s")).rejects.toThrow("Failed to delete session")
  })
})
