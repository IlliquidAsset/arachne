/**
 * Voice integration interfaces for Arachne.
 * Defines the contract between voice input/output and the autonomy system.
 */

/**
 * Represents a voice input received from the voice provider.
 */
export interface VoiceInput {
  /** Transcribed text from voice input */
  text: string;
  /** Confidence score of the transcription (0-1) */
  confidence: number;
  /** Timestamp when the input was received */
  timestamp: Date;
  /** Source of the voice input */
  source: "microphone" | "file";
}

/**
 * Represents voice output to be spoken by the voice provider.
 */
export interface VoiceOutput {
  /** Text to be spoken */
  text: string;
  /** Voice identifier or name to use for synthesis */
  voice: string;
  /** Priority level for output queuing */
  priority: "immediate" | "queued";
}

/**
 * Interface for voice input/output providers.
 * Implementations handle STT, TTS, and voice management.
 */
export interface VoiceProvider {
  /**
   * Listen for voice input.
   * Returns an async generator that yields VoiceInput events.
   */
  listen(): AsyncGenerator<VoiceInput>;

  /**
   * Speak the given voice output.
   */
  speak(output: VoiceOutput): Promise<void>;

  /**
   * Check if the voice provider is available and ready.
   */
  isAvailable(): boolean;

  /**
   * Shutdown the voice provider and clean up resources.
   */
  shutdown(): Promise<void>;
}

/**
 * Current status of the voice system.
 */
export interface VoiceStatus {
  /** Whether the voice provider is connected and active */
  connected: boolean;
  /** Name of the active voice provider */
  provider: string;
  /** Timestamp of the last voice input received */
  lastInput?: Date;
  /** Timestamp of the last voice output sent */
  lastOutput?: Date;
}
