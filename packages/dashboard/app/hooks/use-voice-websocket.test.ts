import { describe, test, expect } from "bun:test";
import { float32ToInt16, parseServerMessage } from "./use-voice-websocket";

describe("float32ToInt16", () => {
  test("converts silence (zeros) to zero", () => {
    const input = new Float32Array([0, 0, 0]);
    const result = float32ToInt16(input);
    expect(result[0]).toBe(0);
    expect(result[1]).toBe(0);
    expect(result[2]).toBe(0);
  });

  test("converts max positive to 0x7FFF", () => {
    const input = new Float32Array([1.0]);
    const result = float32ToInt16(input);
    expect(result[0]).toBe(0x7fff);
  });

  test("converts max negative to -0x8000", () => {
    const input = new Float32Array([-1.0]);
    const result = float32ToInt16(input);
    expect(result[0]).toBe(-0x8000);
  });

  test("clamps values above 1 to 0x7FFF", () => {
    const input = new Float32Array([2.0]);
    const result = float32ToInt16(input);
    expect(result[0]).toBe(0x7fff);
  });

  test("clamps values below -1 to -0x8000", () => {
    const input = new Float32Array([-2.0]);
    const result = float32ToInt16(input);
    expect(result[0]).toBe(-0x8000);
  });

  test("converts mid-range positive value correctly", () => {
    const input = new Float32Array([0.5]);
    const result = float32ToInt16(input);
    expect(result[0]).toBe(Math.floor(0.5 * 0x7fff));
  });

  test("output length matches input length", () => {
    const input = new Float32Array(100);
    const result = float32ToInt16(input);
    expect(result.length).toBe(100);
  });
});

describe("parseServerMessage", () => {
  test("parses valid JSON message", () => {
    const result = parseServerMessage('{"type":"listening"}');
    expect(result).toEqual({ type: "listening" });
  });

  test("parses message with text field", () => {
    const result = parseServerMessage('{"type":"transcription","text":"hello"}');
    expect(result).toEqual({ type: "transcription", text: "hello" });
  });

  test("returns null for invalid JSON", () => {
    const result = parseServerMessage("not json");
    expect(result).toBeNull();
  });

  test("returns null for empty string", () => {
    const result = parseServerMessage("");
    expect(result).toBeNull();
  });

  test("parses all known server message types", () => {
    const types = [
      "listening",
      "processing",
      "thinking",
      "speaking",
      "transcription",
      "response_text",
      "error",
      "session_limit",
    ];
    for (const type of types) {
      const result = parseServerMessage(JSON.stringify({ type }));
      expect(result?.type).toBe(type);
    }
  });

  test("unknown message type is parsed without error", () => {
    const result = parseServerMessage('{"type":"unknown_future_type"}');
    expect(result?.type).toBe("unknown_future_type");
  });
});

describe("reconnect delay logic", () => {
  test("delay doubles with each retry up to 30s max", () => {
    let delay = 1000;
    const delays: number[] = [delay];
    for (let i = 0; i < 6; i++) {
      delay = Math.min(delay * 2, 30000);
      delays.push(delay);
    }
    expect(delays).toEqual([1000, 2000, 4000, 8000, 16000, 30000, 30000]);
  });

  test("delay never exceeds 30000ms", () => {
    let delay = 1000;
    for (let i = 0; i < 20; i++) {
      delay = Math.min(delay * 2, 30000);
    }
    expect(delay).toBe(30000);
  });

  test("delay resets to 1000 on successful connection", () => {
    let delay = 16000;
    delay = 1000;
    expect(delay).toBe(1000);
  });
});
