import { readFile } from "node:fs/promises"
import { join } from "node:path"
import type { ProfileInfo } from "./types"

const TECH_MAP: Record<string, string> = {
  "next": "Next.js",
  "react": "React",
  "react-dom": "React",
  "vue": "Vue",
  "svelte": "Svelte",
  "@angular/core": "Angular",
  "express": "Express",
  "fastify": "Fastify",
  "hono": "Hono",
  "@supabase/supabase-js": "Supabase",
  "firebase": "Firebase",
  "prisma": "Prisma",
  "@prisma/client": "Prisma",
  "drizzle-orm": "Drizzle",
  "mongoose": "MongoDB",
  "pg": "PostgreSQL",
  "tailwindcss": "Tailwind CSS",
  "styled-components": "Styled Components",
  "@emotion/react": "Emotion",
  "zustand": "Zustand",
  "redux": "Redux",
  "@reduxjs/toolkit": "Redux Toolkit",
  "@tanstack/react-query": "React Query",
  "react-router-dom": "React Router",
  "zod": "Zod",
  "trpc": "tRPC",
  "@trpc/server": "tRPC",
  "stripe": "Stripe",
  "openai": "OpenAI",
  "@anthropic-ai/sdk": "Anthropic",
  "langchain": "LangChain",
  "vite": "Vite",
  "webpack": "Webpack",
  "esbuild": "esbuild",
  "typescript": "TypeScript",
  "jest": "Jest",
  "vitest": "Vitest",
  "@playwright/test": "Playwright",
  "puppeteer": "Puppeteer",
  "electron": "Electron",
  "react-native": "React Native",
  "expo": "Expo",
  "three": "Three.js",
  "discord.js": "Discord.js",
  "socket.io": "Socket.IO",
  "graphql": "GraphQL",
  "@apollo/server": "Apollo GraphQL",
  "recharts": "Recharts",
  "d3": "D3.js",
  "sharp": "Sharp",
  "bun-types": "Bun",
}

function dedupe(arr: string[]): string[] {
  return [...new Set(arr)]
}

async function safeRead(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf-8")
  } catch {
    return null
  }
}

function extractTechStack(pkg: Record<string, unknown>): string[] {
  const deps = {
    ...(pkg.dependencies as Record<string, string> | undefined),
    ...(pkg.devDependencies as Record<string, string> | undefined),
  }
  const techs: string[] = []
  for (const dep of Object.keys(deps)) {
    const mapped = TECH_MAP[dep]
    if (mapped) techs.push(mapped)
  }
  return dedupe(techs).slice(0, 10)
}

/**
 * Extracts first meaningful paragraph from markdown, stopping at the second ## heading.
 * Skips badges, frontmatter, code blocks. Truncates to 150 chars.
 */
function extractDescription(content: string): string {
  const lines = content.split("\n")
  const paragraphs: string[] = []
  let foundFirstHeading = false
  let currentParagraph = ""

  for (const line of lines) {
    if (!foundFirstHeading && (line.startsWith("# ") || line.trim().startsWith("<h1"))) {
      foundFirstHeading = true
      continue
    }
    if (foundFirstHeading && line.startsWith("## ") && paragraphs.length > 0) {
      break
    }

    const trimmed = line.trim()
    if (trimmed === "" || trimmed.startsWith("```") || trimmed.startsWith("---") || trimmed.startsWith("##")) {
      if (currentParagraph.trim()) {
        paragraphs.push(currentParagraph.trim())
        currentParagraph = ""
      }
      continue
    }
    if (trimmed.startsWith("[![") || trimmed.startsWith("![")) continue
    if (trimmed.startsWith("<") || trimmed.match(/^[a-z_]+:/)) continue
    if (trimmed.startsWith("**") && trimmed.endsWith("**") && trimmed.length < 60) continue

    currentParagraph += " " + trimmed
  }
  if (currentParagraph.trim()) {
    paragraphs.push(currentParagraph.trim())
  }

  const isMetaDescription = (p: string) =>
    /^guidelines for ai/i.test(p) ||
    /^this file (documents|describes|contains)/i.test(p) ||
    /^instructions for/i.test(p)

  const desc = paragraphs.find(p => p.length > 20 && !isMetaDescription(p))
    ?? paragraphs.find(p => !isMetaDescription(p))
    ?? ""
  if (desc.length > 150) {
    return desc.slice(0, 147) + "..."
  }
  return desc
}

