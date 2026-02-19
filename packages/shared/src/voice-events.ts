/**
 * Voice event types and definitions for Arachne.
 * Used to track voice system state changes and interactions.
 */

import type { VoiceInput, VoiceOutput } from "./voice-interface.js";

/**
 * Union type of all possible voice event types.
 */
export type VoiceEventType =
  | "voice.input.received"
  | "voice.output.queued"
  | "voice.provider.connected"
  | "voice.provider.disconnected";

/**
 * Represents a voice system event.
 */
export interface VoiceEvent {
  /** Type of the voice event */
  type: VoiceEventType;
  /** Timestamp when the event occurred */
  timestamp: Date;
  /** Event-specific data payload */
  data: VoiceInput | VoiceOutput | { provider: string };
}
