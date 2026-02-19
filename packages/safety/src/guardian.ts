import {
  checkBudgetCap,
  type BudgetCapCheckResult,
  type BudgetCapConfig,
  type BudgetCapDependencies,
  type CommanderBudgetOverride,
} from "./budget-cap"
import { isKillSwitchActive, type KillSwitchDependencies } from "./kill-switch"
import {
  checkModificationLimits,
  type ModificationLimitsConfig,
  type ModificationLimitsDependencies,
  type ModificationLimitsInput,
  type ModificationLimitsResult,
} from "./modification-limits"
import type { RateLimitRequest, ReleaseFunction } from "./rate-limiter"

const NOOP_RELEASE: ReleaseFunction = () => {}

export interface SafetyOperation {
  name: string
  budgetOverride?: CommanderBudgetOverride | null
  rateLimitRequest?: RateLimitRequest
  modificationInput?: ModificationLimitsInput
}

export interface GuardianDependencies {
  killSwitch: KillSwitchDependencies
  budgetCapConfig: BudgetCapConfig
  budgetCapDeps: BudgetCapDependencies
  rateLimiter: {
    acquire: (request: RateLimitRequest) => Promise<ReleaseFunction>
  }
  modificationLimitsDeps: ModificationLimitsDependencies
  modificationLimitsConfig?: ModificationLimitsConfig
}

export interface SafetyCheckResult {
  allowed: boolean
  reason?: string
  budgetResult?: BudgetCapCheckResult
  modificationResult?: ModificationLimitsResult
  release?: ReleaseFunction
}

export async function runSafetyChecks(
  operation: SafetyOperation,
  deps: GuardianDependencies
): Promise<SafetyCheckResult> {
  if (isKillSwitchActive(deps.killSwitch)) {
    return {
      allowed: false,
      reason: "Kill switch is active",
    }
  }

  const budgetResult = await checkBudgetCap(
    {
      operation: operation.name,
      override: operation.budgetOverride,
    },
    deps.budgetCapConfig,
    deps.budgetCapDeps
  )

  if (!budgetResult.allowed) {
    return {
      allowed: false,
      reason: budgetResult.reason,
      budgetResult,
    }
  }

  let release: ReleaseFunction = NOOP_RELEASE

  if (operation.rateLimitRequest) {
    release = await deps.rateLimiter.acquire(operation.rateLimitRequest)
  }

  let modificationResult: ModificationLimitsResult | undefined

  if (operation.modificationInput) {
    modificationResult = await checkModificationLimits(
      operation.modificationInput,
      deps.modificationLimitsDeps,
      deps.modificationLimitsConfig
    )

    if (!modificationResult.allowed) {
      release()

      return {
        allowed: false,
        reason: modificationResult.reason,
        budgetResult,
        modificationResult,
      }
    }
  }

  if (operation.rateLimitRequest) {
    return {
      allowed: true,
      budgetResult,
      modificationResult,
      release,
    }
  }

  return {
    allowed: true,
    budgetResult,
    modificationResult,
  }
}
