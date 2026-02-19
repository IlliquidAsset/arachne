import { useRef, useCallback } from "react";

export function useAudioPlayback() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const queueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const ensureAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext({ sampleRate: 24000 });
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const playNextChunk = useCallback(() => {
    if (queueRef.current.length === 0) {
      isPlayingRef.current = false;
      currentSourceRef.current = null;
      return;
    }
    isPlayingRef.current = true;
    const ctx = ensureAudioCtx();
    const chunk = queueRef.current.shift()!;
    const buffer = ctx.createBuffer(1, chunk.length, 24000);
    buffer.getChannelData(0).set(chunk);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.onended = () => playNextChunk();
    source.start();
    currentSourceRef.current = source;
  }, [ensureAudioCtx]);

  const enqueue = useCallback(
    (arrayBuffer: ArrayBuffer) => {
      const float32 = new Float32Array(arrayBuffer);
      queueRef.current.push(float32);
      if (!isPlayingRef.current) playNextChunk();
    },
    [playNextChunk]
  );

  const stop = useCallback(() => {
    queueRef.current.length = 0;
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
      } catch {
        /* already stopped */
      }
      currentSourceRef.current = null;
    }
    isPlayingRef.current = false;
  }, []);

  const resume = useCallback(() => {
    ensureAudioCtx();
  }, [ensureAudioCtx]);

  return { enqueue, stop, resume };
}
