import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { VoiceConfig } from "../config/schema"
import { VoiceWebSocketServer, type WebSocketDependencies, type SessionData } from "./websocket"
import { startSTT, stopSTT, getSTTUrl, isSTTRunning, getSTTStatus, transcribe } from "./stt"
import { initTTS, generateSpeechStream, stopTTS, disposeTTS, getTTSStatus } from "./tts"
import { VoicePipeline, type PipelineDependencies } from "./pipeline"
import { LLMBridge } from "./llm-bridge"
import { serializeServerMessage } from "./protocol"
import type { ServerWebSocket } from "bun"

export type VoiceStatus = "stopped" | "starting" | "running" | "error"

export interface VoiceState {
	status: VoiceStatus
	port: number | null
	sttRunning: boolean
	ttsReady: boolean
	activeSessions: number
	error?: string
}

export interface VoiceDependencies {
	log?: (message: string) => void
	readFile?: (path: string) => string
	startSTT?: typeof startSTT
	stopSTT?: typeof stopSTT
	getSTTUrl?: typeof getSTTUrl
	isSTTRunning?: typeof isSTTRunning
	getSTTStatus?: typeof getSTTStatus
	initTTS?: typeof initTTS
	generateSpeechStream?: typeof generateSpeechStream
	stopTTS?: typeof stopTTS
	disposeTTS?: typeof disposeTTS
	getTTSStatus?: typeof getTTSStatus
	transcribe?: typeof transcribe
	createLLMBridge?: () => LLMBridge
	createWebSocketServer?: () => VoiceWebSocketServer
	createPipeline?: (deps: PipelineDependencies) => VoicePipeline
}

let currentState: VoiceState = {
	status: "stopped",
	port: null,
	sttRunning: false,
	ttsReady: false,
	activeSessions: 0,
}

let wsServer: VoiceWebSocketServer | null = null
let pipeline: VoicePipeline | null = null
let llmBridge: LLMBridge | null = null

function defaultLog(message: string): void {
	console.log(`[arachne:voice] ${message}`)
}

function loadClientHtml(readFile: (path: string) => string): string {
	try {
		const clientPath = join(import.meta.dirname ?? __dirname, "client", "index.html")
		return readFile(clientPath)
	} catch {
		return "<html><body><h1>Arachne Voice</h1><p>Client not found.</p></body></html>"
	}
}

function defaultReadFile(path: string): string {
	return readFileSync(path, "utf-8")
}

export async function startVoice(
	config: VoiceConfig,
	deps: VoiceDependencies = {},
): Promise<VoiceState> {
	const log = deps.log ?? defaultLog
	const readFile = deps.readFile ?? defaultReadFile

	if (currentState.status === "running") {
		log("Voice already running")
		return currentState
	}

	currentState = {
		status: "starting",
		port: config.port,
		sttRunning: false,
		ttsReady: false,
		activeSessions: 0,
	}

	log(`Starting voice module on port ${config.port}`)

	const doStartSTT = deps.startSTT ?? startSTT
	const doGetSTTUrl = deps.getSTTUrl ?? getSTTUrl
	const doTranscribe = deps.transcribe ?? transcribe

	try {
		await doStartSTT({
			binaryPath: config.whisper.binaryPath,
			modelPath: config.whisper.modelPath,
			serverPort: config.whisper.serverPort,
			language: config.whisper.language,
			useCoreML: config.whisper.useCoreML,
		})
		currentState.sttRunning = true
		log("STT started")
	} catch (error) {
		log(`STT failed to start: ${error instanceof Error ? error.message : String(error)}`)
	}

	const doInitTTS = deps.initTTS ?? initTTS
	const doGenerateSpeechStream = deps.generateSpeechStream ?? generateSpeechStream

	try {
		await doInitTTS({
			engine: config.tts.engine,
			voiceId: config.tts.voiceId,
			sampleRate: config.tts.sampleRate,
		})
		currentState.ttsReady = true
		log("TTS initialized")
	} catch (error) {
		log(`TTS failed to initialize: ${error instanceof Error ? error.message : String(error)}`)
	}

	llmBridge = deps.createLLMBridge?.() ?? new LLMBridge()
	log("LLM bridge created")

	wsServer = deps.createWebSocketServer?.() ?? new VoiceWebSocketServer()

	const pipelineDeps: PipelineDependencies = {
		transcribe: async (audio: Buffer, _signal?: AbortSignal) => {
			const sttUrl = doGetSTTUrl()
			if (!sttUrl) throw new Error("STT server URL not available")
			return doTranscribe(audio, sttUrl)
		},
		sendToLLM: async (text: string, _signal?: AbortSignal) => {
			if (!llmBridge) throw new Error("LLM bridge not initialized")
			return llmBridge.sendToLLM(text)
		},
		generateSpeechStream: (text: string, _signal?: AbortSignal) => {
			return doGenerateSpeechStream(text)
		},
		sendMessage: (ws: ServerWebSocket<SessionData>, msg) => {
			ws.send(serializeServerMessage(msg))
		},
		sendAudio: (ws: ServerWebSocket<SessionData>, audio) => {
			if (audio instanceof Float32Array) {
				ws.send(new Uint8Array(audio.buffer, audio.byteOffset, audio.byteLength))
			} else {
				ws.send(audio)
			}
		},
	}

	pipeline = deps.createPipeline?.(pipelineDeps) ?? new VoicePipeline(pipelineDeps)

	const clientHtml = loadClientHtml(readFile)

	const wsDeps: WebSocketDependencies = {
		onAudioReceived: (_ws, audio) => {
			pipeline?.handleSpeechEnd(audio, _ws)
		},
		onClientMessage: (_ws, msg) => {
			if (msg.type === "interrupt") {
				pipeline?.interrupt()
			}
		},
		onConnect: () => {
			currentState.activeSessions = wsServer?.getActiveSessions() ?? 0
			log(`Client connected (${currentState.activeSessions} active)`)
		},
		onDisconnect: () => {
			currentState.activeSessions = wsServer?.getActiveSessions() ?? 0
			log(`Client disconnected (${currentState.activeSessions} active)`)
		},
		getClientHtml: () => clientHtml,
	}

	wsServer.start(config.port, config.maxConcurrentSessions, wsDeps)

	currentState.status = "running"
	log(`Voice module running on port ${config.port}`)

	return currentState
}

export async function stopVoice(deps: VoiceDependencies = {}): Promise<void> {
	const log = deps.log ?? defaultLog
	const doStopSTT = deps.stopSTT ?? stopSTT
	const doStopTTS = deps.stopTTS ?? stopTTS
	const doDisposeTTS = deps.disposeTTS ?? disposeTTS

	log("Stopping voice module")

	if (wsServer) {
		wsServer.stop()
		wsServer = null
	}

	pipeline = null

	try {
		doStopSTT()
	} catch (error) {
		log(`STT stop error: ${error instanceof Error ? error.message : String(error)}`)
	}

	try {
		doStopTTS()
		doDisposeTTS()
	} catch (error) {
		log(`TTS stop error: ${error instanceof Error ? error.message : String(error)}`)
	}

	llmBridge = null

	currentState = {
		status: "stopped",
		port: null,
		sttRunning: false,
		ttsReady: false,
		activeSessions: 0,
	}

	log("Voice module stopped")
}

export function getVoiceStatus(): VoiceState {
	return { ...currentState }
}
