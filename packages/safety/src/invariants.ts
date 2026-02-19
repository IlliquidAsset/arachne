export const NON_EVOLVABLE_PERSONALITY_DIMENSIONS = [
  "core_identity",
  "commander_loyalty",
  "safety_compliance",
  "honesty",
] as const

export type PersonalityInvariantDimension =
  typeof NON_EVOLVABLE_PERSONALITY_DIMENSIONS[number]

export interface SpddInvariantCheckResult {
  violated: boolean
  violations: string[]
}

export interface SpddInvariantChecker {
  checkInvariantViolation: (
    originalText: string,
    modifiedText: string
  ) => SpddInvariantCheckResult
}

export interface PersonalityInvariantDependencies {
  spddInvariantChecker?: SpddInvariantChecker
}

export interface PersonalityInvariantResult {
  safe: boolean
  violations: string[]
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function normalizeContent(content: string): string {
  return content.replace(/\s+/g, " ").trim().toLowerCase()
}

function toDimensionPattern(dimension: PersonalityInvariantDimension): string {
  return dimension.split("_").map(escapeRegex).join("[\\s_-]*")
}

function extractKeyValueBlock(
  legendText: string,
  dimension: PersonalityInvariantDimension
): string | null {
  const pattern = toDimensionPattern(dimension)
  const keyValueRegex = new RegExp(`^\\s*${pattern}\\s*:\\s*(.+)$`, "im")
  const match = keyValueRegex.exec(legendText)
  return match ? match[1] : null
}

function extractHeadingBlock(
  legendText: string,
  dimension: PersonalityInvariantDimension
): string | null {
  const pattern = toDimensionPattern(dimension)
  const headingRegex = new RegExp(`^#{1,6}\\s*${pattern}\\b.*$`, "im")
  const headingMatch = headingRegex.exec(legendText)

  if (!headingMatch || headingMatch.index === undefined) {
    return null
  }

  const start = headingMatch.index + headingMatch[0].length
  const remaining = legendText.slice(start)
  const nextHeadingMatch = /\n#{1,6}\s+/.exec(remaining)
  const end = nextHeadingMatch ? nextHeadingMatch.index : remaining.length

  return remaining.slice(0, end).trim()
}

function extractInvariantBlock(
  legendText: string,
  dimension: PersonalityInvariantDimension
): string | null {
  const keyValueBlock = extractKeyValueBlock(legendText, dimension)
  if (keyValueBlock !== null) {
    return keyValueBlock
  }

  return extractHeadingBlock(legendText, dimension)
}

function checkDimensionModification(
  originalLegend: string,
  proposedLegend: string,
  dimension: PersonalityInvariantDimension
): string | null {
  const originalBlock = extractInvariantBlock(originalLegend, dimension)
  const proposedBlock = extractInvariantBlock(proposedLegend, dimension)

  if (originalBlock === null && proposedBlock === null) {
    return null
  }

  if (originalBlock === null) {
    return `Invariant dimension added unexpectedly: ${dimension}`
  }

  if (proposedBlock === null) {
    return `Invariant dimension removed: ${dimension}`
  }

  if (normalizeContent(originalBlock) !== normalizeContent(proposedBlock)) {
    return `Invariant dimension modified: ${dimension}`
  }

  return null
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values))
}

export function checkPersonalityInvariant(
  originalLegend: string,
  proposedLegend: string,
  deps: PersonalityInvariantDependencies = {}
): PersonalityInvariantResult {
  const violations: string[] = []

  if (deps.spddInvariantChecker) {
    const spddResult = deps.spddInvariantChecker.checkInvariantViolation(
      originalLegend,
      proposedLegend
    )

    if (spddResult.violated) {
      violations.push(...spddResult.violations)
    }
  }

  for (const dimension of NON_EVOLVABLE_PERSONALITY_DIMENSIONS) {
    const violation = checkDimensionModification(originalLegend, proposedLegend, dimension)
    if (violation) {
      violations.push(violation)
    }
  }

  const dedupedViolations = unique(violations)

  return {
    safe: dedupedViolations.length === 0,
    violations: dedupedViolations,
  }
}
