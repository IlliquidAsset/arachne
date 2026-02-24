"use client";
import { Suspense, useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { MessageList } from "./components/message-list";
import { ChatInput } from "./components/chat-input";
import { SessionSidebar, MobileSidebar } from "./components/session-sidebar";
import { ConnectionStatus } from "./components/connection-status";
import { ThinkingDrawer, MobileThinkingDrawer } from "./components/thinking-drawer";
import { Button } from "@/components/ui/button";
import { useSessions } from "@/app/hooks/use-sessions";
import { useMessages } from "@/app/hooks/use-messages";
import { useChatStream } from "@/app/hooks/use-chat-stream";
import { useThinking } from "@/app/hooks/use-thinking";
import { useSendMessage } from "@/app/hooks/use-send-message";

function ChatContent() {
  const {
    sessions,
    activeSessionId,
    setActiveSession,
    createSession,
    deleteSession,
    updateSessionTitle,
  } = useSessions();

  // Lifted hooks — shared between MessageList and ThinkingDrawer
  const { messages, isLoading, refetch, addOptimisticMessage } = useMessages(activeSessionId);
  const {
    currentMessage,
    isStreaming,
    currentToolUse,
    waitingForResponse,
    markWaitingForResponse,
    currentThinkingParts,
    pendingQuestion,
    dismissQuestion,
  } = useChatStream(activeSessionId, {
    onStreamComplete: refetch,
    onSessionUpdated: updateSessionTitle,
  });

  const { send: sendMessage } = useSendMessage(activeSessionId);
  const thinkingSessions = useThinking(messages, currentThinkingParts, activeSessionId);

  const handleQuestionAnswer = useCallback(async (answer: string) => {
    dismissQuestion();
    addOptimisticMessage(answer);
    try {
      await sendMessage(answer);
    } catch {
      void 0;
    }
  }, [dismissQuestion, addOptimisticMessage, sendMessage]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const messageScrollRef = useRef<HTMLDivElement>(null);
  const thinkingScrollRef = useRef<HTMLDivElement>(null);
  const scrollSourceRef = useRef<"chat" | "thinking" | null>(null);

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Bidirectional scroll sync (desktop only)
  useEffect(() => {
    if (!drawerOpen || isMobile) return;

    const chatEl = messageScrollRef.current;
    const thinkingEl = thinkingScrollRef.current;
    if (!chatEl || !thinkingEl) return;

    const handleChatScroll = () => {
      if (scrollSourceRef.current === "thinking") return;
      scrollSourceRef.current = "chat";

      const chatScrollRatio = chatEl.scrollTop / (chatEl.scrollHeight - chatEl.clientHeight || 1);
      thinkingEl.scrollTop = chatScrollRatio * (thinkingEl.scrollHeight - thinkingEl.clientHeight);

      requestAnimationFrame(() => { scrollSourceRef.current = null; });
    };

    const handleThinkingScroll = () => {
      if (scrollSourceRef.current === "chat") return;
      scrollSourceRef.current = "thinking";

      const thinkingScrollRatio = thinkingEl.scrollTop / (thinkingEl.scrollHeight - thinkingEl.clientHeight || 1);
      chatEl.scrollTop = thinkingScrollRatio * (chatEl.scrollHeight - chatEl.clientHeight);

      requestAnimationFrame(() => { scrollSourceRef.current = null; });
    };

    chatEl.addEventListener("scroll", handleChatScroll, { passive: true });
    thinkingEl.addEventListener("scroll", handleThinkingScroll, { passive: true });

    return () => {
      chatEl.removeEventListener("scroll", handleChatScroll);
      thinkingEl.removeEventListener("scroll", handleThinkingScroll);
    };
  }, [drawerOpen, isMobile]);

  const isThinking = isStreaming || waitingForResponse;

  const handleSend = useCallback((text: string) => {
    addOptimisticMessage(text);
    markWaitingForResponse();
  }, [addOptimisticMessage, markWaitingForResponse]);

  return (
    <>
      <SessionSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSessionSelect={setActiveSession}
        onNewChat={() => createSession()}
        onDeleteSession={deleteSession}
        className="hidden lg:flex lg:w-64 lg:flex-col border-r"
      />

      <main className="flex-1 flex flex-col min-w-0">
        <div className="p-2 border-b flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Link
              href="/projects"
              className="text-muted-foreground hover:text-foreground transition-colors hidden lg:block"
              aria-label="Back to projects"
            >
              &larr;
            </Link>
            <MobileSidebar
              sessions={sessions}
              activeSessionId={activeSessionId}
              onSessionSelect={setActiveSession}
              onNewChat={() => createSession()}
              onDeleteSession={deleteSession}
            />
            <Link href="/projects" className="font-semibold hover:text-primary transition-colors">
              Arachne
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <ConnectionStatus />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDrawerOpen(prev => !prev)}
              className="relative"
              aria-label={drawerOpen ? "Close thinking drawer" : "Open thinking drawer"}
              data-testid="thinking-toggle"
            >
              🧠
              {isThinking && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
              )}
            </Button>
          </div>
        </div>

        <MessageList
          messages={messages}
          isLoading={isLoading}
          currentMessage={currentMessage}
          isStreaming={isStreaming}
          currentToolUse={currentToolUse}
          waitingForResponse={waitingForResponse}
          scrollRef={messageScrollRef}
          pendingQuestion={pendingQuestion}
          onQuestionAnswer={handleQuestionAnswer}
          onQuestionDismiss={dismissQuestion}
        />
        <ChatInput
          sessionId={activeSessionId}
          isStreaming={isStreaming}
          onOptimisticSend={handleSend}
        />
      </main>

      <ThinkingDrawer
        isOpen={drawerOpen && !isMobile}
        thinkingSessions={thinkingSessions}
        isThinking={isThinking}
        scrollRef={thinkingScrollRef}
      />

      <MobileThinkingDrawer
        isOpen={drawerOpen && isMobile}
        onOpenChange={setDrawerOpen}
        thinkingSessions={thinkingSessions}
        isThinking={isThinking}
      />
    </>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
