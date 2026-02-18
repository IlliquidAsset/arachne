import { describe, test, expect, beforeEach } from "bun:test"
import { join } from "node:path"
import {
  getProfile,
  getAllProfiles,
  getRoutingContext,
  buildAllProfiles,
  clearProfiles,
} from "./index"
import type { ProfileInfo } from "./types"

const PACKAGE_ROOT = join(import.meta.dir, "../..")

beforeEach(() => {
  clearProfiles()
})

describe("knowledge store", () => {
  test("getProfile returns undefined for unknown project", () => {
    expect(getProfile("nonexistent")).toBeUndefined()
  })

  test("getProfile returns stored profile after buildAllProfiles", async () => {
    await buildAllProfiles([
      { id: "amanda-orchestrator", absolutePath: PACKAGE_ROOT },
    ])
    const profile = getProfile("amanda-orchestrator")
    expect(profile).toBeDefined()
    expect(profile!.projectId).toBe("amanda-orchestrator")
    expect(profile!.name).toBe("@amanda/orchestrator")
  })

  test("getAllProfiles returns all stored profiles", async () => {
    await buildAllProfiles([
      { id: "amanda-orchestrator", absolutePath: PACKAGE_ROOT },
    ])
    const all = getAllProfiles()
    expect(all.length).toBeGreaterThanOrEqual(1)
    expect(all[0].projectId).toBe("amanda-orchestrator")
  })

  test("getRoutingContext returns formatted string with all projects", async () => {
    await buildAllProfiles([
      { id: "amanda-orchestrator", absolutePath: PACKAGE_ROOT },
    ])
    const ctx = getRoutingContext()
    expect(ctx).toContain("Projects:")
    expect(ctx).toContain("amanda-orchestrator")
    expect(ctx).toContain("Stack:")
  })

  test("getRoutingContext returns 'none discovered' when empty", () => {
    const ctx = getRoutingContext()
    expect(ctx).toBe("Projects: none discovered")
  })

  test("clearProfiles empties the store", async () => {
    await buildAllProfiles([
      { id: "amanda-orchestrator", absolutePath: PACKAGE_ROOT },
    ])
    expect(getAllProfiles().length).toBeGreaterThan(0)
    clearProfiles()
    expect(getAllProfiles().length).toBe(0)
  })
})
