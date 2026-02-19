import { describe, expect, it } from "bun:test"
import { isForbidden, isModifiable } from "../../../skills/src/core-whitelist"
import {
  MAX_LINES_CHANGED,
  checkForbiddenOperations,
} from "../../../skills/src/diff-guard"
import {
  runSafetyChecks,
  type GuardianDependencies,
  type SafetyOperation,
} from "../guardian"

interface GuardianHarness {
  deps: GuardianDependencies
  budgetReads: {
    daily: number
    weekly: number
    monthly: number
  }
  rateAcquireCalls: number
  releaseCalls: number
  getDailyCount: () => number
}

function createGuardianHarness(overrides?: {
  killSwitchActive?: boolean
  dailySpend?: number
  weeklySpend?: number
  monthlySpend?: number
  dailyModificationCount?: number
}): GuardianHarness {
  const budgetReads = {
    daily: 0,
    weekly: 0,
    monthly: 0,
  }

  let rateAcquireCalls = 0
  let releaseCalls = 0
  let dailyCount = overrides?.dailyModificationCount ?? 0

  const deps: GuardianDependencies = {
    killSwitch: {
      killSwitchPath: "~/.config/arachne/kill-switch",
      fileExists: () => overrides?.killSwitchActive ?? false,
    },
    budgetCapConfig: {
      dailyCapUsd: 20,
      weeklyCapUsd: 100,
      monthlyCapUsd: 400,
    },
    budgetCapDeps: {
      spendingSource: {
        getDailySpendUsd: () => {
          budgetReads.daily += 1
          return overrides?.dailySpend ?? 10
        },
        getWeeklySpendUsd: () => {
          budgetReads.weekly += 1
          return overrides?.weeklySpend ?? 20
        },
        getMonthlySpendUsd: () => {
          budgetReads.monthly += 1
          return overrides?.monthlySpend ?? 30
        },
      },
      clock: {
        now: () => new Date("2026-02-19T11:00:00.000Z"),
      },
      logger: {
        logCapEvent: () => {},
      },
    },
    rateLimiter: {
      acquire: async () => {
        rateAcquireCalls += 1
        return () => {
          releaseCalls += 1
        }
      },
    },
    modificationLimitsDeps: {
      whitelist: {
        isModifiable,
        isForbidden,
      },
      diffGuard: {
        maxLinesChanged: MAX_LINES_CHANGED,
        checkForbiddenOperations,
      },
      counter: {
        getDailyCount: async () => dailyCount,
        incrementDailyCount: async () => {
          dailyCount += 1
          return dailyCount
        },
      },
      clock: {
        now: () => new Date("2026-02-19T11:00:00.000Z"),
      },
    },
    modificationLimitsConfig: {
      maxCoreModificationsPerDay: 5,
    },
  }

  return {
    deps,
    budgetReads,
    get rateAcquireCalls() {
      return rateAcquireCalls
    },
    get releaseCalls() {
      return releaseCalls
    },
    getDailyCount: () => dailyCount,
  }
}

function safeOperation(overrides?: Partial<SafetyOperation>): SafetyOperation {
  return {
    name: "core-modification",
    rateLimitRequest: { kind: "llm-call" },
    modificationInput: {
      fileChanges: [{ filePath: "src/hooks/use-core.ts", linesChanged: 4 }],
      gitArgs: ["commit", "-m", "safe"],
      isCoreModification: true,
      consumeDailyQuota: true,
    },
    ...overrides,
  }
}

describe("guardian", () => {
  it("blocks immediately when kill switch is active", async () => {
    const harness = createGuardianHarness({ killSwitchActive: true })
    const result = await runSafetyChecks(safeOperation(), harness.deps)

    expect(result.allowed).toBe(false)
    expect(result.reason).toContain("Kill switch")
  })

  it("short-circuits before budget checks when kill switch is active", async () => {
    const harness = createGuardianHarness({ killSwitchActive: true })

    await runSafetyChecks(safeOperation(), harness.deps)

    expect(harness.budgetReads.daily).toBe(0)
    expect(harness.budgetReads.weekly).toBe(0)
    expect(harness.budgetReads.monthly).toBe(0)
  })

  it("blocks when budget cap is reached", async () => {
    const harness = createGuardianHarness({ dailySpend: 20 })
    const result = await runSafetyChecks(safeOperation(), harness.deps)

    expect(result.allowed).toBe(false)
    expect(result.reason).toContain("Daily budget cap")
    expect(harness.rateAcquireCalls).toBe(0)
  })

  it("acquires rate limit when kill switch and budget checks pass", async () => {
    const harness = createGuardianHarness()

    const result = await runSafetyChecks(safeOperation(), harness.deps)

    expect(result.allowed).toBe(true)
    expect(harness.rateAcquireCalls).toBe(1)
  })

  it("returns a release function for rate-limited allowed operations", async () => {
    const harness = createGuardianHarness()
    const result = await runSafetyChecks(safeOperation(), harness.deps)

    expect(result.allowed).toBe(true)
    expect(typeof result.release).toBe("function")

    result.release?.()
    expect(harness.releaseCalls).toBe(1)
  })

  it("blocks when modification limits fail", async () => {
    const harness = createGuardianHarness()
    const result = await runSafetyChecks(
      safeOperation({
        modificationInput: {
          fileChanges: [{ filePath: "src/utils/not-allowed.ts", linesChanged: 4 }],
          gitArgs: ["commit", "-m", "unsafe"],
          isCoreModification: true,
        },
      }),
      harness.deps
    )

    expect(result.allowed).toBe(false)
    expect(result.reason).toContain("outside modifiable whitelist")
  })

  it("releases already acquired rate slot when modification checks fail", async () => {
    const harness = createGuardianHarness()

    await runSafetyChecks(
      safeOperation({
        modificationInput: {
          fileChanges: [{ filePath: "src/utils/not-allowed.ts", linesChanged: 4 }],
          gitArgs: ["commit", "-m", "unsafe"],
          isCoreModification: true,
        },
      }),
      harness.deps
    )

    expect(harness.rateAcquireCalls).toBe(1)
    expect(harness.releaseCalls).toBe(1)
  })

  it("increments daily modification count on successful guarded modification", async () => {
    const harness = createGuardianHarness({ dailyModificationCount: 2 })
    const result = await runSafetyChecks(safeOperation(), harness.deps)

    expect(result.allowed).toBe(true)
    expect(harness.getDailyCount()).toBe(3)
  })

  it("allows non-modification operations while still enforcing kill/budget/rate", async () => {
    const harness = createGuardianHarness()

    const result = await runSafetyChecks(
      {
        name: "status-report",
        rateLimitRequest: { kind: "api-call", provider: "anthropic" },
      },
      harness.deps
    )

    expect(result.allowed).toBe(true)
    expect(harness.rateAcquireCalls).toBe(1)
    expect(result.modificationResult).toBeUndefined()
  })
})
