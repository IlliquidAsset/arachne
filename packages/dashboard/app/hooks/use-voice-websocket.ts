import { useState, useRef, useCallback, useEffect } from "react";
import { useAudioPlayback } from "./use-audio-playback";

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

export function float32ToInt16(float32: Float32Array): Int16Array {
  const len = float32.length;
  const int16 = new Int16Array(len);
  for (let i = 0; i < len; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16;
}

export function parseServerMessage(raw: string): {
  type: string;
  text?: string;
  message?: string;
} | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function useVoiceWebSocket(wsUrl: string) {
  const [state, setState] = useState<VoiceState>("idle");
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");
  const [transcription, setTranscription] = useState("");
  const [responseText, setResponseText] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const vadRef = useRef<{ start: () => void; pause: () => void } | null>(null);
  const reconnectDelayRef = useRef(1000);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const audio = useAudioPlayback();

  const sendJSON = useCallback((obj: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(obj));
    }
  }, []);

  const sendBinary = useCallback((buffer: ArrayBuffer) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(buffer);
    }
  }, []);

  const handleTextMessage = useCallback(
    (raw: string) => {
      const msg = parseServerMessage(raw);
      if (!msg) return;
      switch (msg.type) {
        case "listening":
          setState("listening");
          break;
        case "processing":
          setState("processing");
          break;
        case "thinking":
          setState("thinking");
          break;
        case "speaking":
          setState("speaking");
          break;
        case "transcription":
          setTranscription(msg.text || "");
          break;
        case "response_text":
          setResponseText(msg.text || "");
          break;
        case "error":
          setState("error");
          break;
        case "session_limit":
          setState("error");
          break;
      }
    },
    []
  );

  const connect = useCallback(() => {
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING)
    )
      return;
    setConnectionState("connecting");
    const ws = new WebSocket(wsUrl);
    ws.binaryType = "arraybuffer";
    ws.onopen = () => {
      setConnectionState("connected");
      reconnectDelayRef.current = 1000;
    };
    ws.onclose = () => {
      setConnectionState("disconnected");
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = setTimeout(
        () => connect(),
        reconnectDelayRef.current
      );
      reconnectDelayRef.current = Math.min(
        reconnectDelayRef.current * 2,
        30000
      );
    };
    ws.onerror = () => {};
    ws.onmessage = (evt) => {
      if (typeof evt.data === "string") handleTextMessage(evt.data);
      else if (evt.data instanceof ArrayBuffer) audio.enqueue(evt.data);
    };
    wsRef.current = ws;
  }, [wsUrl, handleTextMessage, audio]);

  const start = useCallback(async () => {
    connect();
    audio.resume();
    try {
      const vadWeb = await import("@ricky0123/vad-web");
      const vad = await vadWeb.MicVAD.new({
        positiveSpeechThreshold: 0.8,
        negativeSpeechThreshold: 0.3,
        redemptionMs: 8,
        preSpeechPadMs: 5,
        onSpeechStart: () => {
          if (isMuted) return;
          sendJSON({ type: "speech_start" });
          audio.stop();
          sendJSON({ type: "interrupt" });
        },
        onSpeechEnd: (audioData: Float32Array) => {
          if (isMuted) return;
          const int16 = float32ToInt16(audioData);
          sendBinary(int16.buffer as ArrayBuffer);
          sendJSON({ type: "speech_end" });
        },
      });
      vad.start();
      vadRef.current = vad;
      setIsActive(true);
      setState("listening");
    } catch {
      setState("error");
    }
  }, [connect, audio, isMuted, sendJSON, sendBinary]);

  const stop = useCallback(() => {
    if (vadRef.current) vadRef.current.pause();
    setIsActive(false);
    setState("idle");
    audio.stop();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, [audio]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  useEffect(() => {
    return () => {
      if (vadRef.current) vadRef.current.pause();
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, []);

  return {
    state,
    connectionState,
    transcription,
    responseText,
    isActive,
    isMuted,
    start,
    stop,
    toggleMute,
  };
}
