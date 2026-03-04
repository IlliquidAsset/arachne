"use client";
import { useState, useRef, useEffect } from "react";

const MODELS = [
  { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
  { id: "claude-opus-4-20250514", label: "Claude Opus 4" },
  { id: "grok-3", label: "Grok 3" },
  { id: "grok-3-mini", label: "Grok 3 Mini" },
];

interface ModelSelectorProps {
  selectedModel: string | null;
  onModelChange: (model: string | null) => void;
}

export function ModelSelector({ selectedModel, onModelChange }: ModelSelectorProps) {
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

  const current = MODELS.find((m) => m.id === selectedModel);
  const displayLabel = current?.label ?? "Default Model";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="Select model"
      >
        <span className="font-medium">{displayLabel}</span>
        <span className="text-[10px] opacity-60">&#9662;</span>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-1 w-48 rounded-lg border border-border bg-popover shadow-lg z-50 py-1">
          <button
            onClick={() => {
              onModelChange(null);
              setOpen(false);
            }}
            className={`w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors ${
              selectedModel === null ? "bg-accent" : ""
            }`}
          >
            Default Model
          </button>
          {MODELS.map((model) => (
            <button
              key={model.id}
              onClick={() => {
                onModelChange(model.id);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors ${
                model.id === selectedModel ? "bg-accent" : ""
              }`}
            >
              {model.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
