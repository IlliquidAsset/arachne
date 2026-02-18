import { describe, it, expect, beforeEach } from "bun:test";
import {
  type TokenUsageEvent,
  parseTokenUsage,
  createTokenEvent,
  recordTokenUsage,
  setBudgetDB,
} from "../token-counter";
import { createInMemoryBudgetDB } from "../db-interface";

describe("token-counter", () => {
  describe("parseTokenUsage", () => {
    it("parses Anthropic format (usage.input_tokens / output_tokens)", () => {
      const metadata = {
        usage: {
          input_tokens: 1500,
          output_tokens: 800,
        },
      };
      const result = parseTokenUsage(metadata);
      expect(result).not.toBeNull();
      expect(result!.inputTokens).toBe(1500);
      expect(result!.outputTokens).toBe(800);
    });

    it("parses OpenAI/xAI format (usage.prompt_tokens / completion_tokens)", () => {
      const metadata = {
        usage: {
          prompt_tokens: 2000,
          completion_tokens: 1200,
        },
      };
      const result = parseTokenUsage(metadata);
      expect(result).not.toBeNull();
      expect(result!.inputTokens).toBe(2000);
      expect(result!.outputTokens).toBe(1200);
    });

    it("returns null for missing usage object", () => {
      const result = parseTokenUsage({});
      expect(result).toBeNull();
    });

    it("returns null for null/undefined metadata", () => {
      expect(parseTokenUsage(null as any)).toBeNull();
      expect(parseTokenUsage(undefined as any)).toBeNull();
    });

    it("returns null for usage with no recognized token fields", () => {
      const metadata = {
        usage: {
          some_other_field: 100,
        },
      };
      const result = parseTokenUsage(metadata);
      expect(result).toBeNull();
    });

    it("handles usage with zero tokens", () => {
      const metadata = {
        usage: {
          input_tokens: 0,
          output_tokens: 0,
        },
      };
      const result = parseTokenUsage(metadata);
      expect(result).not.toBeNull();
      expect(result!.inputTokens).toBe(0);
      expect(result!.outputTokens).toBe(0);
    });

    it("prefers Anthropic format when both formats present", () => {
      const metadata = {
        usage: {
          input_tokens: 100,
          output_tokens: 200,
          prompt_tokens: 300,
          completion_tokens: 400,
        },
      };
      const result = parseTokenUsage(metadata);
      expect(result).not.toBeNull();
      expect(result!.inputTokens).toBe(100);
      expect(result!.outputTokens).toBe(200);
    });
  });

  describe("createTokenEvent", () => {
    it("creates a token usage event with cost", () => {
      const event = createTokenEvent(
        "anthropic",
        "claude-sonnet-4-20250514",
        1000,
        500
      );
      expect(event.provider).toBe("anthropic");
      expect(event.model).toBe("claude-sonnet-4-20250514");
      expect(event.inputTokens).toBe(1000);
      expect(event.outputTokens).toBe(500);
      expect(event.estimatedCost).toBeCloseTo(0.0105, 6);
      expect(event.timestamp).toBeDefined();
      expect(event.project).toBeUndefined();
    });

    it("includes project when provided", () => {
      const event = createTokenEvent(
        "anthropic",
        "claude-opus-4-20250514",
        500,
        200,
        "amanda-core"
      );
      expect(event.project).toBe("amanda-core");
    });

    it("sets timestamp as ISO string", () => {
      const event = createTokenEvent("xai", "grok-3", 100, 50);
      // Should be a valid ISO date
      expect(() => new Date(event.timestamp)).not.toThrow();
      const parsed = new Date(event.timestamp);
      expect(parsed.getTime()).not.toBeNaN();
    });

    it("calculates 0 cost for unknown model", () => {
      const event = createTokenEvent("unknown", "model", 1000, 500);
      expect(event.estimatedCost).toBe(0);
    });
  });

  describe("recordTokenUsage", () => {
    let db: ReturnType<typeof createInMemoryBudgetDB>;

    beforeEach(() => {
      db = createInMemoryBudgetDB();
      db.init();
      setBudgetDB(db);
    });

    it("records a token event to the DB", () => {
      const event = createTokenEvent(
        "anthropic",
        "claude-sonnet-4-20250514",
        1000,
        500
      );
      recordTokenUsage(event);

      const records = db.queryByDate(event.timestamp.slice(0, 10));
      expect(records.length).toBe(1);
      expect(records[0].provider).toBe("anthropic");
      expect(records[0].model).toBe("claude-sonnet-4-20250514");
      expect(records[0].input_tokens).toBe(1000);
      expect(records[0].output_tokens).toBe(500);
      expect(records[0].estimated_cost).toBeCloseTo(0.0105, 6);
    });

    it("records multiple events", () => {
      recordTokenUsage(
        createTokenEvent("anthropic", "claude-sonnet-4-20250514", 500, 100)
      );
      recordTokenUsage(
        createTokenEvent("xai", "grok-3", 800, 400)
      );
      recordTokenUsage(
        createTokenEvent(
          "anthropic",
          "claude-opus-4-20250514",
          200,
          50,
          "project-x"
        )
      );

      const today = new Date().toISOString().slice(0, 10);
      const records = db.queryByDate(today);
      expect(records.length).toBe(3);
    });

    it("records project field when present", () => {
      const event = createTokenEvent(
        "anthropic",
        "claude-sonnet-4-20250514",
        100,
        50,
        "my-project"
      );
      recordTokenUsage(event);

      const records = db.queryByDate(event.timestamp.slice(0, 10));
      expect(records[0].project).toBe("my-project");
    });

    it("records null project when not provided", () => {
      const event = createTokenEvent(
        "anthropic",
        "claude-sonnet-4-20250514",
        100,
        50
      );
      recordTokenUsage(event);

      const records = db.queryByDate(event.timestamp.slice(0, 10));
      expect(records[0].project).toBeNull();
    });
  });
});
