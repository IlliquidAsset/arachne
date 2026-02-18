import { clearContext, routeMessage } from "../../src/dispatch"
import { projectRegistry, scanProjects } from "../../src/discovery"
import { buildAllProfiles, clearProfiles, getAllProfiles } from "../../src/knowledge"

declare const describe: (name: string, fn: () => void | Promise<void>) => void
declare const test: (name: string, fn: () => void | Promise<void>) => void
declare const expect: (value: unknown) => any
declare const beforeAll: (fn: () => void | Promise<void>) => void
declare const beforeEach: (fn: () => void | Promise<void>) => void

const DEV_ROOT = "/Users/kendrick/Documents/dev"

function normalizeTerm(term: string): string {
  return term.toLowerCase().trim()
}

function findLayer3Candidate(): { projectId: string; terms: [string, string] } | null {
  const profiles = getAllProfiles()
  const occurrences = new Map<string, Set<string>>()

  for (const profile of profiles) {
    const terms = new Set(
      [...profile.keyConcepts, ...profile.techStack, ...profile.services]
        .map(normalizeTerm)
        .filter((term) => term.length >= 3),
    )

    for (const term of terms) {
      const existing = occurrences.get(term) ?? new Set<string>()
      existing.add(profile.projectId)
      occurrences.set(term, existing)
    }
  }

  for (const profile of profiles) {
    const uniqueTerms = [...new Set([...profile.keyConcepts, ...profile.techStack, ...profile.services])]
      .map(normalizeTerm)
      .filter((term) => term.length >= 3)
      .filter((term) => occurrences.get(term)?.size === 1)

    if (uniqueTerms.length >= 2) {
      return {
        projectId: profile.projectId,
        terms: [uniqueTerms[0], uniqueTerms[1]],
      }
    }
  }

  return null
}

beforeAll(async () => {
  clearContext()
  clearProfiles()
  projectRegistry.clear()

  const projects = await scanProjects(DEV_ROOT)
  for (const project of projects) {
    projectRegistry.register(project)
  }

  await buildAllProfiles(
    projects.map((project) => ({
      id: project.id,
      absolutePath: project.absolutePath,
    })),
  )
})

beforeEach(() => {
  clearContext()
})

describe("integration: routing", () => {
  test("layer 1 routes explicit message to northstarpro", () => {
    const result = routeMessage("In Northstar, check the wizard")
    expect(result.projectId).toBe("northstarpro")
    expect(result.confidence).toBe("explicit")
    expect(result.layer).toBe(1)
  })

  test("layer 3 routes by real profile keywords", () => {
    const candidate = findLayer3Candidate()
    expect(candidate).toBeDefined()

    const query = `${candidate!.terms[0]} ${candidate!.terms[1]}`
    const result = routeMessage(query)

    expect(result.projectId).toBe(candidate!.projectId)
    expect(result.confidence).toBe("keyword")
    expect(result.layer).toBe(3)
  })

  test("layer 5 asks user for unrelated message with all project names", () => {
    const result = routeMessage("what should we do for lunch today?")
    const expectedCandidates = projectRegistry.getAll().map((project) => project.name)

    expect(result.projectId).toBeNull()
    expect(result.confidence).toBe("ask_user")
    expect(result.layer).toBe(5)
    expect(result.candidates).toEqual(expectedCandidates)
  })
})
