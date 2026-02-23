"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SessionInfo } from "@/app/lib/types";

export function useSessions() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const hasAutoCreatedRef = useRef(false);
  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/sessions');
      if (!response.ok) throw new Error('Failed to fetch sessions');
      const data = await response.json();
      const sorted = data.sort((a: SessionInfo, b: SessionInfo) => 
        b.time.updated - a.time.updated
      );
      setSessions(sorted);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const setActiveSession = useCallback((id: string) => {
    setActiveSessionId(id);
    router.push(`/chat?session=${id}`);
  }, [router]);
  
  const createSession = useCallback(async (title?: string) => {
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      });
      
      if (!response.ok) throw new Error('Failed to create session');
      const newSession = await response.json();
      
      setSessions((prev) => [newSession, ...prev]);
      setActiveSession(newSession.id);
      
      return newSession;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [setActiveSession]);
  
  const deleteSession = useCallback(
    async (id: string) => {
      try {
        const response = await fetch(`/api/sessions/${id}`, {
          method: "DELETE",
        });

        if (!response.ok) throw new Error("Failed to delete session");

        const isActive = activeSessionId === id;

        setSessions((prev) => {
          const remaining = prev.filter((s) => s.id !== id);
          return remaining;
        });

        if (isActive) {
          const remaining = sessionsRef.current.filter((s) => s.id !== id);
          if (remaining.length > 0) {
            setActiveSession(remaining[0].id);
          } else {
            setActiveSessionId(null);
          }
        }
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [activeSessionId, setActiveSession],
  );
  
  const updateSessionTitle = useCallback((sessionInfo: { id: string; title: string }) => {
    setSessions((prev) => prev.map((s) =>
      s.id === sessionInfo.id ? { ...s, title: sessionInfo.title } : s
    ));
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchSessions();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchSessions]);
  
  useEffect(() => {
    const urlSession = searchParams.get('session');
    if (urlSession && urlSession !== activeSessionId) {
      setActiveSessionId(urlSession);
    } else if (!urlSession && sessions.length > 0 && !activeSessionId) {
      setActiveSession(sessions[0].id);
    }
  }, [searchParams, sessions, activeSessionId, setActiveSession]);
  
  useEffect(() => {
    if (!isLoading && sessions.length === 0 && !hasAutoCreatedRef.current) {
      hasAutoCreatedRef.current = true;
      queueMicrotask(() => {
        createSession().catch(() => {
          void 0;
        });
      });
    }
  }, [sessions, isLoading, createSession]);
  
  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;

  const groupedSessions = useMemo(() => {
    const groups = new Map<string, { directory: string; projectName: string; sessions: SessionInfo[] }>();

    for (const session of sessions) {
      const dir = session.directory || "unknown";
      const projectName = dir.split("/").filter(Boolean).pop() || "General";

      if (!groups.has(dir)) {
        groups.set(dir, { directory: dir, projectName, sessions: [] });
      }
      groups.get(dir)!.sessions.push(session);
    }

    return Array.from(groups.values()).sort((a, b) => {
      const aLatest = Math.max(...a.sessions.map(s => s.time.updated));
      const bLatest = Math.max(...b.sessions.map(s => s.time.updated));
      return bLatest - aLatest;
    });
  }, [sessions]);
  
  return {
    sessions,
    groupedSessions,
    activeSession,
    activeSessionId,
    setActiveSession,
    createSession,
    deleteSession,
    isLoading,
    error,
    refetch: fetchSessions,
    updateSessionTitle,
  };
}
