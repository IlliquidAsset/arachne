import { describe, it, expect } from "bun:test";
import {
  type ModelPricing,
  getPricing,
  calculateCost,
  PRICING_TABLE,
} from "../pricing";

describe("pricing", () => {
  describe("PRICING_TABLE", () => {
    it("contains Claude Sonnet pricing", () => {
      const entry = PRICING_TABLE.find(
        (p) =>
          p.provider === "anthropic" &&
          p.model === "claude-sonnet-4-20250514"
      );
      expect(entry).toBeDefined();
      expect(entry!.type).toBe("token");
      expect(entry!.inputPer1kTokens).toBe(0.003);
      expect(entry!.outputPer1kTokens).toBe(0.015);
    });

    it("contains Claude Opus pricing", () => {
      const entry = PRICING_TABLE.find(
        (p) =>
          p.provider === "anthropic" &&
          p.model === "claude-opus-4-20250514"
      );
      expect(entry).toBeDefined();
      expect(entry!.type).toBe("token");
      expect(entry!.inputPer1kTokens).toBe(0.015);
      expect(entry!.outputPer1kTokens).toBe(0.075);
    });

    it("contains Grok pricing", () => {
      const entry = PRICING_TABLE.find(
        (p) => p.provider === "xai" && p.model === "grok-3"
      );
      expect(entry).toBeDefined();
      expect(entry!.type).toBe("token");
      expect(entry!.inputPer1kTokens).toBe(0.003);
      expect(entry!.outputPer1kTokens).toBe(0.015);
    });

    it("contains RunPod GPU pricing (time-based)", () => {
      const entry = PRICING_TABLE.find(
        (p) => p.provider === "runpod" && p.model === "gpu"
      );
      expect(entry).toBeDefined();
      expect(entry!.type).toBe("time");
      expect(entry!.ratePerHour).toBe(0.79);
    });
  });

  describe("getPricing", () => {
    it("returns pricing for known model", () => {
      const pricing = getPricing("anthropic", "claude-sonnet-4-20250514");
      expect(pricing).not.toBeNull();
      expect(pricing!.provider).toBe("anthropic");
      expect(pricing!.model).toBe("claude-sonnet-4-20250514");
    });

    it("returns null for unknown provider", () => {
      const pricing = getPricing("unknown", "some-model");
      expect(pricing).toBeNull();
    });

    it("returns null for unknown model", () => {
      const pricing = getPricing("anthropic", "nonexistent-model");
      expect(pricing).toBeNull();
    });
  });

  describe("calculateCost", () => {
    it("calculates cost for Claude Sonnet", () => {
      // 1000 input tokens at $0.003/1K = $0.003
      // 500 output tokens at $0.015/1K = $0.0075
      // Total = $0.0105
      const cost = calculateCost(
        "anthropic",
        "claude-sonnet-4-20250514",
        1000,
        500
      );
      expect(cost).toBeCloseTo(0.0105, 6);
    });

    it("calculates cost for Claude Opus", () => {
      // 2000 input tokens at $0.015/1K = $0.03
      // 1000 output tokens at $0.075/1K = $0.075
      // Total = $0.105
      const cost = calculateCost(
        "anthropic",
        "claude-opus-4-20250514",
        2000,
        1000
      );
      expect(cost).toBeCloseTo(0.105, 6);
    });

    it("calculates cost for Grok", () => {
      const cost = calculateCost("xai", "grok-3", 1000, 1000);
      // 1000 * 0.003/1000 + 1000 * 0.015/1000 = 0.003 + 0.015 = 0.018
      expect(cost).toBeCloseTo(0.018, 6);
    });

    it("returns 0 for unknown model", () => {
      const cost = calculateCost("unknown", "model", 1000, 1000);
      expect(cost).toBe(0);
    });

    it("returns 0 for time-based pricing (runpod)", () => {
      // Token-based cost calculation doesn't apply to time-based models
      const cost = calculateCost("runpod", "gpu", 1000, 1000);
      expect(cost).toBe(0);
    });

    it("handles zero tokens", () => {
      const cost = calculateCost(
        "anthropic",
        "claude-sonnet-4-20250514",
        0,
        0
      );
      expect(cost).toBe(0);
    });

    it("handles large token counts", () => {
      // 1M input tokens at $0.003/1K = $3.00
      // 500K output tokens at $0.015/1K = $7.50
      // Total = $10.50
      const cost = calculateCost(
        "anthropic",
        "claude-sonnet-4-20250514",
        1_000_000,
        500_000
      );
      expect(cost).toBeCloseTo(10.5, 4);
    });
  });
});
