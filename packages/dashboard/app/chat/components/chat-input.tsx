"use client";
import { useState, useRef, useEffect, useCallback, type KeyboardEvent, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { useSendMessage } from "@/app/hooks/use-send-message";
import { useTapToDictate } from "@/app/hooks/use-tap-to-dictate";

const MAX_HEIGHT_PX = 144;

interface ChatInputProps {
  sessionId: string | null;
  isStreaming?: boolean;
  isSessionBusy?: boolean;
  onOptimisticSend?: (text: string) => void;
}

export function ChatInput({
  sessionId,
  isStreaming = false,
  isSessionBusy = false,
  onOptimisticSend,
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { send, abort, isSending } = useSendMessage(sessionId);
  const { startDictation, stopDictation, isRecording, transcription } = useTapToDictate();

  const autoResize = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, MAX_HEIGHT_PX) + "px";
    }
  }, []);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);
  
  useEffect(() => {
     if (transcription) {
       setInput((prev) => prev + (prev ? " " : "") + transcription);
       autoResize();
     }
   }, [transcription, autoResize]);

  const messageQueueRef = useRef<string[]>([]);
  const isProcessingQueueRef = useRef(false);

  const processQueue = useCallback(async () => {
    if (isProcessingQueueRef.current || messageQueueRef.current.length === 0) return;
    isProcessingQueueRef.current = true;

    while (messageQueueRef.current.length > 0) {
      const next = messageQueueRef.current.shift()!;
      try {
        await send(next);
      } catch {
        void 0;
      }
    }

    isProcessingQueueRef.current = false;
  }, [send]);

  useEffect(() => {
    if (!isStreaming && textareaRef.current) {
      textareaRef.current.focus();
      processQueue();
    }
  }, [isStreaming, processQueue]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    setInput("");
    onOptimisticSend?.(trimmed);

    if (isStreaming) {
      messageQueueRef.current.push(trimmed);
      return;
    }

    try {
      await send(trimmed);
    } catch {
      void 0;
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    autoResize();
  };

  const inputDisabled = isSending || isSessionBusy;
  const sendDisabled = isSending || isSessionBusy || !input.trim();
  const queuedCount = messageQueueRef.current.length;
  
  const handleMicClick = () => {
    if (isRecording) {
      stopDictation();
    } else {
      startDictation();
    }
  };

  return (
    <div className="border-t border-border p-4">
      <div className="flex items-end gap-2">
         <Button
           type="button"
           variant={isRecording ? "destructive" : "outline"}
           size="icon"
           className="shrink-0"
           onClick={handleMicClick}
           disabled={isSending || isStreaming}
           aria-label={isRecording ? "Stop recording" : "Start voice input"}
           data-testid="mic-dictate-button"
         >
          {isRecording ? "⏺" : "🎤"}
        </Button>

         <textarea
            ref={textareaRef}
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
             placeholder={isSessionBusy ? "Agent is working..." : "Message Amanda..."}
           className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono"
           disabled={inputDisabled}
           rows={1}
           data-testid="chat-input"
         />

        {isStreaming && (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            onClick={() => abort()}
            className="shrink-0"
            data-testid="stop-button"
            aria-label="Stop generation"
          >
            ⏹
          </Button>
        )}
        <Button
          type="button"
          onClick={handleSend}
          size="icon"
          disabled={sendDisabled}
          className="shrink-0"
          data-testid="send-button"
          aria-label={isStreaming ? "Queue message" : "Send message"}
        >
          {isStreaming ? "⏳" : "↑"}
        </Button>
      </div>
    </div>
  );
}
