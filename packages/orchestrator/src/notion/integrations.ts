import { readFileSync, writeFileSync, mkdirSync, chmodSync, existsSync } from "node:fs"
import { join } from "node:path"
import { homedir } from "node:os"

const INTEGRATIONS_DIR = join(homedir(), ".config", "arachne")
const INTEGRATIONS_FILE = join(INTEGRATIONS_DIR, "integrations.json")

export interface Integrations {
  notion?: {
    token: string
    workspaceName?: string
    connectedAt: string
    memoryNotebookPageId?: string
  }
}

export function getNotionToken(): string | null {
  try {
    if (!existsSync(INTEGRATIONS_FILE)) return null
    const raw = readFileSync(INTEGRATIONS_FILE, "utf-8")
    const parsed = JSON.parse(raw)
    return parsed?.notion?.token ?? null
  } catch {
    return null
  }
}

export function loadIntegrations(): Integrations {
  try {
    if (!existsSync(INTEGRATIONS_FILE)) return {}
    const raw = readFileSync(INTEGRATIONS_FILE, "utf-8")
    return JSON.parse(raw) as Integrations
  } catch {
    return {}
  }
}

export function saveIntegrations(integrations: Integrations): void {
  if (!existsSync(INTEGRATIONS_DIR)) {
    mkdirSync(INTEGRATIONS_DIR, { recursive: true })
  }
  writeFileSync(INTEGRATIONS_FILE, JSON.stringify(integrations, null, 2), "utf-8")
  chmodSync(INTEGRATIONS_FILE, 0o600)
}
