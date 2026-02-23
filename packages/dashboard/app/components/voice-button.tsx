"use client";

import { useState, useCallback, useEffect } from "react";
import { useVoiceWebSocket } from "@/app/hooks/use-voice-websocket";
import { VoiceOverlay } from "./voice-overlay";

const WS_URL =
  process.env.NEXT_PUBLIC_VOICE_WS_URL || "ws://localhost:3200";

export function VoiceButton() {
  const [overlayOpen, setOverlayOpen] = useState(false);
  const voice = useVoiceWebSocket(WS_URL);

  const handleOpen = useCallback(async () => {
    try {
      setOverlayOpen(true);
      await voice.start();
    } catch {
      setOverlayOpen(false);
    }
  }, [voice]);

  const handleClose = useCallback(() => {
    voice.stop();
    setOverlayOpen(false);
  }, [voice]);

  useEffect(() => {
    if (!overlayOpen) return;
    if (
      voice.state === "error" ||
      (voice.connectionState === "disconnected" && voice.state !== "connecting")
    ) {
      const timer = setTimeout(() => {
        handleClose();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [overlayOpen, voice.state, voice.connectionState, handleClose]);

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={`fixed bottom-20 right-6 z-40 h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-all ${
          voice.isActive
            ? "bg-indigo-500 text-white shadow-indigo-500/25 shadow-xl animate-[pulse-orb_2s_ease-in-out_infinite]"
            : "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-primary/25 hover:shadow-xl"
        }`}
        data-testid="mic-button"
        aria-label="Voice mode"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <title>Microphone</title>
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" x2="12" y1="19" y2="22" />
        </svg>
      </button>

      {overlayOpen && (
        <VoiceOverlay
          state={voice.state}
          connectionState={voice.connectionState}
          transcription={voice.transcription}
          responseText={voice.responseText}
          isMuted={voice.isMuted}
          onToggleMute={voice.toggleMute}
          onClose={handleClose}
        />
      )}
    </>
  );
}
