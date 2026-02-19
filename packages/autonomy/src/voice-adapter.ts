/**
 * No-op voice adapter for Arachne autonomy system.
 * Provides a stub implementation of VoiceProvider for systems without voice support.
 */

import type { VoiceInput, VoiceOutput, VoiceProvider } from "@arachne/shared";

/**
 * No-operation voice provider that does nothing.
 * Used as a fallback when voice is not available or not configured.
 */
export class NoOpVoiceProvider implements VoiceProvider {
  /**
   * Check if the voice provider is available.
   * Always returns false for the no-op provider.
   */
  isAvailable(): boolean {
    return false;
  }

  /**
   * Listen for voice input.
   * Returns an empty async generator that never yields.
   */
  async *listen(): AsyncGenerator<VoiceInput> {
    // No-op: never yields any voice input
  }

  /**
   * Speak the given voice output.
   * No-op: does nothing.
   */
  async speak(_output: VoiceOutput): Promise<void> {
    // No-op: does nothing
  }

  /**
   * Shutdown the voice provider.
   * No-op: does nothing.
   */
  async shutdown(): Promise<void> {
    // No-op: does nothing
  }
}

/**
 * Factory function to create a voice adapter.
 * Returns a NoOpVoiceProvider instance.
 */
export function createVoiceAdapter(): VoiceProvider {
  return new NoOpVoiceProvider();
}
