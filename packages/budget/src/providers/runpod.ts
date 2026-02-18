/**
 * RunPod billing API client.
 * RunPod is time-based ($0.79/hr), not token-based.
 * Uses DI for fetch and env access.
 */

import type { ProviderClient, ProviderUsageResponse } from "./types";

export interface RunPodClientDeps {
  fetchFn: (url: string, init?: RequestInit) => Promise<Response>;
  apiKeyEnvVar: string;
  getEnv?: (varName: string) => string | undefined;
}

const RUNPOD_RATE_PER_HOUR = 0.79;
const RUNPOD_API_URL = "https://api.runpod.io/graphql";

/**
 * Create a RunPod provider client.
 * RunPod pricing is time-based at $0.79/hr — tokens are not tracked by RunPod.
 */
export function createRunPodClient(deps: RunPodClientDeps): ProviderClient {
  const { fetchFn, apiKeyEnvVar, getEnv } = deps;

  return {
    async getUsage(
      startDate: string,
      endDate: string
    ): Promise<ProviderUsageResponse | null> {
      const resolveEnv = getEnv ?? ((name: string) => process.env[name]);
      const apiKey = resolveEnv(apiKeyEnvVar);

      if (!apiKey) {
        return null;
      }

      try {
        const response = await fetchFn(RUNPOD_API_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: `query { billing(startDate: "${startDate}", endDate: "${endDate}") { totalHours totalCost } }`,
          }),
        });

        if (!response.ok) {
          return null;
        }

        const data = await response.json() as {
          data?: { billing?: { totalHours: number; totalCost: number } };
        };

        const billing = data?.data?.billing;
        if (!billing) return null;

        return {
          provider: "runpod",
          totalCostUsd: billing.totalCost,
          inputTokens: 0, // RunPod is time-based, not token-based
          outputTokens: 0,
          period: { start: startDate, end: endDate },
        };
      } catch {
        return null;
      }
    },
  };
}

export { RUNPOD_RATE_PER_HOUR };
