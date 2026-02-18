/**
 * xAI billing API client (stub).
 * xAI may not have a public usage/billing API yet.
 * Designed for graceful degradation — always returns null until API exists.
 */

import type { ProviderClient, ProviderUsageResponse } from "./types";

export interface XaiClientDeps {
  fetchFn: (url: string, init?: RequestInit) => Promise<Response>;
  apiKeyEnvVar: string;
  getEnv?: (varName: string) => string | undefined;
}

/**
 * Create an xAI provider client.
 * Currently a stub — returns null (API not yet available).
 */
export function createXaiClient(deps: XaiClientDeps): ProviderClient {
  return {
    async getUsage(
      _startDate: string,
      _endDate: string
    ): Promise<ProviderUsageResponse | null> {
      // xAI usage API not publicly available yet.
      // When it becomes available, implement here with same pattern as Anthropic.
      return null;
    },
  };
}
