"use client";
import { useState, useRef, useEffect, useCallback, type KeyboardEvent, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { useSendMessage } from "@/app/hooks/use-send-message";

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
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { send, abort, isSending } = useSendMessage(sessionId);

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

  const messageQueueRef = useRef<string[]>([]);
  const isProcessingQueueRef = useRef(false);

  const toDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    const MAX_FILES = 5;
    
    if (pendingFiles.length + files.length > MAX_FILES) {
      alert(`Maximum ${MAX_FILES} files allowed`);
      return;
    }
    
    const validFiles = files.filter(f => {
      if (f.size > MAX_SIZE) {
        alert(`${f.name} is too large (max 10MB)`);
        return false;
      }
      return true;
    });
    
    setPendingFiles(prev => [...prev, ...validFiles]);
    if (e.target) e.target.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(e.clipboardData.files);
    const images = files.filter(f => f.type.startsWith('image/'));
    if (images.length > 0) {
      setPendingFiles(prev => [...prev, ...images]);
    }
  };

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
    if (!trimmed && pendingFiles.length === 0) return;

    setInput("");
    const filesToSend = pendingFiles;
    setPendingFiles([]);
    onOptimisticSend?.(trimmed);

    if (isStreaming) {
      messageQueueRef.current.push(trimmed);
      return;
    }

    try {
      let fileParts = undefined;
      if (filesToSend.length > 0) {
        const dataURLs = await Promise.all(filesToSend.map(toDataURL));
        fileParts = filesToSend.map((file, i) => ({
          type: "file" as const,
          mime: file.type,
          url: dataURLs[i],
          filename: file.name
        }));
      }
      await send(trimmed, fileParts);
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
  const sendDisabled = isSending || isSessionBusy || (!input.trim() && pendingFiles.length === 0);
  const queuedCount = messageQueueRef.current.length;

  return (
    <div className="border-t border-border p-4">
      {pendingFiles.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {pendingFiles.map((file, i) => {
            const isImage = file.type.startsWith('image/');
            return (
              <div key={i} className="relative">
                {isImage ? (
                  <div className="relative">
                    <img 
                      src={URL.createObjectURL(file)} 
                      alt={file.name}
                      className="w-16 h-16 object-cover rounded border"
                    />
                    <button
                      onClick={() => setPendingFiles(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs"
                      type="button"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="border rounded p-2 flex items-center gap-2 bg-muted">
                    <span>📄</span>
                    <div className="text-xs">
                      <div>{file.name}</div>
                      <div className="text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB</div>
                    </div>
                    <button
                      onClick={() => setPendingFiles(prev => prev.filter((_, idx) => idx !== i))}
                      className="ml-2 text-red-500 text-sm"
                      type="button"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.txt"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={isSending || isStreaming}
          data-testid="file-upload-button"
          aria-label="Attach files"
        >
          📎
        </Button>
        <textarea
            ref={textareaRef}
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
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
