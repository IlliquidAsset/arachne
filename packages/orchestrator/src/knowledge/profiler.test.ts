import { describe, test, expect, beforeAll, afterAll } from "bun:test"
import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { buildProfile } from "./profiler"

let tempDir: string

beforeAll(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "profiler-test-"))

  await writeFile(
    join(tempDir, "package.json"),
    JSON.stringify({
      name: "test-project",
      description: "A test project for profiling",
      dependencies: {
        "react": "^18.0.0",
        "react-dom": "^18.0.0",
        "@supabase/supabase-js": "^2.0.0",
        "@tanstack/react-query": "^5.0.0",
        "zustand": "^5.0.0",
      },
      devDependencies: {
        "typescript": "^5.0.0",
        "vite": "^5.0.0",
        "tailwindcss": "^3.0.0",
      },
    }),
  )

  await writeFile(
    join(tempDir, "AGENTS.md"),
    [
      "# Test Project Guidelines",
      "",
      "A deal management system for SPDD workflows and real estate operations.",
      "",
      "## Tech Stack",
      "",
      "- React + TypeScript",
      "- Supabase backend",
      "",
      "## Deal Wizard",
      "",
      'The "deal wizard" handles multi-step deal creation with SPDD validation.',
    ].join("\n"),
  )

  await mkdir(join(tempDir, ".git"))
})

afterAll(async () => {
  await rm(tempDir, { recursive: true, force: true })
})

describe("buildProfile", () => {
  test("extracts name from package.json", async () => {
    const profile = await buildProfile(tempDir, "test-proj")
    expect(profile.name).toBe("test-project")
    expect(profile.projectId).toBe("test-proj")
  })

  test("extracts tech stack from dependencies", async () => {
    const profile = await buildProfile(tempDir, "test-proj")
    expect(profile.techStack).toContain("React")
    expect(profile.techStack).toContain("Supabase")
    expect(profile.techStack).toContain("TypeScript")
    expect(profile.techStack).toContain("Vite")
    expect(profile.techStack).toContain("Tailwind CSS")
    expect(profile.techStack).toContain("React Query")
    expect(profile.techStack).toContain("Zustand")
  })

  test("extracts description from AGENTS.md first paragraph", async () => {
    const profile = await buildProfile(tempDir, "test-proj")
    expect(profile.description).toContain("SPDD")
    expect(profile.description).toContain("deal management")
  })

  test("extracts key concepts from markdown", async () => {
    const profile = await buildProfile(tempDir, "test-proj")
    expect(profile.keyConcepts).toContain("SPDD")
  })

  test("extracts services from content", async () => {
    const profile = await buildProfile(tempDir, "test-proj")
    expect(profile.services).toContain("Supabase")
  })

  test("profile is under 200 tokens", async () => {
    const profile = await buildProfile(tempDir, "test-proj")
    expect(profile.rawTokenEstimate).toBeLessThanOrEqual(200)
  })

  test("handles missing package.json gracefully", async () => {
    const emptyDir = await mkdtemp(join(tmpdir(), "profiler-empty-"))
    try {
      const profile = await buildProfile(emptyDir, "empty-proj")
      expect(profile.projectId).toBe("empty-proj")
      expect(profile.name).toBe("empty-proj")
      expect(profile.techStack).toEqual([])
    } finally {
      await rm(emptyDir, { recursive: true, force: true })
    }
  })

  test("falls back to README.md when no AGENTS.md", async () => {
    const readmeDir = await mkdtemp(join(tmpdir(), "profiler-readme-"))
    try {
      await writeFile(
        join(readmeDir, "README.md"),
        "# My App\n\nA powerful tool for managing cloud infrastructure.\n\n## Features\n",
      )
      const profile = await buildProfile(readmeDir, "readme-proj")
      expect(profile.description).toContain("cloud infrastructure")
    } finally {
      await rm(readmeDir, { recursive: true, force: true })
    }
  })

  test("deduplicates tech stack entries", async () => {
    const dedupeDir = await mkdtemp(join(tmpdir(), "profiler-dedupe-"))
    try {
      await writeFile(
        join(dedupeDir, "package.json"),
        JSON.stringify({
          name: "dedupe-test",
          dependencies: { "react": "^18.0.0", "react-dom": "^18.0.0" },
        }),
      )
      const profile = await buildProfile(dedupeDir, "dedupe-proj")
      const reactCount = profile.techStack.filter(t => t === "React").length
      expect(reactCount).toBe(1)
    } finally {
      await rm(dedupeDir, { recursive: true, force: true })
    }
  })
})
