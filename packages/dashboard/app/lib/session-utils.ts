import type { SessionInfo } from "./types";

const STUB_TITLE_PATTERN = /^New session - \d{4}-\d{2}-\d{2}T/;

const SYSTEM_SESSION_TITLES = [
  "Amanda Voice Session",
] as const;

/** Returns true if the session should be visible in the sidebar (filters sub-agents, system sessions, stubs) */
export function isRealSession(session: SessionInfo): boolean {
  if (session.parentID) return false;
  if (!session.title) return false;
  if (STUB_TITLE_PATTERN.test(session.title)) return false;
  if (SYSTEM_SESSION_TITLES.some((t) => session.title.includes(t))) return false;
  return true;
}
