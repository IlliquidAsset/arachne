import { checkInvariantViolation, EVOLVABLE_SECTIONS } from "./invariants"

export function generateEvolutionPrompt(
  legendText: string,
  interactionData: { recentTopics: string[]; sessionCount: number },
): string {
  const topics = interactionData.recentTopics.join(", ") || "none"

  return [
    "You are Muse, performing a periodic evolution pass on Amanda's Legend.",
    "",
    "## Instructions",
    "- Review the Legend against recent interaction patterns",
    "- Identify traits that may need updating based on how Amanda has been used",
    "- Only modify EVOLVABLE sections: cross-domain analogies, interaction patterns, humor calibration, technical depth",
    "- NEVER modify: core identity, principles, forbidden patterns, education, career arc",
    "- Produce a refined Legend with evolution changes integrated",
    "",
    `## Recent Interaction Data`,
    `- Topics: ${topics}`,
    `- Session count: ${interactionData.sessionCount}`,
    "",
    "## Current Legend (first 1000 chars)",
    legendText.slice(0, 1000),
    "",
    "Return the evolved Legend.",
  ].join("\n")
}

export function validateEvolution(
  originalText: string,
  evolvedText: string,
): { valid: boolean; violations: string[] } {
  const { violated, violations } = checkInvariantViolation(originalText, evolvedText)
  return { valid: !violated, violations }
}

export function getEvolvableSections(): string[] {
  return [...EVOLVABLE_SECTIONS]
}
