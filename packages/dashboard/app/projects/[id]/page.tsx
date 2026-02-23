"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { SessionInfo } from "@/app/lib/types";

interface ProjectDetail {
  id: string;
  name: string;
  absolutePath: string;
  instructions: string;
  readme: string;
  knowledgeFiles: string[];
}

const STUB_TITLE_PATTERN = /^New session - \d{4}-\d{2}-\d{2}T/;

function isRealSession(session: SessionInfo): boolean {
  if (!session.title) return false;
  if (STUB_TITLE_PATTERN.test(session.title)) return false;
  return true;
}

function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function SessionItem({
  session,
  onClick,
}: {
  session: SessionInfo;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-lg p-3 hover:bg-accent transition-colors"
      type="button"
    >
      <div className="font-medium truncate">
        {session.title || "Untitled"}
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        {getRelativeTime(session.time.updated)}
      </div>
    </button>
  );
}

function InstructionsEditor({
  projectId,
  initialContent,
}: {
  projectId: string;
  initialContent: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(initialContent);
  const [savedContent, setSavedContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructions: content }),
      });
      if (res.ok) {
        setSavedContent(content);
        setIsEditing(false);
      }
    } catch {
      void 0;
    } finally {
      setIsSaving(false);
    }
  }, [projectId, content]);

  const handleCancel = () => {
    setContent(savedContent);
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div className="mt-3">
        <button
          className="w-full text-left text-sm text-foreground whitespace-pre-wrap bg-card rounded-lg p-3 max-h-80 overflow-y-auto border border-border cursor-pointer hover:border-primary/30 transition-colors"
          onClick={() => setIsEditing(true)}
          type="button"
        >
          {savedContent || "Click to add project instructions..."}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full text-sm text-foreground bg-card rounded-lg p-3 border border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary resize-y min-h-32 max-h-80"
        rows={8}
        
      />
      <div className="flex justify-end gap-2 mt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}

function KnowledgePanel({
  project,
}: {
  project: ProjectDetail;
}) {
  const [showInstructions, setShowInstructions] = useState(true);

  return (
    <div className="w-80 border-l border-border flex flex-col bg-background overflow-y-auto hidden lg:flex">
      <div className="p-4">
        <button
          onClick={() => setShowInstructions((v) => !v)}
          className="text-sm font-semibold text-muted-foreground uppercase tracking-wide w-full text-left flex items-center justify-between"
          type="button"
        >
          Project Instructions
          <span className="text-xs">{showInstructions ? "\u25B2" : "\u25BC"}</span>
        </button>
        {showInstructions && (
          <InstructionsEditor
            projectId={project.id}
            initialContent={project.instructions}
          />
        )}
      </div>

      <Separator />

      <div className="p-4">
        <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Knowledge Files
        </div>
        {project.knowledgeFiles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No knowledge files found.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {project.knowledgeFiles.map((file) => (
              <li
                key={file}
                className="text-sm flex items-center gap-2 py-1.5 px-2 rounded bg-card border border-border"
              >
                <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                  {file.split(".").pop()?.toUpperCase()}
                </span>
                <span className="truncate">{file}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {project.readme && (
        <>
          <Separator />
          <div className="p-4">
            <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              README
            </div>
            <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-card rounded-lg p-3 max-h-60 overflow-y-auto border border-border">
              {project.readme.slice(0, 500)}
              {project.readme.length > 500 && "..."}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ProjectDetailContent() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showStubs, setShowStubs] = useState(false);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const [projectRes, sessionsRes] = await Promise.all([
          fetch(`/api/projects/${projectId}`),
          fetch("/api/sessions"),
        ]);

        if (!projectRes.ok) {
          throw new Error("Project not found");
        }

        const projectData: ProjectDetail = await projectRes.json();
        setProject(projectData);

        if (sessionsRes.ok) {
          const allSessions: SessionInfo[] = await sessionsRes.json();
          const projectSessions = allSessions
            .filter((s) => s.directory === projectData.absolutePath)
            .sort((a, b) => b.time.updated - a.time.updated);
          setSessions(projectSessions);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load project");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [projectId]);

  const handleStartConversation = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "" }),
      });
      if (res.ok) {
        const session = await res.json();
        router.push(`/chat?session=${session.id}`);
      } else {
        router.push("/chat");
      }
    } catch {
      router.push("/chat");
    }
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading project...</div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-destructive">{error || "Project not found"}</p>
        <Button variant="ghost" onClick={() => router.push("/")}>
          Back to projects
        </Button>
      </div>
    );
  }

  const realSessions = sessions.filter(isRealSession);
  const stubCount = sessions.length - realSessions.length;
  const displaySessions = showStubs ? sessions : realSessions;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/")}
              aria-label="Back to projects"
            >
              &larr;
            </Button>
            <h1 className="text-lg font-semibold">{project.name}</h1>
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {project.absolutePath}
            </span>
          </div>
          <Button onClick={handleStartConversation}>
            Start conversation
          </Button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-muted-foreground uppercase tracking-wide text-sm">
                Conversations
              </h2>
              <div className="flex items-center gap-3">
                {stubCount > 0 && (
                  <button
                    onClick={() => setShowStubs((v) => !v)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    type="button"
                  >
                    {showStubs
                      ? `Hide ${stubCount} empty sessions`
                      : `+ ${stubCount} empty sessions`}
                  </button>
                )}
                <span className="text-xs text-muted-foreground">
                  {displaySessions.length} shown
                </span>
              </div>
            </div>

            {displaySessions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  No conversations yet. Start one!
                </p>
                <Button variant="ghost" onClick={handleStartConversation}>
                  Start a conversation
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                {displaySessions.map((session) => (
                  <SessionItem
                    key={session.id}
                    session={session}
                    onClick={() =>
                      router.push(`/chat?session=${session.id}`)
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <KnowledgePanel project={project} />
      </div>
    </div>
  );
}

export default function ProjectDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <ProjectDetailContent />
    </Suspense>
  );
}
