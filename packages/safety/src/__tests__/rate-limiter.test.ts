import { describe, expect, it } from "bun:test"
import {
  DEFAULT_MAX_CONCURRENT_LLM_CALLS,
  DEFAULT_MAX_CONCURRENT_OC_INSTANCES,
  DEFAULT_API_CALLS_PER_MINUTE,
  TokenBucketRateLimiter,
  calculateBackoffDelayMs,
  type RateLimiterClock,
} from "../rate-limiter"

class FakeClock implements RateLimiterClock {
  private currentMs = 0
  readonly sleepCalls: number[] = []

  now(): number {
    return this.currentMs
  }

  async sleep(ms: number): Promise<void> {
    this.sleepCalls.push(ms)
    this.currentMs += ms
  }

  advance(ms: number): void {
    this.currentMs += ms
  }
}

describe("rate-limiter", () => {
  it("uses default concurrency and api limits", () => {
    const limiter = new TokenBucketRateLimiter(
      {},
      {
        clock: new FakeClock(),
      }
    )

    const snapshot = limiter.getSnapshot()
    expect(snapshot.llmActive).toBe(0)
    expect(snapshot.ocActive).toBe(0)

    expect(DEFAULT_MAX_CONCURRENT_LLM_CALLS).toBe(3)
    expect(DEFAULT_MAX_CONCURRENT_OC_INSTANCES).toBe(5)
    expect(DEFAULT_API_CALLS_PER_MINUTE).toBe(60)
  })

  it("acquires and releases llm concurrency slots", async () => {
    const limiter = new TokenBucketRateLimiter(
      { maxConcurrentLlmCalls: 2 },
      {
        clock: new FakeClock(),
      }
    )

    const releaseA = await limiter.acquire({ kind: "llm-call" })
    const releaseB = await limiter.acquire({ kind: "llm-call" })

    expect(limiter.getSnapshot().llmActive).toBe(2)

    releaseA()
    expect(limiter.getSnapshot().llmActive).toBe(1)

    releaseB()
    expect(limiter.getSnapshot().llmActive).toBe(0)
  })

  it("waits for llm slot when at concurrency limit", async () => {
    const limiter = new TokenBucketRateLimiter(
      { maxConcurrentLlmCalls: 1 },
      {
        clock: new FakeClock(),
      }
    )

    const releaseFirst = await limiter.acquire({ kind: "llm-call" })

    let secondAcquired = false
    const secondAcquire = limiter.acquire({ kind: "llm-call" }).then(release => {
      secondAcquired = true
      return release
    })

    await Promise.resolve()
    expect(secondAcquired).toBe(false)

    releaseFirst()
    const releaseSecond = await secondAcquire
    expect(secondAcquired).toBe(true)

    releaseSecond()
    expect(limiter.getSnapshot().llmActive).toBe(0)
  })

  it("waits for oc-instance slot when at concurrency limit", async () => {
    const limiter = new TokenBucketRateLimiter(
      { maxConcurrentOcInstances: 1 },
      {
        clock: new FakeClock(),
      }
    )

    const releaseFirst = await limiter.acquire({ kind: "oc-instance" })

    let secondAcquired = false
    const secondAcquire = limiter.acquire({ kind: "oc-instance" }).then(release => {
      secondAcquired = true
      return release
    })

    await Promise.resolve()
    expect(secondAcquired).toBe(false)

    releaseFirst()
    const releaseSecond = await secondAcquire
    expect(secondAcquired).toBe(true)
    releaseSecond()
  })

  it("rate-limits API calls with token bucket waits", async () => {
    const clock = new FakeClock()
    const limiter = new TokenBucketRateLimiter(
      {
        apiCallsPerMinuteByProvider: { anthropic: 2 },
        defaultApiCallsPerMinute: 2,
      },
      { clock }
    )

    await limiter.acquire({ kind: "api-call", provider: "anthropic" })
    await limiter.acquire({ kind: "api-call", provider: "anthropic" })
    await limiter.acquire({ kind: "api-call", provider: "anthropic" })

    expect(clock.sleepCalls.length).toBeGreaterThan(0)
    expect(clock.sleepCalls[0]).toBeGreaterThanOrEqual(30_000)
  })

  it("applies provider-specific API limits independently", async () => {
    const clock = new FakeClock()
    const limiter = new TokenBucketRateLimiter(
      {
        apiCallsPerMinuteByProvider: {
          anthropic: 1,
          xai: 3,
        },
        defaultApiCallsPerMinute: 1,
      },
      { clock }
    )

    await limiter.acquire({ kind: "api-call", provider: "xai" })
    await limiter.acquire({ kind: "api-call", provider: "anthropic" })
    await limiter.acquire({ kind: "api-call", provider: "anthropic" })

    expect(clock.sleepCalls.length).toBe(1)
    expect(clock.sleepCalls[0]).toBeGreaterThanOrEqual(60_000)
  })

  it("uses default provider limit for providers without explicit config", async () => {
    const clock = new FakeClock()
    const limiter = new TokenBucketRateLimiter(
      {
        defaultApiCallsPerMinute: 1,
      },
      { clock }
    )

    await limiter.acquire({ kind: "api-call", provider: "runpod" })
    await limiter.acquire({ kind: "api-call", provider: "runpod" })

    expect(clock.sleepCalls.length).toBe(1)
    expect(clock.sleepCalls[0]).toBeGreaterThanOrEqual(60_000)
  })

  it("returns a callable release function for api calls", async () => {
    const limiter = new TokenBucketRateLimiter(
      { defaultApiCallsPerMinute: 10 },
      {
        clock: new FakeClock(),
      }
    )

    const release = await limiter.acquire({ kind: "api-call", provider: "xai" })
    expect(typeof release).toBe("function")

    release()
  })

  it("calculates exponential backoff with bounded jitter", () => {
    const fixed = calculateBackoffDelayMs(
      3,
      { baseMs: 100, maxMs: 10_000, jitterRatio: 0 },
      0.1
    )
    expect(fixed).toBe(800)

    const lowestJitter = calculateBackoffDelayMs(
      1,
      { baseMs: 100, maxMs: 10_000, jitterRatio: 0.5 },
      0
    )
    const highestJitter = calculateBackoffDelayMs(
      1,
      { baseMs: 100, maxMs: 10_000, jitterRatio: 0.5 },
      1
    )

    expect(lowestJitter).toBe(100)
    expect(highestJitter).toBe(300)
  })

  it("uses injected random source for backoff jitter", () => {
    const limiter = new TokenBucketRateLimiter(
      {
        backoffBaseMs: 100,
        backoffMaxMs: 500,
        backoffJitterRatio: 0.5,
      },
      {
        clock: new FakeClock(),
        random: () => 1,
      }
    )

    const delay = limiter.getBackoffDelayMs(0)
    expect(delay).toBe(150)
  })

  it("treats release as idempotent", async () => {
    const limiter = new TokenBucketRateLimiter(
      {
        maxConcurrentLlmCalls: 1,
      },
      {
        clock: new FakeClock(),
      }
    )

    const releaseFirst = await limiter.acquire({ kind: "llm-call" })
    releaseFirst()
    releaseFirst()

    const releaseSecond = await limiter.acquire({ kind: "llm-call" })

    let thirdAcquired = false
    const thirdAcquire = limiter.acquire({ kind: "llm-call" }).then(release => {
      thirdAcquired = true
      return release
    })

    await Promise.resolve()
    expect(thirdAcquired).toBe(false)

    releaseSecond()
    const releaseThird = await thirdAcquire
    releaseThird()
  })
})
