export interface TTSConfig {
  engine: "kokoro"
  voiceId: string // e.g., "af_heart"
  sampleRate: number // e.g., 24000
}

export type TTSStatus =
  | "uninitialized"
  | "loading"
  | "ready"
  | "generating"
  | "error"

export interface TTSResult {
  audio: Float32Array
  sampleRate: number
  durationMs: number
}
