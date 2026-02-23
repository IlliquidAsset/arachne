import { NextRequest } from "next/server";
import { requireAuth, jsonResponse } from "@/app/lib/api-helpers";
import { readdir, stat, readFile, mkdir, writeFile } from "node:fs/promises";
import { join, basename, dirname } from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

const OC_SIGNALS = [".opencode", "AGENTS.md", ".opencode.json", ".opencodeignore"];
const WEAK_SIGNALS = ["package.json"];
const IGNORE = new Set([
  "node_modules", ".git", "dist", ".next", ".cache", ".sisyphus",
  ".Trash", "Library", "Applications",
]);

const TECH_MAP: Record<string, string> = {
  next: "Next.js",
  react: "React",
  "react-dom": "React",
  vue: "Vue",
  svelte: "Svelte",
  "@angular/core": "Angular",
  express: "Express",
  fastify: "Fastify",
  hono: "Hono",
  tailwindcss: "Tailwind CSS",
  typescript: "TypeScript",
  prisma: "Prisma",
  "@prisma/client": "Prisma",
  "drizzle-orm": "Drizzle",
  zod: "Zod",
  "@supabase/supabase-js": "Supabase",
  openai: "OpenAI",
  "@anthropic-ai/sdk": "Anthropic",
  stripe: "Stripe",
  "@tanstack/react-query": "React Query",
  vitest: "Vitest",
  jest: "Jest",
  "@playwright/test": "Playwright",
  "socket.io": "Socket.IO",
  "three": "Three.js",
  "discord.js": "Discord.js",
  "mongoose": "MongoDB",
  pg: "PostgreSQL",
};

export interface ProjectCard {
  id: string;
  name: string;
  description: string;
  absolutePath: string;
  techStack: string[];
  detectedFiles: string[];
  lastActivity?: string;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function detectSignals(dirPath: string): Promise<string[]> {
  const found: string[] = [];
  for (const signal of [...OC_SIGNALS, ...WEAK_SIGNALS]) {
    if (await pathExists(join(dirPath, signal))) {
      found.push(signal);
    }
  }
  return found;
}

async function readPackageJson(
  dirPath: string,
): Promise<Record<string, unknown> | null> {
  try {
    const raw = await readFile(join(dirPath, "package.json"), "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function extractTechStack(pkg: Record<string, unknown>): string[] {
  const deps = {
    ...(pkg.dependencies as Record<string, string> | undefined),
    ...(pkg.devDependencies as Record<string, string> | undefined),
  };
  const techs: string[] = [];
  for (const dep of Object.keys(deps || {})) {
    const mapped = TECH_MAP[dep];
    if (mapped && !techs.includes(mapped)) techs.push(mapped);
  }
  return techs.slice(0, 8);
}

async function extractDescription(dirPath: string): Promise<string> {
  for (const file of ["AGENTS.md", "README.md"]) {
    try {
      const content = await readFile(join(dirPath, file), "utf-8");
      const lines = content.split("\n");
      let foundHeading = false;

      for (const line of lines) {
        if (!foundHeading && line.startsWith("# ")) {
          foundHeading = true;
          continue;
        }
        const trimmed = line.trim();
        if (
          !trimmed ||
          trimmed.startsWith("#") ||
          trimmed.startsWith("```") ||
          trimmed.startsWith("---") ||
          trimmed.startsWith("![") ||
          trimmed.startsWith("[![") ||
          trimmed.startsWith("<")
        ) {
          continue;
        }
        if (trimmed.length > 20) {
          return trimmed.length > 150
            ? trimmed.slice(0, 147) + "..."
            : trimmed;
        }
      }
    } catch {
      continue;
    }
  }
  return "";
}

async function getLastActivity(dirPath: string): Promise<string | undefined> {
  try {
    const { stdout } = await execAsync("git log -1 --format=%cr", {
      cwd: dirPath,
      timeout: 3000,
    });
    return stdout.trim() || undefined;
  } catch {
    return undefined;
  }
}

function getScanDir(): string {
  if (process.env.ARACHNE_SCAN_DIR) return process.env.ARACHNE_SCAN_DIR;
  const projectDir = process.env.NEXT_PUBLIC_PROJECT_DIR;
  if (projectDir) return dirname(projectDir);
  return process.cwd();
}

async function scanProjects(): Promise<ProjectCard[]> {
  const scanDir = getScanDir();
  let entries: string[];
  try {
    entries = await readdir(scanDir);
  } catch {
    return [];
  }

  const projects: ProjectCard[] = [];

  for (const entry of entries) {
    if (IGNORE.has(entry) || entry.startsWith(".")) continue;

    const fullPath = join(scanDir, entry);
    try {
      const s = await stat(fullPath);
      if (!s.isDirectory()) continue;
    } catch {
      continue;
    }

    const detectedFiles = await detectSignals(fullPath);
    const hasOcSignal = detectedFiles.some((f) => OC_SIGNALS.includes(f));
    const hasWeakSignal = detectedFiles.some((f) => WEAK_SIGNALS.includes(f));
    if (!hasOcSignal && !hasWeakSignal) continue;

    const pkg = await readPackageJson(fullPath);
    const dirName = basename(fullPath);
    const name = (pkg?.name as string) || dirName;
    const description =
      (pkg?.description as string) || (await extractDescription(fullPath));
    const techStack = pkg ? extractTechStack(pkg) : [];
    const lastActivity = await getLastActivity(fullPath);

    projects.push({
      id: slugify(dirName),
      name,
      description,
      absolutePath: fullPath,
      techStack,
      detectedFiles,
      lastActivity,
    });
  }

  return projects.sort((a, b) => a.name.localeCompare(b.name));
}

export async function GET(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult instanceof Response) return authResult;

  try {
    const projects = await scanProjects();
    return jsonResponse(projects);
  } catch {
    return jsonResponse({ error: "Failed to scan projects" }, 500);
  }
}

export async function POST(request: NextRequest) {
  const authResult = requireAuth(request);
  if (authResult instanceof Response) return authResult;

  try {
    const { name } = await request.json();
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return jsonResponse({ error: "Project name is required" }, 400);
    }

    const scanDir = getScanDir();
    const slug = slugify(name.trim());
    if (!slug) {
      return jsonResponse({ error: "Invalid project name" }, 400);
    }

    const projectPath = join(scanDir, slug);
    if (await pathExists(projectPath)) {
      return jsonResponse({ error: "Project directory already exists" }, 409);
    }

    await mkdir(projectPath, { recursive: true });
    await writeFile(
      join(projectPath, "AGENTS.md"),
      `# ${name.trim()}\n\nProject instructions go here.\n`,
    );
    await writeFile(
      join(projectPath, "package.json"),
      JSON.stringify(
        {
          name: slug,
          version: "0.0.1",
          description: `${name.trim()} project`,
        },
        null,
        2,
      ) + "\n",
    );

    const project: ProjectCard = {
      id: slug,
      name: slug,
      description: `${name.trim()} project`,
      absolutePath: projectPath,
      techStack: [],
      detectedFiles: ["AGENTS.md", "package.json"],
    };

    return jsonResponse(project, 201);
  } catch {
    return jsonResponse({ error: "Failed to create project" }, 500);
  }
}
