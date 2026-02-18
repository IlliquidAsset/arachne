import { readFileSync, existsSync } from "fs"
import { join } from "path"
import { homedir } from "os"
import { AmandaConfigSchema, type AmandaConfig } from "./schema"

function findConfigPath(directory: string): string | undefined {
  const candidates = [
    join(directory, "amanda.json"),
    join(homedir(), ".config", "amanda", "config.json"),
  ]
  return candidates.find((p) => existsSync(p))
}

export function loadAmandaConfig(directory?: string): AmandaConfig {
  const cwd = directory ?? process.cwd()
  const configPath = findConfigPath(cwd)

  if (!configPath) {
    return AmandaConfigSchema.parse({})
  }

  const raw = readFileSync(configPath, "utf-8")
  const parsed = JSON.parse(raw)
  return AmandaConfigSchema.parse(parsed)
}
