import type { SpendingSummary } from "../api/types"

export type UsageLevel = "green" | "yellow" | "red"

export interface ProviderBar {
	name: string
	tokensUsed: number
	tokenLimit: number
	costUsd: number
	percentage: number
	level: UsageLevel
}

export interface TokenRibbonData {
	providers: ProviderBar[]
	totalCostUsd: number
	collapsed: boolean
}

const PROVIDER_LABELS: Record<string, string> = {
	anthropic: "Claude",
	xai: "Grok",
	runpod: "RunPod",
}

const DEFAULT_TOKEN_LIMITS: Record<string, number> = {
	anthropic: 10_000_000,
	xai: 5_000_000,
	runpod: 2_000_000,
}

export function getUsageLevel(percentage: number): UsageLevel {
	if (percentage >= 80) return "red"
	if (percentage >= 60) return "yellow"
	return "green"
}

export function formatProviderBars(summary: SpendingSummary): ProviderBar[] {
	return Object.entries(summary.byProvider).map(([key, data]) => {
		const tokensUsed = data.tokensIn + data.tokensOut
		const tokenLimit = DEFAULT_TOKEN_LIMITS[key] ?? 5_000_000
		const percentage = Math.min(100, Math.round((tokensUsed / tokenLimit) * 100))

		return {
			name: PROVIDER_LABELS[key] ?? key,
			tokensUsed,
			tokenLimit,
			costUsd: data.costUsd,
			percentage,
			level: getUsageLevel(percentage),
		}
	})
}

export function createTokenRibbonData(
	summary: SpendingSummary | null,
	collapsed = false,
): TokenRibbonData {
	if (!summary) {
		return { providers: [], totalCostUsd: 0, collapsed }
	}

	return {
		providers: formatProviderBars(summary),
		totalCostUsd: summary.totalUsd,
		collapsed,
	}
}

export function formatCost(usd: number): string {
	return `$${usd.toFixed(2)}`
}

export function formatTokenCount(count: number): string {
	if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
	if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`
	return String(count)
}
