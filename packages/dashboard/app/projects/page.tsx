"use client";
import { useState, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useProjects, type ProjectCard } from "@/app/hooks/use-projects";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function ProjectCardItem({ project }: { project: ProjectCard }) {
  const router = useRouter();

  return (
    <Card
      className="hover:border-primary/50 transition-colors cursor-pointer"
      onClick={() => router.push(`/projects/${project.id}`)}
    >
      <CardHeader>
        <CardTitle className="truncate">{project.name}</CardTitle>
        {project.description && (
          <CardDescription className="line-clamp-2">
            {project.description}
          </CardDescription>
        )}
      </CardHeader>
      {project.techStack.length > 0 && (
        <CardContent>
          <div className="flex flex-wrap gap-1.5">
            {project.techStack.map((tech) => (
              <span
                key={tech}
                className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full"
              >
                {tech}
              </span>
            ))}
          </div>
        </CardContent>
      )}
      <CardFooter>
        <span className="text-xs text-muted-foreground">
          {project.lastActivity
            ? `Active ${project.lastActivity}`
            : "No recent activity"}
        </span>
      </CardFooter>
    </Card>
  );
}

function CreateProjectModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) return;
    setIsCreating(true);
    setError("");
    try {
      await onCreate(name.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Create project"
    >
      <div className="bg-card rounded-xl p-6 w-full max-w-md border border-border shadow-lg">
        <h2 className="text-lg font-semibold mb-4">Create Project</h2>
        <Input
          placeholder="Project name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
          }}
          autoFocus
          className="mb-3"
        />
        {error && <p className="text-destructive text-sm mb-3">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || isCreating}
          >
            {isCreating ? "Creating..." : "Create"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SkeletonCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader>
            <div className="h-5 w-32 bg-muted rounded" />
            <div className="h-4 w-48 bg-muted rounded mt-2" />
          </CardHeader>
          <CardContent>
            <div className="flex gap-1.5">
              <div className="h-5 w-16 bg-muted rounded-full" />
              <div className="h-5 w-20 bg-muted rounded-full" />
            </div>
          </CardContent>
          <CardFooter>
            <div className="h-3 w-24 bg-muted rounded" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

function ProjectsPage() {
  const { projects, isLoading, error, createProject, refetch } = useProjects();
  const [showCreate, setShowCreate] = useState(false);
  const router = useRouter();

  const handleCreate = useCallback(
    async (name: string) => {
      const project = await createProject(name);
      router.push(`/projects/${project.id}`);
    },
    [createProject, router],
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/chat"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Back to chat"
            >
              &larr;
            </Link>
            <h1 className="text-xl font-semibold">Projects</h1>
          </div>
          <Button onClick={() => setShowCreate(true)}>+ Create Project</Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {isLoading ? (
          <SkeletonCards />
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-destructive mb-4">
              Failed to load projects
            </p>
            <Button variant="ghost" onClick={refetch}>
              Retry
            </Button>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 max-w-lg mx-auto text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <span className="text-primary text-2xl font-bold">A</span>
            </div>
            <h2 className="text-2xl font-semibold mb-3">Welcome to Arachne</h2>
            <p className="text-muted-foreground mb-2">
              Your personal AI assistant platform. Each project gets its own context-firewalled workspace.
            </p>
            <p className="text-muted-foreground text-sm mb-8">
              Create a new project below, or drop any folder with a package.json or AGENTS.md
              into your dev directory and it will appear here automatically.
            </p>
            <div className="flex gap-3">
              <Button onClick={() => setShowCreate(true)}>
                Create your first project
              </Button>
              <Button variant="ghost" onClick={() => router.push("/chat")}>
                Skip to chat
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <ProjectCardItem key={project.id} project={project} />
            ))}
          </div>
        )}
      </main>

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}

export default function Projects() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <ProjectsPage />
    </Suspense>
  );
}
