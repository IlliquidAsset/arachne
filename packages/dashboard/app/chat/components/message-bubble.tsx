"use client";
import { StreamingText } from "./streaming-text";
import type { MessagePart } from "@/app/hooks/use-messages";

interface MessageBubbleProps {
  messageRole: "user" | "assistant";
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  parts?: MessagePart[];
}

export function MessageBubble({
  messageRole,
  content,
  timestamp,
  isStreaming = false,
  parts = [],
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
        
        {/* Render file parts */}
        {parts.map((part, i) => {
          if (part.type === "file" && part.url) {
            if (part.mime?.startsWith("image/")) {
              return (
                <img
                  key={i}
                  src={part.url}
                  alt={part.filename || "Image"}
                  className="max-w-md rounded-md mt-2"
                />
              );
            }
            return (
              <div
                key={i}
                className="border rounded-md p-2 mt-2 flex items-center gap-2 bg-muted/30"
              >
                <span className="text-2xl">📄</span>
                <span className="text-sm font-medium">
                  {part.filename || "Document"}
                </span>
              </div>
            );
          }
          return null;
        })}
        
        <div className="text-xs opacity-70 mt-1">
          {new Date(timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
