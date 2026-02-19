import { describe, it, expect } from "bun:test"
import {
	calculateProviderBreakdown,
	determineAlertLevel,
	generateTrendPoints,
	trendToSvgPath,
	createBudgetOverview,
	formatUsd,
} from "../components/BudgetSummary"
import type { SpendingSummary } from "../api/types"

function makeSummary(overrides?: Partial<SpendingSummary>): SpendingSummary {
	return {
		totalUsd: 10.0,
		byProvider: {
			anthropic: { tokensIn: 500_000, tokensOut: 200_000, costUsd: 7.0 },
			xai: { tokensIn: 100_000, tokensOut: 50_000, costUsd: 3.0 },
		},
		byProject: { arachne: 10 },
		period: "day",
		...overrides,
	}
}

describe("BudgetSummary", () => {
	describe("calculateProviderBreakdown", () => {
		it("calculates percentages", () => {
			const breakdown = calculateProviderBreakdown(makeSummary().byProvider, 10.0)
			expect(breakdown).toHaveLength(2)

			const anthropic = breakdown.find((b) => b.name === "Anthropic")!
			expect(anthropic.costUsd).toBe(7.0)
			expect(anthropic.percentage).toBe(70)
		})

		it("handles zero total", () => {
			const breakdown = calculateProviderBreakdown(makeSummary().byProvider, 0)
			expect(breakdown[0].percentage).toBe(0)
		})
	})

	describe("determineAlertLevel", () => {
		it("returns none below 80%", () => {
			expect(determineAlertLevel(7, 10)).toBe("none")
		})

		it("returns warning at 80%+", () => {
			expect(determineAlertLevel(8, 10)).toBe("warning")
		})

		it("returns critical at 95%+", () => {
			expect(determineAlertLevel(9.5, 10)).toBe("critical")
		})

		it("returns none with no budget", () => {
			expect(determineAlertLevel(100, 0)).toBe("none")
		})
	})

	describe("generateTrendPoints", () => {
		it("generates points for daily costs", () => {
			const points = generateTrendPoints([1, 2, 3, 4, 5, 6, 7])
			expect(points).toHaveLength(7)
			expect(points[0].costUsd).toBe(1)
			expect(points[6].costUsd).toBe(7)
		})

		it("assigns sequential dates", () => {
			const endDate = new Date("2026-02-19")
			const points = generateTrendPoints([1, 2, 3], endDate)
			expect(points[0].day).toBe("2026-02-17")
			expect(points[2].day).toBe("2026-02-19")
		})
	})

	describe("trendToSvgPath", () => {
		it("generates SVG path from points", () => {
			const points = generateTrendPoints([10, 20, 30])
			const path = trendToSvgPath(points, 200, 100)
			expect(path).toStartWith("M ")
			expect(path).toContain("L ")
		})

		it("returns empty for no points", () => {
			expect(trendToSvgPath([], 200, 100)).toBe("")
		})
	})

	describe("createBudgetOverview", () => {
		it("handles null summary", () => {
			const overview = createBudgetOverview(null)
			expect(overview.todayUsd).toBe(0)
			expect(overview.providers).toHaveLength(0)
			expect(overview.hasAlert).toBe(false)
		})

		it("populates from summary", () => {
			const overview = createBudgetOverview(makeSummary(), 20, 50, 200)
			expect(overview.todayUsd).toBe(10.0)
			expect(overview.weekUsd).toBe(50)
			expect(overview.monthUsd).toBe(200)
			expect(overview.providers).toHaveLength(2)
		})

		it("triggers alert when over budget", () => {
			const overview = createBudgetOverview(makeSummary(), 10)
			expect(overview.hasAlert).toBe(true)
			expect(overview.alertLevel).toBe("critical")
		})
	})

	describe("formatUsd", () => {
		it("formats to 2 decimals with dollar sign", () => {
			expect(formatUsd(12.5)).toBe("$12.50")
			expect(formatUsd(0)).toBe("$0.00")
		})
	})
})
