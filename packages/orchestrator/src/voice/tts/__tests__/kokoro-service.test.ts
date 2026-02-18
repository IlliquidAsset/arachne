import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { KokoroService, type TTSDependencies } from "../kokoro-service"
import type { TTSConfig } from "../types"

function makeConfig(overrides: Partial<TTSConfig> = {}): TTSConfig {
  return {
    engine: "kokoro",
    voiceId: "af_heart",
    sampleRate: 24000,
    ...overrides,
  }
}

function makeFakeTTS(audioLength = 4800) {
  const audio = new Float32Array(audioLength)
  for (let i = 0; i < audioLength; i++) {
    audio[i] = Math.sin(i * 0.1)
  }

  return {
    generate: async (_text: string, _options?: { voice?: string }) => ({
      audio,
      sampling_rate: 24000,
    }),
  }
}

function makeDependencies(
  overrides: Partial<TTSDependencies> = {},
): TTSDependencies {
  return {
    createTTS: async (_modelId: string, _options: { dtype: string }) =>
      makeFakeTTS(),
    ...overrides,
  }
}

describe("KokoroService", () => {
  let service: KokoroService

  beforeEach(() => {
    service = new KokoroService()
  })

  afterEach(() => {
    service.dispose()
  })

  describe("init()", () => {
    test("loads model and transitions to ready status", async () => {
      const deps = makeDependencies()
      service = new KokoroService(deps)

      expect(service.getStatus()).toBe("uninitialized")

      await service.init(makeConfig())

      expect(service.getStatus()).toBe("ready")
    })

    test("calls createTTS with correct model ID and options", async () => {
      let capturedModelId = ""
      let capturedOptions: { dtype: string } = { dtype: "" }

      const deps = makeDependencies({
        createTTS: async (modelId, options) => {
          capturedModelId = modelId
          capturedOptions = options
          return makeFakeTTS()
        },
      })

      service = new KokoroService(deps)
      await service.init(makeConfig())

      expect(capturedModelId).toBe("onnx-community/Kokoro-82M-v1.0-ONNX")
      expect(capturedOptions.dtype).toBe("fp32")
    })

    test("transitions to error if model load fails", async () => {
      const deps = makeDependencies({
        createTTS: async () => {
          throw new Error("Model download failed")
        },
      })

      service = new KokoroService(deps)

      await expect(service.init(makeConfig())).rejects.toThrow(
        "Model download failed",
      )
      expect(service.getStatus()).toBe("error")
    })

    test("transitions through loading status during init", async () => {
      const statuses: string[] = []

      const deps = makeDependencies({
        createTTS: async (modelId, options) => {
          statuses.push(service.getStatus())
          return makeFakeTTS()
        },
      })

      service = new KokoroService(deps)
      await service.init(makeConfig())

      expect(statuses).toContain("loading")
    })
  })

  describe("generate()", () => {
    test("returns Float32Array audio buffer", async () => {
      const deps = makeDependencies()
      service = new KokoroService(deps)
      await service.init(makeConfig())

      const result = await service.generate("Hello world")

      expect(result.audio).toBeInstanceOf(Float32Array)
      expect(result.audio.length).toBeGreaterThan(0)
      expect(result.sampleRate).toBe(24000)
      expect(result.durationMs).toBeGreaterThan(0)
    })

    test("computes correct durationMs from audio length and sample rate", async () => {
      const audioLength = 24000 // exactly 1 second at 24kHz
      const deps = makeDependencies({
        createTTS: async () => makeFakeTTS(audioLength),
      })

      service = new KokoroService(deps)
      await service.init(makeConfig())

      const result = await service.generate("Test")

      expect(result.durationMs).toBe(1000)
    })

    test("rejects if model not initialized", async () => {
      await expect(service.generate("Hello")).rejects.toThrow()
    })

    test("passes voice ID from config to TTS generate", async () => {
      let capturedVoice = ""

      const fakeTTS = {
        generate: async (_text: string, options?: { voice?: string }) => {
          capturedVoice = options?.voice ?? ""
          return { audio: new Float32Array(100), sampling_rate: 24000 }
        },
      }

      const deps = makeDependencies({
        createTTS: async () => fakeTTS,
      })

      service = new KokoroService(deps)
      await service.init(makeConfig({ voiceId: "bf_emma" }))
      await service.generate("Test")

      expect(capturedVoice).toBe("bf_emma")
    })

    test("sets status to generating during generation", async () => {
      let statusDuringGeneration = ""

      const fakeTTS = {
        generate: async (_text: string, _options?: { voice?: string }) => {
          statusDuringGeneration = service.getStatus()
          return { audio: new Float32Array(100), sampling_rate: 24000 }
        },
      }

      const deps = makeDependencies({
        createTTS: async () => fakeTTS,
      })

      service = new KokoroService(deps)
      await service.init(makeConfig())
      await service.generate("Test")

      expect(statusDuringGeneration).toBe("generating")
    })

    test("resets status to ready after generation", async () => {
      const deps = makeDependencies()
      service = new KokoroService(deps)
      await service.init(makeConfig())

      await service.generate("Test")

      expect(service.getStatus()).toBe("ready")
    })

    test("resets status to ready even if generation throws", async () => {
      const fakeTTS = {
        generate: async () => {
          throw new Error("Generation failed")
        },
      }

      const deps = makeDependencies({
        createTTS: async () => fakeTTS,
      })

      service = new KokoroService(deps)
      await service.init(makeConfig())

      await expect(service.generate("Test")).rejects.toThrow(
        "Generation failed",
      )
      expect(service.getStatus()).toBe("ready")
    })
  })

  describe("generateStream()", () => {
    test("yields multiple chunks for multi-sentence text", async () => {
      const deps = makeDependencies()
      service = new KokoroService(deps)
      await service.init(makeConfig())

      const chunks: Float32Array[] = []
      for await (const chunk of service.generateStream(
        "Hello world. How are you? I am fine.",
      )) {
        chunks.push(chunk)
      }

      expect(chunks.length).toBeGreaterThanOrEqual(3)
    })

    test("yields at least 1 chunk per sentence", async () => {
      const deps = makeDependencies()
      service = new KokoroService(deps)
      await service.init(makeConfig())

      const chunks: Float32Array[] = []
      for await (const chunk of service.generateStream(
        "First sentence. Second sentence.",
      )) {
        chunks.push(chunk)
      }

      expect(chunks.length).toBeGreaterThanOrEqual(2)
    })

    test("each chunk is a Float32Array", async () => {
      const deps = makeDependencies()
      service = new KokoroService(deps)
      await service.init(makeConfig())

      for await (const chunk of service.generateStream("Hello. World.")) {
        expect(chunk).toBeInstanceOf(Float32Array)
        expect(chunk.length).toBeGreaterThan(0)
      }
    })

    test("rejects if model not initialized", async () => {
      const generator = service.generateStream("Hello")

      await expect(generator.next()).rejects.toThrow()
    })

    test("sets status to generating during streaming", async () => {
      let statusDuringStream = ""

      const fakeTTS = {
        generate: async (_text: string, _options?: { voice?: string }) => {
          statusDuringStream = service.getStatus()
          return { audio: new Float32Array(100), sampling_rate: 24000 }
        },
      }

      const deps = makeDependencies({
        createTTS: async () => fakeTTS,
      })

      service = new KokoroService(deps)
      await service.init(makeConfig())

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _chunk of service.generateStream("Hello. World.")) {
        // consume
      }

      expect(statusDuringStream).toBe("generating")
    })

    test("resets status to ready after streaming completes", async () => {
      const deps = makeDependencies()
      service = new KokoroService(deps)
      await service.init(makeConfig())

      for await (const _chunk of service.generateStream("Hello. World.")) {
        // consume
      }

      expect(service.getStatus()).toBe("ready")
    })
  })

  describe("stop()", () => {
    test("cancels in-progress generateStream", async () => {
      let generateCallCount = 0

      const fakeTTS = {
        generate: async (_text: string, _options?: { voice?: string }) => {
          generateCallCount++
          // Simulate slow generation
          await new Promise((resolve) => setTimeout(resolve, 10))
          return { audio: new Float32Array(100), sampling_rate: 24000 }
        },
      }

      const deps = makeDependencies({
        createTTS: async () => fakeTTS,
      })

      service = new KokoroService(deps)
      await service.init(makeConfig())

      const chunks: Float32Array[] = []
      const text =
        "First sentence. Second sentence. Third sentence. Fourth sentence. Fifth sentence."

      // Start streaming, then stop after first chunk
      const generator = service.generateStream(text)
      const first = await generator.next()
      chunks.push(first.value!)

      // Stop should cause the generator to finish early
      service.stop()

      // Consume remaining — should be empty or have at most 1 more
      for await (const chunk of generator) {
        chunks.push(chunk)
      }

      // Should have fewer chunks than sentences (5 sentences)
      expect(chunks.length).toBeLessThan(5)
    })

    test("is safe to call when not generating (no-op)", () => {
      // Should not throw
      expect(() => service.stop()).not.toThrow()
    })

    test("is safe to call when initialized but idle", async () => {
      const deps = makeDependencies()
      service = new KokoroService(deps)
      await service.init(makeConfig())

      expect(() => service.stop()).not.toThrow()
      expect(service.getStatus()).toBe("ready")
    })
  })

  describe("dispose()", () => {
    test("sets status to uninitialized", async () => {
      const deps = makeDependencies()
      service = new KokoroService(deps)
      await service.init(makeConfig())

      expect(service.getStatus()).toBe("ready")

      service.dispose()

      expect(service.getStatus()).toBe("uninitialized")
    })

    test("generate() rejects after dispose", async () => {
      const deps = makeDependencies()
      service = new KokoroService(deps)
      await service.init(makeConfig())

      service.dispose()

      await expect(service.generate("Hello")).rejects.toThrow()
    })

    test("is safe to call multiple times", async () => {
      const deps = makeDependencies()
      service = new KokoroService(deps)
      await service.init(makeConfig())

      service.dispose()
      expect(() => service.dispose()).not.toThrow()
      expect(service.getStatus()).toBe("uninitialized")
    })
  })

  describe("getStatus()", () => {
    test("returns uninitialized before init", () => {
      expect(service.getStatus()).toBe("uninitialized")
    })

    test("returns ready after successful init", async () => {
      const deps = makeDependencies()
      service = new KokoroService(deps)
      await service.init(makeConfig())

      expect(service.getStatus()).toBe("ready")
    })
  })
})
