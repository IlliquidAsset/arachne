import { describe, expect, it } from "bun:test"
import {
  CRITICAL_OPERATIONS,
  checkBudgetCap,
  isCommanderOverrideActive,
  type BudgetCapConfig,
  type BudgetCapDependencies,
  type BudgetCapEvent,
} from "../budget-cap"

interface BudgetHarness {
  deps: BudgetCapDependencies
  events: BudgetCapEvent[]
}

function createBudgetHarness(overrides?: {
  now?: Date
  dailyUsd?: number
  weeklyUsd?: number
  monthlyUsd?: number
}): BudgetHarness {
  const events: BudgetCapEvent[] = []

  return {
    deps: {
      spendingSource: {
        getDailySpendUsd: () => overrides?.dailyUsd ?? 10,
        getWeeklySpendUsd: () => overrides?.weeklyUsd ?? 25,
        getMonthlySpendUsd: () => overrides?.monthlyUsd ?? 80,
      },
      clock: {
        now: () => overrides?.now ?? new Date("2026-02-19T10:00:00.000Z"),
      },
      logger: {
        logCapEvent: event => {
          events.push(event)
        },
      },
    },
    events,
  }
}

const BASE_CONFIG: BudgetCapConfig = {
  dailyCapUsd: 20,
  weeklyCapUsd: 100,
  monthlyCapUsd: 400,
}

describe("budget-cap", () => {
  it("exposes required critical operations", () => {
    expect(CRITICAL_OPERATIONS).toEqual([
      "health-check",
      "status-report",
      "kill-switch-check",
    ])
  })

  it("allows non-critical operations when spend is below every cap", async () => {
    const harness = createBudgetHarness()

    const result = await checkBudgetCap(
      { operation: "core-modification" },
      BASE_CONFIG,
      harness.deps
    )

    expect(result.allowed).toBe(true)
    expect(result.blockedPeriod).toBeUndefined()
  })

  it("blocks non-critical operations when daily cap is reached", async () => {
    const harness = createBudgetHarness({ dailyUsd: 20 })

    const result = await checkBudgetCap(
      { operation: "core-modification" },
      BASE_CONFIG,
      harness.deps
    )

    expect(result.allowed).toBe(false)
    expect(result.blockedPeriod).toBe("daily")
    expect(result.reason).toContain("Daily budget cap")
  })

  it("blocks non-critical operations when weekly cap is reached", async () => {
    const harness = createBudgetHarness({ dailyUsd: 19.99, weeklyUsd: 100 })

    const result = await checkBudgetCap(
      { operation: "core-modification" },
      BASE_CONFIG,
      harness.deps
    )

    expect(result.allowed).toBe(false)
    expect(result.blockedPeriod).toBe("weekly")
  })

  it("blocks non-critical operations when monthly cap is reached", async () => {
    const harness = createBudgetHarness({
      dailyUsd: 19,
      weeklyUsd: 90,
      monthlyUsd: 400,
    })

    const result = await checkBudgetCap(
      { operation: "core-modification" },
      BASE_CONFIG,
      harness.deps
    )

    expect(result.allowed).toBe(false)
    expect(result.blockedPeriod).toBe("monthly")
  })

  it("always allows critical operations even when every cap is exceeded", async () => {
    const harness = createBudgetHarness({ dailyUsd: 999, weeklyUsd: 999, monthlyUsd: 999 })

    const result = await checkBudgetCap(
      { operation: "health-check" },
      BASE_CONFIG,
      harness.deps
    )

    expect(result.allowed).toBe(true)
    expect(result.isCriticalOperation).toBe(true)
  })

  it("allows non-critical operations during an active commander override", async () => {
    const harness = createBudgetHarness({ dailyUsd: 30, weeklyUsd: 120, monthlyUsd: 600 })

    const result = await checkBudgetCap(
      {
        operation: "core-modification",
        override: {
          enabled: true,
          expiresAt: new Date("2026-02-20T10:00:00.000Z"),
          commanderId: "commander-1",
        },
      },
      BASE_CONFIG,
      harness.deps
    )

    expect(result.allowed).toBe(true)
    expect(result.isCommanderOverrideActive).toBe(true)
  })

  it("blocks operations when commander override is expired", async () => {
    const harness = createBudgetHarness({
      now: new Date("2026-02-19T10:00:00.000Z"),
      dailyUsd: 30,
      weeklyUsd: 120,
      monthlyUsd: 600,
    })

    const result = await checkBudgetCap(
      {
        operation: "core-modification",
        override: {
          enabled: true,
          expiresAt: new Date("2026-02-18T10:00:00.000Z"),
        },
      },
      BASE_CONFIG,
      harness.deps
    )

    expect(result.allowed).toBe(false)
    expect(result.isCommanderOverrideActive).toBe(false)
  })

  it("supports custom critical operation extensions", async () => {
    const harness = createBudgetHarness({ dailyUsd: 30, weeklyUsd: 120, monthlyUsd: 600 })

    const result = await checkBudgetCap(
      { operation: "emergency-drain" },
      {
        ...BASE_CONFIG,
        criticalOperations: ["emergency-drain"],
      },
      harness.deps
    )

    expect(result.allowed).toBe(true)
    expect(result.isCriticalOperation).toBe(true)
  })

  it("logs every budget cap enforcement decision", async () => {
    const harness = createBudgetHarness({ dailyUsd: 30 })

    await checkBudgetCap(
      { operation: "core-modification" },
      BASE_CONFIG,
      harness.deps
    )

    expect(harness.events).toHaveLength(1)
    expect(harness.events[0]?.operation).toBe("core-modification")
    expect(harness.events[0]?.allowed).toBe(false)
    expect(harness.events[0]?.blockedPeriod).toBe("daily")
  })

  it("treats disabled or invalid overrides as inactive", () => {
    const now = new Date("2026-02-19T10:00:00.000Z")

    expect(
      isCommanderOverrideActive(
        {
          enabled: false,
          expiresAt: new Date("2026-02-20T10:00:00.000Z"),
        },
        now
      )
    ).toBe(false)

    expect(
      isCommanderOverrideActive(
        {
          enabled: true,
          expiresAt: "invalid-date",
        },
        now
      )
    ).toBe(false)
  })
})
