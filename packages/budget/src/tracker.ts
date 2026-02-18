/**
 * Spending tracker — summaries by period, provider, and project.
 * Uses DI to consume existing aggregator functions from the token counting engine.
 */

import type { DailySummary } from "./aggregator";

// --- Types ---

export interface SpendingSummary {
  totalUsd: number;
  byProvider: Record<
    string,
    { inputTokens: number; outputTokens: number; cost: number }
  >;
  byProject: Record<string, number>;
  period: string;
}

export interface ProviderUsage {
  provider: string;
  totalTokensIn: number;
  totalTokensOut: number;
  totalCost: number;
  models: Array<{
    model: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
  }>;
}

export interface ProjectUsage {
  project: string;
  totalTokens: number;
  totalCost: number;
  lastActivity: string;
}

export interface TrackerDependencies {
  getDailySummary: (date: string) => DailySummary[];
  getDateRangeSummary: (startDate: string, endDate: string) => DailySummary[];
  getTotalSpend: (startDate?: string, endDate?: string) => number;
  getTokenUsage: (
    provider: string,
    startDate: string,
    endDate: string
  ) => { inputTokens: number; outputTokens: number; cost: number };
  queryByDateRange: (
    startDate: string,
    endDate: string
  ) => Array<{
    provider: string;
    model: string;
    input_tokens: number;
    output_tokens: number;
    estimated_cost: number;
    project: string | null;
    timestamp: string;
  }>;
}

// --- Helpers ---

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getDateRange(
  period: "day" | "week" | "month",
  opts?: { date?: string }
): { startDate: string; endDate: string } {
  const now = opts?.date ? new Date(opts.date + "T00:00:00Z") : new Date();
  const endDate = formatDate(now);

  switch (period) {
    case "day":
      return { startDate: endDate, endDate };
    case "week": {
      const weekAgo = new Date(now);
      weekAgo.setUTCDate(weekAgo.getUTCDate() - 6);
      return { startDate: formatDate(weekAgo), endDate };
    }
    case "month": {
      const monthAgo = new Date(now);
      monthAgo.setUTCDate(monthAgo.getUTCDate() - 29);
      return { startDate: formatDate(monthAgo), endDate };
    }
  }
}

function buildByProvider(
  summaries: DailySummary[]
): Record<string, { inputTokens: number; outputTokens: number; cost: number }> {
  const result: Record<
    string,
    { inputTokens: number; outputTokens: number; cost: number }
  > = {};

  for (const s of summaries) {
    if (!result[s.provider]) {
      result[s.provider] = { inputTokens: 0, outputTokens: 0, cost: 0 };
    }
    result[s.provider].inputTokens += s.totalInputTokens;
    result[s.provider].outputTokens += s.totalOutputTokens;
    result[s.provider].cost += s.totalCost;
  }

  return result;
}

function buildByProject(
  records: Array<{
    estimated_cost: number;
    project: string | null;
  }>
): Record<string, number> {
  const result: Record<string, number> = {};

  for (const r of records) {
    const project = r.project ?? "unassigned";
    result[project] = (result[project] ?? 0) + r.estimated_cost;
  }

  return result;
}

// --- Public API ---

/**
 * Get a spending summary for a given period.
 */
export function getSpendingSummary(
  period: "day" | "week" | "month",
  deps: TrackerDependencies,
  opts?: { date?: string }
): SpendingSummary {
  const { startDate, endDate } = getDateRange(period, opts);

  let summaries: DailySummary[];
  if (period === "day") {
    summaries = deps.getDailySummary(startDate);
  } else {
    summaries = deps.getDateRangeSummary(startDate, endDate);
  }

  const records = deps.queryByDateRange(startDate, endDate);
  const totalUsd = summaries.reduce((sum, s) => sum + s.totalCost, 0);

  return {
    totalUsd,
    byProvider: buildByProvider(summaries),
    byProject: buildByProject(records),
    period,
  };
}

/**
 * Get per-provider breakdown with model-level detail.
 */
export function getProviderBreakdown(deps: TrackerDependencies): ProviderUsage[] {
  // Use a wide date range to get all data
  const summaries = deps.getDateRangeSummary("2000-01-01", "2099-12-31");

  const providers = new Map<string, ProviderUsage>();

  for (const s of summaries) {
    let entry = providers.get(s.provider);
    if (!entry) {
      entry = {
        provider: s.provider,
        totalTokensIn: 0,
        totalTokensOut: 0,
        totalCost: 0,
        models: [],
      };
      providers.set(s.provider, entry);
    }

    entry.totalTokensIn += s.totalInputTokens;
    entry.totalTokensOut += s.totalOutputTokens;
    entry.totalCost += s.totalCost;
    entry.models.push({
      model: s.model,
      inputTokens: s.totalInputTokens,
      outputTokens: s.totalOutputTokens,
      cost: s.totalCost,
    });
  }

  return Array.from(providers.values());
}

/**
 * Get per-project breakdown with last activity.
 */
export function getProjectBreakdown(deps: TrackerDependencies): ProjectUsage[] {
  const records = deps.queryByDateRange("2000-01-01", "2099-12-31");

  const projects = new Map<
    string,
    { totalTokens: number; totalCost: number; lastActivity: string }
  >();

  for (const r of records) {
    const project = r.project ?? "unassigned";
    const existing = projects.get(project);

    if (!existing) {
      projects.set(project, {
        totalTokens: r.input_tokens + r.output_tokens,
        totalCost: r.estimated_cost,
        lastActivity: r.timestamp,
      });
    } else {
      existing.totalTokens += r.input_tokens + r.output_tokens;
      existing.totalCost += r.estimated_cost;
      if (r.timestamp > existing.lastActivity) {
        existing.lastActivity = r.timestamp;
      }
    }
  }

  return Array.from(projects.entries()).map(([project, data]) => ({
    project,
    ...data,
  }));
}
