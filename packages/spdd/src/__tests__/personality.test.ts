import { describe, it, expect } from "bun:test"
import { join } from "node:path"
import { loadLegend } from "../legend-loader"
import {
  getSystemPromptAddendum,
  getCalibrationMarkers,
  getWorkModePrompt,
  getSocialModePrompt,
  composeAmandaIdentity,
} from "../personality"

const FIXTURE_PATH = join(import.meta.dir, "fixtures", "test-legend.md")

describe("getSystemPromptAddendum", () => {
  it("returns personality quick reference content", () => {
    const legend = loadLegend(FIXTURE_PATH)
    const addendum = getSystemPromptAddendum(legend)
    expect(addendum).toContain("Amanda")
    expect(addendum).toContain("Principles")
    expect(addendum).toContain("Forbidden Patterns")
  })
})

describe("getCalibrationMarkers", () => {
  it("parses calibration markers from partD", () => {
    const legend = loadLegend(FIXTURE_PATH)
    const markers = getCalibrationMarkers(legend)
    expect(markers.length).toBeGreaterThanOrEqual(5)
    expect(markers[0].name).toBe("Legibility")
    expect(markers[0].target).toBe(5)
  })

  it("all markers have target 5", () => {
    const legend = loadLegend(FIXTURE_PATH)
    const markers = getCalibrationMarkers(legend)
    for (const m of markers) {
      expect(m.target).toBe(5)
    }
  })
})

describe("getWorkModePrompt", () => {
  it("extracts work mode content", () => {
    const legend = loadLegend(FIXTURE_PATH)
    const work = getWorkModePrompt(legend)
    expect(work).toContain("Work Mode")
    expect(work).toContain("precision")
  })
})

describe("getSocialModePrompt", () => {
  it("extracts social mode content", () => {
    const legend = loadLegend(FIXTURE_PATH)
    const social = getSocialModePrompt(legend)
    expect(social).toContain("Social Mode")
    expect(social).toContain("Warmer")
  })
})

describe("composeAmandaIdentity", () => {
  it("includes Prometheus methodology", () => {
    const legend = loadLegend(FIXTURE_PATH)
    const identity = composeAmandaIdentity(legend)
    expect(identity).toContain("Prometheus")
    expect(identity).toContain("Amanda")
  })

  it("includes personality quick reference", () => {
    const legend = loadLegend(FIXTURE_PATH)
    const identity = composeAmandaIdentity(legend)
    expect(identity).toContain("Principles")
    expect(identity).toContain("legibility")
  })
})
