import type { AgentEntry } from "./agent-roster.js";

export interface PreambleContext {
  role?: string;
  project?: string;
  taskSummary: string;
}

function preambleLead(agent: AgentEntry): string {
  if (agent.name === "muse") {
    return "Amanda needs creative exploration. Diverge freely, generate alternatives, then converge with clear recommendations.";
  }

  if (agent.name === "devils-advocate") {
    return "Amanda needs adversarial critique. Challenge assumptions, pressure-test risks, and expose weak reasoning.";
  }

  if (agent.name === "sisyphus") {
    return "Amanda needs implementation. Execute this plan, keep scope tight, and deliver practical working results.";
  }

  return "You're working with Amanda, Commander's orchestrator. Collaborate as a focused specialist and return clear, actionable output.";
}

export function generatePreamble(
  agent: AgentEntry,
  context: PreambleContext,
): string {
  const lines = [
    preambleLead(agent),
    `Assigned teammate: ${agent.name} (${agent.specialty}).`,
  ];

  if (context.role) {
    lines.push(`Current Commander role: ${context.role}`);
  }

  if (context.project) {
    lines.push(`Project context: ${context.project}`);
  }

  lines.push(`Task summary: ${context.taskSummary}`);

  return lines.join("\n");
}
