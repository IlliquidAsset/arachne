import { describe, it, expect, afterEach } from "bun:test"
import {
	startVoice,
	stopVoice,
	getVoiceStatus,
	type VoiceDependencies,
	type VoiceState,
} from "../src/voice"
import type { VoiceConfig } from "../src/config/schema"
import { VoiceWebSocketServer } from "../src/voice/websocket"
import { VoicePipeline, type PipelineDependencies } from "../src/voice/pipeline"
import { LLMBridge } from "../src/voice/llm-bridge"

function createTestConfig(overrides?: Partial<VoiceConfig>): VoiceConfig {
	return {
		enabled: true,
		port: 0,
		whisper: {
			binaryPath: "/mock/whisper",
			modelPath: "/mock/model.bin",
			serverPort: 9999,
			language: "en",
			useCoreML: false,
		},
		tts: {
			engine: "kokoro" as const,
			voiceId: "af_heart",
			sampleRate: 24000,
		},
		vad: {
			silenceThreshold: 640,
		},
		maxConcurrentSessions: 1,
		...overrides,
	}
}

function createMockDeps(overrides?: Partial<VoiceDependencies>): VoiceDependencies {
	const logs: string[] = []
	let wsStarted = false
	let wsStopped = false

	const mockWsServer = {
		start: (_port: number, _maxSessions: number, _deps: unknown) => {
			wsStarted = true
		},
		stop: () => {
			wsStopped = true
		},
		getActiveSessions: () => 0,
		getSessions: () => new Map(),
		broadcast: () => {},
		sendTo: () => {},
		sendAudioTo: () => {},
	} as unknown as VoiceWebSocketServer

	return {
		log: (msg: string) => logs.push(msg),
		readFile: () => "<html><body>mock</body></html>",
		startSTT: async () => {},
		stopSTT: () => {},
		getSTTUrl: () => "http://127.0.0.1:9999",
		isSTTRunning: () => true,
		getSTTStatus: () => "running" as const,
		initTTS: async () => {},
		generateSpeechStream: function* () {},
		stopTTS: () => {},
		disposeTTS: () => {},
		getTTSStatus: () => "ready" as const,
		transcribe: async () => "hello world",
		createLLMBridge: () => new LLMBridge({ createSession: async () => "mock-session" }),
		createWebSocketServer: () => mockWsServer,
		createPipeline: (pipelineDeps: PipelineDependencies) => new VoicePipeline(pipelineDeps),
		...overrides,
		_logs: logs,
		_wsStarted: () => wsStarted,
		_wsStopped: () => wsStopped,
	} as VoiceDependencies & {
		_logs: string[]
		_wsStarted: () => boolean
		_wsStopped: () => boolean
	}
}

afterEach(async () => {
	await stopVoice({ log: () => {}, stopSTT: () => {}, stopTTS: () => {}, disposeTTS: () => {} })
})

describe("Voice module lifecycle", () => {
	it("starts with all components and reports running", async () => {
		const deps = createMockDeps()
		const state = await startVoice(createTestConfig(), deps)

		expect(state.status).toBe("running")
		expect(state.sttRunning).toBe(true)
		expect(state.ttsReady).toBe(true)
		expect(state.activeSessions).toBe(0)
	})

	it("getVoiceStatus returns current state", async () => {
		const deps = createMockDeps()
		await startVoice(createTestConfig(), deps)

		const status = getVoiceStatus()
		expect(status.status).toBe("running")
	})

	it("stopVoice resets state to stopped", async () => {
		const deps = createMockDeps()
		await startVoice(createTestConfig(), deps)
		await stopVoice(deps)

		const status = getVoiceStatus()
		expect(status.status).toBe("stopped")
		expect(status.sttRunning).toBe(false)
		expect(status.ttsReady).toBe(false)
		expect(status.port).toBeNull()
	})

	it("returns immediately if already running", async () => {
		const deps = createMockDeps()
		await startVoice(createTestConfig(), deps)

		const secondState = await startVoice(createTestConfig(), deps)
		expect(secondState.status).toBe("running")
	})
})

describe("Voice module partial failure tolerance", () => {
	it("continues when STT fails to start", async () => {
		const deps = createMockDeps({
			startSTT: async () => {
				throw new Error("whisper binary not found")
			},
		})
		const state = await startVoice(createTestConfig(), deps)

		expect(state.status).toBe("running")
		expect(state.sttRunning).toBe(false)
		expect(state.ttsReady).toBe(true)
	})

	it("continues when TTS fails to initialize", async () => {
		const deps = createMockDeps({
			initTTS: async () => {
				throw new Error("kokoro model not found")
			},
		})
		const state = await startVoice(createTestConfig(), deps)

		expect(state.status).toBe("running")
		expect(state.sttRunning).toBe(true)
		expect(state.ttsReady).toBe(false)
	})

	it("runs even when both STT and TTS fail", async () => {
		const deps = createMockDeps({
			startSTT: async () => {
				throw new Error("stt fail")
			},
			initTTS: async () => {
				throw new Error("tts fail")
			},
		})
		const state = await startVoice(createTestConfig(), deps)

		expect(state.status).toBe("running")
		expect(state.sttRunning).toBe(false)
		expect(state.ttsReady).toBe(false)
	})
})

