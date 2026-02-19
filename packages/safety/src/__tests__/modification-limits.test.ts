import { describe, expect, it } from "bun:test"
import {
  checkModificationLimits,
  type ModificationLimitsDependencies,
  type ModificationLimitsInput,
} from "../modification-limits"

interface WhitelistModule {
  isForbidden: (filePath: string) => boolean
  isModifiable: (filePath: string) => boolean
}

interface DiffGuardModule {
  MAX_LINES_CHANGED: number
  checkForbiddenOperations: (gitArgs: string | string[]) => { ok: boolean; message: string }
}

let whitelistModulePromise: Promise<WhitelistModule> | null = null
let diffGuardModulePromise: Promise<DiffGuardModule> | null = null

async function loadWhitelistModule(): Promise<WhitelistModule> {
  if (!whitelistModulePromise) {
    const modulePath = ["..", "..", "..", "skills", "src", "core-whitelist"].join("/")
    whitelistModulePromise = import(modulePath) as Promise<WhitelistModule>
  }

  return whitelistModulePromise
}

async function loadDiffGuardModule(): Promise<DiffGuardModule> {
  if (!diffGuardModulePromise) {
    const modulePath = ["..", "..", "..", "skills", "src", "diff-guard"].join("/")
    diffGuardModulePromise = import(modulePath) as Promise<DiffGuardModule>
  }

  return diffGuardModulePromise
}

async function createHarness(initialCount = 0): Promise<{
  deps: ModificationLimitsDependencies
  getCount: () => number
  incrementCalls: string[]
  maxLinesChanged: number
}> {
  const whitelistModule = await loadWhitelistModule()
  const diffGuardModule = await loadDiffGuardModule()

  let count = initialCount
  const incrementCalls: string[] = []

  const deps: ModificationLimitsDependencies = {
    whitelist: {
      isModifiable: whitelistModule.isModifiable,
      isForbidden: whitelistModule.isForbidden,
    },
    diffGuard: {
      maxLinesChanged: diffGuardModule.MAX_LINES_CHANGED,
      checkForbiddenOperations: diffGuardModule.checkForbiddenOperations,
    },
    counter: {
      getDailyCount: async () => count,
      incrementDailyCount: async dayKey => {
        incrementCalls.push(dayKey)
        count += 1
        return count
      },
    },
    clock: {
      now: () => new Date("2026-02-19T09:30:00.000Z"),
    },
  }

  return {
    deps,
    getCount: () => count,
    incrementCalls,
    maxLinesChanged: diffGuardModule.MAX_LINES_CHANGED,
  }
}

function safeInput(overrides?: Partial<ModificationLimitsInput>): ModificationLimitsInput {
  return {
    fileChanges: [{ filePath: "src/hooks/use-core.ts", linesChanged: 8 }],
    gitArgs: ["commit", "-m", "safe change"],
    isCoreModification: true,
    consumeDailyQuota: true,
    ...overrides,
  }
}

describe("modification-limits", () => {
  it("allows safe whitelisted changes within all limits", async () => {
    const harness = await createHarness()
    const result = await checkModificationLimits(safeInput(), harness.deps)

    expect(result.allowed).toBe(true)
    expect(result.totalLinesChanged).toBe(8)
    expect(result.dailyCoreModifications).toBe(1)
  })

  it("rejects changes outside the whitelist", async () => {
    const harness = await createHarness()
    const result = await checkModificationLimits(
      safeInput({
        fileChanges: [{ filePath: "src/utils/format.ts", linesChanged: 4 }],
      }),
      harness.deps
    )

    expect(result.allowed).toBe(false)
    expect(result.violations.some(v => v.includes("outside modifiable whitelist"))).toBe(true)
  })

  it("rejects explicitly forbidden paths", async () => {
    const harness = await createHarness()
    const result = await checkModificationLimits(
      safeInput({
        fileChanges: [{ filePath: "package.json", linesChanged: 2 }],
      }),
      harness.deps
    )

    expect(result.allowed).toBe(false)
    expect(result.violations.some(v => v.includes("Forbidden path"))).toBe(true)
  })

  it("rejects force-push operations", async () => {
    const harness = await createHarness()
    const result = await checkModificationLimits(
      safeInput({
        gitArgs: ["push", "origin", "main", "--force"],
      }),
      harness.deps
    )

    expect(result.allowed).toBe(false)
    expect(result.violations.some(v => v.includes("--force"))).toBe(true)
  })

  it("enforces max lines per commit using diff guard limit", async () => {
    const harness = await createHarness()
    const maxLinesChanged = harness.maxLinesChanged
    const result = await checkModificationLimits(
      safeInput({
        fileChanges: [{ filePath: "src/hooks/use-core.ts", linesChanged: maxLinesChanged + 1 }],
      }),
      harness.deps
    )

    expect(result.allowed).toBe(false)
    expect(result.totalLinesChanged).toBe(maxLinesChanged + 1)
    expect(result.violations.some(v => v.includes("exceeds limit"))).toBe(true)
  })

  it("enforces daily core modification limit", async () => {
    const harness = await createHarness(5)
    const result = await checkModificationLimits(safeInput(), harness.deps)

    expect(result.allowed).toBe(false)
    expect(result.violations.some(v => v.includes("Daily core modification limit reached"))).toBe(
      true
    )
  })

  it("allows configurable daily limit overrides", async () => {
    const harness = await createHarness(5)
    const result = await checkModificationLimits(
      safeInput(),
      harness.deps,
      { maxCoreModificationsPerDay: 6 }
    )

    expect(result.allowed).toBe(true)
    expect(result.dailyCoreModifications).toBe(6)
  })

  it("rejects test file deletion", async () => {
    const harness = await createHarness()
    const result = await checkModificationLimits(
      safeInput({
        fileChanges: [
          {
            filePath: "src/hooks/use-core.test.ts",
            linesChanged: 10,
            deleted: true,
          },
        ],
      }),
      harness.deps
    )

    expect(result.allowed).toBe(false)
    expect(result.violations.some(v => v.includes("Deleting test files is forbidden"))).toBe(
      true
    )
  })

  it("rejects modifications to safety guardrails", async () => {
    const harness = await createHarness()
    const result = await checkModificationLimits(
      safeInput({
        fileChanges: [{ filePath: "packages/safety/src/rate-limiter.ts", linesChanged: 1 }],
      }),
      harness.deps
    )

    expect(result.allowed).toBe(false)
    expect(result.violations.some(v => v.includes("immutable"))).toBe(true)
  })

  it("does not consume daily quota when request is blocked", async () => {
    const harness = await createHarness()

    await checkModificationLimits(
      safeInput({
        fileChanges: [{ filePath: "src/utils/format.ts", linesChanged: 1 }],
      }),
      harness.deps
    )

    expect(harness.incrementCalls).toHaveLength(0)
    expect(harness.getCount()).toBe(0)
  })

  it("supports non-core modifications without using daily quota", async () => {
    const harness = await createHarness(5)
    const result = await checkModificationLimits(
      safeInput({
        isCoreModification: false,
      }),
      harness.deps
    )

    expect(result.allowed).toBe(true)
    expect(result.dailyCoreModifications).toBe(5)
    expect(harness.incrementCalls).toHaveLength(0)
  })

  it("supports explicit non-consuming checks", async () => {
    const harness = await createHarness(2)
    const result = await checkModificationLimits(
      safeInput({ consumeDailyQuota: false }),
      harness.deps
    )

    expect(result.allowed).toBe(true)
    expect(result.dailyCoreModifications).toBe(2)
    expect(harness.incrementCalls).toHaveLength(0)
  })
})