/**
 * Extracts domain-specific concepts via regex: section headers, acronyms, quoted terms.
 * Filters out generic programming terms to keep only project-specific vocabulary.
 */
function extractKeyConcepts(content: string): string[] {
  const concepts: string[] = []

  const headers = content.match(/^#{2,3}\s+(.+)$/gm)
  if (headers) {
    for (const h of headers.slice(0, 10)) {
      const text = h.replace(/^#{2,3}\s+/, "")
        .replace(/[*_`#]/g, "")
        .replace(/^\d+\.\s+/, "")
        .replace(/[^\p{L}\p{N}\p{P}\p{Z}]/gu, "")
        .trim()
      if (text.length > 2 && text.length < 40 && !isGenericHeader(text)) {
        concepts.push(text)
      }
    }
  }

  // Acronyms: 3+ uppercase letters to avoid noise (AI, UI, DO)
  const acronyms = content.match(/\b[A-Z][A-Z0-9]{2,8}\b/g)
  if (acronyms) {
    for (const a of acronyms) {
      if (!isGenericAcronym(a) && !concepts.includes(a)) {
        concepts.push(a)
      }
    }
  }

  const quoted = content.match(/"([^"]{2,30})"/g)
  if (quoted) {
    for (const q of quoted.slice(0, 5)) {
      const term = q.replace(/"/g, "")
      const isCodeSnippet = /^[a-z]/.test(term) || term.includes("/") || term.startsWith("@")
      if (term.length > 2 && !isCodeSnippet && !concepts.includes(term)) {
        concepts.push(term)
      }
    }
  }

  return dedupe(concepts).slice(0, 8)
}

function isGenericHeader(h: string): boolean {
  const generic = [
    "quick reference", "tech stack", "project structure", "code style",
    "imports", "naming conventions", "typescript rules", "styling",
    "data fetching", "error handling", "environment variables",
    "verification checklist", "key files", "do not", "getting started",
    "installation", "usage", "license", "contributing", "testing",
    "development", "deployment", "configuration", "setup", "overview",
    "table of contents", "features", "requirements", "prerequisites",
    "important notice", "code quality gates", "debugging", "known quirks",
    "import order", "component pattern", "role-based access",
    "what is", "who is", "how to", "why", "rules",
    "full workflow", "workflow documentation",
  ]
  return generic.some(g => h.toLowerCase().includes(g))
}

function isGenericAcronym(a: string): boolean {
  const generic = [
    "API", "URL", "CSS", "HTML", "SQL", "JSON", "HTTP", "HTTPS",
    "CLI", "GUI", "IDE", "SDK", "NPM", "SPA", "SSR", "SSG",
    "DOM", "ENV", "EOF", "GET", "PUT", "POST", "CRUD", "NOT",
    "MUST", "TODO", "EDIT", "THE", "RGB", "AND", "USE", "RUN",
    "NEW", "ALL", "YES", "TRUE", "FALSE", "NULL", "VOID", "INFO",
    "WARN", "CORE", "FILE", "TYPE", "LOCK", "BOTH",
    "AGENTS", "FORBIDDEN", "GENERATED", "MANDATORY",
    "IMPORTANT", "NEVER", "ALWAYS", "WRONG", "CORRECT",
  ]
  return generic.includes(a)
}

function extractServices(content: string, techStack: string[]): string[] {
  const services: string[] = []
  const servicePatterns: Record<string, string> = {
    "supabase": "Supabase",
    "firebase": "Firebase",
    "stripe": "Stripe",
    "runpod": "RunPod",
    "vercel": "Vercel",
    "netlify": "Netlify",
    "aws": "AWS",
    "gcp": "GCP",
    "azure": "Azure",
    "cloudflare": "Cloudflare",
    "docker": "Docker",
    "redis": "Redis",
    "openai": "OpenAI",
    "anthropic": "Anthropic",
    "twilio": "Twilio",
    "sendgrid": "SendGrid",
    "sentry": "Sentry",
    "datadog": "Datadog",
    "gohighlevel": "GoHighLevel",
    "mediapipe": "MediaPipe",
    "hugging\\s?face": "HuggingFace",
  }

  const lower = content.toLowerCase()
  for (const [pattern, name] of Object.entries(servicePatterns)) {
    if (new RegExp(pattern, "i").test(lower)) {
      services.push(name)
    }
  }

  const saasFromStack = ["Supabase", "Firebase", "Stripe", "OpenAI", "Anthropic"]
  for (const s of saasFromStack) {
    if (techStack.includes(s) && !services.includes(s)) {
      services.push(s)
    }
  }

  return dedupe(services).slice(0, 6)
}

async function getRecentActivity(projectPath: string): Promise<string> {
  try {
    const proc = Bun.spawn(["git", "log", "--oneline", "-5"], {
      cwd: projectPath,
      stdout: "pipe",
      stderr: "pipe",
    })
    const output = await new Response(proc.stdout).text()
    await proc.exited
    return output.trim() || "no recent commits"
  } catch {
    return "no git history"
  }
}

function estimateTokens(profile: ProfileInfo): number {
  const text = [
    profile.name,
    profile.description,
    profile.techStack.join(", "),
    profile.keyConcepts.join(", "),
    profile.services.join(", "),
    profile.recentActivity,
  ].join(" ")
  return Math.ceil(text.length / 4)
}

function truncateToFit(profile: ProfileInfo, maxTokens: number): ProfileInfo {
  const p = { ...profile }
  p.rawTokenEstimate = estimateTokens(p)

  if (p.rawTokenEstimate > maxTokens) {
    p.recentActivity = p.recentActivity.split("\n").slice(0, 3).join("; ")
    p.rawTokenEstimate = estimateTokens(p)
  }
  if (p.rawTokenEstimate > maxTokens) {
    p.keyConcepts = p.keyConcepts.slice(0, 5)
    p.rawTokenEstimate = estimateTokens(p)
  }
  if (p.rawTokenEstimate > maxTokens) {
    p.description = p.description.slice(0, 100) + "..."
    p.rawTokenEstimate = estimateTokens(p)
  }
  return p
}

export async function buildProfile(
  projectPath: string,
  projectId: string,
): Promise<ProfileInfo> {
  const [pkgRaw, agentsMd, readmeMd] = await Promise.all([
    safeRead(join(projectPath, "package.json")),
    safeRead(join(projectPath, "AGENTS.md")),
    safeRead(join(projectPath, "README.md")),
  ])

  let pkg: Record<string, unknown> = {}
  if (pkgRaw) {
    try {
      pkg = JSON.parse(pkgRaw) as Record<string, unknown>
    } catch { /* malformed — skip */ }
  }

  const name = (pkg.name as string) ?? projectId
  const techStack = pkgRaw ? extractTechStack(pkg) : []

  let description = ""
  for (const source of [agentsMd, readmeMd]) {
    if (source) {
      const extracted = extractDescription(source)
      if (extracted) {
        description = extracted
        break
      }
    }
  }
  if (!description && pkg.description) {
    description = pkg.description as string
  }

  const markdownContent = [agentsMd, readmeMd].filter(Boolean).join("\n")
  const keyConcepts = markdownContent
    ? extractKeyConcepts(markdownContent)
    : []

  const allText = [agentsMd, readmeMd, pkgRaw].filter(Boolean).join("\n")
  const services = extractServices(allText, techStack)

  const recentActivity = await getRecentActivity(projectPath)

  const profile: ProfileInfo = {
    projectId,
    name,
    description,
    techStack,
    keyConcepts,
    services,
    recentActivity,
    rawTokenEstimate: 0,
  }

  return truncateToFit(profile, 200)
}
