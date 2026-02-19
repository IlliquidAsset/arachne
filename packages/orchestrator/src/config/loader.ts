import { readFileSync, existsSync } from "fs"
import { join } from "path"
import { homedir } from "os"
import { ArachneConfigSchema, type ArachneConfig } from "./schema"

function findConfigPath(directory: string): string | undefined {
  const candidates = [
    join(directory, "arachne.json"),
    join(homedir(), ".config", "arachne", "config.json"),
  ]
  return candidates.find((p) => existsSync(p))
}

export function loadArachneConfig(directory?: string): ArachneConfig {
  const cwd = directory ?? process.cwd()
  const configPath = findConfigPath(cwd)

  if (!configPath) {
    return ArachneConfigSchema.parse({})
  }

  const raw = readFileSync(configPath, "utf-8")
  const parsed = JSON.parse(raw)
  return ArachneConfigSchema.parse(parsed)
}
