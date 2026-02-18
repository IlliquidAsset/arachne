import { describe, expect, it } from "bun:test";
import type { AgentEntry } from "../agent-roster.js";
import { getAgent } from "../agent-roster.js";
import { generatePreamble } from "../preamble.js";

function requireAgent(name: string): AgentEntry {
  const agent = getAgent(name);
  if (!agent) {
    throw new Error(`Expected agent ${name} to exist`);
  }
  return agent;
}

describe("generatePreamble", () => {
  it("creates creative framing for Muse", () => {
    const preamble = generatePreamble(requireAgent("muse"), {
      taskSummary: "Generate options for onboarding experiments",
    });

    expect(preamble).toContain(
      "Amanda needs creative exploration. Diverge freely",
    );
    expect(preamble).toContain("Generate options for onboarding experiments");
  });

  it("creates adversarial framing for Devil's Advocate", () => {
    const preamble = generatePreamble(requireAgent("devils-advocate"), {
      taskSummary: "Critique this migration plan",
    });

    expect(preamble).toContain(
      "Amanda needs adversarial critique. Challenge assumptions",
    );
  });

  it("creates implementation framing for Sisyphus", () => {
    const preamble = generatePreamble(requireAgent("sisyphus"), {
      taskSummary: "Implement the fallback parser",
    });

    expect(preamble).toContain(
      "Amanda needs implementation. Execute this plan",
    );
  });

  it("uses default framing and includes Commander role + project context", () => {
    const preamble = generatePreamble(requireAgent("prometheus"), {
      role: "Strategic Architect",
      project: "northstar",
      taskSummary: "Define the Q2 planning framework",
    });

    expect(preamble).toContain(
      "You're working with Amanda, Commander's orchestrator",
    );
    expect(preamble).toContain("Current Commander role: Strategic Architect");
    expect(preamble).toContain("Project context: northstar");
    expect(preamble).toContain("Define the Q2 planning framework");
  });
});
