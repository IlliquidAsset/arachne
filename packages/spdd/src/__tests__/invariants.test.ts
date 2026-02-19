import { describe, it, expect } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { checkInvariantViolation, INVARIANT_PATTERNS, EVOLVABLE_SECTIONS } from "../invariants"

const FIXTURE = readFileSync(join(import.meta.dir, "fixtures", "test-legend.md"), "utf-8")

describe("checkInvariantViolation", () => {
  it("passes when all invariants present", () => {
    const result = checkInvariantViolation(FIXTURE, FIXTURE)
    expect(result.violated).toBe(false)
    expect(result.violations).toHaveLength(0)
  })

  it("detects removal of 'polymath'", () => {
    const modified = FIXTURE.replace(/polymath/gi, "generalist")
    const result = checkInvariantViolation(FIXTURE, modified)
    expect(result.violated).toBe(true)
    expect(result.violations.some(v => v.includes("polymath"))).toBe(true)
  })

  it("detects removal of 'sycophancy'", () => {
    const modified = FIXTURE.replace(/sycophancy/gi, "flattery")
    const result = checkInvariantViolation(FIXTURE, modified)
    expect(result.violated).toBe(true)
    expect(result.violations.some(v => v.includes("sycophancy"))).toBe(true)
  })

  it("detects removal of 'Georgia Tech'", () => {
    const modified = FIXTURE.replace(/Georgia Tech/gi, "MIT")
    const result = checkInvariantViolation(FIXTURE, modified)
    expect(result.violated).toBe(true)
    expect(result.violations.some(v => v.includes("Georgia Tech"))).toBe(true)
  })

  it("allows changes to non-invariant content", () => {
    const modified = FIXTURE.replace("cross-domain analogies", "expanded cross-domain analogies with new metaphors")
    const result = checkInvariantViolation(FIXTURE, modified)
    expect(result.violated).toBe(false)
  })
})

describe("INVARIANT_PATTERNS", () => {
  it("has at least 8 patterns", () => {
    expect(INVARIANT_PATTERNS.length).toBeGreaterThanOrEqual(8)
  })
})

describe("EVOLVABLE_SECTIONS", () => {
  it("includes cross-domain analogies", () => {
    expect(EVOLVABLE_SECTIONS).toContain("cross-domain analogies")
  })

  it("includes humor calibration", () => {
    expect(EVOLVABLE_SECTIONS).toContain("humor calibration")
  })
})
