import { randomBytes, timingSafeEqual } from "node:crypto"
import { readFileSync, writeFileSync, mkdirSync, chmodSync } from "node:fs"
import { join } from "node:path"
import { homedir } from "node:os"

const AUTH_DIR = join(homedir(), ".config", "arachne")
const AUTH_FILE = join(AUTH_DIR, "auth.json")

export interface ApiKeyFileOperations {
  readFile: (path: string) => string
  writeFile: (path: string, data: string) => void
  mkdir: (path: string) => void
  chmod: (path: string, mode: number) => void
}

const defaultOps: ApiKeyFileOperations = {
  readFile: (path: string) => readFileSync(path, "utf-8"),
  writeFile: (path: string, data: string) => writeFileSync(path, data, "utf-8"),
  mkdir: (path: string) => mkdirSync(path, { recursive: true }),
  chmod: (path: string, mode: number) => chmodSync(path, mode),
}

/**
 * Generate a cryptographically random API key (32 bytes = 64 hex chars).
 */
export function generateApiKey(): string {
  return randomBytes(32).toString("hex")
}

/**
 * Store an API key to ~/.config/arachne/auth.json with chmod 600.
 */
export function storeApiKey(
  key: string,
  ops: ApiKeyFileOperations = defaultOps,
  dir: string = AUTH_DIR,
  file: string = AUTH_FILE,
): void {
  ops.mkdir(dir)
  const data = JSON.stringify({ apiKey: key, createdAt: new Date().toISOString() })
  ops.writeFile(file, data)
  ops.chmod(file, 0o600)
}

/**
 * Load an API key from ~/.config/arachne/auth.json.
 * Returns null if the file doesn't exist or is malformed.
 */
export function loadApiKey(
  ops: Pick<ApiKeyFileOperations, "readFile"> = defaultOps,
  file: string = AUTH_FILE,
): string | null {
  try {
    const raw = ops.readFile(file)
    const parsed = JSON.parse(raw)
    if (typeof parsed.apiKey === "string" && parsed.apiKey.length > 0) {
      return parsed.apiKey
    }
    return null
  } catch {
    return null
  }
}

/**
 * Constant-time comparison of two API keys to prevent timing attacks.
 */
export function validateApiKey(provided: string, stored: string): boolean {
  if (typeof provided !== "string" || typeof stored !== "string") return false
  if (provided.length === 0 || stored.length === 0) return false

  const providedBuf = Buffer.from(provided, "utf-8")
  const storedBuf = Buffer.from(stored, "utf-8")

  if (providedBuf.length !== storedBuf.length) return false

  return timingSafeEqual(providedBuf, storedBuf)
}
