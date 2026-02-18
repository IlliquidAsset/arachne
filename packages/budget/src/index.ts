// @amanda/budget — token counting engine with pricing, aggregation, and budget tracking

// Pricing table and cost calculation
export {
  type ModelPricing,
  PRICING_TABLE,
  getPricing,
  calculateCost,
} from "./pricing";

// Token counting and event recording
export {
  type TokenUsageEvent,
  parseTokenUsage,
  createTokenEvent,
  recordTokenUsage,
  setBudgetDB,
} from "./token-counter";

// Aggregation and summaries
export {
  type DailySummary,
  getDailySummary,
  getDateRangeSummary,
  getTotalSpend,
  getTokenUsage,
  setAggregatorDB,
} from "./aggregator";

// DB interface for wiring to @amanda/shared
export {
  type BudgetRecord,
  type BudgetDB,
  createInMemoryBudgetDB,
} from "./db-interface";

// Spending tracker — summaries by period, provider, and project
export {
  type SpendingSummary,
  type ProviderUsage,
  type ProjectUsage,
  type TrackerDependencies,
  getSpendingSummary,
  getProviderBreakdown,
  getProjectBreakdown,
} from "./tracker";

// Provider reconciliation
export {
  type ReconciliationResult,
  type ReconcilerDependencies,
  reconcileProvider,
  reconcileAll,
} from "./reconciler";

// Budget alerts
export {
  type AlertThreshold,
  type Alert,
  type AlertChannel,
  checkAlerts,
  LogAlertChannel,
} from "./alerts";

// Provider clients
export {
  type ProviderClient,
  type ProviderUsageResponse,
} from "./providers/types";
export { createAnthropicClient } from "./providers/anthropic";
export { createXaiClient } from "./providers/xai";
export { createRunPodClient, RUNPOD_RATE_PER_HOUR } from "./providers/runpod";
