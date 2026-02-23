"use client";
import type { ThinkingSession } from "@/app/hooks/use-thinking";
import { ThinkingEntryComponent } from "./thinking-entry";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";

interface ThinkingDrawerProps {
  isOpen: boolean;
  thinkingSessions: ThinkingSession[];
  isThinking: boolean;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
}

export function ThinkingDrawer({ isOpen, thinkingSessions, isThinking, scrollRef }: ThinkingDrawerProps) {
  if (!isOpen) return null;

  return (
    <aside
      className="hidden lg:flex lg:w-80 lg:flex-col border-l bg-background"
      data-testid="thinking-drawer"
    >
      <div className="p-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Amanda&apos;s Thinking</span>
          {isThinking && (
            <span className="animate-pulse text-xs text-muted-foreground">● active</span>
          )}
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3"
        data-testid="thinking-scroll"
      >
        {thinkingSessions.length === 0 ? (
          <EmptyState />
        ) : (
          thinkingSessions.map((session) => (
            <div
              key={session.messageId}
              className="mb-4"
              data-thinking-for={session.messageId}
              data-message-index={session.messageIndex}
            >
              <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                Response {session.messageIndex + 1}
              </div>
              {session.entries.map((entry) => (
                <ThinkingEntryComponent key={entry.id} entry={entry} />
              ))}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

interface MobileThinkingDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  thinkingSessions: ThinkingSession[];
  isThinking: boolean;
}

export function MobileThinkingDrawer({ isOpen, onOpenChange, thinkingSessions, isThinking }: MobileThinkingDrawerProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[85vw] sm:max-w-sm p-0">
        <SheetTitle className="sr-only">Amanda&apos;s Thinking</SheetTitle>
        <SheetDescription className="sr-only">
          Shows Amanda&apos;s reasoning process and tool usage
        </SheetDescription>
        <div className="p-3 border-b flex items-center gap-2">
          <span className="text-sm font-semibold">Amanda&apos;s Thinking</span>
          {isThinking && (
            <span className="animate-pulse text-xs text-muted-foreground">● active</span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {thinkingSessions.length === 0 ? (
            <EmptyState />
          ) : (
            thinkingSessions.map((session) => (
              <div
                key={session.messageId}
                className="mb-4"
                data-thinking-for={session.messageId}
                data-message-index={session.messageIndex}
              >
                <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                  Response {session.messageIndex + 1}
                </div>
                {session.entries.map((entry) => (
                  <ThinkingEntryComponent key={entry.id} entry={entry} />
                ))}
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function EmptyState() {
  return (
    <div className="text-center text-muted-foreground text-sm mt-8">
      <div className="text-2xl mb-2">🧠</div>
      <div>Amanda&apos;s reasoning will appear here</div>
      <div className="text-xs mt-1">Send a message to see how she thinks</div>
    </div>
  );
}
