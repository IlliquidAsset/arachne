"use client";
import { useState } from "react";

interface ToolIndicatorProps {
  toolName: string;
  status: "running" | "complete";
  output?: string;
}

export function ToolIndicator({
  toolName,
  status,
  output,
}: ToolIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className="text-sm text-muted-foreground my-2"
      data-testid="tool-indicator"
    >
      <div className="flex items-center gap-2">
        {status === "running" ? "⚙️" : "✓"} Using {toolName}...
      </div>
      {output && (
        <>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs underline"
          >
            {isExpanded ? "Hide" : "Show"} output
          </button>
          {isExpanded && (
            <pre className="text-xs mt-2 bg-muted p-2 rounded">{output}</pre>
          )}
        </>
      )}
    </div>
  );
}
