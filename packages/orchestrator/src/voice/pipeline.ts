import type { ServerMessage } from "./protocol"
import { pcmToWav } from "./audio-utils"
import { NotificationQueue } from "./notification-queue"

const DEFAULT_SAMPLE_RATE = 16_000

class PipelineAbortedError extends Error {
  constructor() {
    super("Voice pipeline cancelled")
  }
}

export interface PipelineDependencies {
  transcribe: (audio: Buffer) => Promise<string>
  sendToLLM: (text: string) => Promise<string>
  generateSpeechStream: (text: string) => AsyncGenerator<Float32Array>
  sendMessage: (ws: any, msg: ServerMessage) => void
  sendAudio: (ws: any, audio: Float32Array | Buffer) => void
}

export class VoicePipeline {
  private readonly dependencies: PipelineDependencies
  private readonly notificationQueue: NotificationQueue
  private readonly sampleRate: number
  private processing = false
  private abortController: AbortController | null = null

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
  }

  isProcessing(): boolean {
    return this.processing
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

      let transcription = ""
      try {
        transcription = await this.dependencies.transcribe(wavBuffer)
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

      let responseText = ""
      try {
        responseText = await this.dependencies.sendToLLM(transcription)
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
      await this.speakText(ws, responseText, signal)
      this.throwIfAborted(signal)
      await this.flushNotifications(ws, signal)
    } catch (error) {
      if (!(error instanceof PipelineAbortedError)) {
        throw error
      }
    } finally {
      this.processing = false
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

    try {
      for await (const chunk of this.dependencies.generateSpeechStream(text)) {
        this.throwIfAborted(signal)
        this.dependencies.sendAudio(ws, chunk)
      }
    } catch (error) {
      if (error instanceof PipelineAbortedError || signal.aborted) {
        throw new PipelineAbortedError()
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

  private bufferToPcm16(audioBuffer: Buffer): Int16Array {
    const sampleCount = Math.floor(audioBuffer.byteLength / 2)
    const pcm = new Int16Array(sampleCount)

    for (let i = 0; i < sampleCount; i++) {
      pcm[i] = audioBuffer.readInt16LE(i * 2)
    }

    return pcm
  }
}
