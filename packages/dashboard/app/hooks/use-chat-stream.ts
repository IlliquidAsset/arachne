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
  const hasClearedThinkingRef = useRef(false);
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
        process.env.NEXT_PUBLIC_PROJECT_DIR || "",
      );
      const eventSource = new EventSource(`/api/events?directory=${directory}`);
      eventSourceRef.current = eventSource;

       eventSource.onmessage = (event) => {
         try {
           const data = JSON.parse(event.data);
           const eventType = data.type as string | undefined;

           if (eventType === "message.part.delta") {
              if (!hasClearedThinkingRef.current) {
                setCurrentThinkingParts([]);
                hasClearedThinkingRef.current = true;
              }
              setWaitingForResponse(false);
              setIsStreaming(true);
              hasReceivedDeltaRef.current = true;
              setCurrentMessage((prev) => {
                const delta = data.properties?.delta ?? data.props?.delta ?? "";
                const next = prev + delta;
                const isSystem = SYSTEM_STREAM_PATTERNS.some((p) => p.test(next.trim()));
                return isSystem ? "" : next;
              });

              if (streamTimeoutRef.current) clearTimeout(streamTimeoutRef.current);
              streamTimeoutRef.current = window.setTimeout(() => {
                setIsStreaming(false);
                setCurrentMessage("");
                hasReceivedDeltaRef.current = false;
                onStreamCompleteRef.current?.();
              }, 60000);
            } else if (eventType === "message.part.updated") {
              const part = data.properties?.part;
              if (!part) return;
              if (!hasClearedThinkingRef.current) {
                setCurrentThinkingParts([]);
                hasClearedThinkingRef.current = true;
              }

              if (part.type === "tool") {
                const toolName: string = part.tool || "unknown";
                const callID: string | undefined = part.callID;
                const status: string | undefined = part.state?.status;

                if (status === "running" || status === "pending") {
                  setWaitingForResponse(false);
                  setIsStreaming(true);
                  setCurrentToolUse(toolName);
                  setCurrentThinkingParts(prev => [...prev, {
                    type: "tool-start" as const,
                    tool: toolName,
                    callID,
                    input: part.state?.input,
                    timestamp: part.state?.time?.start || Date.now(),
                  }]);

                  if (toolName === "mcp_question") {
                    const input = part.state?.input;
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
                        callID,
                      });
                    }
                  }
                } else if (status === "completed" || status === "error") {
                  setCurrentToolUse(null);
                  if (toolName === "mcp_question") {
                    setPendingQuestion(null);
                  }
                  setCurrentThinkingParts(prev => [...prev, {
                    type: "tool-end" as const,
                    tool: toolName,
                    callID,
                    output: typeof part.state?.output === "string" ? part.state.output.slice(0, 500) : undefined,
                    status: status,
                    timestamp: Date.now(),
                  }]);
                }
              } else if (part.type === "reasoning" && part.text) {
                setCurrentThinkingParts(prev => [...prev, {
                  type: "reasoning" as const,
                  text: part.text,
                  timestamp: part.time?.start || Date.now(),
                }]);
              } else if (part.type === "step-start") {
                setCurrentThinkingParts(prev => [...prev, {
                  type: "step-start" as const,
                  timestamp: part.time?.start || Date.now(),
                }]);
              } else if (part.type === "step-finish") {
                setCurrentThinkingParts(prev => [...prev, {
                  type: "step-finish" as const,
                  reason: part.reason,
                  tokens: part.tokens,
                  timestamp: Date.now(),
                }]);
              }
            } else if (eventType === "message.updated") {
              if (hasReceivedDeltaRef.current) {
                setCurrentMessage("");
                hasReceivedDeltaRef.current = false;
              }
              const props = data.properties || data.props || {};
              const parts = props.info?.parts || data.parts || [];
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
            } else if (eventType === "session.idle") {
               if (streamTimeoutRef.current) clearTimeout(streamTimeoutRef.current);
               setWaitingForResponse(false);
               setIsStreaming(false);
               setCurrentMessage("");
               hasReceivedDeltaRef.current = false;

               setPendingQuestion(null);
               onStreamCompleteRef.current?.();
          } else if (eventType === "session.updated") {
            const info = data.properties?.info || data.props?.info;
            const updatedSessionId = info?.id;
            const title = info?.title;
            if (updatedSessionId && title) {
              onSessionUpdatedRef.current?.({ id: updatedSessionId, title });
            }
          } else if (eventType === "session.error") {
            const msg = data.properties?.message || data.props?.message;
            setError(new Error(msg || "Session error"));
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
