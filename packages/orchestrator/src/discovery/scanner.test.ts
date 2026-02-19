import { describe, test, expect, beforeAll, afterAll } from "bun:test"
import { scanProjects } from "./scanner"
import { mkdirSync, writeFileSync, rmSync } from "node:fs"
import { join } from "node:path"

const TEST_BASE = join("/tmp", `arachne-scanner-test-${Date.now()}`)

function mkDir(...parts: string[]) {
  mkdirSync(join(TEST_BASE, ...parts), { recursive: true })
}

function mkFile(path: string, content = "") {
  writeFileSync(join(TEST_BASE, path), content)
}

beforeAll(() => {
  mkdirSync(TEST_BASE, { recursive: true })

  mkDir("project-a", ".opencode")
  mkFile("project-a/package.json", JSON.stringify({ name: "alpha-project" }))

  mkDir("project-b")
  mkFile("project-b/AGENTS.md", "# Agents")

  mkDir("project-c")
  mkFile("project-c/.opencodeignore", "node_modules")

  mkDir("project-d")
  mkFile("project-d/.opencode.json", "{}")

  mkDir("empty-dir")

  mkDir("node_modules", "some-package")

  mkDir("has-only-pkg")
  mkFile("has-only-pkg/package.json", JSON.stringify({ name: "pkg-only" }))
})

afterAll(() => {
  rmSync(TEST_BASE, { recursive: true, force: true })
})

describe("scanProjects", () => {
  test("discovers projects with .opencode/ directory", async () => {
    const projects = await scanProjects(TEST_BASE)
    const a = projects.find((p) => p.id === "project-a")
    expect(a).toBeDefined()
    expect(a!.detectedFiles).toContain(".opencode")
    expect(a!.name).toBe("alpha-project")
  })

  test("discovers projects with AGENTS.md", async () => {
    const projects = await scanProjects(TEST_BASE)
    const b = projects.find((p) => p.id === "project-b")
    expect(b).toBeDefined()
    expect(b!.detectedFiles).toContain("AGENTS.md")
    expect(b!.name).toBe("project-b")
  })

  test("discovers projects with .opencodeignore", async () => {
    const projects = await scanProjects(TEST_BASE)
    const c = projects.find((p) => p.id === "project-c")
    expect(c).toBeDefined()
    expect(c!.detectedFiles).toContain(".opencodeignore")
  })

  test("discovers projects with .opencode.json", async () => {
    const projects = await scanProjects(TEST_BASE)
    const d = projects.find((p) => p.id === "project-d")
    expect(d).toBeDefined()
    expect(d!.detectedFiles).toContain(".opencode.json")
  })

  test("discovers projects with only package.json (weak signal)", async () => {
    const projects = await scanProjects(TEST_BASE)
    const pkg = projects.find((p) => p.id === "has-only-pkg")
    expect(pkg).toBeDefined()
    expect(pkg!.detectedFiles).toEqual(["package.json"])
    expect(pkg!.name).toBe("pkg-only")
  })

  test("ignores node_modules by default", async () => {
    const projects = await scanProjects(TEST_BASE)
    const nm = projects.find((p) => p.id === "node-modules")
    expect(nm).toBeUndefined()
  })

  test("skips directories with no signals", async () => {
    const projects = await scanProjects(TEST_BASE)
    const empty = projects.find((p) => p.id === "empty-dir")
    expect(empty).toBeUndefined()
  })

  test("returns results sorted alphabetically by name", async () => {
    const projects = await scanProjects(TEST_BASE)
    const names = projects.map((p) => p.name)
    const sorted = [...names].sort((a, b) => a.localeCompare(b))
    expect(names).toEqual(sorted)
  })

  test("all projects have state 'discovered'", async () => {
    const projects = await scanProjects(TEST_BASE)
    for (const p of projects) {
      expect(p.state).toBe("discovered")
    }
  })

  test("reads name from package.json when available", async () => {
    const projects = await scanProjects(TEST_BASE)
    const a = projects.find((p) => p.id === "project-a")
    expect(a!.name).toBe("alpha-project")
  })

  test("falls back to directory name when no package.json", async () => {
    const projects = await scanProjects(TEST_BASE)
    const b = projects.find((p) => p.id === "project-b")
    expect(b!.name).toBe("project-b")
  })

  test("returns empty array for nonexistent path", async () => {
    const projects = await scanProjects("/nonexistent/path/12345")
    expect(projects).toEqual([])
  })

  test("respects custom ignore list", async () => {
    const projects = await scanProjects(TEST_BASE, ["project-a", "project-b"])
    expect(projects.find((p) => p.id === "project-a")).toBeUndefined()
    expect(projects.find((p) => p.id === "project-b")).toBeUndefined()
    expect(projects.find((p) => p.id === "project-c")).toBeDefined()
  })
})
