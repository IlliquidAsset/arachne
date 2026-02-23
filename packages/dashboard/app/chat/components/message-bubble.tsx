"use client";
import { StreamingText } from "./streaming-text";

interface MessageBubbleProps {
  messageRole: "user" | "assistant";
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

export function MessageBubble({
  messageRole,
  content,
  timestamp,
  isStreaming = false,
}: MessageBubbleProps) {
  const isUser = messageRole === "user";

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}
      data-testid="message-bubble"
      data-role={messageRole}
    >
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-card text-card-foreground"
        }`}
      >
        <div className="text-xs font-medium mb-1">
          {isUser ? "You" : "Amanda"}
        </div>
        <StreamingText text={content} isStreaming={isStreaming} />
        <div className="text-xs opacity-70 mt-1">
          {new Date(timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
