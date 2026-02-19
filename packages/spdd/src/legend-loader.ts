import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs"
import { dirname, join } from "node:path"
import { LegendSchema, type Legend } from "./legend-schema"

export interface LoaderDeps {
  readFile?: (path: string) => string
  writeFile?: (path: string, content: string) => void
  mkdir?: (path: string) => void
  existsSync?: (path: string) => boolean
}

const defaultDeps: Required<LoaderDeps> = {
  readFile: (p) => readFileSync(p, "utf-8"),
  writeFile: (p, c) => writeFileSync(p, c, "utf-8"),
  mkdir: (p) => mkdirSync(p, { recursive: true }),
  existsSync: (p) => existsSync(p),
}

function resolve(deps?: LoaderDeps): Required<LoaderDeps> {
  return { ...defaultDeps, ...deps }
}

interface SectionMatch {
  key: keyof Legend
  pattern: RegExp
}

const SECTION_MATCHERS: SectionMatch[] = [
  { key: "partA", pattern: /^##\s+PART\s+A/i },
  { key: "partB0", pattern: /^##\s+PART\s+B-0|origin\s+arc/i },
  { key: "partB", pattern: /^##\s+PART\s+B[:\s]|in\s+session/i },
  { key: "partC", pattern: /^##\s+PART\s+C|self-awareness/i },
  { key: "partD", pattern: /^##\s+PART\s+D|calibration/i },
  { key: "personalityQuickReference", pattern: /^##\s+PERSONALITY\s+QUICK/i },
  { key: "appendix", pattern: /^##\s+APPENDIX/i },
]

function matchSection(line: string): keyof Legend | null {
  for (const { key, pattern } of SECTION_MATCHERS) {
    if (pattern.test(line)) return key
  }
  return null
}

export function loadLegend(path: string, deps?: LoaderDeps): Legend {
  const d = resolve(deps)
  const content = d.readFile(path)
  const lines = content.split("\n")

  const sections: Partial<Record<keyof Legend, string[]>> = {}
  let currentKey: keyof Legend | null = null

  for (const line of lines) {
    const matched = matchSection(line)
    if (matched) {
      currentKey = matched
      sections[currentKey] = sections[currentKey] ?? []
      sections[currentKey]!.push(line)
    } else if (currentKey) {
      sections[currentKey]!.push(line)
    }
  }

  const legend: Record<string, string> = {}
  for (const [key, lines] of Object.entries(sections)) {
    legend[key] = lines.join("\n").trim()
  }

  return LegendSchema.parse(legend)
}

export function saveLegend(legend: Legend, path: string, deps?: LoaderDeps): void {
  const d = resolve(deps)
  const dir = dirname(path)
  if (!d.existsSync(dir)) {
    d.mkdir(dir)
  }

  const parts = [
    legend.partA,
    legend.partB0,
    legend.partB,
    legend.partC,
    legend.partD,
    legend.personalityQuickReference,
  ]
  if (legend.appendix) {
    parts.push(legend.appendix)
  }

  d.writeFile(path, parts.join("\n\n---\n\n") + "\n")
}

export function copyLegendToActive(
  sourcePath: string,
  destDir: string,
  deps?: LoaderDeps,
): string {
  const d = resolve(deps)
  if (!d.existsSync(destDir)) {
    d.mkdir(destDir)
  }
  const content = d.readFile(sourcePath)
  const destPath = join(destDir, "legend.md")
  d.writeFile(destPath, content)
  return destPath
}
