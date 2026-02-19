/**
 * DB interface for budget tracking.
 * Defines the contract for SQLite operations.
 * In production, this will be wired to @arachne/shared's DB.
 * For testing, an in-memory implementation is provided.
 */

export interface BudgetRecord {
  id?: number;
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  estimated_cost: number;
  project: string | null;
  timestamp: string; // ISO 8601
}

export interface BudgetDB {
  /** Initialize the budget_records table */
  init(): void;
  /** Insert a budget record */
  insert(record: Omit<BudgetRecord, "id">): void;
  /** Query records for a specific date (YYYY-MM-DD) */
  queryByDate(date: string): BudgetRecord[];
  /** Query records for a date range (inclusive) */
  queryByDateRange(startDate: string, endDate: string): BudgetRecord[];
  /** Get aggregated summary grouped by provider+model for a date */
  getDailySummary(
    date: string
  ): Array<{
    provider: string;
    model: string;
    total_input_tokens: number;
    total_output_tokens: number;
    total_cost: number;
    request_count: number;
  }>;
  /** Get aggregated summary for a date range */
  getDateRangeSummary(
    startDate: string,
    endDate: string
  ): Array<{
    provider: string;
    model: string;
    total_input_tokens: number;
    total_output_tokens: number;
    total_cost: number;
    request_count: number;
  }>;
  /** Get total spend, optionally filtered by date range */
  getTotalSpend(startDate?: string, endDate?: string): number;
  /** Get token usage for a specific provider in a date range */
  getProviderUsage(
    provider: string,
    startDate: string,
    endDate: string
  ): { input_tokens: number; output_tokens: number; cost: number };
}

/**
 * In-memory BudgetDB implementation for testing.
 * Uses plain arrays — no SQLite dependency.
 */
export function createInMemoryBudgetDB(): BudgetDB {
  let records: BudgetRecord[] = [];
  let nextId = 1;

  return {
    init() {
      records = [];
      nextId = 1;
    },

    insert(record) {
      records.push({ ...record, id: nextId++ });
    },

    queryByDate(date) {
      return records.filter((r) => r.timestamp.startsWith(date));
    },

    queryByDateRange(startDate, endDate) {
      return records.filter((r) => {
        const d = r.timestamp.slice(0, 10);
        return d >= startDate && d <= endDate;
      });
    },

    getDailySummary(date) {
      const filtered = records.filter((r) => r.timestamp.startsWith(date));
      return aggregate(filtered);
    },

    getDateRangeSummary(startDate, endDate) {
      const filtered = records.filter((r) => {
        const d = r.timestamp.slice(0, 10);
        return d >= startDate && d <= endDate;
      });
      return aggregate(filtered);
    },

    getTotalSpend(startDate?, endDate?) {
      let filtered = records;
      if (startDate && endDate) {
        filtered = records.filter((r) => {
          const d = r.timestamp.slice(0, 10);
          return d >= startDate && d <= endDate;
        });
      } else if (startDate) {
        filtered = records.filter((r) => r.timestamp.slice(0, 10) >= startDate);
      }
      return filtered.reduce((sum, r) => sum + r.estimated_cost, 0);
    },

    getProviderUsage(provider, startDate, endDate) {
      const filtered = records.filter((r) => {
        const d = r.timestamp.slice(0, 10);
        return r.provider === provider && d >= startDate && d <= endDate;
      });
      return {
        input_tokens: filtered.reduce((s, r) => s + r.input_tokens, 0),
        output_tokens: filtered.reduce((s, r) => s + r.output_tokens, 0),
        cost: filtered.reduce((s, r) => s + r.estimated_cost, 0),
      };
    },
  };
}

function aggregate(
  records: BudgetRecord[]
): Array<{
  provider: string;
  model: string;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost: number;
  request_count: number;
}> {
  const groups = new Map<
    string,
    {
      provider: string;
      model: string;
      total_input_tokens: number;
      total_output_tokens: number;
      total_cost: number;
      request_count: number;
    }
  >();

  for (const r of records) {
    const key = `${r.provider}|${r.model}`;
    const existing = groups.get(key);
    if (existing) {
      existing.total_input_tokens += r.input_tokens;
      existing.total_output_tokens += r.output_tokens;
      existing.total_cost += r.estimated_cost;
      existing.request_count += 1;
    } else {
      groups.set(key, {
        provider: r.provider,
        model: r.model,
        total_input_tokens: r.input_tokens,
        total_output_tokens: r.output_tokens,
        total_cost: r.estimated_cost,
        request_count: 1,
      });
    }
  }

  return Array.from(groups.values());
}
