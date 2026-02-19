import { describe, it, expect } from "bun:test"
import {
	isKillSwitchActive,
	checkBudgetCap,
	checkModificationLimits,
	checkPersonalityInvariant,
	runSafetyChecks,
	type BudgetCapConfig,
	type BudgetCapDependencies,
	type ModificationLimitsDependencies,
	type GuardianDependencies,
} from "@arachne/safety"

function createBudgetCapConfig(overrides?: Partial<BudgetCapConfig>): BudgetCapConfig {
	return {
		dailyCapUsd: 50,
		weeklyCapUsd: 200,
		monthlyCapUsd: 500,
		...overrides,
	}
}

function createBudgetCapDeps(
	overrides?: Partial<{
		dailyUsd: number
		weeklyUsd: number
		monthlyUsd: number
	}>,
): BudgetCapDependencies {
	const { dailyUsd = 10, weeklyUsd = 30, monthlyUsd = 100 } = overrides ?? {}

	return {
		spendingSource: {
			getDailySpendUsd: () => dailyUsd,
			getWeeklySpendUsd: () => weeklyUsd,
			getMonthlySpendUsd: () => monthlyUsd,
		},
		clock: { now: () => new Date("2026-02-19T12:00:00Z") },
		logger: { logCapEvent: () => {} },
	}
}

function createModLimitsDeps(overrides?: {
	isModifiable?: (path: string) => boolean
	isForbidden?: (path: string) => boolean
	dailyCount?: number
}): ModificationLimitsDependencies {
	return {
		whitelist: {
			isModifiable: overrides?.isModifiable ?? (() => true),
			isForbidden: overrides?.isForbidden ?? (() => false),
		},
		diffGuard: {
			maxLinesChanged: 500,
			checkForbiddenOperations: () => ({ ok: true, message: "" }),
		},
		counter: {
			getDailyCount: () => overrides?.dailyCount ?? 0,
			incrementDailyCount: () => (overrides?.dailyCount ?? 0) + 1,
		},
		clock: { now: () => new Date("2026-02-19T12:00:00Z") },
	}
}

