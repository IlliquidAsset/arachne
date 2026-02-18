import type { TargetingOptions, TargetingStrategy } from "./types"

export interface OverrideResult {
  options: TargetingOptions
  cleanedMessage: string
}

interface PatternRule {
  regex: RegExp
  extract: (match: RegExpExecArray) => Partial<TargetingOptions>
}

const PATTERNS: PatternRule[] = [
  // New session (check before title keyword patterns)
  {
    regex: /\b(?:in\s+(?:a|the)\s+)?new\s+session\b/i,
    extract: () => ({ newSession: true }),
  },
  {
    regex: /\bstart\s+fresh\b/i,
    extract: () => ({ newSession: true }),
  },
  // Explicit session ID
  {
    regex: /\bin\s+session\s+(ses_\w+)\b/i,
    extract: (m) => ({ sessionId: m[1] }),
  },
  // Continue / pick up
  {
    regex: /\bcontinue\s+where\s+\w+\s+left\s+off\b/i,
    extract: (): Partial<TargetingOptions> => ({
      strategyHint: "most_recent" as TargetingStrategy,
    }),
  },
  {
    regex: /\bpick\s+up\s+where\s+\w+\s+left\s+off\b/i,
    extract: (): Partial<TargetingOptions> => ({
      strategyHint: "most_recent" as TargetingStrategy,
    }),
  },
  // Title keyword (last — "in the <keyword> session" / "in session about <keyword>")
  {
    regex: /\bin\s+the\s+(\w+)\s+session\b/i,
    extract: (m) => ({ titleKeyword: m[1] }),
  },
  {
    regex: /\bin\s+session\s+about\s+(\w+)\b/i,
    extract: (m) => ({ titleKeyword: m[1] }),
  },
]

function cleanAfterRemoval(text: string): string {
  return text
    .replace(/\s*,\s*,\s*/g, ", ") // collapse double commas
    .replace(/^[\s,;]+/, "") // leading junk
    .replace(/[\s,;]+$/, "") // trailing junk
    .replace(/\s{2,}/g, " ") // collapse whitespace
    .trim()
}

export function parseOverrides(message: string): OverrideResult {
  const options: TargetingOptions = {}
  let cleaned = message

  for (const rule of PATTERNS) {
    const match = rule.regex.exec(cleaned)
    if (match) {
      Object.assign(options, rule.extract(match))
      const before = cleaned.slice(0, match.index)
      const after = cleaned.slice(match.index + match[0].length)
      cleaned = cleanAfterRemoval(before + " " + after)
      break // first matching override wins
    }
  }

  return { options, cleanedMessage: cleaned }
}
