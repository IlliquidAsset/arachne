export const DEFAULT_MAX_CONCURRENT_LLM_CALLS = 3
export const DEFAULT_MAX_CONCURRENT_OC_INSTANCES = 5
export const DEFAULT_API_CALLS_PER_MINUTE = 60
export const DEFAULT_BACKOFF_BASE_MS = 100
export const DEFAULT_BACKOFF_MAX_MS = 5_000
export const DEFAULT_BACKOFF_JITTER_RATIO = 0.2

export type ReleaseFunction = () => void

export interface RateLimiterClock {
  now: () => number
  sleep: (ms: number) => Promise<void>
}

export interface RateLimiterDependencies {
  clock: RateLimiterClock
  random?: () => number
}

export interface RateLimiterConfig {
  maxConcurrentLlmCalls?: number
  maxConcurrentOcInstances?: number
  defaultApiCallsPerMinute?: number
  apiCallsPerMinuteByProvider?: Record<string, number>
  backoffBaseMs?: number
  backoffMaxMs?: number
  backoffJitterRatio?: number
}

export type RateLimitRequest =
  | { kind: "llm-call" }
  | { kind: "oc-instance" }
  | { kind: "api-call"; provider: string; tokens?: number }

export interface BackoffSettings {
  baseMs: number
  maxMs: number
  jitterRatio: number
}

interface ConcurrencyState {
  max: number
  active: number
  waiters: Array<() => void>
}

interface TokenBucketState {
  capacity: number
  tokens: number
  refillRatePerMs: number
  lastRefillAtMs: number
}

const NOOP_RELEASE: ReleaseFunction = () => {}

function clampToPositiveInteger(value: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback
  }

  const normalized = Math.floor(value)
  return normalized > 0 ? normalized : fallback
}

function clampToPositiveNumber(value: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback
  }

  return value > 0 ? value : fallback
}

function clampToRange(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback
  }

  return Math.min(max, Math.max(min, value))
}

function createConcurrencyState(max: number): ConcurrencyState {
  return {
    max,
    active: 0,
    waiters: [],
  }
}

export function calculateBackoffDelayMs(
  attempt: number,
  settings: BackoffSettings,
  randomValue: number
): number {
  const normalizedAttempt = Math.max(0, Math.floor(attempt))
  const baseMs = clampToPositiveNumber(settings.baseMs, DEFAULT_BACKOFF_BASE_MS)
  const maxMs = clampToPositiveNumber(settings.maxMs, DEFAULT_BACKOFF_MAX_MS)
  const jitterRatio = clampToRange(
    settings.jitterRatio,
    0,
    1,
    DEFAULT_BACKOFF_JITTER_RATIO
  )
  const normalizedRandom = clampToRange(randomValue, 0, 1, 0.5)

  const exponential = Math.min(maxMs, baseMs * 2 ** normalizedAttempt)
  const jitterSpan = exponential * jitterRatio
  const jitterOffset = (normalizedRandom * 2 - 1) * jitterSpan
  return Math.max(1, Math.round(exponential + jitterOffset))
}

export class TokenBucketRateLimiter {
  private readonly clock: RateLimiterClock
  private readonly random: () => number

  private readonly llmState: ConcurrencyState
  private readonly ocState: ConcurrencyState

  private readonly defaultApiCallsPerMinute: number
  private readonly apiCallsPerMinuteByProvider: Record<string, number>

  private readonly backoffSettings: BackoffSettings
  private readonly providerBuckets = new Map<string, TokenBucketState>()

  constructor(config: RateLimiterConfig, dependencies: RateLimiterDependencies) {
    this.clock = dependencies.clock
    this.random = dependencies.random ?? (() => 0.5)

    this.llmState = createConcurrencyState(
      clampToPositiveInteger(
        config.maxConcurrentLlmCalls ?? DEFAULT_MAX_CONCURRENT_LLM_CALLS,
        DEFAULT_MAX_CONCURRENT_LLM_CALLS
      )
    )

    this.ocState = createConcurrencyState(
      clampToPositiveInteger(
        config.maxConcurrentOcInstances ?? DEFAULT_MAX_CONCURRENT_OC_INSTANCES,
        DEFAULT_MAX_CONCURRENT_OC_INSTANCES
      )
    )

    this.defaultApiCallsPerMinute = clampToPositiveInteger(
      config.defaultApiCallsPerMinute ?? DEFAULT_API_CALLS_PER_MINUTE,
      DEFAULT_API_CALLS_PER_MINUTE
    )

    this.apiCallsPerMinuteByProvider = { ...(config.apiCallsPerMinuteByProvider ?? {}) }
    this.backoffSettings = {
      baseMs: config.backoffBaseMs ?? DEFAULT_BACKOFF_BASE_MS,
      maxMs: config.backoffMaxMs ?? DEFAULT_BACKOFF_MAX_MS,
      jitterRatio: config.backoffJitterRatio ?? DEFAULT_BACKOFF_JITTER_RATIO,
    }
  }

