import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { loadAmandaConfig } from "./loader"
import { mkdirSync, writeFileSync, rmSync } from "fs"
import { join } from "path"

const TEST_DIR = join(import.meta.dir, "__test_fixtures__")

describe("loadAmandaConfig", () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true })
  })

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true })
  })

  test("returns defaults when no config file exists", () => {
    const config = loadAmandaConfig(TEST_DIR)

    expect(config.discovery.paths).toEqual([])
    expect(config.discovery.ignore).toContain("node_modules")
    expect(config.servers.autoStart).toBe(true)
    expect(config.dispatch.maxConcurrent).toBe(3)
    expect(config.dispatch.timeout).toBe(300000)
  })

  test("loads config from amanda.json in directory", () => {
    writeFileSync(
      join(TEST_DIR, "amanda.json"),
      JSON.stringify({ dispatch: { maxConcurrent: 10 } }),
    )

    const config = loadAmandaConfig(TEST_DIR)

    expect(config.dispatch.maxConcurrent).toBe(10)
    expect(config.dispatch.timeout).toBe(300000)
    expect(config.servers.autoStart).toBe(true)
  })

  test("loads full custom config from amanda.json", () => {
    writeFileSync(
      join(TEST_DIR, "amanda.json"),
      JSON.stringify({
        discovery: { paths: ["/my/projects"] },
        servers: { portRange: [5000, 5100], autoStart: false },
        auth: { apiKey: "secret", enabled: false },
        dispatch: { maxConcurrent: 8, timeout: 120000 },
      }),
    )

    const config = loadAmandaConfig(TEST_DIR)

    expect(config.discovery.paths).toEqual(["/my/projects"])
    expect(config.servers.portRange).toEqual([5000, 5100])
    expect(config.servers.autoStart).toBe(false)
    expect(config.auth.apiKey).toBe("secret")
    expect(config.auth.enabled).toBe(false)
    expect(config.dispatch.maxConcurrent).toBe(8)
    expect(config.dispatch.timeout).toBe(120000)
  })

  test("validates config and rejects invalid data", () => {
    writeFileSync(
      join(TEST_DIR, "amanda.json"),
      JSON.stringify({ dispatch: { maxConcurrent: "invalid" } }),
    )

    expect(() => loadAmandaConfig(TEST_DIR)).toThrow()
  })

  test("rejects malformed JSON", () => {
    writeFileSync(join(TEST_DIR, "amanda.json"), "{ not valid json }")

    expect(() => loadAmandaConfig(TEST_DIR)).toThrow()
  })

  test("uses process.cwd() when no directory provided", () => {
    const config = loadAmandaConfig()

    expect(config).toBeDefined()
    expect(config.dispatch.maxConcurrent).toBe(3)
  })
})
