import { describe, it, expect } from "bun:test";
import { createAnthropicClient } from "../../providers/anthropic";
import type { ProviderClient, ProviderUsageResponse } from "../../providers/types";

describe("AnthropicClient", () => {
  it("implements ProviderClient interface", () => {
    const client = createAnthropicClient({
      fetchFn: async () => new Response("{}"),
      apiKeyEnvVar: "ANTHROPIC_API_KEY",
    });
    expect(typeof client.getUsage).toBe("function");
  });

  it("parses successful API response correctly", async () => {
    const mockResponse: ProviderUsageResponse = {
      provider: "anthropic",
      totalCostUsd: 12.50,
      inputTokens: 500000,
      outputTokens: 150000,
      period: { start: "2025-02-01", end: "2025-02-18" },
    };

    const fetchFn = async (url: string, init?: RequestInit): Promise<Response> => {
      return new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const client = createAnthropicClient({
      fetchFn,
      apiKeyEnvVar: "ANTHROPIC_API_KEY",
      getEnv: () => "sk-test-key",
    });
    const result = await client.getUsage("2025-02-01", "2025-02-18");

    expect(result).not.toBeNull();
    expect(result!.provider).toBe("anthropic");
    expect(result!.totalCostUsd).toBe(12.50);
    expect(result!.inputTokens).toBe(500000);
    expect(result!.outputTokens).toBe(150000);
  });

  it("sends authorization header from env var reference", async () => {
    let capturedHeaders: Record<string, string> = {};

    const fetchFn = async (url: string, init?: RequestInit): Promise<Response> => {
      const headers = init?.headers as Record<string, string> | undefined;
      if (headers) capturedHeaders = { ...headers };
      return new Response(JSON.stringify({
        provider: "anthropic",
        totalCostUsd: 0,
        inputTokens: 0,
        outputTokens: 0,
        period: { start: "2025-02-01", end: "2025-02-18" },
      }), { status: 200 });
    };

    const client = createAnthropicClient({
      fetchFn,
      apiKeyEnvVar: "ANTHROPIC_API_KEY",
      getEnv: () => "sk-test-key-123",
    });
    await client.getUsage("2025-02-01", "2025-02-18");

    expect(capturedHeaders["x-api-key"]).toBe("sk-test-key-123");
  });

  it("returns null on API error (graceful degradation)", async () => {
    const fetchFn = async (): Promise<Response> => {
      return new Response("Internal Server Error", { status: 500 });
    };

    const client = createAnthropicClient({
      fetchFn,
      apiKeyEnvVar: "ANTHROPIC_API_KEY",
      getEnv: () => "sk-test-key",
    });
    const result = await client.getUsage("2025-02-01", "2025-02-18");
    expect(result).toBeNull();
  });

  it("returns null on network error (graceful degradation)", async () => {
    const fetchFn = async (): Promise<Response> => {
      throw new Error("Network timeout");
    };

    const client = createAnthropicClient({
      fetchFn,
      apiKeyEnvVar: "ANTHROPIC_API_KEY",
      getEnv: () => "sk-test-key",
    });
    const result = await client.getUsage("2025-02-01", "2025-02-18");
    expect(result).toBeNull();
  });

  it("returns null when API key env var is not set", async () => {
    const fetchFn = async (): Promise<Response> => {
      return new Response("{}", { status: 200 });
    };

    const client = createAnthropicClient({
      fetchFn,
      apiKeyEnvVar: "ANTHROPIC_API_KEY",
      getEnv: () => undefined,
    });
    const result = await client.getUsage("2025-02-01", "2025-02-18");
    expect(result).toBeNull();
  });

  it("passes date range in request URL", async () => {
    let capturedUrl = "";

    const fetchFn = async (url: string): Promise<Response> => {
      capturedUrl = url;
      return new Response(JSON.stringify({
        provider: "anthropic",
        totalCostUsd: 0,
        inputTokens: 0,
        outputTokens: 0,
        period: { start: "2025-02-01", end: "2025-02-18" },
      }), { status: 200 });
    };

    const client = createAnthropicClient({
      fetchFn,
      apiKeyEnvVar: "ANTHROPIC_API_KEY",
      getEnv: () => "sk-key",
    });
    await client.getUsage("2025-02-01", "2025-02-18");

    expect(capturedUrl).toContain("2025-02-01");
    expect(capturedUrl).toContain("2025-02-18");
  });
});
