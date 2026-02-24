"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { SessionInfo } from "@/app/lib/types";
import { useProjects } from "@/app/hooks/use-projects";

const STUB_TITLE_PATTERN = /^New session - \d{4}-\d{2}-\d{2}T/;
const MAX_SIDEBAR_PROJECTS = 5;

export interface SessionGroup {
  directory: string;
  projectName: string;
  sessions: SessionInfo[];
}

interface SessionSidebarProps {
  sessions: SessionInfo[];
  activeSessionId: string | null;
  onSessionSelect: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  className?: string;
}

function isRealSession(session: SessionInfo): boolean {
  if (!session.title) return false;
  if (STUB_TITLE_PATTERN.test(session.title)) return false;
  return true;
}

function ProjectsSection() {
  const { projects, isLoading } = useProjects();

  if (isLoading || projects.length === 0) return null;

  const visibleProjects = projects.slice(0, MAX_SIDEBAR_PROJECTS);
  const hasMore = projects.length > MAX_SIDEBAR_PROJECTS;

  return (
    <div data-testid="sidebar-projects-section">
      <Link
        href="/projects"
        className="px-3 pt-3 pb-1 text-xs uppercase text-muted-foreground font-semibold tracking-wide hover:text-foreground transition-colors flex items-center justify-between"
        data-testid="sidebar-projects-header"
      >
        Projects
      </Link>

      <div className="px-1 py-1">
        {visibleProjects.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm hover:bg-sidebar-accent transition-colors"
            data-testid="sidebar-project-item"
          >
            <span className="text-muted-foreground text-xs shrink-0">
              &#128193;
            </span>
            <span className="truncate">{project.name}</span>
          </Link>
        ))}
      </div>

      {hasMore && (
        <Link
          href="/projects"
          className="px-3 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          data-testid="sidebar-see-more"
        >
          See more
        </Link>
      )}
    </div>
  );
}

function SessionList({ sessions, activeSessionId, onSessionSelect, onNewChat, onDeleteSession }: Omit<SessionSidebarProps, "className">) {
  const realSessions = sessions.filter(isRealSession);

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
        <ProjectsSection />

        <Separator className="my-2" />

        <div data-testid="sidebar-chats-section">
          <div className="px-3 pt-3 pb-1 text-xs uppercase text-muted-foreground font-semibold tracking-wide">
            Your chats
          </div>

          {realSessions
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
                      <div className="font-medium truncate text-sm">
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
                      &#128465;
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
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
          &#9776;
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
