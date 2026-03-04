import { NextRequest } from "next/server";
import { jsonResponse, requireAuth } from "@/app/lib/api-helpers";
import { getAuthenticatedClient } from "@/app/lib/opencode-client";
import Database from "better-sqlite3";
import { join } from "node:path";
import { homedir } from "node:os";
import { existsSync } from "node:fs";

const DB_PATH = join(homedir(), ".config", "arachne", "arachne.db");

interface TaskRow {
  id: number;
  name: string;
  prompt: string;
  agent: string | null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAuth(request);
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const dbPath = DB_PATH;
  if (!existsSync(dbPath)) {
    return jsonResponse({ error: "Database not initialized" }, 500);
  }

  const db = new Database(dbPath, { readonly: true });
  let task: TaskRow | undefined;
  try {
    task = db.prepare("SELECT id, name, prompt, agent FROM scheduled_tasks WHERE id = ?").get(Number(id)) as TaskRow | undefined;
  } finally {
    db.close();
  }

  if (!task) {
    return jsonResponse({ error: "Task not found" }, 404);
  }

  try {
    const client = getAuthenticatedClient(auth);

    // Create a new session for the test run
    const sessionResult = await client.session.create({
      body: {},
    });

    if (sessionResult.error || !sessionResult.data) {
      return jsonResponse({ error: "Failed to create test session" }, 500);
    }

    const sessionId = sessionResult.data.id;

    // Dispatch the task prompt
    const promptResult = await client.session.promptAsync({
      path: { id: sessionId },
      body: {
        parts: [{ type: "text" as const, text: `[Scheduled Task Test: ${task.name}]\n\n${task.prompt}` }],
        ...(task.agent ? { agent: task.agent } : {}),
      },
    });

    if (promptResult.error) {
      return jsonResponse({ error: "Failed to dispatch test prompt" }, 500);
    }

    // Record the test run in the DB
    const writeDb = new Database(DB_PATH, { readonly: false });
    try {
      writeDb.prepare(
        "UPDATE scheduled_tasks SET last_run = datetime('now'), last_status = 'running', run_count = run_count + 1, updated_at = datetime('now') WHERE id = ?",
      ).run(task.id);
    } finally {
      writeDb.close();
    }

    return jsonResponse({
      message: `Test dispatched for "${task.name}" in session ${sessionId}.`,
      sessionId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to dispatch test";
    return jsonResponse({ error: message }, 500);
  }
}
