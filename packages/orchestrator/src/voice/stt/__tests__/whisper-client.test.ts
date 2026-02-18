import { describe, expect, test } from "bun:test"
import { transcribe } from "../whisper-client"

describe("whisper-client transcribe()", () => {
  test("sends correct multipart POST to /inference", async () => {
    let capturedUrl = ""
    let capturedMethod = ""
    let capturedBody: FormData | null = null

    const mockFetch: typeof fetch = async (input, init) => {
      capturedUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url
      capturedMethod = init?.method ?? "GET"
      capturedBody = init?.body as FormData
      return new Response(JSON.stringify({ text: "hello world" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }

    const audioBuffer = Buffer.from("fake wav data")
    const result = await transcribe(audioBuffer, "http://127.0.0.1:8178", mockFetch)

    expect(capturedUrl).toBe("http://127.0.0.1:8178/inference")
    expect(capturedMethod).toBe("POST")
    expect(capturedBody).toBeInstanceOf(FormData)
    expect(result).toBe("hello world")
  })

  test("parses response text correctly and trims whitespace", async () => {
    const mockFetch: typeof fetch = async () =>
      new Response(JSON.stringify({ text: "  transcribed text with spaces  " }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })

    const result = await transcribe(Buffer.from("wav"), "http://127.0.0.1:8178", mockFetch)
    expect(result).toBe("transcribed text with spaces")
  })

  test("throws on server error", async () => {
    const mockFetch: typeof fetch = async () =>
      new Response("Internal Server Error", { status: 500 })

    expect(
      transcribe(Buffer.from("wav"), "http://127.0.0.1:8178", mockFetch),
    ).rejects.toThrow("Whisper transcription failed")
  })

  test("throws on timeout", async () => {
    const mockFetch: typeof fetch = async () => {
      const error = new DOMException("The operation was aborted.", "AbortError")
      throw error
    }

    expect(
      transcribe(Buffer.from("wav"), "http://127.0.0.1:8178", mockFetch),
    ).rejects.toThrow()
  })

  test("throws descriptive error on network failure", async () => {
    const mockFetch: typeof fetch = async () => {
      throw new Error("ECONNREFUSED")
    }

    expect(
      transcribe(Buffer.from("wav"), "http://127.0.0.1:8178", mockFetch),
    ).rejects.toThrow("Whisper transcription failed")
  })

  test("sends file with correct MIME type and filename", async () => {
    let capturedBody: FormData | null = null

    const mockFetch: typeof fetch = async (_input, init) => {
      capturedBody = init?.body as FormData
      return new Response(JSON.stringify({ text: "test" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }

    await transcribe(Buffer.from("wav data"), "http://127.0.0.1:8178", mockFetch)

    expect(capturedBody).not.toBeNull()
    const file = capturedBody!.get("file")
    expect(file).toBeInstanceOf(Blob)
    expect((file as Blob).type).toBe("audio/wav")
  })
})
