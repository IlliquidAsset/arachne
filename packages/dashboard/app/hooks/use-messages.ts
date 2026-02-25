"use client";
import { useState, useEffect, useCallback } from "react";

export interface MessagePart {
  type: "text" | "reasoning" | "tool" | "step-start" | "step-finish" | "file";
  text?: string;
  tool?: string;
  callID?: string;
  state?: {
    status: string;
    input?: unknown;
    output?: string;
    title?: string;
    time?: { start: number; end: number };
  };
  time?: { start?: number; end?: number };
  reason?: string;
  tokens?: {
    total: number;
    input: number;
    output: number;
    reasoning: number;
  };
  cost?: number;
  mime?: string;
  url?: string;
  filename?: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  parts: MessagePart[];
}

const SYSTEM_MESSAGE_PATTERNS = [
  /^\[BACKGROUND TASK COMPLETED\]/i,
  /^\[SYSTEM REMINDER/i,
  /^\[SYSTEM\s/i,
  /^\[TODO CONTINUATION/i,
  /^<system-reminder>/i,
  /^<\/system-reminder>/i,
  /^\[HOOK\]/i,
] as const;

function isSystemMessage(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) return false;
  return SYSTEM_MESSAGE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function useMessages(sessionId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!sessionId) {
      setMessages([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/sessions/${sessionId}/messages`);
      if (!response.ok) throw new Error("Failed to fetch messages");
      const data = await response.json();
      const transformed: Message[] = (Array.isArray(data) ? data : [])
        .map((msg: any) => ({
          id: msg.info?.id || `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          role: msg.info?.role === "user" ? ("user" as const) : ("assistant" as const),
          content: (msg.parts || [])
            .filter((p: any) => p.type === "text")
            .map((p: any) => p.text || "")
            .join(""),
          timestamp: msg.info?.time?.created || msg.info?.time?.updated || Date.now(),
          parts: (msg.parts || []).map((p: any) => ({
            type: p.type,
            text: p.text,
            tool: p.tool,
            callID: p.callID,
            state: p.state,
            time: p.time,
            reason: p.reason,
            tokens: p.state?.tokens || p.tokens,
            cost: p.state?.cost || p.cost,
            mime: p.mime,
            url: p.url,
            filename: p.filename,
          })),
        }))
        .filter((msg: Message) => msg.content.trim() !== "" || msg.parts.some((p: MessagePart) => p.type !== "text"))
        .filter((msg: Message) => !isSystemMessage(msg.content));
      setMessages(transformed);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const addOptimisticMessage = useCallback((text: string) => {
    const optimistic: Message = {
      id: `optimistic-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: Date.now(),
      parts: [{ type: "text", text }],
    };
    setMessages((prev) => [...prev, optimistic]);
  }, []);

  return {
    messages,
    isLoading,
    error,
    refetch: fetchMessages,
    addOptimisticMessage,
  };
}
