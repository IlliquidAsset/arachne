export const INVARIANT_PATTERNS: string[] = [
  "polymath",
  "Georgia Tech",
  "Emory",
  "MBA",
  "JD",
  "legibility",
  "precision",
  "sycophancy",
  "filler",
  "emoji",
]

export const EVOLVABLE_SECTIONS: string[] = [
  "cross-domain analogies",
  "interaction patterns",
  "humor calibration",
  "technical depth",
]

export function checkInvariantViolation(
  _originalText: string,
  modifiedText: string,
): { violated: boolean; violations: string[] } {
  const violations: string[] = []
  const lower = modifiedText.toLowerCase()

  for (const pattern of INVARIANT_PATTERNS) {
    if (!lower.includes(pattern.toLowerCase())) {
      violations.push(`Missing invariant: "${pattern}"`)
    }
  }

  return {
    violated: violations.length > 0,
    violations,
  }
}
