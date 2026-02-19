import type { SpendingSummary } from "../api/types"

export interface BudgetOverview {
	todayUsd: number
	weekUsd: number
	monthUsd: number
	providers: ProviderCostEntry[]
	trendPoints: TrendPoint[]
	hasAlert: boolean
	alertLevel: "none" | "warning" | "critical"
}

export interface ProviderCostEntry {
	name: string
	costUsd: number
	percentage: number
}

export interface TrendPoint {
	day: string
	costUsd: number
}

const ALERT_WARNING_THRESHOLD = 0.8
const ALERT_CRITICAL_THRESHOLD = 0.95

const PROVIDER_NAMES: Record<string, string> = {
	anthropic: "Anthropic",
	xai: "xAI",
	runpod: "RunPod",
}

export function calculateProviderBreakdown(
	byProvider: SpendingSummary["byProvider"],
	totalUsd: number,
): ProviderCostEntry[] {
	return Object.entries(byProvider).map(([key, data]) => ({
		name: PROVIDER_NAMES[key] ?? key,
		costUsd: data.costUsd,
		percentage: totalUsd > 0 ? Math.round((data.costUsd / totalUsd) * 100) : 0,
	}))
}

export function determineAlertLevel(
	currentSpend: number,
	dailyBudget: number,
): BudgetOverview["alertLevel"] {
	if (dailyBudget <= 0) return "none"
	const ratio = currentSpend / dailyBudget
	if (ratio >= ALERT_CRITICAL_THRESHOLD) return "critical"
	if (ratio >= ALERT_WARNING_THRESHOLD) return "warning"
	return "none"
}

export function generateTrendPoints(
	dailyCosts: number[],
	endDate = new Date(),
): TrendPoint[] {
	return dailyCosts.map((cost, index) => {
		const date = new Date(endDate)
		date.setDate(date.getDate() - (dailyCosts.length - 1 - index))
		return {
			day: date.toISOString().slice(0, 10),
			costUsd: cost,
		}
	})
}

export function trendToSvgPath(
	points: TrendPoint[],
	width: number,
	height: number,
): string {
	if (points.length === 0) return ""

	const maxCost = Math.max(...points.map((p) => p.costUsd), 0.01)
	const stepX = points.length > 1 ? width / (points.length - 1) : 0

	return points
		.map((point, i) => {
			const x = Math.round(i * stepX)
			const y = Math.round(height - (point.costUsd / maxCost) * height)
			return `${i === 0 ? "M" : "L"} ${x} ${y}`
		})
		.join(" ")
}

export function createBudgetOverview(
	summary: SpendingSummary | null,
	dailyBudget = 0,
	weeklyTotal = 0,
	monthlyTotal = 0,
	recentDailyCosts: number[] = [],
): BudgetOverview {
	if (!summary) {
		return {
			todayUsd: 0,
			weekUsd: 0,
			monthUsd: 0,
			providers: [],
			trendPoints: [],
			hasAlert: false,
			alertLevel: "none",
		}
	}

	const alertLevel = determineAlertLevel(summary.totalUsd, dailyBudget)

	return {
		todayUsd: summary.totalUsd,
		weekUsd: weeklyTotal,
		monthUsd: monthlyTotal,
		providers: calculateProviderBreakdown(summary.byProvider, summary.totalUsd),
		trendPoints: generateTrendPoints(recentDailyCosts),
		hasAlert: alertLevel !== "none",
		alertLevel,
	}
}

export function formatUsd(amount: number): string {
	return `$${amount.toFixed(2)}`
}
