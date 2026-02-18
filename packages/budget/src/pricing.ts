/**
 * Model pricing table for LLM providers.
 * All costs in USD. Token-based models charge per 1K tokens.
 * Time-based models (e.g. RunPod GPU) charge per hour.
 */

export interface ModelPricing {
  provider: string;
  model: string;
  inputPer1kTokens: number;
  outputPer1kTokens: number;
  type: "token" | "time";
  ratePerHour?: number;
}

export const PRICING_TABLE: ModelPricing[] = [
  {
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    inputPer1kTokens: 0.003,
    outputPer1kTokens: 0.015,
    type: "token",
  },
  {
    provider: "anthropic",
    model: "claude-opus-4-20250514",
    inputPer1kTokens: 0.015,
    outputPer1kTokens: 0.075,
    type: "token",
  },
  {
    provider: "xai",
    model: "grok-3",
    inputPer1kTokens: 0.003,
    outputPer1kTokens: 0.015,
    type: "token",
  },
  {
    provider: "runpod",
    model: "gpu",
    inputPer1kTokens: 0,
    outputPer1kTokens: 0,
    type: "time",
    ratePerHour: 0.79,
  },
];

/**
 * Look up pricing for a specific provider/model combo.
 * Returns null if no pricing is found.
 */
export function getPricing(
  provider: string,
  model: string
): ModelPricing | null {
  return (
    PRICING_TABLE.find(
      (p) => p.provider === provider && p.model === model
    ) ?? null
  );
}

/**
 * Calculate the cost in USD for a token-based request.
 * Returns 0 for unknown models or time-based pricing.
 */
export function calculateCost(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = getPricing(provider, model);
  if (!pricing || pricing.type !== "token") return 0;

  const inputCost = (inputTokens / 1000) * pricing.inputPer1kTokens;
  const outputCost = (outputTokens / 1000) * pricing.outputPer1kTokens;
  return inputCost + outputCost;
}
