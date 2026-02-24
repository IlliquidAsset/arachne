"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { SessionInfo } from "@/app/lib/types";
import { isRealSession } from "@/app/lib/session-utils";
import { useProjects } from "@/app/hooks/use-projects";

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

function ProjectsSection() {
  const { projects, isLoading } = useProjects();

  if (isLoading || projects.length === 0) return null;

  const visibleProjects = projects.slice(0, MAX_SIDEBAR_PROJECTS);
  const hasMore = projects.length > MAX_SIDEBAR_PROJECTS;

  return (
    <div data-testid="sidebar-projects-section">
      <Link
        href="/projects"
        className="px-2.5 pt-2 pb-0.5 text-xs uppercase text-muted-foreground font-semibold tracking-wide hover:text-foreground transition-colors flex items-center justify-between"
        data-testid="sidebar-projects-header"
      >
        Projects
      </Link>

      <div className="px-0.5 py-0.5">
        {visibleProjects.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className="flex items-center gap-2 rounded-md px-2.5 py-1 text-sm hover:bg-sidebar-accent transition-colors"
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
          className="px-2.5 py-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          data-testid="sidebar-see-more"
        >
          See more
        </Link>
      )}
    </div>
  );
}

function useProjectNameMap() {
  const { projects } = useProjects();
  const map = new Map<string, string>();
  for (const project of projects) {
    if (project.absolutePath) {
      map.set(project.absolutePath, project.name);
    }
  }
  return map;
}

function SessionList({ sessions, activeSessionId, onSessionSelect, onNewChat, onDeleteSession }: Omit<SessionSidebarProps, "className">) {
  const realSessions = sessions.filter(isRealSession);
  const projectNames = useProjectNameMap();

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      <div className="p-3">
        <Button
          onClick={onNewChat}
          className="w-full"
          data-testid="new-chat-button"
        >
          + New Chat
        </Button>
      </div>

      <Separator />

      <div className="flex-1 overflow-y-auto px-1.5 py-1">
        <ProjectsSection />

        <Separator className="my-1.5" />

        <div data-testid="sidebar-chats-section">
          <div className="px-2.5 pt-2 pb-0.5 text-xs uppercase text-muted-foreground font-semibold tracking-wide">
            Your chats
          </div>

          {realSessions
            .sort((a, b) => b.time.updated - a.time.updated)
            .map((session) => {
              const isActive = session.id === activeSessionId;
              const relativeTime = getRelativeTime(session.time.updated);
              const projectName = session.directory ? projectNames.get(session.directory) : undefined;

              return (
                /* biome-ignore lint/a11y/useSemanticElements: outer container cannot be a button because it wraps a delete button */
                <div
                  key={session.id}
                  className={`group relative rounded-md px-2.5 py-2 mb-0.5 cursor-pointer hover:bg-sidebar-accent w-full text-left ${
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
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate text-sm leading-tight">
                        {session.title || "Untitled"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {relativeTime}
                        {projectName && (
                          <span className="ml-1.5 opacity-70">&middot; {projectName}</span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete "${session.title || "Untitled"}"?`)) {
                          onDeleteSession(session.id);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0"
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
        <SheetContent side="left" className="w-72 p-0">
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
