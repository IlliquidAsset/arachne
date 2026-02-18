import { describe, expect, test } from "bun:test"
import { LLMBridge } from "../llm-bridge"

describe("LLMBridge", () => {
  test("sendToLLM calls promptAsync with transcribed text", async () => {
    const calls: Array<{
      sessionId: string
      text: string
      opts?: { agent?: string }
    }> = []
    const getResponseCalls: string[] = []

    const bridge = new LLMBridge({
      createSession: async () => "voice-session-1",
      promptAsync: async (sessionId, text, opts) => {
        calls.push({ sessionId, text, opts })
      },
      getResponse: async (sessionId) => {
        getResponseCalls.push(sessionId)
        return "Hello from Amanda"
      },
    })

    const response = await bridge.sendToLLM("What is my next task?")

    expect(response).toBe("Hello from Amanda")
    expect(calls).toEqual([
      {
        sessionId: "voice-session-1",
        text: "What is my next task?",
        opts: undefined,
      },
    ])
    expect(getResponseCalls).toEqual(["voice-session-1"])
  })

  test("getOrCreateSession creates and reuses dedicated session", async () => {
    let createCount = 0
    const bridge = new LLMBridge({
      createSession: async () => {
        createCount += 1
        return `voice-session-${createCount}`
      },
      promptAsync: async () => {},
      getResponse: async () => "ok",
    })

    const first = await bridge.getOrCreateSession()
    const second = await bridge.getOrCreateSession()

    expect(first).toBe("voice-session-1")
    expect(second).toBe("voice-session-1")
    expect(createCount).toBe(1)
  })
})
