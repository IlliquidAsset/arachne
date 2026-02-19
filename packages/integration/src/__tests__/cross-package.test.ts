import { describe, it, expect } from "bun:test"
import { createTokenRibbonData, formatProviderBars } from "@arachne/web/src/components/TokenRibbon"
import { createServiceGridData } from "@arachne/web/src/components/ServiceStatus"
import { createActiveTasksData } from "@arachne/web/src/components/ActiveTasks"
import { createBudgetOverview } from "@arachne/web/src/components/BudgetSummary"
import { getLayoutConfig, getVisibleNavItems } from "@arachne/web/src/components/Layout"
import { canAccess, getRedirectPath } from "@arachne/web/src/components/AccessControl"
import { checkPersonalityInvariant } from "@arachne/safety/src/invariants"
import { isModifiable, isForbidden } from "@arachne/skills"
import { validateModification } from "@arachne/skills"
import { NoOpVoiceProvider } from "@arachne/autonomy/src/voice-adapter"

describe("Cross-package integration", () => {
	it("token ribbon processes budget data correctly", () => {
		const data = createTokenRibbonData({
			totalUsd: 15.0,
			byProvider: {
				anthropic: { tokensIn: 1_000_000, tokensOut: 500_000, costUsd: 12.0 },
				xai: { tokensIn: 50_000, tokensOut: 10_000, costUsd: 3.0 },
			},
			byProject: {},
			period: "day",
		})

		expect(data.providers).toHaveLength(2)
		expect(data.totalCostUsd).toBe(15.0)
	})

	it("service grid handles empty state", () => {
		const grid = createServiceGridData([])
		expect(grid.totalCount).toBe(0)
		expect(grid.services).toHaveLength(0)
	})

	it("task filtering works with various statuses", () => {
		const data = createActiveTasksData(
			[
				{ id: "1", name: "A", status: "running", track: "llm", project: "x", startedAt: "", duration: 1000 },
				{ id: "2", name: "B", status: "completed", track: "deterministic", project: "y", startedAt: "", duration: 2000 },
			],
			"running",
		)
		expect(data.tasks).toHaveLength(1)
		expect(data.tasks[0].name).toBe("A")
	})

	it("budget overview with alert triggers", () => {
		const overview = createBudgetOverview(
			{
				totalUsd: 48.0,
				byProvider: { anthropic: { tokensIn: 0, tokensOut: 0, costUsd: 48.0 } },
				byProject: {},
				period: "day",
			},
			50,
		)
		expect(overview.hasAlert).toBe(true)
		expect(overview.alertLevel).toBe("critical")
	})

	it("layout adapts to viewport sizes", () => {
		const mobile = getLayoutConfig(375)
		const desktop = getLayoutConfig(1440)

		expect(mobile.gridColumns).toBe(1)
		expect(desktop.gridColumns).toBe(4)
		expect(mobile.sidebarVisible).toBe(false)
		expect(desktop.sidebarVisible).toBe(true)
	})

	it("access control enforces roles across routes", () => {
		expect(canAccess("/settings", "viewer")).toBe(false)
		expect(canAccess("/settings", "admin")).toBe(true)
		expect(getRedirectPath(null, "/dashboard")).toBe("/login")
	})

	it("skills whitelist integration with safety", () => {
		expect(isModifiable("src/hooks/guard.ts")).toBe(true)
		expect(isForbidden("src/index.ts")).toBe(true)

		const validation = validateModification(
			"src/hooks/test.ts",
			"export const a = 1",
			"export const a = 2",
		)
		expect(validation.ok).toBe(true)
	})

	it("personality invariants block forbidden changes", () => {
		const original = "core_identity: Arachne the polymath\nhonesty: Always truthful"
		const modified = "core_identity: Generic AI\nhonesty: Always truthful"

		const result = checkPersonalityInvariant(original, modified)
		expect(result.safe).toBe(false)
		expect(result.violations.some((v) => v.includes("core_identity"))).toBe(true)
	})

	it("voice adapter stub reports unavailable", () => {
		const adapter = new NoOpVoiceProvider()
		expect(adapter.isAvailable()).toBe(false)
	})

	it("nav items filtered by role", () => {
		const adminItems = getVisibleNavItems("admin")
		const viewerItems = getVisibleNavItems("viewer")
		expect(adminItems.length).toBeGreaterThan(viewerItems.length)
	})
})
