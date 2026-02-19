import { describe, it, expect } from "bun:test"
import { LegendSchema } from "../legend-schema"

describe("LegendSchema", () => {
  it("accepts a valid legend with all required sections", () => {
    const result = LegendSchema.safeParse({
      partA: "identity content",
      partB0: "origin arc",
      partB: "session behavior",
      partC: "self-awareness",
      partD: "calibration",
      personalityQuickReference: "quick ref",
    })
    expect(result.success).toBe(true)
  })

  it("accepts legend with optional appendix", () => {
    const result = LegendSchema.safeParse({
      partA: "a",
      partB0: "b0",
      partB: "b",
      partC: "c",
      partD: "d",
      personalityQuickReference: "pqr",
      appendix: "appendix content",
    })
    expect(result.success).toBe(true)
  })

  it("rejects legend missing partA", () => {
    const result = LegendSchema.safeParse({
      partB0: "b0",
      partB: "b",
      partC: "c",
      partD: "d",
      personalityQuickReference: "pqr",
    })
    expect(result.success).toBe(false)
  })

  it("rejects legend missing personalityQuickReference", () => {
    const result = LegendSchema.safeParse({
      partA: "a",
      partB0: "b0",
      partB: "b",
      partC: "c",
      partD: "d",
    })
    expect(result.success).toBe(false)
  })

  it("rejects legend with empty section", () => {
    const result = LegendSchema.safeParse({
      partA: "",
      partB0: "b0",
      partB: "b",
      partC: "c",
      partD: "d",
      personalityQuickReference: "pqr",
    })
    expect(result.success).toBe(false)
  })
})
