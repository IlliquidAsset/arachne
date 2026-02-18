import { describe, test, expect, beforeEach } from "bun:test"
import { ProjectRegistry } from "./registry"
import type { ProjectInfo, ProjectChangeEvent } from "./types"

function makeProject(overrides: Partial<ProjectInfo> = {}): ProjectInfo {
  return {
    id: "test-project",
    name: "test-project",
    absolutePath: "/tmp/test-project",
    detectedFiles: [".opencode"],
    state: "discovered",
    ...overrides,
  }
}

describe("ProjectRegistry", () => {
  let registry: ProjectRegistry

  beforeEach(() => {
    registry = new ProjectRegistry()
  })

  test("register + getAll", () => {
    const p1 = makeProject({ id: "alpha", name: "alpha" })
    const p2 = makeProject({ id: "beta", name: "beta" })
    registry.register(p1)
    registry.register(p2)
    expect(registry.getAll()).toHaveLength(2)
    expect(registry.size).toBe(2)
  })

  test("getAll returns sorted by name", () => {
    registry.register(makeProject({ id: "zeta", name: "zeta" }))
    registry.register(makeProject({ id: "alpha", name: "alpha" }))
    registry.register(makeProject({ id: "mid", name: "mid" }))
    const names = registry.getAll().map((p) => p.name)
    expect(names).toEqual(["alpha", "mid", "zeta"])
  })

  test("getById returns correct project", () => {
    const p = makeProject({ id: "northstarpro", name: "northstarpro" })
    registry.register(p)
    expect(registry.getById("northstarpro")).toBeDefined()
    expect(registry.getById("nonexistent")).toBeUndefined()
  })

  test("getByPath returns correct project", () => {
    const p = makeProject({
      id: "myproj",
      absolutePath: "/home/user/projects/myproj",
    })
    registry.register(p)
    expect(registry.getByPath("/home/user/projects/myproj")).toBeDefined()
    expect(registry.getByPath("/other/path")).toBeUndefined()
  })

  test("findByName — exact match", () => {
    registry.register(
      makeProject({ id: "northstarpro", name: "northstarpro" }),
    )
    expect(registry.findByName("northstarpro")?.id).toBe("northstarpro")
  })

  test("findByName — case-insensitive", () => {
    registry.register(
      makeProject({ id: "northstarpro", name: "NorthStarPro" }),
    )
    expect(registry.findByName("northstarpro")?.id).toBe("northstarpro")
  })

  test("findByName — starts-with", () => {
    registry.register(
      makeProject({ id: "northstarpro", name: "northstarpro" }),
    )
    expect(registry.findByName("north")?.id).toBe("northstarpro")
  })

  test("findByName — contains", () => {
    registry.register(
      makeProject({ id: "northstarpro", name: "northstarpro" }),
    )
    expect(registry.findByName("star")?.id).toBe("northstarpro")
  })

  test("findByName — watserface lookup", () => {
    registry.register(makeProject({ id: "watserface", name: "watserface" }))
    expect(registry.findByName("water")).toBeUndefined()
    expect(registry.findByName("wats")?.id).toBe("watserface")
    expect(registry.findByName("face")?.id).toBe("watserface")
  })

  test("findByName — rejects too-short queries", () => {
    registry.register(
      makeProject({ id: "northstarpro", name: "northstarpro" }),
    )
    expect(registry.findByName("n")).toBeUndefined()
    expect(registry.findByName("")).toBeUndefined()
  })

  test("updateState changes project state", () => {
    registry.register(
      makeProject({ id: "proj", name: "proj", state: "discovered" }),
    )
    registry.updateState("proj", "server-running")
    expect(registry.getById("proj")?.state).toBe("server-running")
  })

  test("updateState fires change event", () => {
    const events: ProjectChangeEvent[] = []
    registry.onChange((e) => events.push(e))
    registry.register(makeProject({ id: "proj", state: "discovered" }))
    registry.updateState("proj", "server-running")

    const stateEvent = events.find((e) => e.type === "state-changed")
    expect(stateEvent).toBeDefined()
    expect(stateEvent!.type).toBe("state-changed")
    if (stateEvent!.type === "state-changed") {
      expect(stateEvent!.previousState).toBe("discovered")
      expect(stateEvent!.project.state).toBe("server-running")
    }
  })

  test("register fires added event", () => {
    const events: ProjectChangeEvent[] = []
    registry.onChange((e) => events.push(e))
    registry.register(makeProject({ id: "new-proj" }))
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe("added")
  })

  test("unregister fires removed event", () => {
    registry.register(makeProject({ id: "rm-proj" }))
    const events: ProjectChangeEvent[] = []
    registry.onChange((e) => events.push(e))
    registry.unregister("rm-proj")
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe("removed")
  })

  test("onChange returns unsubscribe function", () => {
    const events: ProjectChangeEvent[] = []
    const unsub = registry.onChange((e) => events.push(e))
    registry.register(makeProject({ id: "p1" }))
    expect(events).toHaveLength(1)

    unsub()
    registry.register(makeProject({ id: "p2" }))
    expect(events).toHaveLength(1)
  })

  test("clear removes all projects", () => {
    registry.register(makeProject({ id: "a" }))
    registry.register(makeProject({ id: "b" }))
    registry.clear()
    expect(registry.size).toBe(0)
    expect(registry.getAll()).toEqual([])
  })
})
