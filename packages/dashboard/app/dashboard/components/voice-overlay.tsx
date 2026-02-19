"use client";

import { Button } from "@/components/ui/button";

type VoiceState =
  | "idle"
  | "connecting"
  | "connected"
  | "listening"
  | "processing"
  | "thinking"
  | "speaking"
  | "error";
type ConnectionState = "disconnected" | "connecting" | "connected";

interface VoiceOverlayProps {
  state: VoiceState;
  connectionState: ConnectionState;
  transcription: string;
  responseText: string;
  isMuted: boolean;
  onToggleMute: () => void;
  onClose: () => void;
}

const STATE_LABELS: Record<VoiceState, string> = {
  idle: "Ready",
  connecting: "Connecting...",
  connected: "Connected",
  listening: "Listening...",
  processing: "Processing...",
  thinking: "Thinking...",
  speaking: "Speaking...",
  error: "Error",
};

const CONNECTION_DOT: Record<ConnectionState, string> = {
  disconnected: "bg-red-500",
  connecting: "bg-amber-500 animate-pulse",
  connected: "bg-emerald-500",
};

const CONNECTION_LABELS: Record<ConnectionState, string> = {
  disconnected: "Disconnected",
  connecting: "Connecting...",
  connected: "Connected",
};

function orbClasses(state: VoiceState, isMuted: boolean): string {
  const base =
    "w-32 h-32 rounded-full border-2 transition-all duration-500 flex items-center justify-center";

  if (isMuted) return `${base} border-red-500/50 bg-red-500/10 opacity-50`;

  switch (state) {
    case "listening":
      return `${base} border-indigo-500 bg-indigo-500/20 shadow-[0_0_40px_rgba(99,102,241,0.3)] animate-[pulse-orb_2s_ease-in-out_infinite]`;
    case "processing":
    case "thinking":
      return `${base} border-amber-500 bg-amber-500/10 shadow-[0_0_30px_rgba(234,179,8,0.2)] animate-spin-slow`;
    case "speaking":
      return `${base} border-indigo-500 bg-indigo-500/30 shadow-[0_0_50px_rgba(99,102,241,0.4)] scale-110`;
    case "error":
      return `${base} border-red-500 bg-red-500/10`;
    default:
      return `${base} border-border bg-card`;
  }
}

export function VoiceOverlay({
  state,
  connectionState,
  transcription,
  responseText,
  isMuted,
  onToggleMute,
  onClose,
}: VoiceOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-50 bg-[#0a0a0f]/95 backdrop-blur-sm flex flex-col"
      data-testid="voice-overlay"
    >
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${CONNECTION_DOT[connectionState]}`}
          />
          <span className="text-xs text-slate-400">
            {CONNECTION_LABELS[connectionState]}
          </span>
        </div>
        <span className="text-xs text-slate-400 capitalize">
          {STATE_LABELS[state]}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-slate-400 hover:text-white"
          data-testid="voice-close"
          aria-label="Close voice mode"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <title>Close</title>
            <path d="M5 5l10 10M15 5L5 15" />
          </svg>
        </Button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6">
        {transcription && (
          <div className="text-center max-w-md" data-testid="voice-transcription">
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">
              You said
            </p>
            <p className="text-sm text-slate-300 italic">{transcription}</p>
          </div>
        )}

        <div className={orbClasses(state, isMuted)} data-testid="voice-orb">
          {isMuted ? (
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="text-red-400"
              aria-hidden="true"
            >
              <title>Muted</title>
              <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
            </svg>
          ) : (
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="text-slate-300"
              aria-hidden="true"
            >
              <title>Microphone</title>
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          )}
        </div>

        {responseText && (
          <div
            className="text-center max-w-lg"
            data-testid="voice-response"
          >
            <p className="text-base text-slate-200 leading-relaxed whitespace-pre-wrap">
              {responseText}
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-center gap-4 pb-8">
        <Button
          variant="outline"
          size="lg"
          onClick={onToggleMute}
          className={`rounded-full px-6 ${isMuted ? "border-red-500 text-red-400" : "border-border text-slate-300"}`}
          data-testid="voice-mute"
        >
          {isMuted ? "Unmute" : "Mute"}
        </Button>
      </div>
    </div>
  );
}
