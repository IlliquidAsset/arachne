import { describe, it, expect } from "bun:test";
import {
  getSpendingSummary,
  getProviderBreakdown,
  getProjectBreakdown,
  type TrackerDependencies,
  type SpendingSummary,
  type ProviderUsage,
  type ProjectUsage,
} from "../tracker";
import type { DailySummary } from "../aggregator";

/**
 * Mock data simulating aggregator output.
 * 3 providers, 2 projects, across multiple days.
 */
const mockSummaries: DailySummary[] = [
  {
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    totalInputTokens: 5000,
    totalOutputTokens: 2000,
    totalCost: 0.045,
    requestCount: 5,
  },
  {
    provider: "anthropic",
    model: "claude-opus-4-20250514",
    totalInputTokens: 3000,
    totalOutputTokens: 1500,
    totalCost: 0.1575,
    requestCount: 2,
  },
  {
    provider: "xai",
    model: "grok-3",
    totalInputTokens: 2000,
    totalOutputTokens: 800,
    totalCost: 0.018,
    requestCount: 3,
  },
];

function createMockDeps(overrides?: Partial<TrackerDependencies>): TrackerDependencies {
  return {
    getDailySummary: (date: string) => mockSummaries,
    getDateRangeSummary: (start: string, end: string) => mockSummaries,
    getTotalSpend: (start?: string, end?: string) => 0.2205,
    getTokenUsage: (provider: string, start: string, end: string) => ({
      inputTokens: 5000,
      outputTokens: 2000,
      cost: 0.045,
    }),
    queryByDateRange: (start: string, end: string) => [
      { provider: "anthropic", model: "claude-sonnet-4-20250514", input_tokens: 3000, output_tokens: 1000, estimated_cost: 0.024, project: "arachne", timestamp: "2025-02-18T10:00:00Z" },
      { provider: "anthropic", model: "claude-sonnet-4-20250514", input_tokens: 2000, output_tokens: 1000, estimated_cost: 0.021, project: "arachne", timestamp: "2025-02-17T14:00:00Z" },
      { provider: "anthropic", model: "claude-opus-4-20250514", input_tokens: 3000, output_tokens: 1500, estimated_cost: 0.1575, project: "sideproject", timestamp: "2025-02-18T09:00:00Z" },
      { provider: "xai", model: "grok-3", input_tokens: 2000, output_tokens: 800, estimated_cost: 0.018, project: null, timestamp: "2025-02-16T08:00:00Z" },
    ],
    ...overrides,
  };
}

