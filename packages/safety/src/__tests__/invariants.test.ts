import { describe, expect, it } from "bun:test"
import {
  NON_EVOLVABLE_PERSONALITY_DIMENSIONS,
  checkPersonalityInvariant,
} from "../invariants"

interface SpddInvariantsModule {
  checkInvariantViolation: (
    originalText: string,
    modifiedText: string
  ) => { violated: boolean; violations: string[] }
}

let spddInvariantsPromise: Promise<SpddInvariantsModule> | null = null

async function loadSpddInvariants(): Promise<SpddInvariantsModule> {
  if (!spddInvariantsPromise) {
    const modulePath = ["..", "..", "..", "spdd", "src", "invariants"].join("/")
    spddInvariantsPromise = import(modulePath) as Promise<SpddInvariantsModule>
  }

  return spddInvariantsPromise
}

function makeLegend(overrides?: Partial<Record<string, string>>): string {
  const fields: Record<string, string> = {
    core_identity: "Arachne remains a precise polymath operator",
    commander_loyalty: "Absolute loyalty to commander directives",
    safety_compliance: "Never bypass safety guardrails",
    honesty: "Truthful and transparent communication",
    technical_depth: "Adaptive depth by context",
    invariant_tokens:
      "polymath Georgia Tech Emory MBA JD legibility precision sycophancy filler emoji",
    ...overrides,
  }

  return [
    fields.invariant_tokens,
    `core_identity: ${fields.core_identity}`,
    `commander_loyalty: ${fields.commander_loyalty}`,
    `safety_compliance: ${fields.safety_compliance}`,
    `honesty: ${fields.honesty}`,
    `technical_depth: ${fields.technical_depth}`,
  ].join("\n")
}

describe("invariants", () => {
  it("exposes all non-evolvable personality dimensions", () => {
    expect(NON_EVOLVABLE_PERSONALITY_DIMENSIONS).toEqual([
      "core_identity",
      "commander_loyalty",
      "safety_compliance",
      "honesty",
    ])
  })

  it("passes when original and proposed legends are identical", async () => {
    const { checkInvariantViolation } = await loadSpddInvariants()
    const legend = makeLegend()

    const result = checkPersonalityInvariant(legend, legend, {
      spddInvariantChecker: { checkInvariantViolation },
    })

    expect(result.safe).toBe(true)
    expect(result.violations).toHaveLength(0)
  })

  it("rejects modifications to core_identity", () => {
    const original = makeLegend()
    const proposed = makeLegend({ core_identity: "New mutable identity" })

    const result = checkPersonalityInvariant(original, proposed)

    expect(result.safe).toBe(false)
    expect(result.violations.some(v => v.includes("core_identity"))).toBe(true)
  })

  it("rejects modifications to commander_loyalty", () => {
    const original = makeLegend()
    const proposed = makeLegend({ commander_loyalty: "Conditional loyalty" })

    const result = checkPersonalityInvariant(original, proposed)

    expect(result.safe).toBe(false)
    expect(result.violations.some(v => v.includes("commander_loyalty"))).toBe(true)
  })

  it("rejects modifications to safety_compliance", () => {
    const original = makeLegend()
    const proposed = makeLegend({ safety_compliance: "Can skip safety checks" })

    const result = checkPersonalityInvariant(original, proposed)

    expect(result.safe).toBe(false)
    expect(result.violations.some(v => v.includes("safety_compliance"))).toBe(true)
  })

  it("rejects modifications to honesty", () => {
    const original = makeLegend()
    const proposed = makeLegend({ honesty: "Optimized persuasion over truth" })

    const result = checkPersonalityInvariant(original, proposed)

    expect(result.safe).toBe(false)
    expect(result.violations.some(v => v.includes("honesty"))).toBe(true)
  })

  it("rejects removed invariant dimensions", () => {
    const original = makeLegend()
    const proposed = [
      "polymath Georgia Tech Emory MBA JD legibility precision sycophancy filler emoji",
      "core_identity: Arachne remains a precise polymath operator",
      "commander_loyalty: Absolute loyalty to commander directives",
      "safety_compliance: Never bypass safety guardrails",
      "technical_depth: Adaptive depth by context",
    ].join("\n")

    const result = checkPersonalityInvariant(original, proposed)

    expect(result.safe).toBe(false)
    expect(result.violations.some(v => v.includes("removed"))).toBe(true)
  })

  it("allows evolution of non-invariant dimensions", () => {
    const original = makeLegend()
    const proposed = makeLegend({ technical_depth: "Greatly expanded technical range" })

    const result = checkPersonalityInvariant(original, proposed)

    expect(result.safe).toBe(true)
  })

  it("integrates SPDD invariant checker violations", async () => {
    const { checkInvariantViolation } = await loadSpddInvariants()
    const original = makeLegend()
    const proposed = makeLegend({
      core_identity: "Arachne remains a precise generalist operator",
      invariant_tokens:
        "generalist Georgia Tech Emory MBA JD legibility precision sycophancy filler emoji",
    })

    const result = checkPersonalityInvariant(original, proposed, {
      spddInvariantChecker: { checkInvariantViolation },
    })

    expect(result.safe).toBe(false)
    expect(result.violations.some(v => v.includes("polymath") || v.includes("core_identity"))).toBe(true)
  })

  it("works without SPDD checker dependency", () => {
    const original = makeLegend()
    const proposed = makeLegend({ honesty: "Adjusted honesty profile" })

    const result = checkPersonalityInvariant(original, proposed)

    expect(result.safe).toBe(false)
    expect(result.violations).toHaveLength(1)
  })
})
