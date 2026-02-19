const DEFAULT_MAX_CORE_MODIFICATIONS_PER_DAY = 5

export interface CoreWhitelistGuard {
  isModifiable: (filePath: string) => boolean
  isForbidden: (filePath: string) => boolean
}

export interface DiffGuardResult {
  ok: boolean
  message: string
}

export interface DiffGuard {
  maxLinesChanged: number
  checkForbiddenOperations: (gitArgs: string | string[]) => DiffGuardResult
}

export interface DailyModificationCounter {
  getDailyCount: (dayKey: string) => number | Promise<number>
  incrementDailyCount: (dayKey: string) => number | Promise<number>
}

export interface ModificationClock {
  now: () => Date
}

export interface ModificationLimitsDependencies {
  whitelist: CoreWhitelistGuard
  diffGuard: DiffGuard
  counter: DailyModificationCounter
  clock: ModificationClock
}

export interface FileModification {
  filePath: string
  linesChanged: number
  deleted?: boolean
}

export interface ModificationLimitsInput {
  fileChanges: FileModification[]
  gitArgs?: string | string[]
  isCoreModification?: boolean
  consumeDailyQuota?: boolean
}

export interface ModificationLimitsConfig {
  maxLinesPerCommit?: number
  maxCoreModificationsPerDay?: number
}

export interface ModificationLimitsResult {
  allowed: boolean
  reason?: string
  violations: string[]
  totalLinesChanged: number
  dailyCoreModifications: number
  maxCoreModificationsPerDay: number
}

function normalizePath(filePath: string): string {
  return filePath
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/^\/+/, "")
}

function formatDayKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function isSafetyGuardrailPath(filePath: string): boolean {
  const normalized = normalizePath(filePath)
  return normalized.includes("packages/safety/")
}

function isTestFilePath(filePath: string): boolean {
  const normalized = normalizePath(filePath)

  if (normalized.includes("/__tests__/")) {
    return true
  }

  return /\.(test|spec)\.[a-z0-9]+$/i.test(normalized)
}

function getTotalLinesChanged(fileChanges: FileModification[]): number {
  return fileChanges.reduce((total, fileChange) => total + Math.abs(fileChange.linesChanged), 0)
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values))
}

export async function checkModificationLimits(
  input: ModificationLimitsInput,
  deps: ModificationLimitsDependencies,
  config: ModificationLimitsConfig = {}
): Promise<ModificationLimitsResult> {
  const maxLinesPerCommit = config.maxLinesPerCommit ?? deps.diffGuard.maxLinesChanged
  const maxCoreModificationsPerDay =
    config.maxCoreModificationsPerDay ?? DEFAULT_MAX_CORE_MODIFICATIONS_PER_DAY
  const isCoreModification = input.isCoreModification ?? true
  const consumeDailyQuota = input.consumeDailyQuota ?? true

  const violations: string[] = []
  const totalLinesChanged = getTotalLinesChanged(input.fileChanges)

  const gitOperationCheck = deps.diffGuard.checkForbiddenOperations(input.gitArgs ?? [])
  if (!gitOperationCheck.ok) {
    violations.push(gitOperationCheck.message)
  }

  if (totalLinesChanged > maxLinesPerCommit) {
    violations.push(
      `Diff size exceeds limit (${totalLinesChanged}/${maxLinesPerCommit} lines changed)`
    )
  }

  for (const fileChange of input.fileChanges) {
    const { filePath, deleted } = fileChange

    if (isSafetyGuardrailPath(filePath)) {
      violations.push(`Safety guardrails are immutable: ${filePath}`)
    }

    if (deleted && isTestFilePath(filePath)) {
      violations.push(`Deleting test files is forbidden: ${filePath}`)
    }

    if (deps.whitelist.isForbidden(filePath)) {
      violations.push(`Forbidden path detected: ${filePath}`)
      continue
    }

    if (!deps.whitelist.isModifiable(filePath)) {
      violations.push(`Path is outside modifiable whitelist: ${filePath}`)
    }
  }

  const dayKey = formatDayKey(deps.clock.now())
  let dailyCoreModifications = await deps.counter.getDailyCount(dayKey)

  if (isCoreModification && dailyCoreModifications >= maxCoreModificationsPerDay) {
    violations.push(
      `Daily core modification limit reached (${dailyCoreModifications}/${maxCoreModificationsPerDay})`
    )
  }

  const dedupedViolations = unique(violations)
  const allowed = dedupedViolations.length === 0

  if (allowed && isCoreModification && consumeDailyQuota) {
    dailyCoreModifications = await deps.counter.incrementDailyCount(dayKey)
  }

  return {
    allowed,
    reason: dedupedViolations[0],
    violations: dedupedViolations,
    totalLinesChanged,
    dailyCoreModifications,
    maxCoreModificationsPerDay,
  }
}
