import { describe, expect, test } from "bun:test"
import type { ServerMessage } from "../protocol"
import { NotificationQueue } from "../notification-queue"
import { VoicePipeline } from "../pipeline"

async function* streamChunks(
  chunks: Float32Array[],
): AsyncGenerator<Float32Array> {
  for (const chunk of chunks) {
    yield chunk
  }
}

function makeThrowingStream(message: string): AsyncGenerator<Float32Array> {
  return {
    [Symbol.asyncIterator]() {
      return this
    },
    async next() {
      throw new Error(message)
    },
    async return(value?: Float32Array) {
      return {
        done: true,
        value: value as Float32Array,
      }
    },
    async throw(error?: unknown) {
      throw error instanceof Error ? error : new Error(String(error))
    },
  } as AsyncGenerator<Float32Array>
}

function makeAudioBuffer(): Buffer {
  const pcm = new Int16Array([0, 2000, -2000, 1200])
  return Buffer.from(pcm.buffer.slice(0))
}

describe("VoicePipeline", () => {
  test("runs STT -> LLM -> TTS in correct order", async () => {
    const calls: string[] = []
    const messages: ServerMessage[] = []

    const pipeline = new VoicePipeline({
      transcribe: async (audio) => {
        calls.push("transcribe")
        expect(audio.subarray(0, 4).toString("ascii")).toBe("RIFF")
        return "hello"
      },
      sendToLLM: async (text) => {
        calls.push("llm")
        expect(text).toBe("hello")
        return "hello from amanda"
      },
      generateSpeechStream: (text) => {
        calls.push(`tts:${text}`)
        return streamChunks([
          new Float32Array([0.1, -0.1]),
          new Float32Array([0.2, -0.2]),
        ])
      },
      sendMessage: (_ws, msg) => {
        calls.push(`msg:${msg.type}`)
        messages.push(msg)
      },
      sendAudio: () => {
        calls.push("audio")
      },
    })

    await pipeline.handleSpeechEnd(makeAudioBuffer(), { id: "ws-1" })

    expect(calls).toEqual([
      "msg:processing",
      "transcribe",
      "msg:transcription",
      "msg:thinking",
      "llm",
      "msg:response_text",
      "msg:speaking",
      "tts:hello from amanda",
      "audio",
      "audio",
      "msg:listening",
    ])
    expect(messages[1]).toEqual({ type: "transcription", text: "hello" })
    expect(messages[3]).toEqual({
      type: "response_text",
      text: "hello from amanda",
    })
  })

  test("sends state messages in expected progression", async () => {
    const messages: ServerMessage[] = []

    const pipeline = new VoicePipeline({
      transcribe: async () => "transcribed",
      sendToLLM: async () => "response",
      generateSpeechStream: () => streamChunks([new Float32Array([0.5])]),
      sendMessage: (_ws, msg) => {
        messages.push(msg)
      },
      sendAudio: () => {},
    })

    await pipeline.handleSpeechEnd(makeAudioBuffer(), { id: "ws-1" })

    expect(messages.map((m) => m.type)).toEqual([
      "processing",
      "transcription",
      "thinking",
      "response_text",
      "speaking",
      "listening",
    ])
  })

  test("STT error sends error and returns to listening", async () => {
    const messages: ServerMessage[] = []
    let llmCalled = false
    let ttsCalled = false

    const pipeline = new VoicePipeline({
      transcribe: async () => {
        throw new Error("stt down")
      },
      sendToLLM: async () => {
        llmCalled = true
        return "never"
      },
      generateSpeechStream: () => {
        ttsCalled = true
        return streamChunks([])
      },
      sendMessage: (_ws, msg) => {
        messages.push(msg)
      },
      sendAudio: () => {},
    })

    await pipeline.handleSpeechEnd(makeAudioBuffer(), { id: "ws-1" })

    expect(messages).toEqual([
      { type: "processing" },
      { type: "error", message: "Transcription failed" },
      { type: "listening" },
    ])
    expect(llmCalled).toBe(false)
    expect(ttsCalled).toBe(false)
  })

  test("LLM error sends error and returns to listening", async () => {
    const messages: ServerMessage[] = []
    let ttsCalled = false

    const pipeline = new VoicePipeline({
      transcribe: async () => "hello",
      sendToLLM: async () => {
        throw new Error("llm down")
      },
      generateSpeechStream: () => {
        ttsCalled = true
        return streamChunks([])
      },
      sendMessage: (_ws, msg) => {
        messages.push(msg)
      },
      sendAudio: () => {},
    })

    await pipeline.handleSpeechEnd(makeAudioBuffer(), { id: "ws-1" })

    expect(messages).toEqual([
      { type: "processing" },
      { type: "transcription", text: "hello" },
      { type: "thinking" },
      { type: "error", message: "LLM unavailable" },
      { type: "listening" },
    ])
    expect(ttsCalled).toBe(false)
  })

  test("TTS error sends text-only response and returns to listening", async () => {
    const messages: ServerMessage[] = []
    let audioCount = 0

    const pipeline = new VoicePipeline({
      transcribe: async () => "hello",
      sendToLLM: async () => "response text",
      generateSpeechStream: () => makeThrowingStream("tts unavailable"),
      sendMessage: (_ws, msg) => {
        messages.push(msg)
      },
      sendAudio: () => {
        audioCount += 1
      },
    })

    await pipeline.handleSpeechEnd(makeAudioBuffer(), { id: "ws-1" })

    expect(messages).toEqual([
      { type: "processing" },
      { type: "transcription", text: "hello" },
      { type: "thinking" },
      { type: "response_text", text: "response text" },
      { type: "speaking" },
      { type: "listening" },
    ])
    expect(audioCount).toBe(0)
  })

  test("cancel stops pipeline between stages", async () => {
    const messages: ServerMessage[] = []
    let llmCalled = false
    let resolveTranscribe: ((value: string) => void) | null = null

    const transcribePromise = new Promise<string>((resolve) => {
      resolveTranscribe = resolve
    })

    const pipeline = new VoicePipeline({
      transcribe: async () => transcribePromise,
      sendToLLM: async () => {
        llmCalled = true
        return "never"
      },
      generateSpeechStream: () => streamChunks([]),
      sendMessage: (_ws, msg) => {
        messages.push(msg)
      },
      sendAudio: () => {},
    })

    const task = pipeline.handleSpeechEnd(makeAudioBuffer(), { id: "ws-1" })
    expect(pipeline.isProcessing()).toBe(true)

    pipeline.cancel()
    resolveTranscribe!("transcribed")
    await task

    expect(llmCalled).toBe(false)
    expect(messages).toEqual([{ type: "processing" }, { type: "listening" }])
    expect(pipeline.isProcessing()).toBe(false)
  })

  test("speaks queued notifications before returning to listening", async () => {
    const queue = new NotificationQueue()
    queue.enqueue("Background dispatch finished")

    const responseTexts: string[] = []
    const speakingCount: number[] = []

    const pipeline = new VoicePipeline(
      {
        transcribe: async () => "hello",
        sendToLLM: async () => "main response",
        generateSpeechStream: (text) => {
          return streamChunks([new Float32Array([text.length])])
        },
        sendMessage: (_ws, msg) => {
          if (msg.type === "response_text") {
            responseTexts.push(msg.text)
          }
          if (msg.type === "speaking") {
            speakingCount.push(1)
          }
        },
        sendAudio: () => {},
      },
      queue,
    )

    await pipeline.handleSpeechEnd(makeAudioBuffer(), { id: "ws-1" })

    expect(responseTexts).toEqual(["main response", "Background dispatch finished"])
    expect(speakingCount.length).toBe(2)
    expect(queue.hasPending()).toBe(false)
  })
})
