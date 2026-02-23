"use client";
import { useState, useCallback } from "react";

export function useSendMessage(sessionId: string | null) {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const send = useCallback(
    async (text: string) => {
      if (!sessionId || !text.trim()) return;

      setIsSending(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/sessions/${sessionId}/prompt`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: text.trim() }),
          },
        );

        if (!response.ok) {
          throw new Error(
            `Failed to send message: ${response.statusText}`,
          );
        }

        await response.json();
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsSending(false);
      }
    },
    [sessionId],
  );

  const abort = useCallback(async () => {
    if (!sessionId) return;

    try {
      const response = await fetch(
        `/api/sessions/${sessionId}/abort`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to abort");
      }
    } catch (err) {
      console.error("Abort error:", err);
    }
  }, [sessionId]);

  return { send, abort, isSending, error };
}
