import { describe, expect, test } from "bun:test"
import { parseClientMessage, serializeServerMessage } from "../protocol"
import type { ServerMessage } from "../protocol"

describe("parseClientMessage", () => {
  test("parses valid speech_start message", () => {
    const result = parseClientMessage(JSON.stringify({ type: "speech_start" }))
    expect(result).toEqual({ type: "speech_start" })
  })

  test("parses valid speech_end message", () => {
    const result = parseClientMessage(JSON.stringify({ type: "speech_end" }))
    expect(result).toEqual({ type: "speech_end" })
  })

  test("parses valid interrupt message", () => {
    const result = parseClientMessage(JSON.stringify({ type: "interrupt" }))
    expect(result).toEqual({ type: "interrupt" })
  })

  test("parses valid config message with settings", () => {
    const msg = { type: "config", settings: { sampleRate: 16000, language: "en" } }
    const result = parseClientMessage(JSON.stringify(msg))
    expect(result).toEqual(msg)
  })

  test("returns null for invalid JSON", () => {
    const result = parseClientMessage("not json {{{")
    expect(result).toBeNull()
  })

  test("returns null for JSON without type field", () => {
    const result = parseClientMessage(JSON.stringify({ foo: "bar" }))
    expect(result).toBeNull()
  })

  test("returns null for unknown type", () => {
    const result = parseClientMessage(JSON.stringify({ type: "unknown_type" }))
    expect(result).toBeNull()
  })

  test("returns null for empty string", () => {
    const result = parseClientMessage("")
    expect(result).toBeNull()
  })

  test("returns null for non-object JSON (number)", () => {
    const result = parseClientMessage("42")
    expect(result).toBeNull()
  })

  test("returns null for non-object JSON (array)", () => {
    const result = parseClientMessage("[1,2,3]")
    expect(result).toBeNull()
  })

  test("config message without settings returns null", () => {
    const result = parseClientMessage(JSON.stringify({ type: "config" }))
    expect(result).toBeNull()
  })
})

describe("serializeServerMessage", () => {
  test("serializes listening message", () => {
    const msg: ServerMessage = { type: "listening" }
    const json = serializeServerMessage(msg)
    expect(JSON.parse(json)).toEqual({ type: "listening" })
  })

  test("serializes processing message", () => {
    const msg: ServerMessage = { type: "processing" }
    const json = serializeServerMessage(msg)
    expect(JSON.parse(json)).toEqual({ type: "processing" })
  })

  test("serializes thinking message", () => {
    const msg: ServerMessage = { type: "thinking" }
    const json = serializeServerMessage(msg)
    expect(JSON.parse(json)).toEqual({ type: "thinking" })
  })

  test("serializes speaking message", () => {
    const msg: ServerMessage = { type: "speaking" }
    const json = serializeServerMessage(msg)
    expect(JSON.parse(json)).toEqual({ type: "speaking" })
  })

  test("serializes transcription message with text", () => {
    const msg: ServerMessage = { type: "transcription", text: "hello world" }
    const json = serializeServerMessage(msg)
    expect(JSON.parse(json)).toEqual({ type: "transcription", text: "hello world" })
  })

  test("serializes response_text message with text", () => {
    const msg: ServerMessage = { type: "response_text", text: "I can help with that" }
    const json = serializeServerMessage(msg)
    expect(JSON.parse(json)).toEqual({ type: "response_text", text: "I can help with that" })
  })

  test("serializes error message", () => {
    const msg: ServerMessage = { type: "error", message: "something went wrong" }
    const json = serializeServerMessage(msg)
    expect(JSON.parse(json)).toEqual({ type: "error", message: "something went wrong" })
  })

  test("serializes session_limit message", () => {
    const msg: ServerMessage = { type: "session_limit" }
    const json = serializeServerMessage(msg)
    expect(JSON.parse(json)).toEqual({ type: "session_limit" })
  })

  test("roundtrip: serialize then parse as JSON preserves data", () => {
    const msg: ServerMessage = { type: "transcription", text: "test round trip" }
    const serialized = serializeServerMessage(msg)
    const parsed = JSON.parse(serialized)
    expect(parsed).toEqual(msg)
  })
})
