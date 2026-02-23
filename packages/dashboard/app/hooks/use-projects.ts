"use client";
import { useState, useEffect, useCallback } from "react";

export interface ProjectCard {
  id: string;
  name: string;
  description: string;
  absolutePath: string;
  techStack: string[];
  detectedFiles: string[];
  lastActivity?: string;
}

export function useProjects() {
  const [projects, setProjects] = useState<ProjectCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/projects");
      if (!response.ok) throw new Error("Failed to fetch projects");
      const data = await response.json();
      setProjects(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createProject = useCallback(
    async (name: string): Promise<ProjectCard> => {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create project");
      }

      const project = await response.json();
      setProjects((prev) => [...prev, project].sort((a, b) => a.name.localeCompare(b.name)));
      return project;
    },
    [],
  );

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return {
    projects,
    isLoading,
    error,
    createProject,
    refetch: fetchProjects,
  };
}
