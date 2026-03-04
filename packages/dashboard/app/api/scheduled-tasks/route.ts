import { NextRequest } from "next/server";
import { jsonResponse, requireAuth } from "@/app/lib/api-helpers";
import Database from "better-sqlite3";
import { join } from "node:path";
import { homedir } from "node:os";
import { existsSync } from "node:fs";

const DB_PATH = join(homedir(), ".config", "arachne", "arachne.db");

interface TaskRow {
  id: number;
  name: string;
  description: string | null;
  prompt: string;
  cron_expression: string;
  timezone: string;
  enabled: number;
  project: string | null;
  agent: string | null;
  skills: string | null;
  last_run: string | null;
  last_status: string | null;
  last_error: string | null;
  run_count: number;
  created_at: string;
  updated_at: string;
}

function formatRow(row: TaskRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    prompt: row.prompt,
    cronExpression: row.cron_expression,
    timezone: row.timezone,
    enabled: row.enabled === 1,
    project: row.project,
    agent: row.agent,
    skills: row.skills ? JSON.parse(row.skills) : null,
    lastRun: row.last_run,
    lastStatus: row.last_status,
    lastError: row.last_error,
    runCount: row.run_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getDb(): Database.Database | null {
  if (!existsSync(DB_PATH)) return null;
  return new Database(DB_PATH, { readonly: false });
}

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof Response) return auth;

  const db = getDb();
  if (!db) return jsonResponse({ tasks: [] });

  try {
    const rows = db.prepare("SELECT * FROM scheduled_tasks ORDER BY created_at ASC").all() as TaskRow[];
    return jsonResponse({ tasks: rows.map(formatRow) });
  } finally {
    db.close();
  }
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof Response) return auth;

  const db = getDb();
  if (!db) return jsonResponse({ error: "Database not initialized" }, 500);

  try {
    const body = await request.json();
    const { name, description, prompt, cronExpression, timezone, enabled, project, agent, skills } = body;

    if (!name || !prompt || !cronExpression) {
      return jsonResponse({ error: "name, prompt, and cronExpression are required" }, 400);
    }

    const result = db.prepare(`
      INSERT INTO scheduled_tasks (name, description, prompt, cron_expression, timezone, enabled, project, agent, skills)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name,
      description ?? null,
      prompt,
      cronExpression,
      timezone ?? "America/New_York",
      enabled !== false ? 1 : 0,
      project ?? null,
      agent ?? null,
      skills ? JSON.stringify(skills) : null,
    );

    const row = db.prepare("SELECT * FROM scheduled_tasks WHERE id = ?").get(Number(result.lastInsertRowid)) as TaskRow;
    return jsonResponse({ task: formatRow(row) }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create task";
    if (message.includes("UNIQUE constraint")) {
      return jsonResponse({ error: "A task with that name already exists" }, 409);
    }
    return jsonResponse({ error: message }, 500);
  } finally {
    db.close();
  }
}
