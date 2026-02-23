"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { SessionInfo } from "@/app/lib/types";

export interface SessionGroup {
  directory: string;
  projectName: string;
  sessions: SessionInfo[];
}

interface SessionSidebarProps {
  groupedSessions: SessionGroup[];
  activeSessionId: string | null;
  onSessionSelect: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  className?: string;
}

function SessionList({ groupedSessions, activeSessionId, onSessionSelect, onNewChat, onDeleteSession }: Omit<SessionSidebarProps, "className">) {
  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      <div className="p-4">
        <Button
          onClick={onNewChat}
          className="w-full"
          data-testid="new-chat-button"
        >
          + New Chat
        </Button>
      </div>
      
      <Separator />
      
      <div className="flex-1 overflow-y-auto p-2">
        {groupedSessions.map((group) => (
          <div key={group.directory} className="mb-4">
            <div
              className="px-3 pt-4 pb-1 text-xs uppercase text-muted-foreground font-semibold tracking-wide"
              data-testid="project-group-header"
            >
              {group.projectName}
            </div>

            {group.sessions
              .sort((a, b) => b.time.updated - a.time.updated)
              .map((session) => {
                const isActive = session.id === activeSessionId;
                const relativeTime = getRelativeTime(session.time.updated);

                return (
                  /* biome-ignore lint/a11y/useSemanticElements: outer container cannot be a button because it wraps a delete button */
                  <div
                    key={session.id}
                    className={`group relative rounded-md p-3 mb-1 cursor-pointer hover:bg-sidebar-accent w-full text-left ${
                      isActive ? "bg-sidebar-accent" : ""
                    }`}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSessionSelect(session.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSessionSelect(session.id);
                      }
                    }}
                    data-testid="session-item"
                    data-session-id={session.id}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {session.title || "Untitled"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {relativeTime}
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete "${session.title || "Untitled"}"?`)) {
                            onDeleteSession(session.id);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                        aria-label="Delete session"
                        type="button"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SessionSidebar(props: SessionSidebarProps) {
  return (
    <div className={props.className} data-testid="session-sidebar">
      <SessionList {...props} />
    </div>
  );
}

export function MobileSidebar(props: Omit<SessionSidebarProps, "className">) {
  const [open, setOpen] = useState(false);

  const handleSessionSelect = (id: string) => {
    props.onSessionSelect(id);
    setOpen(false);
  };

  const handleNewChat = () => {
    props.onNewChat();
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="lg:hidden" data-testid="hamburger">
          ☰
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetTitle className="sr-only">Chat Sessions</SheetTitle>
        <SheetDescription className="sr-only">Select or manage your chat sessions</SheetDescription>
        <SessionList
          {...props}
          onSessionSelect={handleSessionSelect}
          onNewChat={handleNewChat}
        />
      </SheetContent>
    </Sheet>
  );
}

function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  return `${days} day${days > 1 ? "s" : ""} ago`;
}
