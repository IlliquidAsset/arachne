import type { ServerMessage } from "./protocol"
import { pcmToWav } from "./audio-utils"
import { NotificationQueue } from "./notification-queue"

const DEFAULT_SAMPLE_RATE = 16_000
const INTERRUPT_DEBOUNCE_MS = 200

export type PipelineStage =
  | "idle"
  | "stt"
  | "llm"
  | "tts"
  | "speaking_notification"

class PipelineAbortedError extends Error {
  constructor() {
    super("Voice pipeline cancelled")
  }
}

export interface PipelineDependencies {
  transcribe: (audio: Buffer, signal?: AbortSignal) => Promise<string>
  sendToLLM: (text: string, signal?: AbortSignal) => Promise<string>
  generateSpeechStream: (text: string, signal?: AbortSignal) => AsyncGenerator<Float32Array>
  sendMessage: (ws: any, msg: ServerMessage) => void
  sendAudio: (ws: any, audio: Float32Array | Buffer) => void
}

export class VoicePipeline {
  private readonly dependencies: PipelineDependencies
  private readonly notificationQueue: NotificationQueue
  private readonly sampleRate: number
  private processing = false
  private stage: PipelineStage = "idle"
  private abortController: AbortController | null = null
  private lastInterruptTime = 0
  private activeSpeechStream: AsyncGenerator<Float32Array> | null = null

  constructor(
    dependencies: PipelineDependencies,
    notificationQueue: NotificationQueue = new NotificationQueue(),
    sampleRate: number = DEFAULT_SAMPLE_RATE,
  ) {
    this.dependencies = dependencies
    this.notificationQueue = notificationQueue
    this.sampleRate = sampleRate
  }

  enqueueNotification(notification: string): void {
    this.notificationQueue.enqueue(notification)
  }

  cancel(): void {
    if (this.abortController) {
      this.abortController.abort()
    }

    this.cleanupForStage()
  }

  interrupt(): void {
    const now = Date.now()
    if (now - this.lastInterruptTime < INTERRUPT_DEBOUNCE_MS) {
      return
    }

    this.lastInterruptTime = now
    this.cancel()
  }

  isProcessing(): boolean {
    return this.processing
  }

  getStage(): PipelineStage {
    return this.stage
  }

  async handleSpeechEnd(audioBuffer: Buffer, ws: any): Promise<void> {
    if (this.processing) {
      return
    }

    this.processing = true
    this.abortController = new AbortController()
    const { signal } = this.abortController

    try {
      this.dependencies.sendMessage(ws, { type: "processing" })
      this.throwIfAborted(signal)

      const pcm = this.bufferToPcm16(audioBuffer)
      const wavBuffer = pcmToWav(pcm, this.sampleRate)

      this.stage = "stt"
      let transcription = ""
      try {
        transcription = await this.dependencies.transcribe(wavBuffer, signal)
      } catch {
        if (!signal.aborted) {
          this.dependencies.sendMessage(ws, {
            type: "error",
            message: "Transcription failed",
          })
        }
        return
      }

      this.throwIfAborted(signal)
      this.dependencies.sendMessage(ws, {
        type: "transcription",
        text: transcription,
      })

      this.dependencies.sendMessage(ws, { type: "thinking" })

      this.stage = "llm"
      let responseText = ""
      try {
        responseText = await this.dependencies.sendToLLM(transcription, signal)
      } catch {
        if (!signal.aborted) {
          this.dependencies.sendMessage(ws, {
            type: "error",
            message: "LLM unavailable",
          })
        }
        return
      }

      this.throwIfAborted(signal)
      this.stage = "tts"
      await this.speakText(ws, responseText, signal)
      this.throwIfAborted(signal)

      this.stage = "speaking_notification"
      await this.flushNotifications(ws, signal)
    } catch (error) {
      if (!(error instanceof PipelineAbortedError)) {
        throw error
      }
    } finally {
      this.processing = false
      this.stage = "idle"
      this.activeSpeechStream = null
      this.abortController = null
      this.dependencies.sendMessage(ws, { type: "listening" })
    }
  }

  private async speakText(
    ws: any,
    text: string,
    signal: AbortSignal,
  ): Promise<void> {
    this.throwIfAborted(signal)

    this.dependencies.sendMessage(ws, {
      type: "response_text",
      text,
    })
    this.dependencies.sendMessage(ws, { type: "speaking" })

    const stream = this.dependencies.generateSpeechStream(text, signal)
    this.activeSpeechStream = stream

    try {
      for await (const chunk of stream) {
        this.throwIfAborted(signal)
        this.dependencies.sendAudio(ws, chunk)
      }
    } catch (error) {
      if (error instanceof PipelineAbortedError || signal.aborted) {
        throw new PipelineAbortedError()
      }
    } finally {
      if (this.activeSpeechStream === stream) {
        this.activeSpeechStream = null
      }
    }
  }

  private async flushNotifications(ws: any, signal: AbortSignal): Promise<void> {
    while (this.notificationQueue.hasPending()) {
      const notifications = this.notificationQueue.drain()
      for (const notification of notifications) {
        this.throwIfAborted(signal)
        await this.speakText(ws, notification, signal)
      }
    }
  }

  private throwIfAborted(signal: AbortSignal): void {
    if (signal.aborted) {
      throw new PipelineAbortedError()
    }
  }

  private cleanupForStage(): void {
    if (this.stage === "tts" || this.stage === "speaking_notification") {
      this.stopActiveSpeechStream()
    }
  }

  private stopActiveSpeechStream(): void {
    if (!this.activeSpeechStream?.return) {
      return
    }

    void this.activeSpeechStream.return(undefined)
  }

  private bufferToPcm16(audioBuffer: Buffer): Int16Array {
    const sampleCount = Math.floor(audioBuffer.byteLength / 2)
    const pcm = new Int16Array(sampleCount)

    for (let i = 0; i < sampleCount; i++) {
      pcm[i] = audioBuffer.readInt16LE(i * 2)
    }

    return pcm
  }
}
