import { getDb } from "./db.js";

export interface RoleRecord {
  role: string;
  confidence: number;
  detected_at: string;
}

export function getRole(): RoleRecord | null {
  const db = getDb();
  const row = db
    .prepare("SELECT role, confidence, detected_at FROM commander_context ORDER BY id DESC LIMIT 1")
    .get() as RoleRecord | undefined;
  return row ?? null;
}

export function recordRole(
  role: string,
  confidence: number,
  signals?: Record<string, unknown>
): void {
  const db = getDb();
  db.prepare(
    "INSERT INTO commander_context (role, confidence, signals) VALUES (?, ?, ?)"
  ).run(role, confidence, signals ? JSON.stringify(signals) : null);
}

export function recordSkillAction(
  skillName: string,
  action: string,
  diffSummary?: string | null,
  success: boolean = true
): void {
  const db = getDb();
  db.prepare(
    "INSERT INTO skill_history (skill_name, action, diff_summary, success) VALUES (?, ?, ?, ?)"
  ).run(skillName, action, diffSummary ?? null, success ? 1 : 0);
}

export function recordBudget(
  provider: string,
  model: string,
  date: string,
  tokensInput: number,
  tokensOutput: number,
  estimatedCostUsd: number,
  project?: string
): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO budget_records (provider, model, date, tokens_input, tokens_output, estimated_cost_usd, project)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(provider, model, date, tokensInput, tokensOutput, estimatedCostUsd, project ?? null);
}

export interface WorkflowRecord {
  id: number;
  name: string;
  entrypoint: string;
  description: string | null;
  triggers: string | null;
  schema_def: string | null;
  last_run: string | null;
  run_count: number;
  avg_duration_ms: number | null;
}

export function registerWorkflow(
  name: string,
  entrypoint: string,
  description?: string | null,
  triggers?: string[]
): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO workflow_registry (name, entrypoint, description, triggers)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(name) DO UPDATE SET
       entrypoint = excluded.entrypoint,
       description = excluded.description,
       triggers = excluded.triggers`
  ).run(name, entrypoint, description ?? null, triggers ? JSON.stringify(triggers) : null);
}

export function updateWorkflowRun(name: string, durationMs: number): void {
  const db = getDb();

  const existing = db.prepare("SELECT id FROM workflow_registry WHERE name = ?").get(name);
  if (!existing) {
    throw new Error(`Workflow '${name}' not found`);
  }

  db.prepare(
    `UPDATE workflow_registry SET
       last_run = datetime('now'),
       run_count = run_count + 1,
       avg_duration_ms = CASE
         WHEN avg_duration_ms IS NULL THEN ?
         ELSE (avg_duration_ms * run_count + ?) / (run_count + 1)
       END
     WHERE name = ?`
  ).run(durationMs, durationMs, name);
}

export function getWorkflow(name: string): WorkflowRecord | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM workflow_registry WHERE name = ?")
    .get(name) as WorkflowRecord | undefined;
  return row ?? null;
}

export function listWorkflows(): WorkflowRecord[] {
  const db = getDb();
  return db.prepare("SELECT * FROM workflow_registry ORDER BY name").all() as WorkflowRecord[];
}
