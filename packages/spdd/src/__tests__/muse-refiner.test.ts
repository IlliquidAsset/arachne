import { describe, it, expect } from "bun:test"
import { join } from "node:path"
import { loadLegend } from "../legend-loader"
import { generateRefinementPrompt, validateRefinement } from "../muse-refiner"

const FIXTURE_PATH = join(import.meta.dir, "fixtures", "test-legend.md")

describe("generateRefinementPrompt", () => {
  it("includes discovered projects in prompt", () => {
    const legend = loadLegend(FIXTURE_PATH)
    const prompt = generateRefinementPrompt({
      legend,
      discoveredContext: {
        projects: ["northstarpro", "watserface"],
        services: ["anthropic", "runpod"],
        timezone: "America/Chicago",
      },
    })
    expect(prompt).toContain("northstarpro")
    expect(prompt).toContain("watserface")
    expect(prompt).toContain("anthropic")
    expect(prompt).toContain("America/Chicago")
  })

  it("includes Muse instructions", () => {
    const legend = loadLegend(FIXTURE_PATH)
    const prompt = generateRefinementPrompt({
      legend,
      discoveredContext: { projects: [], services: [], timezone: "UTC" },
    })
    expect(prompt).toContain("Muse")
    expect(prompt).toContain("50 lines")
    expect(prompt).toContain("NOT rewrite")
  })
})

describe("validateRefinement", () => {
  it("accepts refinement under 50 lines with invariants preserved", () => {
    const original = "polymath Georgia Tech Emory MBA JD legibility precision sycophancy filler emoji"
    const refined = original + "\nNew contextual line about northstarpro"
    const result = validateRefinement(original, refined)
    expect(result.valid).toBe(true)
    expect(result.diffLineCount).toBeLessThan(50)
    expect(result.invariantViolations).toHaveLength(0)
  })

  it("rejects refinement that removes invariant", () => {
    const original = "polymath Georgia Tech Emory MBA JD legibility precision sycophancy filler emoji"
    const refined = "generalist Georgia Tech Emory MBA JD legibility precision sycophancy filler emoji"
    const result = validateRefinement(original, refined)
    expect(result.valid).toBe(false)
    expect(result.invariantViolations.length).toBeGreaterThan(0)
  })

  it("rejects refinement over 50 lines different", () => {
    const original = "polymath Georgia Tech Emory MBA JD legibility precision sycophancy filler emoji"
    const extraLines = Array.from({ length: 55 }, (_, i) => `new line ${i}`).join("\n")
    const refined = original + "\n" + extraLines
    const result = validateRefinement(original, refined)
    expect(result.valid).toBe(false)
    expect(result.diffLineCount).toBeGreaterThanOrEqual(50)
  })
})
