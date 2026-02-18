/**
 * Daily summary aggregation for budget tracking.
 * Queries the DB for grouped summaries with cost calculation.
 */

import type { BudgetDB } from "./db-interface";

export interface DailySummary {
  provider: string;
  model: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  requestCount: number;
}

// Module-level DB reference. Set via setAggregatorDB() for DI.
let budgetDB: BudgetDB | null = null;

/**
 * Inject the BudgetDB implementation for the aggregator.
 */
export function setAggregatorDB(db: BudgetDB): void {
  budgetDB = db;
}

function requireDB(): BudgetDB {
  if (!budgetDB) {
    throw new Error(
      "BudgetDB not initialized. Call setAggregatorDB() first."
    );
  }
  return budgetDB;
}

function mapSummary(
  raw: Array<{
    provider: string;
    model: string;
    total_input_tokens: number;
    total_output_tokens: number;
    total_cost: number;
    request_count: number;
  }>
): DailySummary[] {
  return raw.map((r) => ({
    provider: r.provider,
    model: r.model,
    totalInputTokens: r.total_input_tokens,
    totalOutputTokens: r.total_output_tokens,
    totalCost: r.total_cost,
    requestCount: r.request_count,
  }));
}

/**
 * Get per-provider/model summary for a specific date (YYYY-MM-DD).
 */
export function getDailySummary(date: string): DailySummary[] {
  const db = requireDB();
  return mapSummary(db.getDailySummary(date));
}

/**
 * Get per-provider/model summary for a date range (inclusive).
 */
export function getDateRangeSummary(
  startDate: string,
  endDate: string
): DailySummary[] {
  const db = requireDB();
  return mapSummary(db.getDateRangeSummary(startDate, endDate));
}

/**
 * Get total USD spend across all providers.
 * Optionally filtered by date range.
 */
export function getTotalSpend(
  startDate?: string,
  endDate?: string
): number {
  const db = requireDB();
  return db.getTotalSpend(startDate, endDate);
}

/**
 * Get token usage for a specific provider in a date range.
 */
export function getTokenUsage(
  provider: string,
  startDate: string,
  endDate: string
): { inputTokens: number; outputTokens: number; cost: number } {
  const db = requireDB();
  const raw = db.getProviderUsage(provider, startDate, endDate);
  return {
    inputTokens: raw.input_tokens,
    outputTokens: raw.output_tokens,
    cost: raw.cost,
  };
}
