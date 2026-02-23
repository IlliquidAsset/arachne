"use client";
import { useState, useEffect, useRef, useCallback } from "react";

const SYSTEM_STREAM_PATTERNS = [
  /\[BACKGROUND TASK COMPLETED\]/i,
  /\[SYSTEM REMINDER/i,
  /\[SYSTEM\s/i,
  /\[TODO CONTINUATION/i,
  /<system-reminder>/i,
  /<\/system-reminder>/i,
  /\[HOOK\]/i,
] as const;

export interface ThinkingPart {
  type: "tool-start" | "tool-end" | "reasoning" | "step-start" | "step-finish";
  tool?: string;
  callID?: string;
  status?: string;
  input?: unknown;
  output?: string;
  text?: string;
  reason?: string;
  tokens?: { total: number; input: number; output: number; reasoning: number };
  timestamp: number;
}

export interface QuestionOption {
  label: string;
  description?: string;
}

export interface PendingQuestion {
  header: string;
  question: string;
  options: QuestionOption[];
  multiple?: boolean;
  callID?: string;
}

interface ChatStreamOptions {
  onStreamComplete?: () => void;
  onSessionUpdated?: (sessionInfo: { id: string; title: string }) => void;
}

export function useChatStream(
  sessionId: string | null,
  options?: ChatStreamOptions,
) {
  const [currentMessage, setCurrentMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentToolUse, setCurrentToolUse] = useState<string | null>(null);
  const [waitingForResponse, setWaitingForResponse] = useState(false);
  const [currentThinkingParts, setCurrentThinkingParts] = useState<ThinkingPart[]>([]);
  const [pendingQuestion, setPendingQuestion] = useState<PendingQuestion | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const retriesRef = useRef(0);
  const maxRetries = 5;
  const onStreamCompleteRef = useRef(options?.onStreamComplete);
  const onSessionUpdatedRef = useRef(options?.onSessionUpdated);
  const hasReceivedDeltaRef = useRef(false);
  const streamTimeoutRef = useRef<number | null>(null);

  const markWaitingForResponse = useCallback(() => {
    setWaitingForResponse(true);
  }, []);

  useEffect(() => {
    onStreamCompleteRef.current = options?.onStreamComplete;
  }, [options?.onStreamComplete]);

  useEffect(() => {
    onSessionUpdatedRef.current = options?.onSessionUpdated;
  }, [options?.onSessionUpdated]);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    let isUnmounted = false;

    const connect = () => {
      if (isUnmounted) {
        return;
      }

      const directory = encodeURIComponent(
        process.env.NEXT_PUBLIC_PROJECT_DIR || "/Users/kendrick/Documents/dev/arachne",
      );
      const eventSource = new EventSource(`/api/events?directory=${directory}`);
      eventSourceRef.current = eventSource;

       eventSource.onmessage = (event) => {
         try {
           const data = JSON.parse(event.data);

           if (data.type === "message.part.delta") {
              setWaitingForResponse(false);
              setIsStreaming(true);
              hasReceivedDeltaRef.current = true;
              setCurrentMessage((prev) => {
                const next = prev + (data.props?.delta || "");
                const isSystem = SYSTEM_STREAM_PATTERNS.some((p) => p.test(next.trim()));
                return isSystem ? "" : next;
              });
             
             // Fallback: auto-reset after 60s if session.idle never fires
             if (streamTimeoutRef.current) clearTimeout(streamTimeoutRef.current);
             streamTimeoutRef.current = window.setTimeout(() => {
               console.warn('[SSE] Stream timeout — forcing idle state');
               setIsStreaming(false);
               setCurrentMessage("");
               hasReceivedDeltaRef.current = false;
               onStreamCompleteRef.current?.();
             }, 60000);
            } else if (data.type === "message.updated") {
              if (hasReceivedDeltaRef.current) {
                setCurrentMessage("");
                hasReceivedDeltaRef.current = false;
              }
              // Extract reasoning parts from the updated message
              const parts = data.parts || data.data?.parts || [];
              if (Array.isArray(parts)) {
                const reasoningParts: ThinkingPart[] = parts
                  .filter((p: any) => p.type === "reasoning" && p.text)
                  .map((p: any) => ({
                    type: "reasoning" as const,
                    text: p.text,
                    timestamp: p.time?.start || Date.now(),
                  }));
                if (reasoningParts.length > 0) {
                  setCurrentThinkingParts(prev => [...prev, ...reasoningParts]);
                }
              }
            } else if (data.type === "session.idle") {
               if (streamTimeoutRef.current) clearTimeout(streamTimeoutRef.current);
               setWaitingForResponse(false);
               setIsStreaming(false);
               setCurrentMessage("");
               hasReceivedDeltaRef.current = false;
               setCurrentThinkingParts([]);
               setPendingQuestion(null);
               onStreamCompleteRef.current?.();
           } else if (data.type === "tool.execute") {
              const toolName = data.props?.name || "unknown";
              setCurrentToolUse(toolName);
              setCurrentThinkingParts(prev => [...prev, {
                type: "tool-start" as const,
                tool: toolName,
                callID: data.props?.callID,
                timestamp: Date.now(),
              }]);
              if (toolName === "mcp_question") {
                const input = data.props?.input;
                const questions = input?.questions || input?.arguments?.questions;
                if (Array.isArray(questions) && questions.length > 0) {
                  const q = questions[0];
                  setPendingQuestion({
                    header: q.header || "Question",
                    question: q.question || "",
                    options: (q.options || []).map((o: any) => ({
                      label: o.label || "",
                      description: o.description || "",
                    })),
                    multiple: q.multiple || false,
                    callID: data.props?.callID,
                  });
                }
              }
           } else if (data.type === "tool.result") {
              setCurrentToolUse(null);
              if (data.props?.name === "mcp_question") {
                setPendingQuestion(null);
              }
              setCurrentThinkingParts(prev => [...prev, {
                type: "tool-end" as const,
                tool: data.props?.name,
                callID: data.props?.callID,
                output: typeof data.props?.result === "string" ? data.props.result.slice(0, 500) : undefined,
                status: "completed",
                timestamp: Date.now(),
              }]);
          } else if (data.type === "session.updated") {
            const info = data.properties?.info || data.props?.info;
            const updatedSessionId = info?.id;
            const title = info?.title;
            if (updatedSessionId && title) {
              onSessionUpdatedRef.current?.({ id: updatedSessionId, title });
            }
          } else if (data.type === "session.error") {
            setError(new Error(data.props?.message || "Session error"));
            setIsStreaming(false);
          }
        } catch (err) {
          console.error("SSE parse error:", err);
        }
      };

      eventSource.onopen = () => {
        retriesRef.current = 0;
      };

      eventSource.onerror = () => {
        eventSource.close();
        if (isUnmounted) {
          return;
        }
        if (retriesRef.current < maxRetries) {
          retriesRef.current += 1;
          reconnectTimeoutRef.current = window.setTimeout(() => {
            connect();
          }, 3000);
        }
      };
    };

    connect();

    return () => {
       isUnmounted = true;
       if (reconnectTimeoutRef.current) {
         window.clearTimeout(reconnectTimeoutRef.current);
       }
       if (streamTimeoutRef.current) {
         window.clearTimeout(streamTimeoutRef.current);
       }
       eventSourceRef.current?.close();
     };
  }, [sessionId]);

  const dismissQuestion = useCallback(() => setPendingQuestion(null), []);

  return { currentMessage, isStreaming, isLoading, error, currentToolUse, waitingForResponse, markWaitingForResponse, currentThinkingParts, pendingQuestion, dismissQuestion };
}
