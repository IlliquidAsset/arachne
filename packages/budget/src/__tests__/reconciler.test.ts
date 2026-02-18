import { describe, it, expect } from "bun:test";
import {
  reconcileProvider,
  reconcileAll,
  type ReconciliationResult,
  type ReconcilerDependencies,
} from "../reconciler";
import type { ProviderClient, ProviderUsageResponse } from "../providers/types";

function createMockDeps(overrides?: Partial<ReconcilerDependencies>): ReconcilerDependencies {
  const successClient: ProviderClient = {
    async getUsage(start, end) {
      return {
        provider: "anthropic",
        totalCostUsd: 10.50,
        inputTokens: 400000,
        outputTokens: 120000,
        period: { start, end },
      };
    },
  };

  return {
    getLocalEstimate: (provider: string) => 10.25,
    providerClients: {
      anthropic: successClient,
      xai: {
        async getUsage() {
          return {
            provider: "xai",
            totalCostUsd: 5.00,
            inputTokens: 200000,
            outputTokens: 80000,
            period: { start: "2025-02-01", end: "2025-02-18" },
          };
        },
      },
    },
    startDate: "2025-02-01",
    endDate: "2025-02-18",
    ...overrides,
  };
}

describe("reconciler", () => {
  describe("reconcileProvider", () => {
    it("returns matched status when discrepancy <= 5%", async () => {
      const deps = createMockDeps({
        getLocalEstimate: () => 10.25, // ~2.4% off from 10.50
      });

      const result = await reconcileProvider("anthropic", deps);

      expect(result.provider).toBe("anthropic");
      expect(result.localEstimate).toBe(10.25);
      expect(result.apiActual).toBe(10.50);
      expect(result.status).toBe("matched");
      expect(result.discrepancyPercent).not.toBeNull();
      expect(Math.abs(result.discrepancyPercent!)).toBeLessThanOrEqual(5);
      expect(result.lastReconciled).toBeInstanceOf(Date);
    });

    it("returns discrepancy status when > 5% off", async () => {
      const deps = createMockDeps({
        getLocalEstimate: () => 8.00, // ~24% off from 10.50
      });

      const result = await reconcileProvider("anthropic", deps);

      expect(result.status).toBe("discrepancy");
      expect(result.discrepancyPercent).not.toBeNull();
      expect(Math.abs(result.discrepancyPercent!)).toBeGreaterThan(5);
    });

    it("returns api_unavailable when client returns null", async () => {
      const failClient: ProviderClient = {
        async getUsage() { return null; },
      };

      const deps = createMockDeps({
        providerClients: { anthropic: failClient },
      });

      const result = await reconcileProvider("anthropic", deps);

      expect(result.status).toBe("api_unavailable");
      expect(result.apiActual).toBeNull();
      expect(result.discrepancyPercent).toBeNull();
      expect(result.localEstimate).toBe(10.25);
    });

    it("returns api_unavailable when client throws", async () => {
      const throwClient: ProviderClient = {
        async getUsage() { throw new Error("Timeout"); },
      };

      const deps = createMockDeps({
        providerClients: { anthropic: throwClient },
      });

      const result = await reconcileProvider("anthropic", deps);

      expect(result.status).toBe("api_unavailable");
      expect(result.apiActual).toBeNull();
    });

    it("returns api_unavailable for unknown provider", async () => {
      const deps = createMockDeps();
      const result = await reconcileProvider("unknown-provider", deps);

      expect(result.status).toBe("api_unavailable");
      expect(result.provider).toBe("unknown-provider");
    });

    it("calculates discrepancy percent correctly", async () => {
      const deps = createMockDeps({
        getLocalEstimate: () => 10.00,
        providerClients: {
          anthropic: {
            async getUsage() {
              return {
                provider: "anthropic",
                totalCostUsd: 12.00,
                inputTokens: 0,
                outputTokens: 0,
                period: { start: "2025-02-01", end: "2025-02-18" },
              };
            },
          },
        },
      });

      const result = await reconcileProvider("anthropic", deps);
      // (12 - 10) / 12 * 100 = ~16.67%
      expect(result.discrepancyPercent).toBeCloseTo(16.67, 0);
    });
  });

  describe("reconcileAll", () => {
    it("reconciles all configured providers", async () => {
      const deps = createMockDeps();
      const results = await reconcileAll(deps);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(2); // anthropic + xai

      const providers = results.map((r) => r.provider);
      expect(providers).toContain("anthropic");
      expect(providers).toContain("xai");
    });

    it("handles mixed success and failure", async () => {
      const deps = createMockDeps({
        providerClients: {
          anthropic: {
            async getUsage(start, end) {
              return {
                provider: "anthropic",
                totalCostUsd: 10.50,
                inputTokens: 400000,
                outputTokens: 120000,
                period: { start, end },
              };
            },
          },
          xai: {
            async getUsage() { return null; },
          },
        },
      });

      const results = await reconcileAll(deps);

      const anthropic = results.find((r) => r.provider === "anthropic");
      const xai = results.find((r) => r.provider === "xai");

      expect(anthropic!.status).toBe("matched");
      expect(xai!.status).toBe("api_unavailable");
    });

    it("returns empty array when no providers configured", async () => {
      const deps = createMockDeps({
        providerClients: {},
      });

      const results = await reconcileAll(deps);
      expect(results).toEqual([]);
    });

    it("each result has lastReconciled timestamp", async () => {
      const deps = createMockDeps();
      const results = await reconcileAll(deps);

      for (const result of results) {
        expect(result.lastReconciled).toBeInstanceOf(Date);
      }
    });
  });
});
