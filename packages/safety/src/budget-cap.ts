export const CRITICAL_OPERATIONS = [
  "health-check",
  "status-report",
  "kill-switch-check",
] as const

export type BudgetPeriod = "daily" | "weekly" | "monthly"

export interface BudgetSpendSnapshot {
  dailyUsd: number
  weeklyUsd: number
  monthlyUsd: number
}

export interface BudgetCapConfig {
  dailyCapUsd: number
  weeklyCapUsd: number
  monthlyCapUsd: number
  criticalOperations?: readonly string[]
}

export interface CommanderBudgetOverride {
  enabled: boolean
  expiresAt: Date | string
  commanderId?: string
  reason?: string
}

export interface BudgetCapSpendingDataSource {
  getDailySpendUsd: () => number | Promise<number>
  getWeeklySpendUsd: () => number | Promise<number>
  getMonthlySpendUsd: () => number | Promise<number>
}

export interface BudgetCapClock {
  now: () => Date
}

export interface BudgetCapEvent {
  operation: string
  timestamp: Date
  allowed: boolean
  reason: string
  blockedPeriod?: BudgetPeriod
  isCriticalOperation: boolean
  isCommanderOverrideActive: boolean
  spend: BudgetSpendSnapshot
  caps: {
    dailyCapUsd: number
    weeklyCapUsd: number
    monthlyCapUsd: number
  }
}

export interface BudgetCapLogger {
  logCapEvent: (event: BudgetCapEvent) => void
}

export interface BudgetCapDependencies {
  spendingSource: BudgetCapSpendingDataSource
  clock: BudgetCapClock
  logger: BudgetCapLogger
}

export interface BudgetCapCheckInput {
  operation: string
  override?: CommanderBudgetOverride | null
}

export interface BudgetCapCheckResult {
  allowed: boolean
  reason?: string
  blockedPeriod?: BudgetPeriod
  isCriticalOperation: boolean
  isCommanderOverrideActive: boolean
  spend: BudgetSpendSnapshot
}

function toTimestamp(value: Date | string): number | null {
  if (value instanceof Date) {
    const timestamp = value.getTime()
    return Number.isFinite(timestamp) ? timestamp : null
  }

  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : null
}

function normalizeOperationName(operation: string): string {
  return operation.trim().toLowerCase()
}

function getCriticalOperations(config: BudgetCapConfig): Set<string> {
  return new Set(
    [...CRITICAL_OPERATIONS, ...(config.criticalOperations ?? [])].map(normalizeOperationName)
  )
}

function findBlockedPeriod(
  spend: BudgetSpendSnapshot,
  config: BudgetCapConfig
): BudgetPeriod | null {
  if (spend.dailyUsd >= config.dailyCapUsd) return "daily"
  if (spend.weeklyUsd >= config.weeklyCapUsd) return "weekly"
  if (spend.monthlyUsd >= config.monthlyCapUsd) return "monthly"
  return null
}

function formatCapReason(period: BudgetPeriod, spend: BudgetSpendSnapshot, config: BudgetCapConfig): string {
  if (period === "daily") {
    return `Daily budget cap reached (${spend.dailyUsd.toFixed(2)}/${config.dailyCapUsd.toFixed(2)} USD)`
  }

  if (period === "weekly") {
    return `Weekly budget cap reached (${spend.weeklyUsd.toFixed(2)}/${config.weeklyCapUsd.toFixed(2)} USD)`
  }

  return `Monthly budget cap reached (${spend.monthlyUsd.toFixed(2)}/${config.monthlyCapUsd.toFixed(2)} USD)`
}

export function isCommanderOverrideActive(
  override: CommanderBudgetOverride | null | undefined,
  now: Date
): boolean {
  if (!override || !override.enabled) {
    return false
  }

  const expiresAt = toTimestamp(override.expiresAt)
  if (expiresAt === null) {
    return false
  }

  return expiresAt > now.getTime()
}

async function getCurrentSpend(
  spendingSource: BudgetCapSpendingDataSource
): Promise<BudgetSpendSnapshot> {
  const [dailyUsd, weeklyUsd, monthlyUsd] = await Promise.all([
    spendingSource.getDailySpendUsd(),
    spendingSource.getWeeklySpendUsd(),
    spendingSource.getMonthlySpendUsd(),
  ])

  return {
    dailyUsd,
    weeklyUsd,
    monthlyUsd,
  }
}

export async function checkBudgetCap(
  input: BudgetCapCheckInput,
  config: BudgetCapConfig,
  deps: BudgetCapDependencies
): Promise<BudgetCapCheckResult> {
  const now = deps.clock.now()
  const spend = await getCurrentSpend(deps.spendingSource)
  const criticalOperations = getCriticalOperations(config)

  const normalizedOperation = normalizeOperationName(input.operation)
  const isCriticalOperation = criticalOperations.has(normalizedOperation)
  const commanderOverrideActive = isCommanderOverrideActive(input.override, now)

  let allowed = true
  let reason = "Budget cap check passed"
  let blockedPeriod: BudgetPeriod | undefined

  if (isCriticalOperation) {
    reason = `Critical operation allowed despite budget caps: ${input.operation}`
  } else if (commanderOverrideActive) {
    reason = `Commander override active for operation: ${input.operation}`
  } else {
    const reachedPeriod = findBlockedPeriod(spend, config)
    if (reachedPeriod) {
      allowed = false
      blockedPeriod = reachedPeriod
      reason = formatCapReason(reachedPeriod, spend, config)
    }
  }

  deps.logger.logCapEvent({
    operation: input.operation,
    timestamp: now,
    allowed,
    reason,
    blockedPeriod,
    isCriticalOperation,
    isCommanderOverrideActive: commanderOverrideActive,
    spend,
    caps: {
      dailyCapUsd: config.dailyCapUsd,
      weeklyCapUsd: config.weeklyCapUsd,
      monthlyCapUsd: config.monthlyCapUsd,
    },
  })

  return {
    allowed,
    reason,
    blockedPeriod,
    isCriticalOperation,
    isCommanderOverrideActive: commanderOverrideActive,
    spend,
  }
}
