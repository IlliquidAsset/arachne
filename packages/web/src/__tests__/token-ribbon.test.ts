import { describe, it, expect } from "bun:test"
import {
	getUsageLevel,
	formatProviderBars,
	createTokenRibbonData,
	formatCost,
	formatTokenCount,
} from "../components/TokenRibbon"
import type { SpendingSummary } from "../api/types"

function makeSummary(overrides?: Partial<SpendingSummary>): SpendingSummary {
	return {
		totalUsd: 12.5,
		byProvider: {
			anthropic: { tokensIn: 500_000, tokensOut: 200_000, costUsd: 8.0 },
			xai: { tokensIn: 100_000, tokensOut: 50_000, costUsd: 3.0 },
			runpod: { tokensIn: 0, tokensOut: 0, costUsd: 1.5 },
		},
		byProject: { arachne: 10, northstar: 2.5 },
		period: "day",
		...overrides,
	}
}

describe("TokenRibbon", () => {
	describe("getUsageLevel", () => {
		it("returns green below 60%", () => {
			expect(getUsageLevel(0)).toBe("green")
			expect(getUsageLevel(59)).toBe("green")
		})

		it("returns yellow at 60-79%", () => {
			expect(getUsageLevel(60)).toBe("yellow")
			expect(getUsageLevel(79)).toBe("yellow")
		})

		it("returns red at 80%+", () => {
			expect(getUsageLevel(80)).toBe("red")
			expect(getUsageLevel(100)).toBe("red")
		})
	})

	describe("formatProviderBars", () => {
		it("creates bars for each provider", () => {
			const bars = formatProviderBars(makeSummary())
			expect(bars).toHaveLength(3)
		})

		it("maps provider keys to display names", () => {
			const bars = formatProviderBars(makeSummary())
			const names = bars.map((b) => b.name)
			expect(names).toContain("Claude")
			expect(names).toContain("Grok")
			expect(names).toContain("RunPod")
		})

		it("calculates percentage from tokens used vs limit", () => {
			const bars = formatProviderBars(makeSummary())
			const claude = bars.find((b) => b.name === "Claude")!
			expect(claude.tokensUsed).toBe(700_000)
			expect(claude.percentage).toBe(7)
		})

		it("caps percentage at 100", () => {
			const summary = makeSummary({
				byProvider: {
					anthropic: { tokensIn: 9_000_000, tokensOut: 5_000_000, costUsd: 50.0 },
				},
			})
			const bars = formatProviderBars(summary)
			expect(bars[0].percentage).toBe(100)
		})
	})

	describe("createTokenRibbonData", () => {
		it("handles null summary", () => {
			const data = createTokenRibbonData(null)
			expect(data.providers).toHaveLength(0)
			expect(data.totalCostUsd).toBe(0)
		})

		it("populates providers from summary", () => {
			const data = createTokenRibbonData(makeSummary())
			expect(data.providers).toHaveLength(3)
			expect(data.totalCostUsd).toBe(12.5)
		})

		it("respects collapsed flag", () => {
			expect(createTokenRibbonData(null, true).collapsed).toBe(true)
			expect(createTokenRibbonData(null, false).collapsed).toBe(false)
		})
	})

	describe("formatCost", () => {
		it("formats to 2 decimal places", () => {
			expect(formatCost(12.5)).toBe("$12.50")
			expect(formatCost(0)).toBe("$0.00")
			expect(formatCost(1234.567)).toBe("$1234.57")
		})
	})

	describe("formatTokenCount", () => {
		it("formats millions", () => {
			expect(formatTokenCount(1_500_000)).toBe("1.5M")
		})

		it("formats thousands", () => {
			expect(formatTokenCount(42_000)).toBe("42.0K")
		})

		it("formats small numbers as-is", () => {
			expect(formatTokenCount(500)).toBe("500")
		})
	})
})
