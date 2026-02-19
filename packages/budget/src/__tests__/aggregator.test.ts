import { describe, it, expect, beforeEach } from "bun:test";
import {
  getDailySummary,
  getDateRangeSummary,
  getTotalSpend,
  getTokenUsage,
  setAggregatorDB,
  type DailySummary,
} from "../aggregator";
import { createInMemoryBudgetDB, type BudgetDB } from "../db-interface";

describe("aggregator", () => {
  let db: BudgetDB;

  beforeEach(() => {
    db = createInMemoryBudgetDB();
    db.init();
    setAggregatorDB(db);

    // Seed test data across 3 days
    // Day 1: 2025-02-18
    db.insert({
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      input_tokens: 1000,
      output_tokens: 500,
      estimated_cost: 0.0105,
      project: "arachne",
      timestamp: "2025-02-18T10:00:00.000Z",
    });
    db.insert({
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      input_tokens: 2000,
      output_tokens: 1000,
      estimated_cost: 0.021,
      project: "arachne",
      timestamp: "2025-02-18T14:00:00.000Z",
    });
    db.insert({
      provider: "xai",
      model: "grok-3",
      input_tokens: 500,
      output_tokens: 200,
      estimated_cost: 0.0045,
      project: null,
      timestamp: "2025-02-18T16:00:00.000Z",
    });

    // Day 2: 2025-02-19
    db.insert({
      provider: "anthropic",
      model: "claude-opus-4-20250514",
      input_tokens: 3000,
      output_tokens: 1500,
      estimated_cost: 0.1575,
      project: "arachne",
      timestamp: "2025-02-19T09:00:00.000Z",
    });
    db.insert({
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      input_tokens: 800,
      output_tokens: 300,
      estimated_cost: 0.0069,
      project: "other",
      timestamp: "2025-02-19T11:00:00.000Z",
    });

    // Day 3: 2025-02-20
    db.insert({
      provider: "xai",
      model: "grok-3",
      input_tokens: 1500,
      output_tokens: 700,
      estimated_cost: 0.015,
      project: null,
      timestamp: "2025-02-20T08:00:00.000Z",
    });
  });

  describe("getDailySummary", () => {
    it("returns per-provider/model summary for a date", () => {
      const summary = getDailySummary("2025-02-18");
      expect(summary.length).toBe(2); // sonnet + grok

      const sonnet = summary.find(
        (s) => s.model === "claude-sonnet-4-20250514"
      );
      expect(sonnet).toBeDefined();
      expect(sonnet!.provider).toBe("anthropic");
      expect(sonnet!.totalInputTokens).toBe(3000); // 1000 + 2000
      expect(sonnet!.totalOutputTokens).toBe(1500); // 500 + 1000
      expect(sonnet!.totalCost).toBeCloseTo(0.0315, 6); // 0.0105 + 0.021
      expect(sonnet!.requestCount).toBe(2);

      const grok = summary.find((s) => s.model === "grok-3");
      expect(grok).toBeDefined();
      expect(grok!.totalInputTokens).toBe(500);
      expect(grok!.totalOutputTokens).toBe(200);
      expect(grok!.requestCount).toBe(1);
    });

    it("returns empty array for a date with no data", () => {
      const summary = getDailySummary("2025-01-01");
      expect(summary).toEqual([]);
    });

    it("returns summary for day 2 with opus and sonnet", () => {
      const summary = getDailySummary("2025-02-19");
      expect(summary.length).toBe(2);

      const opus = summary.find(
        (s) => s.model === "claude-opus-4-20250514"
      );
      expect(opus).toBeDefined();
      expect(opus!.totalInputTokens).toBe(3000);
      expect(opus!.totalOutputTokens).toBe(1500);
      expect(opus!.totalCost).toBeCloseTo(0.1575, 6);
      expect(opus!.requestCount).toBe(1);
    });
  });

  describe("getDateRangeSummary", () => {
    it("aggregates across a date range", () => {
      const summary = getDateRangeSummary("2025-02-18", "2025-02-19");
      // Should have: sonnet (2 days), grok (1 day), opus (1 day)
      expect(summary.length).toBe(3);

      const sonnet = summary.find(
        (s) => s.model === "claude-sonnet-4-20250514"
      );
      expect(sonnet).toBeDefined();
      expect(sonnet!.totalInputTokens).toBe(3800); // 1000+2000+800
      expect(sonnet!.totalOutputTokens).toBe(1800); // 500+1000+300
      expect(sonnet!.requestCount).toBe(3);
    });

    it("returns empty for non-overlapping range", () => {
      const summary = getDateRangeSummary("2024-01-01", "2024-01-31");
      expect(summary).toEqual([]);
    });

    it("includes all 3 days", () => {
      const summary = getDateRangeSummary("2025-02-18", "2025-02-20");
      // sonnet, opus, grok
      expect(summary.length).toBe(3);

      const grok = summary.find((s) => s.model === "grok-3");
      expect(grok).toBeDefined();
      expect(grok!.totalInputTokens).toBe(2000); // 500 + 1500
      expect(grok!.totalOutputTokens).toBe(900); // 200 + 700
      expect(grok!.requestCount).toBe(2);
    });
  });

  describe("getTotalSpend", () => {
    it("returns total spend across all dates", () => {
      const total = getTotalSpend();
      // 0.0105 + 0.021 + 0.0045 + 0.1575 + 0.0069 + 0.015 = 0.2154
      expect(total).toBeCloseTo(0.2154, 4);
    });

    it("returns total spend for a date range", () => {
      const total = getTotalSpend("2025-02-18", "2025-02-18");
      // 0.0105 + 0.021 + 0.0045 = 0.036
      expect(total).toBeCloseTo(0.036, 4);
    });

    it("returns 0 for empty range", () => {
      const total = getTotalSpend("2024-01-01", "2024-01-31");
      expect(total).toBe(0);
    });

    it("filters with only startDate", () => {
      const total = getTotalSpend("2025-02-20");
      // Only day 3: 0.015
      expect(total).toBeCloseTo(0.015, 4);
    });
  });

  describe("getTokenUsage", () => {
    it("returns usage for a specific provider", () => {
      const usage = getTokenUsage("anthropic", "2025-02-18", "2025-02-20");
      // Anthropic: sonnet day1 (1000+2000 in, 500+1000 out) + opus day2 (3000 in, 1500 out) + sonnet day2 (800 in, 300 out)
      expect(usage.inputTokens).toBe(6800); // 1000+2000+3000+800
      expect(usage.outputTokens).toBe(3300); // 500+1000+1500+300
      expect(usage.cost).toBeCloseTo(0.1959, 4); // sum of anthropic costs
    });

    it("returns usage for xai provider", () => {
      const usage = getTokenUsage("xai", "2025-02-18", "2025-02-20");
      expect(usage.inputTokens).toBe(2000); // 500 + 1500
      expect(usage.outputTokens).toBe(900); // 200 + 700
      expect(usage.cost).toBeCloseTo(0.0195, 4);
    });

    it("returns zeros for provider with no data in range", () => {
      const usage = getTokenUsage("runpod", "2025-02-18", "2025-02-20");
      expect(usage.inputTokens).toBe(0);
      expect(usage.outputTokens).toBe(0);
      expect(usage.cost).toBe(0);
    });
  });
});
