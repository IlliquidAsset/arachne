export interface SessionInfo {
  id: string;
  title: string;           // OpenCode always returns it (may be empty)
  projectID: string;        // For project grouping
  directory: string;        // For project identification
  parentID?: string;        // Optional parent session
  version?: string;         // Session version
  time: {
    created: number;
    updated: number;
  };
}
