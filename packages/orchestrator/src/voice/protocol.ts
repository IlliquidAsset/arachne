/**
 * Voice WebSocket message protocol definitions.
 *
 * Client → Server messages are sent as JSON text frames.
 * Binary audio data is sent as separate binary frames.
 * Server → Client messages are sent as JSON text frames.
 * Server → Client audio is sent as binary frames.
 */

// ---------------------------------------------------------------------------
// Client → Server (text frames)
// ---------------------------------------------------------------------------

export type ClientMessage =
  | { type: "speech_start" }
  | { type: "speech_end" }
  | { type: "interrupt" }
  | { type: "config"; settings: Record<string, unknown> }

// ---------------------------------------------------------------------------
// Server → Client (text frames)
// ---------------------------------------------------------------------------

export type ServerMessage =
  | { type: "listening" }
  | { type: "processing" }
  | { type: "thinking" }
  | { type: "speaking" }
  | { type: "transcription"; text: string }
  | { type: "response_text"; text: string }
  | { type: "error"; message: string }
  | { type: "session_limit" }
  | { type: "warming_up" }
  | { type: "ready" }

// ---------------------------------------------------------------------------
// Allowed type strings for validation
// ---------------------------------------------------------------------------

const VALID_CLIENT_TYPES = new Set<string>([
  "speech_start",
  "speech_end",
  "interrupt",
  "config",
])

// ---------------------------------------------------------------------------
// Parsing / serialization
// ---------------------------------------------------------------------------

/**
 * Parse a raw JSON string into a typed ClientMessage.
 * Returns null if the string is not valid JSON, not an object,
 * has no recognized `type` field, or fails validation.
 */
export function parseClientMessage(raw: string): ClientMessage | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null
  }

  const obj = parsed as Record<string, unknown>

  if (typeof obj.type !== "string" || !VALID_CLIENT_TYPES.has(obj.type)) {
    return null
  }

  // Additional validation for config messages
  if (obj.type === "config") {
    if (typeof obj.settings !== "object" || obj.settings === null || Array.isArray(obj.settings)) {
      return null
    }
  }

  return obj as ClientMessage
}

/**
 * Serialize a ServerMessage to a JSON string for sending over WebSocket.
 */
export function serializeServerMessage(msg: ServerMessage): string {
  return JSON.stringify(msg)
}
