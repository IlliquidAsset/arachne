/**
 * Provider reconciliation engine.
 * Compares local token-based cost estimates against provider billing APIs.
 * Batch/scheduled (weekly) — no per-request API calls.
 */

import type { ProviderClient } from "./providers/types";

// --- Types ---

export interface ReconciliationResult {
  provider: string;
  localEstimate: number;
  apiActual: number | null;
  discrepancyPercent: number | null;
  status: "matched" | "discrepancy" | "api_unavailable";
  lastReconciled: Date;
}

export interface ReconcilerDependencies {
  /** Get local cost estimate for a provider (from our token counting) */
  getLocalEstimate: (provider: string) => number;
  /** Map of provider name → client for billing API access */
  providerClients: Record<string, ProviderClient>;
  /** Date range for reconciliation */
  startDate: string;
  endDate: string;
}

// --- Constants ---

/** Discrepancy threshold: flag if difference exceeds this percentage */
const DISCREPANCY_THRESHOLD_PERCENT = 5;

// --- Public API ---

/**
 * Reconcile a single provider's local estimate against their billing API.
 * Gracefully degrades: API timeout/error → status='api_unavailable'.
 */
export async function reconcileProvider(
  provider: string,
  deps: ReconcilerDependencies
): Promise<ReconciliationResult> {
  const localEstimate = deps.getLocalEstimate(provider);
  const client = deps.providerClients[provider];

  if (!client) {
    return {
      provider,
      localEstimate,
      apiActual: null,
      discrepancyPercent: null,
      status: "api_unavailable",
      lastReconciled: new Date(),
    };
  }

  let apiActual: number | null = null;

  try {
    const usage = await client.getUsage(deps.startDate, deps.endDate);
    if (usage) {
      apiActual = usage.totalCostUsd;
    }
  } catch {
    // Graceful degradation — treat as unavailable
  }

  if (apiActual === null) {
    return {
      provider,
      localEstimate,
      apiActual: null,
      discrepancyPercent: null,
      status: "api_unavailable",
      lastReconciled: new Date(),
    };
  }

  // Calculate discrepancy as percentage of actual
  const discrepancyPercent =
    apiActual === 0
      ? localEstimate === 0
        ? 0
        : 100
      : ((apiActual - localEstimate) / apiActual) * 100;

  const status =
    Math.abs(discrepancyPercent) > DISCREPANCY_THRESHOLD_PERCENT
      ? "discrepancy"
      : "matched";

  return {
    provider,
    localEstimate,
    apiActual,
    discrepancyPercent,
    status,
    lastReconciled: new Date(),
  };
}

/**
 * Reconcile all configured providers.
 * Runs reconciliation for each provider client in parallel.
 */
export async function reconcileAll(
  deps: ReconcilerDependencies
): Promise<ReconciliationResult[]> {
  const providers = Object.keys(deps.providerClients);

  if (providers.length === 0) return [];

  const results = await Promise.all(
    providers.map((provider) => reconcileProvider(provider, deps))
  );

  return results;
}
