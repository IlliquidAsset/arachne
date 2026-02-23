"use client";
import type { ThinkingEntry } from "@/app/hooks/use-thinking";

const TOOL_DISPLAY_NAMES: Record<string, string> = {
  mcp_read: "Reading file",
  mcp_write: "Writing file",
  mcp_edit: "Editing file",
  mcp_grep: "Searching content",
  mcp_glob: "Finding files",
  mcp_bash: "Running command",
  mcp_task: "Delegating task",
  mcp_question: "Asking question",
  mcp_todowrite: "Updating tasks",
  mcp_webfetch: "Fetching web page",
  mcp_google_search: "Searching web",
  mcp_lsp_diagnostics: "Checking diagnostics",
  mcp_lsp_goto_definition: "Looking up definition",
  mcp_lsp_find_references: "Finding references",
  mcp_lsp_symbols: "Finding symbols",
  mcp_lsp_rename: "Renaming symbol",
  mcp_ast_grep_search: "Searching code patterns",
  mcp_ast_grep_replace: "Replacing code patterns",
  mcp_skill: "Loading skill",
  mcp_look_at: "Analyzing media",
  mcp_interactive_bash: "Running interactive command",
  mcp_context7_resolve: "Looking up library",
  mcp_context7_query: "Querying docs",
  mcp_arachne_dispatch: "Dispatching to agent",
  mcp_arachne_projects: "Listing projects",
  mcp_session_list: "Listing sessions",
  mcp_session_read: "Reading session",
  mcp_session_search: "Searching sessions",
  mcp_background_output: "Getting task result",
  mcp_background_cancel: "Cancelling task",
};

function humanToolName(raw: string | undefined): string {
  if (!raw) return "Working...";
  return TOOL_DISPLAY_NAMES[raw] || raw.replace(/^mcp_/, "").replace(/_/g, " ");
}

interface ThinkingEntryProps {
  entry: ThinkingEntry;
}

export function ThinkingEntryComponent({ entry }: ThinkingEntryProps) {
  switch (entry.type) {
    case "reasoning":
      return (
        <div className="mb-3">
          <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
            <span>💭</span>
            <span>Reasoning</span>
            {entry.timestamp && (
              <span className="text-xs opacity-50">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground bg-muted/30 rounded-md border border-border/50 p-2.5 max-h-48 overflow-y-auto whitespace-pre-wrap">
            {entry.text}
          </div>
        </div>
      );

    case "tool-start":
      return (
        <div className="mb-2">
          <div className="flex items-center gap-2 text-xs rounded-md border p-2">
            <span className="animate-pulse text-yellow-500">●</span>
            <span className="font-medium">{humanToolName(entry.tool)}</span>
            <span className="text-muted-foreground font-mono text-[10px]">{entry.tool}</span>
          </div>
        </div>
      );

    case "tool-end":
      return (
        <div className="mb-3">
          <div className="rounded-md border p-2">
            <div className="flex items-center gap-2 text-xs mb-1">
              <span className="text-green-500">✓</span>
              <span className="font-medium">{humanToolName(entry.tool)}</span>
              <span className="text-muted-foreground font-mono text-[10px]">{entry.tool}</span>
            </div>
            {entry.output && (
              <pre className="text-xs text-muted-foreground bg-muted/50 rounded p-2 mt-1 max-h-32 overflow-y-auto font-mono whitespace-pre-wrap break-all">
                {entry.output}
              </pre>
            )}
          </div>
        </div>
      );

    case "step-finish":
      return (
        <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground border-t border-border/30 pt-2">
          <span>📊</span>
          <span>Step complete{entry.tokens?.total ? ` — ${entry.tokens.total} tokens` : ""}</span>
          {entry.reason && <span className="opacity-50">({entry.reason})</span>}
        </div>
      );

    case "step-start":
      return (
        <div className="mb-2 border-t border-border/20 pt-1">
          <div className="text-xs text-muted-foreground/50">New step</div>
        </div>
      );

    default:
      return null;
  }
}
