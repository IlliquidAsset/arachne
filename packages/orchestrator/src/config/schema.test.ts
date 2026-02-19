import { describe, test, expect } from "bun:test"
import { ArachneConfigSchema } from "./schema"

describe("ArachneConfigSchema", () => {
  test("applies all defaults when given empty object", () => {
    const config = ArachneConfigSchema.parse({})

    expect(config.discovery.paths).toEqual([])
    expect(config.discovery.ignore).toEqual([
      "node_modules",
      ".git",
      "dist",
      ".next",
      ".cache",
    ])
    expect(config.servers.portRange).toEqual([4100, 4200])
    expect(config.servers.autoStart).toBe(true)
    expect(config.auth.apiKey).toBe("")
    expect(config.auth.enabled).toBe(true)
    expect(config.dispatch.maxConcurrent).toBe(3)
    expect(config.dispatch.timeout).toBe(300000)
  })

  test("accepts valid custom config", () => {
    const config = ArachneConfigSchema.parse({
      discovery: { paths: ["/projects"], ignore: ["node_modules"] },
      servers: { portRange: [5000, 5100], autoStart: false },
      auth: { apiKey: "test-key", enabled: false },
      dispatch: { maxConcurrent: 5, timeout: 60000 },
    })

    expect(config.discovery.paths).toEqual(["/projects"])
    expect(config.discovery.ignore).toEqual(["node_modules"])
    expect(config.servers.portRange).toEqual([5000, 5100])
    expect(config.servers.autoStart).toBe(false)
    expect(config.auth.apiKey).toBe("test-key")
    expect(config.auth.enabled).toBe(false)
    expect(config.dispatch.maxConcurrent).toBe(5)
    expect(config.dispatch.timeout).toBe(60000)
  })

  test("rejects invalid types", () => {
    expect(() =>
      ArachneConfigSchema.parse({ dispatch: { maxConcurrent: "not-a-number" } }),
    ).toThrow()
  })

  test("rejects invalid port range tuple", () => {
    expect(() =>
      ArachneConfigSchema.parse({ servers: { portRange: [4100] } }),
    ).toThrow()
  })

  test("rejects invalid enum-like values in nested fields", () => {
    expect(() =>
      ArachneConfigSchema.parse({ auth: { enabled: "yes" } }),
    ).toThrow()
  })

  test("merges partial config with defaults", () => {
    const config = ArachneConfigSchema.parse({
      dispatch: { maxConcurrent: 10 },
    })

    expect(config.dispatch.maxConcurrent).toBe(10)
    expect(config.dispatch.timeout).toBe(300000)
    expect(config.discovery.paths).toEqual([])
    expect(config.servers.autoStart).toBe(true)
  })

  test("merges partial nested section with defaults", () => {
    const config = ArachneConfigSchema.parse({
      servers: { autoStart: false },
    })

    expect(config.servers.autoStart).toBe(false)
    expect(config.servers.portRange).toEqual([4100, 4200])
  })

  test("applies voice defaults when no voice section provided", () => {
    const config = ArachneConfigSchema.parse({})

    expect(config.voice.enabled).toBe(false)
    expect(config.voice.port).toBe(8090)
    expect(config.voice.whisper.binaryPath).toBe("whisper-server")
    expect(config.voice.whisper.modelPath).toBe("~/.config/arachne/models/ggml-large-v3-turbo.bin")
    expect(config.voice.whisper.serverPort).toBe(9000)
    expect(config.voice.whisper.language).toBe("en")
    expect(config.voice.whisper.useCoreML).toBe(true)
    expect(config.voice.tts.engine).toBe("kokoro")
    expect(config.voice.tts.voiceId).toBe("af_heart")
    expect(config.voice.tts.sampleRate).toBe(24000)
    expect(config.voice.vad.silenceThreshold).toBe(640)
    expect(config.voice.maxConcurrentSessions).toBe(1)
  })

  test("accepts valid custom voice config", () => {
    const config = ArachneConfigSchema.parse({
      voice: {
        enabled: true,
        port: 8091,
        whisper: {
          binaryPath: "/custom/whisper",
          modelPath: "/custom/model.bin",
          serverPort: 9001,
          language: "es",
          useCoreML: false,
        },
        tts: {
          engine: "kokoro",
          voiceId: "af_bella",
          sampleRate: 48000,
        },
        vad: {
          silenceThreshold: 500,
        },
        maxConcurrentSessions: 5,
      },
    })

    expect(config.voice.enabled).toBe(true)
    expect(config.voice.port).toBe(8091)
    expect(config.voice.whisper.binaryPath).toBe("/custom/whisper")
    expect(config.voice.whisper.modelPath).toBe("/custom/model.bin")
    expect(config.voice.whisper.serverPort).toBe(9001)
    expect(config.voice.whisper.language).toBe("es")
    expect(config.voice.whisper.useCoreML).toBe(false)
    expect(config.voice.tts.engine).toBe("kokoro")
    expect(config.voice.tts.voiceId).toBe("af_bella")
    expect(config.voice.tts.sampleRate).toBe(48000)
    expect(config.voice.vad.silenceThreshold).toBe(500)
    expect(config.voice.maxConcurrentSessions).toBe(5)
  })

  test("rejects invalid voice port (negative)", () => {
    expect(() =>
      ArachneConfigSchema.parse({ voice: { port: -1 } }),
    ).toThrow()
  })

  test("rejects invalid voice port (exceeds max)", () => {
    expect(() =>
      ArachneConfigSchema.parse({ voice: { port: 65536 } }),
    ).toThrow()
  })

  test("rejects invalid whisper server port", () => {
    expect(() =>
      ArachneConfigSchema.parse({ voice: { whisper: { serverPort: 0 } } }),
    ).toThrow()
  })

  test("rejects invalid tts engine", () => {
    expect(() =>
      ArachneConfigSchema.parse({ voice: { tts: { engine: "invalid-engine" } } }),
    ).toThrow()
  })

  test("rejects invalid maxConcurrentSessions (zero)", () => {
    expect(() =>
      ArachneConfigSchema.parse({ voice: { maxConcurrentSessions: 0 } }),
    ).toThrow()
  })

  test("merges partial voice config with defaults", () => {
    const config = ArachneConfigSchema.parse({
      voice: { enabled: true, port: 8095 },
    })

    expect(config.voice.enabled).toBe(true)
    expect(config.voice.port).toBe(8095)
    expect(config.voice.whisper.binaryPath).toBe("whisper-server")
    expect(config.voice.tts.engine).toBe("kokoro")
    expect(config.voice.maxConcurrentSessions).toBe(1)
  })

  test("maintains backward compatibility with existing config (no voice section)", () => {
    const config = ArachneConfigSchema.parse({
      discovery: { paths: ["/projects"] },
      servers: { portRange: [5000, 5100] },
      auth: { apiKey: "test-key" },
      dispatch: { maxConcurrent: 5 },
    })

    expect(config.discovery.paths).toEqual(["/projects"])
    expect(config.servers.portRange).toEqual([5000, 5100])
    expect(config.auth.apiKey).toBe("test-key")
    expect(config.dispatch.maxConcurrent).toBe(5)
    expect(config.voice.enabled).toBe(false)
    expect(config.voice.port).toBe(8090)
  })
})
