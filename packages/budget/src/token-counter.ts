/**
 * Core token counting engine.
 * Parses token usage from LLM response metadata,
 * creates token events, and records them to the DB.
 */

import { calculateCost } from "./pricing";
import type { BudgetDB } from "./db-interface";

export interface TokenUsageEvent {
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  project?: string;
  timestamp: string;
}

// Module-level DB reference. Set via setBudgetDB() for DI.
let budgetDB: BudgetDB | null = null;

/**
 * Inject the BudgetDB implementation.
 * Call this at app startup to wire to the real DB,
 * or in tests to inject a mock.
 */
export function setBudgetDB(db: BudgetDB): void {
  budgetDB = db;
}

/**
 * Parse token usage from LLM response metadata.
 * Handles Anthropic format (input_tokens/output_tokens)
 * and OpenAI/xAI format (prompt_tokens/completion_tokens).
 * Returns null if no recognized token fields found.
 */
export function parseTokenUsage(
  responseMetadata: Record<string, any>
): { inputTokens: number; outputTokens: number } | null {
  if (!responseMetadata || typeof responseMetadata !== "object") return null;

  const usage = responseMetadata.usage;
  if (!usage || typeof usage !== "object") return null;

  // Anthropic format (preferred when both present)
  if ("input_tokens" in usage && "output_tokens" in usage) {
    return {
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
    };
  }

  // OpenAI / xAI format
  if ("prompt_tokens" in usage && "completion_tokens" in usage) {
    return {
      inputTokens: usage.prompt_tokens,
      outputTokens: usage.completion_tokens,
    };
  }

  return null;
}

/**
 * Create a TokenUsageEvent with auto-calculated cost and timestamp.
 */
export function createTokenEvent(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  project?: string
): TokenUsageEvent {
  return {
    provider,
    model,
    inputTokens,
    outputTokens,
    estimatedCost: calculateCost(provider, model, inputTokens, outputTokens),
    project,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Record a token usage event to the database.
 * Requires setBudgetDB() to have been called first.
 */
export function recordTokenUsage(event: TokenUsageEvent): void {
  if (!budgetDB) {
    throw new Error(
      "BudgetDB not initialized. Call setBudgetDB() before recording."
    );
  }

  budgetDB.insert({
    provider: event.provider,
    model: event.model,
    input_tokens: event.inputTokens,
    output_tokens: event.outputTokens,
    estimated_cost: event.estimatedCost,
    project: event.project ?? null,
    timestamp: event.timestamp,
  });
}
