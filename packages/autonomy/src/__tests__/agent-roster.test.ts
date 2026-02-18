import { describe, expect, it } from "bun:test";
import { getAgent, listAgents, selectAgent } from "../agent-roster.js";

describe("agent-roster", () => {
  it("contains Amanda's predefined teammate roster", () => {
    const agents = listAgents();
    const names = agents.map((agent) => agent.name);

    expect(agents.length).toBeGreaterThanOrEqual(10);
    expect(names).toEqual(
      expect.arrayContaining([
        "prometheus",
        "sisyphus",
        "muse",
        "devils-advocate",
        "oracle",
        "metis",
        "momus",
        "atlas",
        "explore",
        "librarian",
      ]),
    );
  });

  it("selects the right teammate by specialty keywords", () => {
    const cases: Array<{ task: string; expected: string }> = [
      {
        task: "Plan architecture strategy for the next quarter",
        expected: "prometheus",
      },
      {
        task: "Implement the API and debug failing tests",
        expected: "sisyphus",
      },
      {
        task: "Brainstorm creative alternative launch ideas",
        expected: "muse",
      },
      {
        task: "Review critically and challenge assumptions in this plan",
        expected: "devils-advocate",
      },
      {
        task: "Evaluate long-term architecture decision tradeoffs",
        expected: "oracle",
      },
      {
        task: "What am I missing? find gaps before planning",
        expected: "metis",
      },
      {
        task: "Validate the proposal and verify accuracy",
        expected: "momus",
      },
      {
        task: "Document and catalog this knowledge",
        expected: "atlas",
      },
      {
        task: "Search codebase: where is session routing implemented?",
        expected: "explore",
      },
      {
        task: "Find docs and best practice for this library",
        expected: "librarian",
      },
    ];

    for (const testCase of cases) {
      expect(selectAgent(testCase.task)?.name).toBe(testCase.expected);
    }
  });

  it("returns null for unknown tasks and unknown teammates", () => {
    expect(selectAgent("compose a jazz chord progression")).toBeNull();
    expect(getAgent("nonexistent")).toBeNull();
  });
});
