import type { SessionInfo } from "../client/types"
import type { TargetingResult, TargetingOptions, TargetingStrategy } from "./types"

export const ACTIVE_THRESHOLD_MS = 5 * 60 * 1000

const STOP_WORDS = new Set([
  "the", "a", "an", "in", "on", "for", "is", "it", "to", "of",
  "and", "or", "but", "not", "with", "at", "by", "from", "up",
  "about", "into", "through", "during", "before", "after",
  "this", "that", "these", "those", "i", "me", "my", "we", "our",
  "you", "your", "he", "his", "she", "her", "they", "them", "their",
  "can", "will", "just", "should", "now", "also", "like", "get",
  "make", "let", "do", "did", "has", "have", "had", "was", "were",
  "be", "been", "being", "so", "very", "too", "if",
])

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w))
}

function wordOverlap(messageWords: string[], titleWords: string[]): number {
  let count = 0
  for (const mw of messageWords) {
    for (const tw of titleWords) {
      if (mw === tw || mw.startsWith(tw) || tw.startsWith(mw)) {
        count++
        break
      }
    }
  }
  return count
}

function makeResult(
  sessionId: string | null,
  strategy: TargetingStrategy,
  confidence: number,
  needsCreate: boolean,
): TargetingResult {
  return { sessionId, strategy, confidence, needsCreate }
}

export function findBestSession(
  sessions: SessionInfo[],
  message: string,
  opts?: TargetingOptions,
  now?: number,
): TargetingResult {
  const currentTime = now ?? Date.now()

  if (opts?.sessionId) {
    return makeResult(opts.sessionId, "user_specified", 1.0, false)
  }

  if (opts?.newSession) {
    return makeResult(null, "new_session", 1.0, true)
  }

  if (sessions.length === 0) {
    return makeResult(null, "create_new", 0.3, true)
  }

  if (opts?.strategyHint !== "most_recent") {
    const activeSessions = sessions
      .filter((s) => currentTime - s.time.updated < ACTIVE_THRESHOLD_MS)
      .sort((a, b) => b.time.updated - a.time.updated)

    if (activeSessions.length > 0) {
      return makeResult(activeSessions[0].id, "active_session", 0.9, false)
    }
  }

  if (opts?.titleKeyword) {
    const keyword = opts.titleKeyword.toLowerCase()
    const match = sessions.find((s) =>
      s.title.toLowerCase().includes(keyword),
    )
    if (match) {
      return makeResult(match.id, "topic_match", 0.85, false)
    }
  }

  if (opts?.strategyHint === "most_recent") {
    const sorted = [...sessions].sort((a, b) => b.time.updated - a.time.updated)
    return makeResult(sorted[0].id, "most_recent", 0.8, false)
  }

  const messageKeywords = extractKeywords(message)
  if (messageKeywords.length > 0) {
    let bestSession: SessionInfo | undefined
    let bestOverlap = 0

    for (const session of sessions) {
      const titleKeywords = extractKeywords(session.title)
      const overlap = wordOverlap(messageKeywords, titleKeywords)
      if (overlap >= 2 && overlap > bestOverlap) {
        bestOverlap = overlap
        bestSession = session
      }
    }

    if (bestSession) {
      return makeResult(bestSession.id, "topic_match", 0.7, false)
    }
  }

  const sorted = [...sessions].sort((a, b) => b.time.updated - a.time.updated)
  return makeResult(sorted[0].id, "most_recent", 0.5, false)
}
