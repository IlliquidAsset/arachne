"use client";
import { useState, useEffect } from "react";

export interface AgentInfo {
  name: string;
  specialty: string;
}

export function useAgents() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchAgents() {
      try {
        const res = await fetch("/api/agents");
        if (res.ok && !cancelled) {
          const data = await res.json();
          setAgents(data.agents ?? []);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchAgents();
    return () => { cancelled = true; };
  }, []);

  return { agents, isLoading };
}