describe("Safety system integration", () => {
	describe("Kill switch stops all operations", () => {
		it("blocks when kill switch file exists", () => {
			const result = isKillSwitchActive({ fileExists: () => true })
			expect(result).toBe(true)
		})

		it("allows when kill switch file absent", () => {
			const result = isKillSwitchActive({ fileExists: () => false })
			expect(result).toBe(false)
		})
	})

	describe("Budget cap enforcement", () => {
		it("blocks non-critical ops when over daily budget", async () => {
			const result = await checkBudgetCap(
				{ operation: "generate-code" },
				createBudgetCapConfig({ dailyCapUsd: 50 }),
				createBudgetCapDeps({ dailyUsd: 55 }),
			)
			expect(result.allowed).toBe(false)
			expect(result.blockedPeriod).toBe("daily")
		})

		it("allows critical ops even when over budget", async () => {
			const result = await checkBudgetCap(
				{ operation: "health-check" },
				createBudgetCapConfig({ dailyCapUsd: 50 }),
				createBudgetCapDeps({ dailyUsd: 100 }),
			)
			expect(result.allowed).toBe(true)
			expect(result.isCriticalOperation).toBe(true)
		})

		it("allows operations under budget", async () => {
			const result = await checkBudgetCap(
				{ operation: "generate-code" },
				createBudgetCapConfig({ dailyCapUsd: 50 }),
				createBudgetCapDeps({ dailyUsd: 30 }),
			)
			expect(result.allowed).toBe(true)
		})

		it("commander override bypasses budget cap", async () => {
			const result = await checkBudgetCap(
				{
					operation: "generate-code",
					override: {
						enabled: true,
						expiresAt: new Date("2026-12-31T23:59:59Z"),
						commanderId: "commander",
						reason: "urgent task",
					},
				},
				createBudgetCapConfig({ dailyCapUsd: 50 }),
				createBudgetCapDeps({ dailyUsd: 100 }),
			)
			expect(result.allowed).toBe(true)
			expect(result.isCommanderOverrideActive).toBe(true)
		})
	})

	describe("Modification limits enforced", () => {
		it("rejects modifications to forbidden paths", async () => {
			const result = await checkModificationLimits(
				{
					fileChanges: [{ filePath: "src/index.ts", linesChanged: 5 }],
				},
				createModLimitsDeps({
					isForbidden: (path) => path === "src/index.ts",
				}),
			)
			expect(result.allowed).toBe(false)
			expect(result.violations.some((v: string) => v.includes("Forbidden"))).toBe(true)
		})

		it("rejects when daily core modification limit exceeded", async () => {
			const result = await checkModificationLimits(
				{
					fileChanges: [{ filePath: "src/hooks/custom.ts", linesChanged: 10 }],
					isCoreModification: true,
				},
				createModLimitsDeps({ dailyCount: 5 }),
				{ maxCoreModificationsPerDay: 5 },
			)
			expect(result.allowed).toBe(false)
			expect(result.violations.some((v: string) => v.includes("Daily core modification limit"))).toBe(true)
		})

		it("allows valid modifications within limits", async () => {
			const result = await checkModificationLimits(
				{
					fileChanges: [{ filePath: "src/hooks/custom.ts", linesChanged: 10 }],
					isCoreModification: true,
				},
				createModLimitsDeps({ dailyCount: 2 }),
				{ maxCoreModificationsPerDay: 5 },
			)
			expect(result.allowed).toBe(true)
		})

		it("blocks safety guardrail modifications", async () => {
			const result = await checkModificationLimits(
				{
					fileChanges: [{ filePath: "packages/safety/src/guardian.ts", linesChanged: 3 }],
				},
				createModLimitsDeps(),
			)
			expect(result.allowed).toBe(false)
			expect(result.violations.some((v: string) => v.includes("Safety guardrails"))).toBe(true)
		})

		it("blocks test file deletion", async () => {
			const result = await checkModificationLimits(
				{
					fileChanges: [{ filePath: "src/__tests__/auth.test.ts", linesChanged: 50, deleted: true }],
				},
				createModLimitsDeps(),
			)
			expect(result.allowed).toBe(false)
			expect(result.violations.some((v: string) => v.includes("Deleting test files"))).toBe(true)
		})
	})

	describe("Personality invariants", () => {
		it("blocks modification of core identity", () => {
			const original = "core_identity: Arachne the polymath\nhonesty: Always truthful"
			const modified = "core_identity: Generic AI\nhonesty: Always truthful"

			const result = checkPersonalityInvariant(original, modified)
			expect(result.safe).toBe(false)
			expect(result.violations.some((v: string) => v.includes("core_identity"))).toBe(true)
		})

		it("allows modification of non-invariant dimensions", () => {
			const original = "core_identity: Arachne the polymath\ntone: Sarcastic and warm"
			const modified = "core_identity: Arachne the polymath\ntone: Dry and witty"

			const result = checkPersonalityInvariant(original, modified)
			expect(result.safe).toBe(true)
		})
	})

	describe("Guardian unified safety checks", () => {
		it("kill switch blocks everything via guardian", async () => {
			const deps: GuardianDependencies = {
				killSwitch: { fileExists: () => true },
				budgetCapConfig: createBudgetCapConfig(),
				budgetCapDeps: createBudgetCapDeps(),
				rateLimiter: { acquire: async () => () => {} },
				modificationLimitsDeps: createModLimitsDeps(),
			}

			const result = await runSafetyChecks({ name: "test-op" }, deps)
			expect(result.allowed).toBe(false)
			expect(result.reason).toBe("Kill switch is active")
		})

		it("guardian allows normal operations when all checks pass", async () => {
			const deps: GuardianDependencies = {
				killSwitch: { fileExists: () => false },
				budgetCapConfig: createBudgetCapConfig(),
				budgetCapDeps: createBudgetCapDeps({ dailyUsd: 10 }),
				rateLimiter: { acquire: async () => () => {} },
				modificationLimitsDeps: createModLimitsDeps(),
			}

			const result = await runSafetyChecks({ name: "generate-code" }, deps)
			expect(result.allowed).toBe(true)
		})

		it("guardian blocks when budget exceeded", async () => {
			const deps: GuardianDependencies = {
				killSwitch: { fileExists: () => false },
				budgetCapConfig: createBudgetCapConfig({ dailyCapUsd: 50 }),
				budgetCapDeps: createBudgetCapDeps({ dailyUsd: 60 }),
				rateLimiter: { acquire: async () => () => {} },
				modificationLimitsDeps: createModLimitsDeps(),
			}

			const result = await runSafetyChecks({ name: "generate-code" }, deps)
			expect(result.allowed).toBe(false)
			expect(result.budgetResult?.blockedPeriod).toBe("daily")
		})
	})
})
