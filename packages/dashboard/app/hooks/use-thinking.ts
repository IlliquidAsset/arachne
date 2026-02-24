"use client";
import { useMemo } from "react";
import type { Message } from "./use-messages";
import type { ThinkingPart } from "./use-chat-stream";

export interface ThinkingEntry {
  id: string;
  type: "reasoning" | "tool-start" | "tool-end" | "step-start" | "step-finish";
  text?: string;
  tool?: string;
  callID?: string;
  status?: string;
  input?: unknown;
  output?: string;
  reason?: string;
  tokens?: { total: number; input: number; output: number; reasoning: number };
  timestamp: number;
  agent?: string;
}

export interface ThinkingSession {
  messageId: string;
  messageIndex: number;
  entries: ThinkingEntry[];
}

export function useThinking(
  messages: Message[],
  currentThinkingParts: ThinkingPart[],
  activeSessionId: string | null,
): ThinkingSession[] {
  return useMemo(() => {
    const sessions: ThinkingSession[] = [];

    function extractAgent(input: unknown): string | undefined {
      if (!input || typeof input !== "object") return undefined;
      const inp = input as Record<string, unknown>;
      if (typeof inp.subagent_type === "string") return inp.subagent_type;
      if (typeof inp.category === "string") return inp.category;
      return undefined;
    }

    messages.forEach((msg, messageIndex) => {
      if (msg.role !== "assistant") return;

      const entries: ThinkingEntry[] = [];
      let currentAgent: string | undefined;

      msg.parts.forEach((p, i) => {
        if (p.type === "text") return;

        const timestamp = p.time?.start || msg.timestamp;
        const id = `${msg.id}-part-${i}`;

        if (p.type === "reasoning") {
          entries.push({
            id,
            type: "reasoning",
            text: p.text,
            timestamp,
            agent: currentAgent,
          });
        } else if (p.type === "tool") {
          const status = p.state?.status;
          const isDispatch = p.tool === "mcp_task" || p.tool === "mcp_arachne_dispatch";

          if (isDispatch && status !== "completed" && status !== "error") {
            currentAgent = extractAgent(p.state?.input);
          }

          if (status === "completed" || status === "error") {
            entries.push({
              id,
              type: "tool-end",
              tool: p.tool,
              callID: p.callID,
              status,
              input: p.state?.input,
              output: p.state?.output?.slice(0, 500),
              timestamp,
              agent: isDispatch ? extractAgent(p.state?.input) : currentAgent,
            });
            if (isDispatch) currentAgent = undefined;
          } else {
            entries.push({
              id,
              type: "tool-start",
              tool: p.tool,
              callID: p.callID,
              status,
              input: p.state?.input,
              timestamp,
              agent: isDispatch ? extractAgent(p.state?.input) : currentAgent,
            });
          }
        } else if (p.type === "step-start") {
          entries.push({
            id,
            type: "step-start",
            timestamp,
            agent: currentAgent,
          });
        } else if (p.type === "step-finish") {
          entries.push({
            id,
            type: "step-finish",
            reason: p.reason,
            tokens: p.tokens,
            timestamp,
            agent: currentAgent,
          });
        }
      });

      if (entries.length > 0) {
        sessions.push({
          messageId: msg.id,
          messageIndex,
          entries,
        });
      }
    });

    if (currentThinkingParts.length > 0) {
      sessions.push({
        messageId: "live",
        messageIndex: messages.length,
        entries: currentThinkingParts.map((p, i) => ({
          id: `live-${i}`,
          type: p.type,
          text: p.text,
          tool: p.tool,
          callID: p.callID,
          status: p.status,
          input: p.input,
          output: p.output,
          reason: p.reason,
          tokens: p.tokens,
          timestamp: p.timestamp,
          agent: p.agent,
        })),
      });
    }

    return sessions;
  }, [messages, currentThinkingParts]);
}
