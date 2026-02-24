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

const AGENT_COLORS: Record<string, { border: string; bg: string; label: string }> = {
  oracle: { border: "border-l-purple-500", bg: "bg-purple-500/5", label: "Oracle" },
  metis: { border: "border-l-blue-500", bg: "bg-blue-500/5", label: "Metis" },
  momus: { border: "border-l-rose-500", bg: "bg-rose-500/5", label: "Momus" },
  explore: { border: "border-l-green-500", bg: "bg-green-500/5", label: "Explore" },
  librarian: { border: "border-l-cyan-500", bg: "bg-cyan-500/5", label: "Librarian" },
  "visual-engineering": { border: "border-l-pink-500", bg: "bg-pink-500/5", label: "Visual" },
  "sisyphus-junior": { border: "border-l-amber-500", bg: "bg-amber-500/5", label: "Worker" },
  quick: { border: "border-l-emerald-500", bg: "bg-emerald-500/5", label: "Quick" },
  deep: { border: "border-l-indigo-500", bg: "bg-indigo-500/5", label: "Deep" },
  ultrabrain: { border: "border-l-violet-500", bg: "bg-violet-500/5", label: "Ultra" },
  artistry: { border: "border-l-fuchsia-500", bg: "bg-fuchsia-500/5", label: "Artistry" },
  "unspecified-low": { border: "border-l-slate-400", bg: "bg-slate-400/5", label: "Low" },
  "unspecified-high": { border: "border-l-orange-500", bg: "bg-orange-500/5", label: "High" },
  writing: { border: "border-l-teal-500", bg: "bg-teal-500/5", label: "Writing" },
};

const DEFAULT_AGENT = { border: "border-l-transparent", bg: "", label: "" };

function agentStyle(agent?: string) {
  if (!agent) return DEFAULT_AGENT;
  return AGENT_COLORS[agent] || { border: "border-l-slate-500", bg: "bg-slate-500/5", label: agent };
}

function humanToolName(raw: string | undefined): string {
  if (!raw) return "Working...";
  return TOOL_DISPLAY_NAMES[raw] || raw.replace(/^mcp_/, "").replace(/_/g, " ");
}

interface ThinkingEntryProps {
  entry: ThinkingEntry;
}

export function ThinkingEntryComponent({ entry }: ThinkingEntryProps) {
  const colors = agentStyle(entry.agent);
  const hasAgent = !!entry.agent && colors.label;

  switch (entry.type) {
    case "reasoning":
      return (
        <div className={`mb-3 border-l-2 pl-2 rounded-r ${colors.border} ${colors.bg}`}>
          <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
            <span>\ud83d\udcad</span>
            <span>Reasoning</span>
            {hasAgent && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted font-medium">
                {colors.label}
              </span>
            )}
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

    case "tool-start": {
      const isDispatch = entry.tool === "mcp_task" || entry.tool === "mcp_arachne_dispatch";
      return (
        <div className={`mb-2 border-l-2 pl-2 ${colors.border}`}>
          <div className="flex items-center gap-2 text-xs rounded-md border p-2">
            <span className="animate-pulse text-yellow-500">\u25cf</span>
            <span className="font-medium">{humanToolName(entry.tool)}</span>
            {isDispatch && hasAgent && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${colors.bg} font-medium`}>
                {colors.label}
              </span>
            )}
            <span className="text-muted-foreground font-mono text-[10px]">{entry.tool}</span>
          </div>
        </div>
      );
    }

    case "tool-end":
      return (
        <div className={`mb-3 border-l-2 pl-2 ${colors.border}`}>
          <div className="rounded-md border p-2">
            <div className="flex items-center gap-2 text-xs mb-1">
              <span className="text-green-500">\u2713</span>
              <span className="font-medium">{humanToolName(entry.tool)}</span>
              {hasAgent && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${colors.bg} font-medium`}>
                  {colors.label}
                </span>
              )}
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
        <div className={`mb-3 flex items-center gap-2 text-xs text-muted-foreground border-t border-border/30 pt-2 border-l-2 pl-2 ${colors.border}`}>
          <span>\ud83d\udcca</span>
          <span>Step complete{entry.tokens?.total ? ` \u2014 ${entry.tokens.total} tokens` : ""}</span>
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
