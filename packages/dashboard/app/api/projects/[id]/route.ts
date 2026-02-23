import { NextRequest } from "next/server";
import { requireAuth, jsonResponse } from "@/app/lib/api-helpers";
import { readFile, readdir, stat } from "node:fs/promises";
import { join, basename, dirname } from "node:path";

function getScanDir(): string {
  if (process.env.ARACHNE_SCAN_DIR) return process.env.ARACHNE_SCAN_DIR;
  const projectDir = process.env.NEXT_PUBLIC_PROJECT_DIR;
  if (projectDir) return dirname(projectDir);
  return process.cwd();
}

async function findProjectPath(id: string): Promise<string | null> {
  const scanDir = getScanDir();
  let entries: string[];
  try {
    entries = await readdir(scanDir);
  } catch {
    return null;
  }

  for (const entry of entries) {
    const slug = entry
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    if (slug === id) {
      const fullPath = join(scanDir, entry);
      try {
        const s = await stat(fullPath);
        if (s.isDirectory()) return fullPath;
      } catch {
        continue;
      }
    }
  }
  return null;
}

async function safeReadFile(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = requireAuth(request);
  if (authResult instanceof Response) return authResult;

  try {
    const { id } = await params;
    const projectPath = await findProjectPath(id);

    if (!projectPath) {
      return jsonResponse({ error: "Project not found" }, 404);
    }

    const instructions = await safeReadFile(join(projectPath, "AGENTS.md"));
    const readme = await safeReadFile(join(projectPath, "README.md"));

    let knowledgeFiles: string[] = [];
    try {
      const entries = await readdir(projectPath);
      knowledgeFiles = entries.filter(
        (e) =>
          e.endsWith(".md") ||
          e.endsWith(".txt") ||
          e.endsWith(".pdf") ||
          e.endsWith(".json"),
      );
    } catch {
      knowledgeFiles = [];
    }

    return jsonResponse({
      id,
      name: basename(projectPath),
      absolutePath: projectPath,
      instructions: instructions || "",
      readme: readme || "",
      knowledgeFiles,
    });
  } catch {
    return jsonResponse({ error: "Failed to get project" }, 500);
  }
}
