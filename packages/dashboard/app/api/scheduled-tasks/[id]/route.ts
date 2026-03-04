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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const db = getDb();
  if (!db) return jsonResponse({ error: "Database not initialized" }, 500);

  try {
    const row = db.prepare("SELECT * FROM scheduled_tasks WHERE id = ?").get(Number(id)) as TaskRow | undefined;
    if (!row) return jsonResponse({ error: "Task not found" }, 404);
    return jsonResponse({ task: formatRow(row) });
  } finally {
    db.close();
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const db = getDb();
  if (!db) return jsonResponse({ error: "Database not initialized" }, 500);

  try {
    const taskId = Number(id);
    const existing = db.prepare("SELECT * FROM scheduled_tasks WHERE id = ?").get(taskId) as TaskRow | undefined;
    if (!existing) return jsonResponse({ error: "Task not found" }, 404);

    const body = await request.json();
    const sets: string[] = [];
    const values: unknown[] = [];

    for (const [key, col] of [
      ["name", "name"],
      ["description", "description"],
      ["prompt", "prompt"],
      ["cronExpression", "cron_expression"],
      ["timezone", "timezone"],
    ] as const) {
      if (body[key] !== undefined) {
        sets.push(`${col} = ?`);
        values.push(body[key]);
      }
    }

    if (body.enabled !== undefined) {
      sets.push("enabled = ?");
      values.push(body.enabled ? 1 : 0);
    }
    if (body.project !== undefined) {
      sets.push("project = ?");
      values.push(body.project);
    }
    if (body.agent !== undefined) {
      sets.push("agent = ?");
      values.push(body.agent);
    }
    if (body.skills !== undefined) {
      sets.push("skills = ?");
      values.push(body.skills ? JSON.stringify(body.skills) : null);
    }

    if (sets.length === 0) {
      return jsonResponse({ task: formatRow(existing) });
    }

    sets.push("updated_at = datetime('now')");
    values.push(taskId);

    db.prepare(`UPDATE scheduled_tasks SET ${sets.join(", ")} WHERE id = ?`).run(...values);

    const updated = db.prepare("SELECT * FROM scheduled_tasks WHERE id = ?").get(taskId) as TaskRow;
    return jsonResponse({ task: formatRow(updated) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update task";
    return jsonResponse({ error: message }, 500);
  } finally {
    db.close();
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const db = getDb();
  if (!db) return jsonResponse({ error: "Database not initialized" }, 500);

  try {
    const result = db.prepare("DELETE FROM scheduled_tasks WHERE id = ?").run(Number(id));
    if (result.changes === 0) return jsonResponse({ error: "Task not found" }, 404);
    return jsonResponse({ deleted: true });
  } finally {
    db.close();
  }
}
