import { projectRegistry } from "../discovery/registry"
import { getAllProfiles, type ProfileInfo } from "../knowledge"

export interface RoutingResult {
  projectId: string | null
  confidence: "explicit" | "context" | "keyword" | "ai" | "ask_user"
  layer: 1 | 2 | 3 | 4 | 5
  candidates?: string[]
  cleanedMessage?: string
}

interface ExplicitMatch {
  projectId: string
  cleanedMessage: string
}

interface KnowledgeMatch {
  projectId: string | null
  tiedCandidates: string[]
}

const CONTEXT_TTL_MESSAGES = 10

const EXPLICIT_PATTERNS: Array<{ regex: RegExp; projectGroup: number }> = [
  {
    regex:
      /\b(?:in|on|for)\s+(?:the\s+)?(\w[\w-]*)\s+(?:project|repo|app|codebase)\b/i,
    projectGroup: 1,
  },
  {
    regex: /\[\s*(\w[\w-]*)\s*\]/i,
    projectGroup: 1,
  },
  {
    regex: /@(\w[\w-]*)/i,
    projectGroup: 1,
  },
  {
    regex: /(in|on|for|@|\[)\s*(\w[\w-]*)/i,
    projectGroup: 2,
  },
  {
    regex: /(the\s+)?(\w[\w-]*)\s+(project|repo|app|codebase)/i,
    projectGroup: 2,
  },
]

let currentProject: string | null = null
let messagesSinceContextSet = 0

function normalize(text: string): string {
  return text.toLowerCase()
}

function stripMatchedText(message: string, match: RegExpExecArray): string {
  const start = match.index
  const end = start + match[0].length
  const before = message.slice(0, start).trimEnd()
  const after = message.slice(end).trimStart()

  const joined = [before, after].filter(Boolean).join(" ")

  return joined
    .replace(/^[\s,.:;\-\]_]+/, "")
    .replace(/\s{2,}/g, " ")
    .trim()
}

function matchExplicit(message: string): ExplicitMatch | null {
  for (const { regex, projectGroup } of EXPLICIT_PATTERNS) {
    const match = regex.exec(message)
    if (!match) {
      continue
    }

    const query = match[projectGroup]
    if (!query) {
      continue
    }

    const project = projectRegistry.findByName(query)
    if (!project) {
      continue
    }

    return {
      projectId: project.id,
      cleanedMessage: stripMatchedText(message, match),
    }
  }

  return null
}

function matchContext(): string | null {
  if (!currentProject) {
    return null
  }

  messagesSinceContextSet += 1
  if (messagesSinceContextSet < CONTEXT_TTL_MESSAGES) {
    return currentProject
  }

  clearContext()
  return null
}

function scoreProfileMessageMatch(message: string, profile: ProfileInfo): number {
  const terms = new Set(
    [...profile.keyConcepts, ...profile.techStack, ...profile.services]
      .map((entry) => normalize(entry.trim()))
      .filter((entry) => entry.length >= 3),
  )

  let score = 0
  for (const term of terms) {
    if (message.includes(term)) {
      score += 1
    }
  }

  return score
}

function matchKnowledge(message: string): KnowledgeMatch {
  const availableProjectIds = new Set(projectRegistry.getAll().map((project) => project.id))
  const normalizedMessage = normalize(message)
  let highestScore = 0
  let tiedCandidates: string[] = []

  for (const profile of getAllProfiles()) {
    if (!availableProjectIds.has(profile.projectId)) {
      continue
    }

    const score = scoreProfileMessageMatch(normalizedMessage, profile)
    if (score > highestScore) {
      highestScore = score
      tiedCandidates = [profile.projectId]
      continue
    }

    if (score === highestScore && score > 0) {
      tiedCandidates.push(profile.projectId)
    }
  }

  if (highestScore < 2) {
    return { projectId: null, tiedCandidates: [] }
  }

  if (tiedCandidates.length === 1) {
    return { projectId: tiedCandidates[0], tiedCandidates: [] }
  }

  return { projectId: null, tiedCandidates }
}

function matchAiDisambiguation(_message: string, _candidates: string[]): string | null {
  console.info("AI routing would be invoked here")
  return null
}

function getAllProjectNames(): string[] {
  return projectRegistry.getAll().map((project) => project.name)
}

export function setContext(projectId: string): void {
  currentProject = projectId
  messagesSinceContextSet = 0
}

export function getContext(): string | null {
  return currentProject
}

export function clearContext(): void {
  currentProject = null
  messagesSinceContextSet = 0
}

export function routeMessage(message: string): RoutingResult {
  const explicit = matchExplicit(message)
  if (explicit) {
    setContext(explicit.projectId)
    return {
      projectId: explicit.projectId,
      confidence: "explicit",
      layer: 1,
      cleanedMessage: explicit.cleanedMessage,
    }
  }

  const contextualProject = matchContext()
  if (contextualProject) {
    return {
      projectId: contextualProject,
      confidence: "context",
      layer: 2,
    }
  }

  const knowledgeMatch = matchKnowledge(message)
  if (knowledgeMatch.projectId) {
    return {
      projectId: knowledgeMatch.projectId,
      confidence: "keyword",
      layer: 3,
    }
  }

  const aiCandidate = matchAiDisambiguation(message, knowledgeMatch.tiedCandidates)
  if (aiCandidate) {
    return {
      projectId: aiCandidate,
      confidence: "ai",
      layer: 4,
    }
  }

  return {
    projectId: null,
    confidence: "ask_user",
    layer: 5,
    candidates: getAllProjectNames(),
  }
}
