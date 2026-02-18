/**
 * Provider client types for billing API integration.
 * Each provider implements ProviderClient for usage reconciliation.
 */

export interface ProviderUsageResponse {
  provider: string;
  totalCostUsd: number;
  inputTokens: number;
  outputTokens: number;
  period: { start: string; end: string };
}

export interface ProviderClient {
  /** Fetch usage data from provider billing API. Returns null on failure. */
  getUsage(startDate: string, endDate: string): Promise<ProviderUsageResponse | null>;
}
