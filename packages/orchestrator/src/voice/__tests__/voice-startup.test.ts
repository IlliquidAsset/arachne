import { describe, expect, test, afterEach } from "bun:test"
import { startVoice, stopVoice, getVoiceStatus, type VoiceDependencies } from "../index"
import { VoiceWebSocketServer } from "../websocket"
import { VoicePipeline, type PipelineDependencies } from "../pipeline"
import { LLMBridge } from "../llm-bridge"
import type { VoiceConfig } from "../../config/schema"
import type { ServerMessage } from "../protocol"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

function makeConfig(overrides: Partial<VoiceConfig> = {}): VoiceConfig {
	return {
		enabled: true,
		port: 18090 + Math.floor(Math.random() * 1000),
		whisper: {
			binaryPath: "/fake/whisper",
			modelPath: "/fake/model.bin",
			serverPort: 19000 + Math.floor(Math.random() * 1000),
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

function noop() {}

/** Mock WS server that records broadcasts and sendTo calls */
function makeMockWsServer() {
	const broadcasts: ServerMessage[] = []
	const sentTo: Array<{ ws: unknown; msg: ServerMessage }> = []
	let startCalled = false
	let stopCalled = false
	let activeSessions = 0
	let capturedDeps: Record<string, Function> = {}

	const server = {
		start(_port: number, _max: number, deps: Record<string, Function>) {
			startCalled = true
			capturedDeps = deps
		},
		stop() {
			stopCalled = true
		},
		getActiveSessions() {
			return activeSessions
		},
		broadcast(msg: ServerMessage) {
			broadcasts.push(msg)
		},
		sendTo(ws: unknown, msg: ServerMessage) {
			sentTo.push({ ws, msg })
		},
	}

	return {
		server: server as unknown as VoiceWebSocketServer,
		broadcasts,
		sentTo,
		get startCalled() { return startCalled },
		get stopCalled() { return stopCalled },
		get capturedDeps() { return capturedDeps },
		setActiveSessions(n: number) { activeSessions = n },
	}
}

function makeMockPipeline() {
	let handleSpeechEndCalled = false
	let interruptCalled = false

	const pipeline = {
		handleSpeechEnd() { handleSpeechEndCalled = true },
		interrupt() { interruptCalled = true },
	}

	return {
		pipeline: pipeline as unknown as VoicePipeline,
		get handleSpeechEndCalled() { return handleSpeechEndCalled },
		get interruptCalled() { return interruptCalled },
	}
}

function baseDeps(overrides: Partial<VoiceDependencies> = {}): VoiceDependencies {
	const mockWs = makeMockWsServer()
	const mockPipeline = makeMockPipeline()

	return {
		log: noop,
		readFile: () => "<html>test</html>",
		startSTT: async () => {},
		stopSTT: () => {},
		getSTTUrl: () => "http://localhost:9000",
		isSTTRunning: () => true,
		getSTTStatus: () => "running" as const,
		initTTS: async () => {},
		generateSpeechStream: async function* () { yield new Float32Array(0) },
		stopTTS: () => {},
		disposeTTS: () => {},
		getTTSStatus: () => "ready" as const,
		transcribe: async () => "hello",
		createLLMBridge: () => new LLMBridge(),
		createWebSocketServer: () => mockWs.server,
		createPipeline: () => mockPipeline.pipeline,
		...overrides,
	}
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

afterEach(async () => {
	await stopVoice({ log: noop, stopSTT: noop, stopTTS: noop, disposeTTS: noop })
})

describe("voice startup restructuring", () => {
	test("startVoice returns status='starting' immediately", async () => {
		const state = await startVoice(makeConfig(), baseDeps({
			startSTT: () => sleep(200),
			initTTS: () => sleep(200),
		}))

		expect(state.status).toBe("starting")
		expect(state.sttRunning).toBe(false)
		expect(state.ttsReady).toBe(false)
	})

	test("WS server starts before models are loaded", async () => {
		const mockWs = makeMockWsServer()
		let sttStarted = false

		await startVoice(makeConfig(), baseDeps({
			startSTT: async () => {
				await sleep(500)
				sttStarted = true
			},
			initTTS: async () => { await sleep(500) },
			createWebSocketServer: () => mockWs.server,
		}))

		// WS should be started immediately
		expect(mockWs.startCalled).toBe(true)
		// STT should NOT be done yet
		expect(sttStarted).toBe(false)
	})

	test("STT and TTS load in parallel (not sequentially)", async () => {
		const start = Date.now()

		const deps = baseDeps({
			startSTT: async () => { await sleep(100) },
			initTTS: async () => { await sleep(100) },
		})

		await startVoice(makeConfig(), deps)

		// Wait for both to complete
		await sleep(150)
		const elapsed = Date.now() - start

		const status = getVoiceStatus()
		expect(status.sttRunning).toBe(true)
		expect(status.ttsReady).toBe(true)
		// If sequential it would be ~200ms+; parallel should be <180ms
		expect(elapsed).toBeLessThan(250)
	})

	test("broadcasts 'ready' when both models load successfully", async () => {
		const mockWs = makeMockWsServer()

		await startVoice(makeConfig(), baseDeps({
			startSTT: async () => { await sleep(30) },
			initTTS: async () => { await sleep(30) },
			createWebSocketServer: () => mockWs.server,
		}))

		await sleep(100)

		expect(mockWs.broadcasts).toContainEqual({ type: "ready" })
		expect(getVoiceStatus().status).toBe("running")
	})

	test("broadcasts 'ready' on partial success (one model fails)", async () => {
		const mockWs = makeMockWsServer()

		await startVoice(makeConfig(), baseDeps({
			startSTT: async () => { throw new Error("STT crash") },
			initTTS: async () => { await sleep(30) },
			createWebSocketServer: () => mockWs.server,
		}))

		await sleep(100)

		expect(mockWs.broadcasts).toContainEqual({ type: "ready" })
		expect(getVoiceStatus().status).toBe("running")
		expect(getVoiceStatus().sttRunning).toBe(false)
		expect(getVoiceStatus().ttsReady).toBe(true)
	})

	test("broadcasts 'error' when both models fail", async () => {
		const mockWs = makeMockWsServer()

		await startVoice(makeConfig(), baseDeps({
			startSTT: async () => { throw new Error("STT crash") },
			initTTS: async () => { throw new Error("TTS crash") },
			createWebSocketServer: () => mockWs.server,
		}))

		await sleep(100)

		expect(mockWs.broadcasts.some(m => m.type === "error")).toBe(true)
		expect(getVoiceStatus().status).toBe("error")
	})

	test("double-start guard blocks when status is 'starting'", async () => {
		const logs: string[] = []

		const deps = baseDeps({
			log: (msg: string) => logs.push(msg),
			startSTT: async () => { await sleep(500) },
			initTTS: async () => { await sleep(500) },
		})

		await startVoice(makeConfig(), deps)
		// Try to start again while still loading
		await startVoice(makeConfig(), deps)

		expect(logs.filter(m => m.includes("already running")).length).toBe(1)
	})
})

describe("readiness guard", () => {
	test("sends warming_up when audio arrives before STT ready", async () => {
		const mockWs = makeMockWsServer()
		const mockPipeline = makeMockPipeline()

		await startVoice(makeConfig(), baseDeps({
			startSTT: async () => { await sleep(500) },
			initTTS: async () => { await sleep(500) },
			createWebSocketServer: () => mockWs.server,
			createPipeline: () => mockPipeline.pipeline,
		}))

		// Simulate audio arriving during warmup
		const fakeWs = {} as any
		mockWs.capturedDeps.onAudioReceived(fakeWs, Buffer.from([1, 2, 3]))

		expect(mockWs.sentTo.length).toBe(1)
		expect(mockWs.sentTo[0].msg).toEqual({ type: "warming_up" })
		expect(mockPipeline.handleSpeechEndCalled).toBe(false)
	})

	test("passes audio to pipeline when models are ready", async () => {
		const mockWs = makeMockWsServer()
		const mockPipeline = makeMockPipeline()

		await startVoice(makeConfig(), baseDeps({
			startSTT: async () => { await sleep(10) },
			initTTS: async () => { await sleep(10) },
			createWebSocketServer: () => mockWs.server,
			createPipeline: () => mockPipeline.pipeline,
		}))

		// Wait for models to load
		await sleep(80)

		const fakeWs = {} as any
		mockWs.capturedDeps.onAudioReceived(fakeWs, Buffer.from([1, 2, 3]))

		// Should NOT send warming_up
		const warmingMsgs = mockWs.sentTo.filter(s => (s.msg as any).type === "warming_up")
		expect(warmingMsgs.length).toBe(0)
		expect(mockPipeline.handleSpeechEndCalled).toBe(true)
	})
})

describe("warming_up on connect", () => {
	test("sends warming_up to newly connecting client during warmup", async () => {
		const mockWs = makeMockWsServer()

		await startVoice(makeConfig(), baseDeps({
			startSTT: async () => { await sleep(500) },
			initTTS: async () => { await sleep(500) },
			createWebSocketServer: () => mockWs.server,
		}))

		// Simulate client connecting during warmup
		const fakeWs = {} as any
		mockWs.capturedDeps.onConnect(fakeWs)

		expect(mockWs.sentTo.length).toBe(1)
		expect(mockWs.sentTo[0].msg).toEqual({ type: "warming_up" })
	})

	test("does NOT send warming_up on connect when models are ready", async () => {
		const mockWs = makeMockWsServer()

		await startVoice(makeConfig(), baseDeps({
			startSTT: async () => { await sleep(10) },
			initTTS: async () => { await sleep(10) },
			createWebSocketServer: () => mockWs.server,
		}))

		// Wait for models to load
		await sleep(80)

		const fakeWs = {} as any
		mockWs.capturedDeps.onConnect(fakeWs)

		const warmingMsgs = mockWs.sentTo.filter(s => (s.msg as any).type === "warming_up")
		expect(warmingMsgs.length).toBe(0)
	})
})

describe("generation counter (stop during warmup)", () => {
	test("stopVoice during warmup prevents stale callbacks from updating state", async () => {
		await startVoice(makeConfig(), baseDeps({
			startSTT: async () => { await sleep(300) },
			initTTS: async () => { await sleep(300) },
		}))

		expect(getVoiceStatus().status).toBe("starting")

		// Stop after 50ms — before models finish
		await sleep(50)
		await stopVoice({ log: noop, stopSTT: noop, stopTTS: noop, disposeTTS: noop })

		expect(getVoiceStatus().status).toBe("stopped")

		// Wait for the background loading to have completed (would have at ~300ms)
		await sleep(400)

		// State should STILL be "stopped" — generation counter prevented stale update
		expect(getVoiceStatus().status).toBe("stopped")
		expect(getVoiceStatus().sttRunning).toBe(false)
		expect(getVoiceStatus().ttsReady).toBe(false)
	})

	test("start-stop-start sequence works correctly", async () => {
		const mockWs1 = makeMockWsServer()
		const mockWs2 = makeMockWsServer()
		let wsCallCount = 0

		const deps = baseDeps({
			startSTT: async () => { await sleep(100) },
			initTTS: async () => { await sleep(100) },
			createWebSocketServer: () => {
				wsCallCount++
				return wsCallCount === 1 ? mockWs1.server : mockWs2.server
			},
		})

		// First start
		await startVoice(makeConfig(), deps)

		// Stop immediately
		await stopVoice({ log: noop, stopSTT: noop, stopTTS: noop, disposeTTS: noop })
		expect(getVoiceStatus().status).toBe("stopped")

		// Second start
		await startVoice(makeConfig(), deps)

		// Wait for second start's models to load
		await sleep(200)

		expect(getVoiceStatus().status).toBe("running")
		// Second WS server should get the ready broadcast
		expect(mockWs2.broadcasts).toContainEqual({ type: "ready" })
	})
})
