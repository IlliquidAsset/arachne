import { describe, it, expect } from "bun:test"
import { generateEvolutionPrompt, validateEvolution, getEvolvableSections } from "../evolution"

describe("generateEvolutionPrompt", () => {
  it("includes recent topics", () => {
    const prompt = generateEvolutionPrompt("legend text", {
      recentTopics: ["React optimization", "voice pipeline"],
      sessionCount: 42,
    })
    expect(prompt).toContain("React optimization")
    expect(prompt).toContain("voice pipeline")
    expect(prompt).toContain("42")
  })

  it("includes Muse instructions", () => {
    const prompt = generateEvolutionPrompt("legend", {
      recentTopics: [],
      sessionCount: 0,
    })
    expect(prompt).toContain("Muse")
    expect(prompt).toContain("EVOLVABLE")
    expect(prompt).toContain("NEVER modify")
  })
})

describe("validateEvolution", () => {
  it("accepts evolution with all invariants preserved", () => {
    const original = "polymath Georgia Tech Emory MBA JD legibility precision sycophancy filler emoji"
    const evolved = original + "\nEvolved humor calibration"
    const result = validateEvolution(original, evolved)
    expect(result.valid).toBe(true)
    expect(result.violations).toHaveLength(0)
  })

  it("rejects evolution that removes invariant", () => {
    const original = "polymath Georgia Tech Emory MBA JD legibility precision sycophancy filler emoji"
    const evolved = "generalist Georgia Tech Emory MBA JD legibility precision sycophancy filler emoji"
    const result = validateEvolution(original, evolved)
    expect(result.valid).toBe(false)
    expect(result.violations.length).toBeGreaterThan(0)
  })
})

describe("getEvolvableSections", () => {
  it("returns correct evolvable sections", () => {
    const sections = getEvolvableSections()
    expect(sections).toContain("cross-domain analogies")
    expect(sections).toContain("interaction patterns")
    expect(sections).toContain("humor calibration")
    expect(sections).toContain("technical depth")
    expect(sections).toHaveLength(4)
  })
})
