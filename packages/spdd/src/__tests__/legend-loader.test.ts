import { describe, it, expect } from "bun:test"
import { join } from "node:path"
import { loadLegend, saveLegend, copyLegendToActive } from "../legend-loader"

const FIXTURE_PATH = join(import.meta.dir, "fixtures", "test-legend.md")

describe("loadLegend", () => {
  it("loads and parses the test fixture", () => {
    const legend = loadLegend(FIXTURE_PATH)
    expect(legend.partA).toContain("Identity & Background")
    expect(legend.partB0).toContain("ORIGIN ARC")
    expect(legend.partB).toContain("Work Mode")
    expect(legend.partC).toContain("self-aware")
    expect(legend.partD).toContain("Calibration")
    expect(legend.personalityQuickReference).toContain("Amanda")
  })

  it("parses appendix section", () => {
    const legend = loadLegend(FIXTURE_PATH)
    expect(legend.appendix).toContain("AMANDA TEST")
  })

  it("extracts all required sections", () => {
    const legend = loadLegend(FIXTURE_PATH)
    expect(legend.partA.length).toBeGreaterThan(10)
    expect(legend.partB0.length).toBeGreaterThan(10)
    expect(legend.partB.length).toBeGreaterThan(10)
    expect(legend.partC.length).toBeGreaterThan(10)
    expect(legend.partD.length).toBeGreaterThan(10)
    expect(legend.personalityQuickReference.length).toBeGreaterThan(10)
  })

  it("uses injected readFile dependency", () => {
    const legend = loadLegend("/fake/path", {
      readFile: () => [
        "## PART A: THE LEGEND",
        "identity",
        "## PART B-0: ORIGIN ARC",
        "origin",
        "## PART B: AMANDA IN SESSION",
        "session",
        "## PART C: SELF-AWARENESS",
        "awareness",
        "## PART D: CALIBRATION SCORECARD",
        "calibration",
        "## PERSONALITY QUICK REFERENCE",
        "quick ref",
      ].join("\n"),
    })
    expect(legend.partA).toContain("identity")
    expect(legend.personalityQuickReference).toContain("quick ref")
  })
})

describe("saveLegend", () => {
  it("writes legend back to file", () => {
    const legend = loadLegend(FIXTURE_PATH)
    let written = ""
    saveLegend(legend, "/fake/output.md", {
      writeFile: (_p, c) => { written = c },
      existsSync: () => true,
    })
    expect(written).toContain("PART A")
    expect(written).toContain("PERSONALITY QUICK REFERENCE")
  })

  it("creates directory if missing", () => {
    const legend = loadLegend(FIXTURE_PATH)
    let mkdirCalled = false
    saveLegend(legend, "/new/dir/legend.md", {
      writeFile: () => {},
      existsSync: () => false,
      mkdir: () => { mkdirCalled = true },
    })
    expect(mkdirCalled).toBe(true)
  })
})

describe("copyLegendToActive", () => {
  it("copies file to destination", () => {
    let destPath = ""
    let content = ""
    const result = copyLegendToActive(FIXTURE_PATH, "/dest/spdd", {
      readFile: () => "legend content",
      writeFile: (p, c) => { destPath = p; content = c },
      existsSync: () => true,
    })
    expect(result).toBe("/dest/spdd/legend.md")
    expect(destPath).toBe("/dest/spdd/legend.md")
    expect(content).toBe("legend content")
  })

  it("creates destination directory if missing", () => {
    let mkdirCalled = false
    copyLegendToActive("/src", "/dest/spdd", {
      readFile: () => "content",
      writeFile: () => {},
      existsSync: () => false,
      mkdir: () => { mkdirCalled = true },
    })
    expect(mkdirCalled).toBe(true)
  })
})
