-- 002_scheduled_tasks.sql: Scheduled recurring tasks

CREATE TABLE IF NOT EXISTS scheduled_tasks (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  prompt TEXT NOT NULL,
  cron_expression TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  enabled INTEGER NOT NULL DEFAULT 1,
  project TEXT,
  agent TEXT,
  skills TEXT,
  last_run TEXT,
  last_status TEXT CHECK(last_status IN ('success','failed','running','skipped')),
  last_error TEXT,
  run_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
