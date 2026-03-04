import { Database } from "bun:sqlite";

export interface ScheduledTask {
  id: number;
  name: string;
  description: string | null;
  prompt: string;
  cronExpression: string;
  timezone: string;
  enabled: boolean;
  project: string | null;
  agent: string | null;
  skills: string[] | null;
  lastRun: string | null;
  lastStatus: "success" | "failed" | "running" | "skipped" | null;
  lastError: string | null;
  runCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduledTask {
  name: string;
  description?: string;
  prompt: string;
  cronExpression: string;
  timezone?: string;
  enabled?: boolean;
  project?: string;
  agent?: string;
  skills?: string[];
}

export interface UpdateScheduledTask {
  name?: string;
  description?: string | null;
  prompt?: string;
  cronExpression?: string;
  timezone?: string;
  enabled?: boolean;
  project?: string | null;
  agent?: string | null;
  skills?: string[] | null;
}

interface ScheduledTaskRow {
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

function rowToTask(row: ScheduledTaskRow): ScheduledTask {
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
    lastStatus: row.last_status as ScheduledTask["lastStatus"],
    lastError: row.last_error,
    runCount: row.run_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ScheduledTaskStore {
  constructor(private readonly db: Database) {}

  list(): ScheduledTask[] {
    const rows = this.db
      .prepare("SELECT * FROM scheduled_tasks ORDER BY created_at ASC")
      .all() as ScheduledTaskRow[];
    return rows.map(rowToTask);
  }

  listEnabled(): ScheduledTask[] {
    const rows = this.db
      .prepare("SELECT * FROM scheduled_tasks WHERE enabled = 1 ORDER BY created_at ASC")
      .all() as ScheduledTaskRow[];
    return rows.map(rowToTask);
  }

  get(id: number): ScheduledTask | null {
    const row = this.db
      .prepare("SELECT * FROM scheduled_tasks WHERE id = ?")
      .get(id) as ScheduledTaskRow | null;
    return row ? rowToTask(row) : null;
  }

  getByName(name: string): ScheduledTask | null {
    const row = this.db
      .prepare("SELECT * FROM scheduled_tasks WHERE name = ?")
      .get(name) as ScheduledTaskRow | null;
    return row ? rowToTask(row) : null;
  }

  create(input: CreateScheduledTask): ScheduledTask {
    const stmt = this.db.prepare(`
      INSERT INTO scheduled_tasks (name, description, prompt, cron_expression, timezone, enabled, project, agent, skills)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      input.name,
      input.description ?? null,
      input.prompt,
      input.cronExpression,
      input.timezone ?? "America/New_York",
      input.enabled !== false ? 1 : 0,
      input.project ?? null,
      input.agent ?? null,
      input.skills ? JSON.stringify(input.skills) : null,
    );

    return this.get(Number(result.lastInsertRowid))!;
  }

  update(id: number, input: UpdateScheduledTask): ScheduledTask | null {
    const existing = this.get(id);
    if (!existing) return null;

    const sets: string[] = [];
    const values: (string | number | null)[] = [];

    if (input.name !== undefined) {
      sets.push("name = ?");
      values.push(input.name);
    }
    if (input.description !== undefined) {
      sets.push("description = ?");
      values.push(input.description);
    }
    if (input.prompt !== undefined) {
      sets.push("prompt = ?");
      values.push(input.prompt);
    }
    if (input.cronExpression !== undefined) {
      sets.push("cron_expression = ?");
      values.push(input.cronExpression);
    }
    if (input.timezone !== undefined) {
      sets.push("timezone = ?");
      values.push(input.timezone);
    }
    if (input.enabled !== undefined) {
      sets.push("enabled = ?");
      values.push(input.enabled ? 1 : 0);
    }
    if (input.project !== undefined) {
      sets.push("project = ?");
      values.push(input.project);
    }
    if (input.agent !== undefined) {
      sets.push("agent = ?");
      values.push(input.agent);
    }
    if (input.skills !== undefined) {
      sets.push("skills = ?");
      values.push(input.skills ? JSON.stringify(input.skills) : null);
    }

    if (sets.length === 0) return existing;

    sets.push("updated_at = datetime('now')");
    values.push(id);

    this.db.prepare(`UPDATE scheduled_tasks SET ${sets.join(", ")} WHERE id = ?`).run(...values);
    return this.get(id);
  }

  delete(id: number): boolean {
    const result = this.db.prepare("DELETE FROM scheduled_tasks WHERE id = ?").run(id);
    return result.changes > 0;
  }

  recordRun(id: number, status: "success" | "failed" | "skipped", error?: string): void {
    this.db
      .prepare(
        `UPDATE scheduled_tasks
         SET last_run = datetime('now'),
             last_status = ?,
             last_error = ?,
             run_count = run_count + 1,
             updated_at = datetime('now')
         WHERE id = ?`,
      )
      .run(status, error ?? null, id);
  }

  markRunning(id: number): void {
    this.db
      .prepare(
        `UPDATE scheduled_tasks
         SET last_status = 'running',
             updated_at = datetime('now')
         WHERE id = ?`,
      )
      .run(id);
  }
}
