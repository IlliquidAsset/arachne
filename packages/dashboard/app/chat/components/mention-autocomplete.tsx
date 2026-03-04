"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import type { AgentInfo } from "@/app/hooks/use-agents";

interface MentionAutocompleteProps {
  agents: AgentInfo[];
  text: string;
  cursorPosition: number;
  onSelect: (agentName: string, replaceStart: number, replaceEnd: number) => void;
  anchorRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function MentionAutocomplete({
  agents,
  text,
  cursorPosition,
  onSelect,
  anchorRef,
}: MentionAutocompleteProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  // Find the @ mention in progress
  const mentionMatch = getMentionContext(text, cursorPosition);

  const filtered = mentionMatch
    ? agents.filter((a) =>
        a.name.toLowerCase().startsWith(mentionMatch.query.toLowerCase()),
      )
    : [];

  const isVisible = filtered.length > 0;

  // Reset active index when filtered list changes
  useEffect(() => {
    setActiveIndex(0);
  }, [mentionMatch?.query]);

  const handleSelect = useCallback(
    (index: number) => {
      if (!mentionMatch || !filtered[index]) return;
      onSelect(
        filtered[index].name,
        mentionMatch.start,
        mentionMatch.end,
      );
    },
    [mentionMatch, filtered, onSelect],
  );

  // Keyboard navigation — called from parent's onKeyDown
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isVisible) return false;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % filtered.length);
        return true;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
        return true;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        handleSelect(activeIndex);
        return true;
      }
      if (e.key === "Escape") {
        return true; // parent will handle
      }
      return false;
    },
    [isVisible, filtered.length, activeIndex, handleSelect],
  );

  if (!isVisible) return null;

  return (
    <div
      ref={menuRef}
      className="absolute bottom-full left-0 mb-1 w-56 rounded-lg border border-border bg-popover shadow-lg z-50 py-1 max-h-48 overflow-y-auto"
    >
      {filtered.map((agent, i) => (
        <button
          key={agent.name}
          onMouseDown={(e) => {
            e.preventDefault(); // prevent blur
            handleSelect(i);
          }}
          className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
            i === activeIndex ? "bg-accent" : "hover:bg-accent/50"
          }`}
        >
          <span className="capitalize font-medium">@{agent.name}</span>
          <span className="text-xs text-muted-foreground ml-2">{agent.specialty}</span>
        </button>
      ))}
    </div>
  );
}

// Expose handleKeyDown via a ref-based pattern
MentionAutocomplete.useKeyHandler = function useKeyHandler(
  agents: AgentInfo[],
  text: string,
  cursorPosition: number,
  onSelect: (agentName: string, replaceStart: number, replaceEnd: number) => void,
) {
  const mentionMatch = getMentionContext(text, cursorPosition);
  const filtered = mentionMatch
    ? agents.filter((a) =>
        a.name.toLowerCase().startsWith(mentionMatch.query.toLowerCase()),
      )
    : [];

  const [activeIndex, setActiveIndex] = useState(0);
  const isVisible = filtered.length > 0;

  useEffect(() => {
    setActiveIndex(0);
  }, [mentionMatch?.query]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isVisible) return false;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % filtered.length);
        return true;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
        return true;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        if (mentionMatch && filtered[activeIndex]) {
          e.preventDefault();
          onSelect(filtered[activeIndex].name, mentionMatch.start, mentionMatch.end);
          return true;
        }
      }
      if (e.key === "Escape") {
        return true;
      }
      return false;
    },
    [isVisible, filtered, activeIndex, mentionMatch, onSelect],
  );

  return { isVisible, filtered, activeIndex, handleKeyDown };
};

// Extract @ mention context from text at cursor position
function getMentionContext(
  text: string,
  cursor: number,
): { query: string; start: number; end: number } | null {
  // Look backwards from cursor for @
  const before = text.slice(0, cursor);
  const atIndex = before.lastIndexOf("@");
  if (atIndex === -1) return null;

  // @ must be at start of word (beginning of text or preceded by whitespace)
  if (atIndex > 0 && !/\s/.test(before[atIndex - 1])) return null;

  const query = before.slice(atIndex + 1);
  // Must be a valid partial agent name (alphanumeric + dash)
  if (!/^[\w-]*$/.test(query)) return null;

  return { query, start: atIndex, end: cursor };
}