describe("Voice module stop resilience", () => {
	it("stopVoice is safe to call when not running", async () => {
		await stopVoice({ log: () => {}, stopSTT: () => {}, stopTTS: () => {}, disposeTTS: () => {} })
		const status = getVoiceStatus()
		expect(status.status).toBe("stopped")
	})

	it("handles STT stop errors gracefully", async () => {
		const deps = createMockDeps()
		await startVoice(createTestConfig(), deps)

		const stopDeps = createMockDeps({
			stopSTT: () => {
				throw new Error("kill failed")
			},
		})
		await stopVoice(stopDeps)
		expect(getVoiceStatus().status).toBe("stopped")
	})

	it("handles TTS stop errors gracefully", async () => {
		const deps = createMockDeps()
		await startVoice(createTestConfig(), deps)

		const stopDeps = createMockDeps({
			stopTTS: () => {
				throw new Error("tts cleanup failed")
			},
		})
		await stopVoice(stopDeps)
		expect(getVoiceStatus().status).toBe("stopped")
	})
})

describe("Voice config integration", () => {
	it("respects custom port in config", async () => {
		const deps = createMockDeps()
		const state = await startVoice(createTestConfig({ port: 9090 }), deps)
		expect(state.port).toBe(9090)
	})

	it("passes whisper config to STT", async () => {
		let receivedConfig: unknown = null
		const deps = createMockDeps({
			startSTT: async (config: unknown) => {
				receivedConfig = config
			},
		})

		await startVoice(
			createTestConfig({
				whisper: {
					binaryPath: "/custom/whisper",
					modelPath: "/custom/model.bin",
					serverPort: 8888,
					language: "es",
					useCoreML: true,
				},
			}),
			deps,
		)

		const sttConfig = receivedConfig as Record<string, unknown>
		expect(sttConfig.binaryPath).toBe("/custom/whisper")
		expect(sttConfig.modelPath).toBe("/custom/model.bin")
		expect(sttConfig.serverPort).toBe(8888)
		expect(sttConfig.language).toBe("es")
		expect(sttConfig.useCoreML).toBe(true)
	})

	it("passes TTS config to init", async () => {
		let receivedConfig: unknown = null
		const deps = createMockDeps({
			initTTS: async (config: unknown) => {
				receivedConfig = config
			},
		})

		await startVoice(
			createTestConfig({
				tts: { engine: "kokoro", voiceId: "af_bella", sampleRate: 48000 },
			}),
			deps,
		)

		const ttsConfig = receivedConfig as Record<string, unknown>
		expect(ttsConfig.voiceId).toBe("af_bella")
		expect(ttsConfig.sampleRate).toBe(48000)
	})
})

describe("Voice pipeline wiring", () => {
	it("pipeline is created with correct dependencies", async () => {
		let pipelineDepsReceived: PipelineDependencies | null = null

		const deps = createMockDeps({
			createPipeline: (pDeps: PipelineDependencies) => {
				pipelineDepsReceived = pDeps
				return new VoicePipeline(pDeps)
			},
		})

		await startVoice(createTestConfig(), deps)

		expect(pipelineDepsReceived).not.toBeNull()
		expect(typeof pipelineDepsReceived!.transcribe).toBe("function")
		expect(typeof pipelineDepsReceived!.sendToLLM).toBe("function")
		expect(typeof pipelineDepsReceived!.generateSpeechStream).toBe("function")
		expect(typeof pipelineDepsReceived!.sendMessage).toBe("function")
		expect(typeof pipelineDepsReceived!.sendAudio).toBe("function")
	})

	it("pipeline transcribe delegates to STT", async () => {
		let pipelineDepsReceived: PipelineDependencies | null = null
		let transcribeCalled = false

		const deps = createMockDeps({
			transcribe: async () => {
				transcribeCalled = true
				return "hello world"
			},
			createPipeline: (pDeps: PipelineDependencies) => {
				pipelineDepsReceived = pDeps
				return new VoicePipeline(pDeps)
			},
		})

		await startVoice(createTestConfig(), deps)
		const result = await pipelineDepsReceived!.transcribe(Buffer.from("audio"), undefined)

		expect(transcribeCalled).toBe(true)
		expect(result).toBe("hello world")
	})
})

describe("Session limit enforcement", () => {
	it("maxConcurrentSessions is passed to WebSocket server", async () => {
		let receivedMaxSessions: number | null = null

		const mockWsServer = {
			start: (_port: number, maxSessions: number) => {
				receivedMaxSessions = maxSessions
			},
			stop: () => {},
			getActiveSessions: () => 0,
		} as unknown as VoiceWebSocketServer

		const deps = createMockDeps({
			createWebSocketServer: () => mockWsServer,
		})

		await startVoice(createTestConfig({ maxConcurrentSessions: 3 }), deps)
		expect(receivedMaxSessions).toBe(3)
	})
})
