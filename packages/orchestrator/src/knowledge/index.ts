import { buildProfile } from "./profiler"
import type { ProfileInfo } from "./types"

export type { ProfileInfo } from "./types"
export { buildProfile } from "./profiler"

const profileStore = new Map<string, ProfileInfo>()

export async function buildAllProfiles(
  projects: Array<{ id: string; absolutePath: string }>,
): Promise<void> {
  const results = await Promise.allSettled(
    projects.map(p => buildProfile(p.absolutePath, p.id)),
  )
  for (const result of results) {
    if (result.status === "fulfilled") {
      profileStore.set(result.value.projectId, result.value)
    }
  }
}

export function getProfile(projectId: string): ProfileInfo | undefined {
  return profileStore.get(projectId)
}

export function getAllProfiles(): ProfileInfo[] {
  return [...profileStore.values()]
}

export function getRoutingContext(): string {
  const profiles = getAllProfiles()
  if (profiles.length === 0) return "Projects: none discovered"

  const lines = profiles.map(p => {
    const parts = [`${p.projectId}: ${p.description || p.name}`]
    if (p.keyConcepts.length > 0) parts.push(`Key: ${p.keyConcepts.join(", ")}`)
    if (p.techStack.length > 0) parts.push(`Stack: ${p.techStack.join(", ")}`)
    return `- ${parts.join(". ")}.`
  })

  return `Projects:\n${lines.join("\n")}`
}

export function clearProfiles(): void {
  profileStore.clear()
}
