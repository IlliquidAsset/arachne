import { scanProjects } from "../../src/discovery"

declare const describe: (name: string, fn: () => void | Promise<void>) => void
declare const test: (name: string, fn: () => void | Promise<void>) => void
declare const expect: (value: unknown) => any

const DEV_ROOT = "/Users/kendrick/Documents/dev"
const REQUIRED_PROJECT_IDS = ["northstarpro", "watserface", "oh-my-opencode"]

describe("integration: project discovery", () => {
  test("discovers real projects and excludes ignored directories", async () => {
    const projects = await scanProjects(DEV_ROOT)
    const ids = projects.map((project) => project.id)

    for (const requiredId of REQUIRED_PROJECT_IDS) {
      expect(ids).toContain(requiredId)
    }

    expect(ids).not.toContain("node-modules")
    expect(ids).not.toContain("git")

    for (const project of projects) {
      expect(project.absolutePath).not.toContain("/node_modules")
      expect(project.absolutePath).not.toContain("/.git")
    }

    for (const requiredId of REQUIRED_PROJECT_IDS) {
      const project = projects.find((candidate) => candidate.id === requiredId)
      expect(project).toBeDefined()
      expect(project!.detectedFiles.length).toBeGreaterThan(0)
    }
  })
})
