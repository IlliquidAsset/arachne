import { describe, test, expect } from "bun:test"
import { AmandaConfigSchema } from "./schema"

describe("AmandaConfigSchema", () => {
  test("applies all defaults when given empty object", () => {
    const config = AmandaConfigSchema.parse({})

    expect(config.discovery.paths).toEqual([])
    expect(config.discovery.ignore).toEqual([
      "node_modules",
      ".git",
      "dist",
      ".next",
      ".cache",
    ])
    expect(config.servers.portRange).toEqual([4100, 4200])
    expect(config.servers.autoStart).toBe(true)
    expect(config.auth.apiKey).toBe("")
    expect(config.auth.enabled).toBe(true)
    expect(config.dispatch.maxConcurrent).toBe(3)
    expect(config.dispatch.timeout).toBe(300000)
  })

  test("accepts valid custom config", () => {
    const config = AmandaConfigSchema.parse({
      discovery: { paths: ["/projects"], ignore: ["node_modules"] },
      servers: { portRange: [5000, 5100], autoStart: false },
      auth: { apiKey: "test-key", enabled: false },
      dispatch: { maxConcurrent: 5, timeout: 60000 },
    })

    expect(config.discovery.paths).toEqual(["/projects"])
    expect(config.discovery.ignore).toEqual(["node_modules"])
    expect(config.servers.portRange).toEqual([5000, 5100])
    expect(config.servers.autoStart).toBe(false)
    expect(config.auth.apiKey).toBe("test-key")
    expect(config.auth.enabled).toBe(false)
    expect(config.dispatch.maxConcurrent).toBe(5)
    expect(config.dispatch.timeout).toBe(60000)
  })

  test("rejects invalid types", () => {
    expect(() =>
      AmandaConfigSchema.parse({ dispatch: { maxConcurrent: "not-a-number" } }),
    ).toThrow()
  })

  test("rejects invalid port range tuple", () => {
    expect(() =>
      AmandaConfigSchema.parse({ servers: { portRange: [4100] } }),
    ).toThrow()
  })

  test("rejects invalid enum-like values in nested fields", () => {
    expect(() =>
      AmandaConfigSchema.parse({ auth: { enabled: "yes" } }),
    ).toThrow()
  })

  test("merges partial config with defaults", () => {
    const config = AmandaConfigSchema.parse({
      dispatch: { maxConcurrent: 10 },
    })

    expect(config.dispatch.maxConcurrent).toBe(10)
    expect(config.dispatch.timeout).toBe(300000)
    expect(config.discovery.paths).toEqual([])
    expect(config.servers.autoStart).toBe(true)
  })

  test("merges partial nested section with defaults", () => {
    const config = AmandaConfigSchema.parse({
      servers: { autoStart: false },
    })

    expect(config.servers.autoStart).toBe(false)
    expect(config.servers.portRange).toEqual([4100, 4200])
  })
})