  async acquire(request: RateLimitRequest): Promise<ReleaseFunction> {
    if (request.kind === "llm-call") {
      return this.acquireConcurrencySlot(this.llmState)
    }

    if (request.kind === "oc-instance") {
      return this.acquireConcurrencySlot(this.ocState)
    }

    await this.acquireApiTokens(request.provider, request.tokens ?? 1)
    return NOOP_RELEASE
  }

  getBackoffDelayMs(attempt: number): number {
    return calculateBackoffDelayMs(attempt, this.backoffSettings, this.random())
  }

  getSnapshot(): {
    llmActive: number
    ocActive: number
    providers: Record<string, { tokens: number; capacity: number }>
  } {
    const providers: Record<string, { tokens: number; capacity: number }> = {}

    for (const [provider, bucket] of this.providerBuckets.entries()) {
      providers[provider] = {
        tokens: bucket.tokens,
        capacity: bucket.capacity,
      }
    }

    return {
      llmActive: this.llmState.active,
      ocActive: this.ocState.active,
      providers,
    }
  }

  private async acquireConcurrencySlot(state: ConcurrencyState): Promise<ReleaseFunction> {
    while (state.active >= state.max) {
      await new Promise<void>(resolve => {
        state.waiters.push(resolve)
      })
    }

    state.active += 1
    let released = false

    return () => {
      if (released) {
        return
      }

      released = true
      state.active = Math.max(0, state.active - 1)

      const nextWaiter = state.waiters.shift()
      nextWaiter?.()
    }
  }

  private resolveProviderLimit(provider: string): number {
    const configured = this.apiCallsPerMinuteByProvider[provider]
    if (typeof configured !== "number") {
      return this.defaultApiCallsPerMinute
    }

    return clampToPositiveInteger(configured, this.defaultApiCallsPerMinute)
  }

  private getProviderBucket(provider: string): TokenBucketState {
    const existing = this.providerBuckets.get(provider)
    if (existing) {
      return existing
    }

    const capacity = this.resolveProviderLimit(provider)
    const bucket: TokenBucketState = {
      capacity,
      tokens: capacity,
      refillRatePerMs: capacity / 60_000,
      lastRefillAtMs: this.clock.now(),
    }

    this.providerBuckets.set(provider, bucket)
    return bucket
  }

  private refillBucket(bucket: TokenBucketState, nowMs: number): void {
    const elapsedMs = nowMs - bucket.lastRefillAtMs
    if (elapsedMs <= 0) {
      return
    }

    bucket.tokens = Math.min(bucket.capacity, bucket.tokens + elapsedMs * bucket.refillRatePerMs)
    bucket.lastRefillAtMs = nowMs
  }

  private async acquireApiTokens(provider: string, tokensRequested: number): Promise<void> {
    const bucket = this.getProviderBucket(provider)
    const tokensToConsume = Math.min(
      bucket.capacity,
      clampToPositiveInteger(tokensRequested, 1)
    )

    let attempt = 0

    while (true) {
      this.refillBucket(bucket, this.clock.now())

      if (bucket.tokens >= tokensToConsume) {
        bucket.tokens -= tokensToConsume
        return
      }

      const missingTokens = tokensToConsume - bucket.tokens
      const waitForTokenRefillMs = Math.ceil(missingTokens / bucket.refillRatePerMs)
      const backoffDelayMs = this.getBackoffDelayMs(attempt)
      const waitMs = Math.max(waitForTokenRefillMs, backoffDelayMs, 1)

      await this.clock.sleep(waitMs)
      attempt += 1
    }
  }
}

export function createRateLimiter(
  config: RateLimiterConfig,
  dependencies: RateLimiterDependencies
): TokenBucketRateLimiter {
  return new TokenBucketRateLimiter(config, dependencies)
}