describe("tracker", () => {
  describe("getSpendingSummary", () => {
    it("returns daily summary with totalUsd and period", () => {
      const deps = createMockDeps();
      const summary = getSpendingSummary("day", deps);

      expect(summary.period).toBe("day");
      expect(typeof summary.totalUsd).toBe("number");
      expect(summary.totalUsd).toBeGreaterThan(0);
    });

    it("returns weekly summary", () => {
      const deps = createMockDeps();
      const summary = getSpendingSummary("week", deps);
      expect(summary.period).toBe("week");
      expect(typeof summary.totalUsd).toBe("number");
    });

    it("returns monthly summary", () => {
      const deps = createMockDeps();
      const summary = getSpendingSummary("month", deps);
      expect(summary.period).toBe("month");
    });

    it("includes byProvider breakdown", () => {
      const deps = createMockDeps();
      const summary = getSpendingSummary("day", deps);

      expect(summary.byProvider).toBeDefined();
      expect(typeof summary.byProvider).toBe("object");
      // Should have entries for anthropic and xai based on mock data
      expect(Object.keys(summary.byProvider).length).toBeGreaterThan(0);
    });

    it("byProvider includes inputTokens, outputTokens, cost", () => {
      const deps = createMockDeps();
      const summary = getSpendingSummary("day", deps);

      for (const [provider, usage] of Object.entries(summary.byProvider)) {
        expect(typeof usage.inputTokens).toBe("number");
        expect(typeof usage.outputTokens).toBe("number");
        expect(typeof usage.cost).toBe("number");
      }
    });

    it("includes byProject breakdown", () => {
      const deps = createMockDeps();
      const summary = getSpendingSummary("day", deps);

      expect(summary.byProject).toBeDefined();
      expect(typeof summary.byProject).toBe("object");
    });

    it("accepts optional date parameter", () => {
      let capturedDate = "";
      const deps = createMockDeps({
        getDailySummary: (date: string) => {
          capturedDate = date;
          return mockSummaries;
        },
      });

      getSpendingSummary("day", deps, { date: "2025-02-15" });
      expect(capturedDate).toBe("2025-02-15");
    });

    it("aggregates provider costs correctly from summaries", () => {
      const deps = createMockDeps();
      const summary = getSpendingSummary("day", deps);

      // anthropic should combine sonnet + opus
      if (summary.byProvider["anthropic"]) {
        expect(summary.byProvider["anthropic"].inputTokens).toBe(8000); // 5000+3000
        expect(summary.byProvider["anthropic"].outputTokens).toBe(3500); // 2000+1500
        expect(summary.byProvider["anthropic"].cost).toBeCloseTo(0.2025, 4); // 0.045+0.1575
      }
    });
  });

  describe("getProviderBreakdown", () => {
    it("returns array of ProviderUsage", () => {
      const deps = createMockDeps();
      const breakdown = getProviderBreakdown(deps);

      expect(Array.isArray(breakdown)).toBe(true);
      expect(breakdown.length).toBeGreaterThan(0);
    });

    it("each entry has provider, totalTokensIn, totalTokensOut, totalCost", () => {
      const deps = createMockDeps();
      const breakdown = getProviderBreakdown(deps);

      for (const entry of breakdown) {
        expect(typeof entry.provider).toBe("string");
        expect(typeof entry.totalTokensIn).toBe("number");
        expect(typeof entry.totalTokensOut).toBe("number");
        expect(typeof entry.totalCost).toBe("number");
      }
    });

    it("includes model breakdown per provider", () => {
      const deps = createMockDeps();
      const breakdown = getProviderBreakdown(deps);

      const anthropic = breakdown.find((b) => b.provider === "anthropic");
      expect(anthropic).toBeDefined();
      expect(Array.isArray(anthropic!.models)).toBe(true);
      expect(anthropic!.models.length).toBeGreaterThan(0);
    });

    it("model breakdown includes name, tokens, cost", () => {
      const deps = createMockDeps();
      const breakdown = getProviderBreakdown(deps);

      const anthropic = breakdown.find((b) => b.provider === "anthropic");
      if (anthropic) {
        for (const model of anthropic.models) {
          expect(typeof model.model).toBe("string");
          expect(typeof model.inputTokens).toBe("number");
          expect(typeof model.outputTokens).toBe("number");
          expect(typeof model.cost).toBe("number");
        }
      }
    });
  });

  describe("getProjectBreakdown", () => {
    it("returns array of ProjectUsage", () => {
      const deps = createMockDeps();
      const breakdown = getProjectBreakdown(deps);

      expect(Array.isArray(breakdown)).toBe(true);
      expect(breakdown.length).toBeGreaterThan(0);
    });

    it("each entry has project, totalTokens, totalCost, lastActivity", () => {
      const deps = createMockDeps();
      const breakdown = getProjectBreakdown(deps);

      for (const entry of breakdown) {
        expect(typeof entry.project).toBe("string");
        expect(typeof entry.totalTokens).toBe("number");
        expect(typeof entry.totalCost).toBe("number");
        expect(typeof entry.lastActivity).toBe("string");
      }
    });

    it("groups null project as 'unassigned'", () => {
      const deps = createMockDeps();
      const breakdown = getProjectBreakdown(deps);

      const unassigned = breakdown.find((b) => b.project === "unassigned");
      expect(unassigned).toBeDefined();
    });

    it("sums costs per project correctly", () => {
      const deps = createMockDeps();
      const breakdown = getProjectBreakdown(deps);

      const arachne = breakdown.find((b) => b.project === "arachne");
      expect(arachne).toBeDefined();
      // arachne: 0.024 + 0.021 = 0.045
      expect(arachne!.totalCost).toBeCloseTo(0.045, 4);
    });
  });
});
