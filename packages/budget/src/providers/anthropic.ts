/**
 * Anthropic billing API client.
 * Uses DI for fetch and env access — fully mockable in tests.
 * Anthropic's console usage API may not be public; designed for graceful degradation.
 */

import type { ProviderClient, ProviderUsageResponse } from "./types";

export interface AnthropicClientDeps {
  /** Injected fetch function (for mocking) */
  fetchFn: (url: string, init?: RequestInit) => Promise<Response>;
  /** Env var name containing the API key (not the raw key) */
  apiKeyEnvVar: string;
  /** Optional: resolve env var (defaults to process.env lookup) */
  getEnv?: (varName: string) => string | undefined;
}

const ANTHROPIC_USAGE_URL = "https://api.anthropic.com/v1/usage";

/**
 * Create an Anthropic provider client with injected dependencies.
 */
export function createAnthropicClient(deps: AnthropicClientDeps): ProviderClient {
  const { fetchFn, apiKeyEnvVar, getEnv } = deps;

  return {
    async getUsage(startDate: string, endDate: string): Promise<ProviderUsageResponse | null> {
      const resolveEnv = getEnv ?? ((name: string) => process.env[name]);
      const apiKey = resolveEnv(apiKeyEnvVar);

      if (!apiKey) {
        return null;
      }

      try {
        const url = `${ANTHROPIC_USAGE_URL}?start_date=${startDate}&end_date=${endDate}`;
        const response = await fetchFn(url, {
          headers: {
            "x-api-key": apiKey,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          return null;
        }

        const data = await response.json() as ProviderUsageResponse;
        return data;
      } catch {
        // Network error, timeout, etc. — graceful degradation
        return null;
      }
    },
  };
}
