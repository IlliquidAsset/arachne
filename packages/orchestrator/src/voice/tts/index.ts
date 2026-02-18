export type { TTSConfig, TTSResult, TTSStatus } from "./types"
export { KokoroService, type TTSDependencies, type KokoroTTSLike } from "./kokoro-service"

import { KokoroService } from "./kokoro-service"
import type { TTSConfig, TTSResult, TTSStatus } from "./types"

// Singleton instance for module-level convenience API
const service = new KokoroService()

export function initTTS(config: TTSConfig): Promise<void> {
  return service.init(config)
}

export function generateSpeech(text: string): Promise<TTSResult> {
  return service.generate(text)
}

export function generateSpeechStream(text: string): AsyncGenerator<Float32Array> {
  return service.generateStream(text)
}

export function stopTTS(): void {
  service.stop()
}

export function getTTSStatus(): TTSStatus {
  return service.getStatus()
}

export function disposeTTS(): void {
  service.dispose()
}
