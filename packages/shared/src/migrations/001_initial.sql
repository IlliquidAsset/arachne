-- 001_initial.sql: Create core Amanda tables

CREATE TABLE IF NOT EXISTS commander_context (
  id INTEGER PRIMARY KEY,
  role TEXT NOT NULL CHECK(role IN ('dad','work','husband','general')),
  detected_at TEXT NOT NULL DEFAULT (datetime('now')),
  confidence REAL NOT NULL,
  signals TEXT
);

CREATE TABLE IF NOT EXISTS commander_relationships (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  relationship TEXT NOT NULL,
  notes TEXT,
  last_mentioned TEXT,
  evolution_log TEXT
);

CREATE TABLE IF NOT EXISTS skill_history (
  id INTEGER PRIMARY KEY,
  skill_name TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('created','modified','deleted')),
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  diff_summary TEXT,
  success INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS budget_records (
  id INTEGER PRIMARY KEY,
  provider TEXT NOT NULL,
  model TEXT,
  date TEXT NOT NULL,
  tokens_input INTEGER NOT NULL DEFAULT 0,
  tokens_output INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd REAL NOT NULL DEFAULT 0,
  reconciled INTEGER NOT NULL DEFAULT 0,
  project TEXT
);

CREATE TABLE IF NOT EXISTS workflow_registry (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  entrypoint TEXT NOT NULL,
  description TEXT,
  triggers TEXT,
  schema_def TEXT,
  last_run TEXT,
  run_count INTEGER NOT NULL DEFAULT 0,
  avg_duration_ms REAL
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  project TEXT,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'active',
  token_count INTEGER NOT NULL DEFAULT 0
);
