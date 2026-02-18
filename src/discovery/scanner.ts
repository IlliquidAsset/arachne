import { readdir, stat } from "node:fs/promises"
import { join, basename } from "node:path"
import {
  type ProjectInfo,
  OC_SIGNALS,
  WEAK_SIGNALS,
  DEFAULT_IGNORE,
} from "./types"

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

async function readPackageName(dirPath: string): Promise<string | undefined> {
  try {
    const pkgPath = join(dirPath, "package.json")
    const file = Bun.file(pkgPath)
    const pkg = await file.json()
    return typeof pkg.name === "string" ? pkg.name : undefined
  } catch {
    return undefined
  }
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

async function detectSignals(dirPath: string): Promise<string[]> {
  const found: string[] = []

  for (const signal of OC_SIGNALS) {
    if (await exists(join(dirPath, signal))) {
      found.push(signal)
    }
  }

  for (const signal of WEAK_SIGNALS) {
    if (await exists(join(dirPath, signal))) {
      found.push(signal)
    }
  }

  return found
}

function isProject(detectedFiles: string[]): boolean {
  const hasOcSignal = detectedFiles.some((f) =>
    (OC_SIGNALS as readonly string[]).includes(f),
  )
  const hasWeakSignal = detectedFiles.some((f) =>
    (WEAK_SIGNALS as readonly string[]).includes(f),
  )
  return hasOcSignal || hasWeakSignal
}

export async function scanProjects(
  basePath: string,
  ignore: string[] = [...DEFAULT_IGNORE],
): Promise<ProjectInfo[]> {
  const ignoreSet = new Set(ignore)
  let entries: string[]

  try {
    entries = await readdir(basePath)
  } catch {
    return []
  }

  const projects: ProjectInfo[] = []

  for (const entry of entries) {
    if (ignoreSet.has(entry)) continue
    if (entry.startsWith(".")) continue

    const fullPath = join(basePath, entry)

    try {
      const s = await stat(fullPath)
      if (!s.isDirectory()) continue
    } catch {
      continue
    }

    const detectedFiles = await detectSignals(fullPath)
    if (!isProject(detectedFiles)) continue

    const pkgName = await readPackageName(fullPath)
    const dirName = basename(fullPath)
    const name = pkgName || dirName

    projects.push({
      id: slugify(dirName),
      name,
      absolutePath: fullPath,
      detectedFiles,
      state: "discovered",
    })
  }

  return projects.sort((a, b) => a.name.localeCompare(b.name))
}
