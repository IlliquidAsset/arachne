import type { Legend } from "./legend-schema"
import { checkInvariantViolation } from "./invariants"

export interface MuseRefinementRequest {
  legend: Legend
  discoveredContext: {
    projects: string[]
    services: string[]
    timezone: string
  }
}

export function generateRefinementPrompt(req: MuseRefinementRequest): string {
  const { legend, discoveredContext } = req
  const projects = discoveredContext.projects.join(", ") || "none discovered"
  const services = discoveredContext.services.join(", ") || "none discovered"

  return [
    "You are Muse, performing a subtle contextual refinement pass on Amanda's Legend.",
    "",
    "## Instructions",
    "- Add awareness of the discovered environment to the Legend",
    "- Do NOT rewrite — add at most 50 lines of contextual additions",
    "- Preserve ALL core identity, principles, and forbidden patterns EXACTLY",
    "- Keep Amanda's voice, tone, and structure intact",
    "",
    "## Discovered Environment",
    `- Projects: ${projects}`,
    `- Services: ${services}`,
    `- Timezone: ${discoveredContext.timezone}`,
    "",
    "## Current Legend",
    legend.personalityQuickReference,
    "",
    "## Current Identity",
    legend.partA.slice(0, 500),
    "",
    "Return the FULL refined Legend with your subtle additions integrated naturally.",
  ].join("\n")
}

function countDiffLines(original: string, modified: string): number {
  const origLines = original.split("\n")
  const modLines = modified.split("\n")
  const origSet = new Set(origLines)
  let diff = 0
  for (const line of modLines) {
    if (!origSet.has(line)) diff++
  }
  return diff
}

export function validateRefinement(
  originalText: string,
  refinedText: string,
): { valid: boolean; diffLineCount: number; invariantViolations: string[] } {
  const diffLineCount = countDiffLines(originalText, refinedText)
  const { violations } = checkInvariantViolation(originalText, refinedText)

  return {
    valid: diffLineCount < 50 && violations.length === 0,
    diffLineCount,
    invariantViolations: violations,
  }
}
