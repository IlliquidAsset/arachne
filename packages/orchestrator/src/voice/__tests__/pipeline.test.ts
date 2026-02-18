// @ts-ignore Bun test globals are available at runtime
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

// @ts-ignore Buffer is provided by Bun runtime
function makeAudioBuffer(): Buffer {
  const pcm = new Int16Array([0, 2000, -2000, 1200])
  // @ts-ignore Buffer is provided by Bun runtime
  return Buffer.from(pcm.buffer.slice(0))
}

function deferred<T>(): {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason?: unknown) => void
} {
  let resolve: (value: T) => void = () => {}
  let reject: (reason?: unknown) => void = () => {}

  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitFor(condition: () => boolean, timeoutMs = 1000): Promise<void> {
  const start = Date.now()
  while (!condition()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(`Condition not met within ${timeoutMs}ms`)
    }
    await sleep(5)
  }
}

function waitForAbort(signal?: AbortSignal): Promise<never> {
  return new Promise((_resolve, reject) => {
    if (!signal) {
      return
    }

    if (signal.aborted) {
      reject(new Error("aborted"))
      return
    }

    signal.addEventListener(
      "abort",
      () => {
        reject(new Error("aborted"))
      },
      { once: true },
    )
  })
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

  test("interrupt during TTS stops audio generation", async () => {
    const messages: ServerMessage[] = []
    const audioChunks: Float32Array[] = []
    const releaseSecondChunk = deferred<void>()

    let pipeline: VoicePipeline
    pipeline = new VoicePipeline({
      transcribe: async () => "hello",
      sendToLLM: async () => "response",
      generateSpeechStream: async function* (_text, signal) {
        yield new Float32Array([0.1])

        await Promise.race([
          releaseSecondChunk.promise,
          new Promise<void>((resolve) => {
            if (!signal) {
              return
            }

            if (signal.aborted) {
              resolve()
              return
            }

            signal.addEventListener("abort", () => resolve(), { once: true })
          }),
        ])

        if (signal?.aborted) {
          return
        }

        yield new Float32Array([0.2])
      },
      sendMessage: (_ws, msg) => {
        messages.push(msg)
      },
      sendAudio: (_ws, audio) => {
        audioChunks.push(audio as Float32Array)
        if (audioChunks.length === 1) {
          pipeline.interrupt()
        }
      },
    })

    await pipeline.handleSpeechEnd(makeAudioBuffer(), { id: "ws-1" })

    releaseSecondChunk.resolve(undefined)

    expect(audioChunks.length).toBe(1)
    expect(messages[messages.length - 1]).toEqual({ type: "listening" })
  })

  test("interrupt during LLM aborts request", async () => {
    const messages: ServerMessage[] = []
    let ttsCalled = false

    const pipeline = new VoicePipeline({
      transcribe: async () => "hello",
      sendToLLM: async (_text, signal) => waitForAbort(signal),
      generateSpeechStream: () => {
        ttsCalled = true
        return streamChunks([])
      },
      sendMessage: (_ws, msg) => {
        messages.push(msg)
      },
      sendAudio: () => {},
    })

    const task = pipeline.handleSpeechEnd(makeAudioBuffer(), { id: "ws-1" })

    await waitFor(() => pipeline.getStage() === "llm")
    pipeline.interrupt()

    const completion = await Promise.race([
      task.then(() => "done"),
      sleep(300).then(() => "timeout"),
    ])

    expect(completion).toBe("done")
    expect(ttsCalled).toBe(false)
    expect(messages[messages.length - 1]).toEqual({ type: "listening" })
  })

  test("interrupt during STT discards partial result", async () => {
    const messages: ServerMessage[] = []
    let llmCalled = false
    let ttsCalled = false

    const pipeline = new VoicePipeline({
      transcribe: async (_audio, signal) => waitForAbort(signal),
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

    const task = pipeline.handleSpeechEnd(makeAudioBuffer(), { id: "ws-1" })

    await waitFor(() => pipeline.getStage() === "stt")
    pipeline.interrupt()

    const completion = await Promise.race([
      task.then(() => "done"),
      sleep(300).then(() => "timeout"),
    ])

    expect(completion).toBe("done")
    expect(llmCalled).toBe(false)
    expect(ttsCalled).toBe(false)
    expect(messages[messages.length - 1]).toEqual({ type: "listening" })
  })

  test("pipeline transitions to listening after interrupt", async () => {
    const messages: ServerMessage[] = []

    const pipeline = new VoicePipeline({
      transcribe: async () => "hello",
      sendToLLM: async (_text, signal) => waitForAbort(signal),
      generateSpeechStream: () => streamChunks([]),
      sendMessage: (_ws, msg) => {
        messages.push(msg)
      },
      sendAudio: () => {},
    })

    const task = pipeline.handleSpeechEnd(makeAudioBuffer(), { id: "ws-1" })

    await waitFor(() => pipeline.getStage() === "llm")
    pipeline.interrupt()
    await task

    expect(messages[messages.length - 1]).toEqual({ type: "listening" })
  })

  test("rapid double-interrupt debounced", async () => {
    const pipeline = new VoicePipeline({
      transcribe: async (_audio, signal) => waitForAbort(signal),
      sendToLLM: async () => "never",
      generateSpeechStream: () => streamChunks([]),
      sendMessage: () => {},
      sendAudio: () => {},
    })

    const originalCancel = pipeline.cancel.bind(pipeline)
    let cancelCalls = 0
    pipeline.cancel = () => {
      cancelCalls += 1
      originalCancel()
    }

    const task = pipeline.handleSpeechEnd(makeAudioBuffer(), { id: "ws-1" })

    await waitFor(() => pipeline.getStage() === "stt")

    pipeline.interrupt()
    await sleep(50)
    pipeline.interrupt()

    await task

    expect(cancelCalls).toBe(1)
  })

  test("pipeline works correctly after interrupt", async () => {
    const messages: ServerMessage[] = []
    let transcribeCalls = 0
    let llmCalls = 0
    let ttsCalls = 0
    let audioCount = 0

    const pipeline = new VoicePipeline({
      transcribe: async (_audio, signal) => {
        transcribeCalls += 1
        if (transcribeCalls === 1) {
          return waitForAbort(signal)
        }

        return "second transcript"
      },
      sendToLLM: async () => {
        llmCalls += 1
        return "second response"
      },
      generateSpeechStream: () => {
        ttsCalls += 1
        return streamChunks([new Float32Array([0.2])])
      },
      sendMessage: (_ws, msg) => {
        messages.push(msg)
      },
      sendAudio: () => {
        audioCount += 1
      },
    })

    const firstRun = pipeline.handleSpeechEnd(makeAudioBuffer(), { id: "ws-1" })

    await waitFor(() => pipeline.getStage() === "stt")
    pipeline.interrupt()
    await firstRun

    await pipeline.handleSpeechEnd(makeAudioBuffer(), { id: "ws-1" })

    expect(transcribeCalls).toBe(2)
    expect(llmCalls).toBe(1)
    expect(ttsCalls).toBe(1)
    expect(audioCount).toBe(1)
    expect(messages.filter((msg) => msg.type === "listening").length).toBe(2)
    expect(messages[messages.length - 1]).toEqual({ type: "listening" })
  })

  test("getStage returns correct stage", async () => {
    const queue = new NotificationQueue()
    queue.enqueue("queued notification")

    const stt = deferred<string>()
    const llm = deferred<string>()
    const mainTts = deferred<void>()
    const notificationTts = deferred<void>()

    const pipeline = new VoicePipeline(
      {
        transcribe: async () => stt.promise,
        sendToLLM: async () => llm.promise,
        generateSpeechStream: async function* (text) {
          if (text === "assistant response") {
            await mainTts.promise
            yield new Float32Array([0.1])
            return
          }

          if (text === "queued notification") {
            await notificationTts.promise
            yield new Float32Array([0.2])
          }
        },
        sendMessage: () => {},
        sendAudio: () => {},
      },
      queue,
    )

    const task = pipeline.handleSpeechEnd(makeAudioBuffer(), { id: "ws-1" })

    await waitFor(() => pipeline.getStage() === "stt")
    stt.resolve("hello")

    await waitFor(() => pipeline.getStage() === "llm")
    llm.resolve("assistant response")

    await waitFor(() => pipeline.getStage() === "tts")
    mainTts.resolve(undefined)

    await waitFor(() => pipeline.getStage() === "speaking_notification")
    notificationTts.resolve(undefined)

    await task

    expect(pipeline.getStage()).toBe("idle")
  })
})
