import type { TTSConfig, TTSResult, TTSStatus } from "./types"

export interface KokoroTTSLike {
  generate(
    text: string,
    options?: { voice?: string },
  ): Promise<{ audio: Float32Array; sampling_rate: number }>
}

export interface TTSDependencies {
  createTTS?: (
    modelId: string,
    options: { dtype: string },
  ) => Promise<KokoroTTSLike>
}

const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX"
const MODEL_DTYPE = "fp32"

// Simple sentence splitter: split on sentence-ending punctuation followed by whitespace
const SENTENCE_SPLIT_RE = /(?<=[.!?])\s+/

async function defaultCreateTTS(
  modelId: string,
  options: { dtype: string },
): Promise<KokoroTTSLike> {
  const { KokoroTTS } = await import("kokoro-js")
  return KokoroTTS.from_pretrained(modelId, options) as Promise<KokoroTTSLike>
}

export class KokoroService {
  private status: TTSStatus = "uninitialized"
  private tts: KokoroTTSLike | null = null
  private config: TTSConfig | null = null
  private abortController: AbortController | null = null
  private readonly dependencies: TTSDependencies

  constructor(dependencies: TTSDependencies = {}) {
    this.dependencies = dependencies
  }

  async init(config: TTSConfig): Promise<void> {
    this.config = config
    this.status = "loading"

    try {
      const createTTS = this.dependencies.createTTS ?? defaultCreateTTS
      this.tts = await createTTS(MODEL_ID, { dtype: MODEL_DTYPE })
      this.status = "ready"
    } catch (error) {
      this.status = "error"
      this.tts = null
      throw error
    }
  }

  async generate(text: string): Promise<TTSResult> {
    if (this.status !== "ready" || !this.tts || !this.config) {
      throw new Error(
        `Cannot generate: TTS is not ready (status: ${this.status})`,
      )
    }

    this.status = "generating"

    try {
      const result = await this.tts.generate(text, {
        voice: this.config.voiceId,
      })

      const sampleRate = result.sampling_rate
      const durationMs = (result.audio.length / sampleRate) * 1000

      return {
        audio: result.audio,
        sampleRate,
        durationMs,
      }
    } finally {
      if (this.status === "generating") {
        this.status = "ready"
      }
    }
  }

  async *generateStream(text: string): AsyncGenerator<Float32Array> {
    if (this.status !== "ready" || !this.tts || !this.config) {
      throw new Error(
        `Cannot generate: TTS is not ready (status: ${this.status})`,
      )
    }

    this.status = "generating"
    this.abortController = new AbortController()
    const { signal } = this.abortController

    try {
      const sentences = text
        .split(SENTENCE_SPLIT_RE)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)

      for (const sentence of sentences) {
        // Check abort signal before each sentence
        if (signal.aborted) {
          break
        }

        const result = await this.tts.generate(sentence, {
          voice: this.config.voiceId,
        })

        // Check again after generation (in case stop() was called during)
        if (signal.aborted) {
          break
        }

        yield result.audio
      }
    } finally {
      this.abortController = null
      if (this.status === "generating") {
        this.status = "ready"
      }
    }
  }

  stop(): void {
    if (this.abortController) {
      this.abortController.abort()
    }
  }

  getStatus(): TTSStatus {
    return this.status
  }

  dispose(): void {
    this.stop()
    this.tts = null
    this.config = null
    this.status = "uninitialized"
  }
}
