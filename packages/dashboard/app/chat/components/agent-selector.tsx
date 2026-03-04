"use client";
import { useState, useRef, useEffect } from "react";
import type { AgentInfo } from "@/app/hooks/use-agents";

interface AgentSelectorProps {
  agents: AgentInfo[];
  selectedAgent: string;
  onAgentChange: (name: string) => void;
}

export function AgentSelector({ agents, selectedAgent, onAgentChange }: AgentSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const current = agents.find((a) => a.name === selectedAgent);
  const displayName = current?.name ?? selectedAgent;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="Select agent"
      >
        <span className="capitalize font-medium">{displayName}</span>
        <span className="text-[10px] opacity-60">&#9662;</span>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-1 w-56 rounded-lg border border-border bg-popover shadow-lg z-50 py-1 max-h-64 overflow-y-auto">
          {agents.map((agent) => (
            <button
              key={agent.name}
              onClick={() => {
                onAgentChange(agent.name);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors ${
                agent.name === selectedAgent ? "bg-accent" : ""
              }`}
            >
              <div className="font-medium capitalize">{agent.name}</div>
              <div className="text-xs text-muted-foreground">{agent.specialty}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
