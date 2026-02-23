"use client";
import { useEffect, useRef } from "react";
import { MessageBubble } from "./message-bubble";
import { QuestionCard } from "./question-card";
import type { Message } from "@/app/hooks/use-messages";
import type { PendingQuestion } from "@/app/hooks/use-chat-stream";

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  currentMessage: string;
  isStreaming: boolean;
  currentToolUse: string | null;
  waitingForResponse: boolean;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  pendingQuestion?: PendingQuestion | null;
  onQuestionAnswer?: (answer: string) => void;
  onQuestionDismiss?: () => void;
}

export function MessageList({
  messages,
  isLoading,
  currentMessage,
  isStreaming,
  currentToolUse,
  waitingForResponse,
  scrollRef: externalScrollRef,
  pendingQuestion,
  onQuestionAnswer,
  onQuestionDismiss,
}: MessageListProps) {
  const internalScrollRef = useRef<HTMLDivElement>(null);
  const scrollRef = externalScrollRef || internalScrollRef;

  useEffect(() => {
    const shouldAutoScroll = messages.length > 0 || currentMessage.length > 0;
    if (!shouldAutoScroll) return;
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, currentMessage, scrollRef]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-4"
      data-testid="message-list"
    >
      {isLoading && messages.length === 0 && (
        <div className="text-center text-muted-foreground">
          Loading messages...
        </div>
      )}

      {!isLoading && messages.length === 0 && !isStreaming && (
        <div className="flex-1 flex items-center justify-center h-full">
          <div className="text-center text-muted-foreground">
            <div className="text-2xl mb-2">🕸️</div>
            <div>Send a message to start chatting</div>
          </div>
        </div>
      )}

      {messages.map((msg, index) => (
        <div key={`${msg.id}-${index}`} data-message-index={index}>
          <MessageBubble
            messageRole={msg.role}
            content={msg.content}
            timestamp={msg.timestamp}
          />
        </div>
      ))}

      {(waitingForResponse || (isStreaming && !currentMessage)) && (
        <div className="flex justify-start mb-4">
          <div className="bg-card text-card-foreground rounded-lg px-4 py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="animate-pulse">●</span>
              <span>Amanda is thinking...</span>
            </div>
          </div>
        </div>
      )}

      {isStreaming && currentMessage && (
        <MessageBubble
          messageRole="assistant"
          content={currentMessage}
          timestamp={Date.now()}
          isStreaming={true}
        />
      )}

      {pendingQuestion && onQuestionAnswer && onQuestionDismiss && (
        <QuestionCard
          question={pendingQuestion}
          onAnswer={onQuestionAnswer}
          onDismiss={onQuestionDismiss}
        />
      )}

      {isStreaming && !currentMessage && currentToolUse && !pendingQuestion && (
        <div className="flex justify-start mb-4">
          <div className="bg-card text-card-foreground rounded-lg px-4 py-2 text-sm text-muted-foreground flex items-center gap-2">
            <span className="animate-pulse">●</span>
            <span>{currentToolUse.replace(/^mcp_/, "").replace(/_/g, " ")}...</span>
          </div>
        </div>
      )}
    </div>
  );
}
