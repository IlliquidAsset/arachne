"use client";
import { useState, useRef, useCallback } from "react";

export function useTapToDictate() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [error, setError] = useState<Error | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const vadRef = useRef<any>(null);
  
  const stopDictation = useCallback(() => {
    if (vadRef.current) {
      vadRef.current.pause();
      vadRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsRecording(false);
  }, []);
  
  const startDictation = useCallback(async () => {
    setIsRecording(true);
    setError(null);
    setTranscription("");
    
    try {
      const ws = new WebSocket("ws://localhost:3200");
      wsRef.current = ws;
      
      ws.onopen = async () => {
        const { MicVAD } = await import("@ricky0123/vad-web");
        
        const vad = await MicVAD.new({
          onSpeechStart: () => {
            ws.send(JSON.stringify({ type: "speech_start" }));
          },
          onSpeechEnd: (audio: Float32Array) => {
            const pcm = float32ToInt16(audio);
            ws.send(pcm.buffer);
            ws.send(JSON.stringify({ type: "speech_end" }));
          },
          onVADMisfire: () => {
            console.log("VAD misfire");
          }
        });
        
        vadRef.current = vad;
        vad.start();
      };
      
      ws.onmessage = (event) => {
        if (typeof event.data === "string") {
          try {
            const message = JSON.parse(event.data);
            
            if (message.type === "transcription") {
              setTranscription(message.text || "");
              stopDictation();
            }
          } catch (err) {
            console.error("Failed to parse message:", err);
          }
        }
      };
      
      ws.onerror = () => {
        stopDictation();
      };
      
      ws.onclose = () => {
        stopDictation();
      };
    } catch (err) {
      stopDictation();
    }
  }, [stopDictation]);
  
  return {
    startDictation,
    stopDictation,
    isRecording,
    transcription,
    error
  };
}

function float32ToInt16(float32Array: Float32Array): Int16Array {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16Array;
}
