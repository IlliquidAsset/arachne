export type ProjectState =
  | "discovered"
  | "server-running"
  | "server-stopped"
  | "error"

/** Signals that indicate a directory is an OpenCode project */
export const OC_SIGNALS = [
  ".opencode",
  "AGENTS.md",
  ".opencode.json",
  ".opencodeignore",
] as const

/** Weaker signals — present in most JS/TS projects */
export const WEAK_SIGNALS = ["package.json"] as const

/** All detectable signals */
export type DetectionSignal =
  | (typeof OC_SIGNALS)[number]
  | (typeof WEAK_SIGNALS)[number]

/** Default directories to skip when scanning */
export const DEFAULT_IGNORE = [
  "node_modules",
  ".git",
  "dist",
  ".next",
  ".cache",
  ".sisyphus",
] as const

export interface ProjectInfo {
  /** Slug derived from directory name */
  id: string
  /** Human-readable name (from package.json or directory name) */
  name: string
  /** Absolute path to the project root */
  absolutePath: string
  /** Which OC detection signals were found */
  detectedFiles: string[]
  /** Current project lifecycle state */
  state: ProjectState
  /** Server port if running */
  serverPort?: number
  /** Server URL if running */
  serverUrl?: string
}

export type ProjectChangeEvent =
  | { type: "added"; project: ProjectInfo }
  | { type: "removed"; project: ProjectInfo }
  | { type: "state-changed"; project: ProjectInfo; previousState: ProjectState }

export type OnChangeCallback = (event: ProjectChangeEvent) => void
