import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { runMigrations } from "./migrations/index.js";

export interface DatabaseDependencies {
  dbPath?: string;
  migrationsDir?: string;
}

const DEFAULT_DB_PATH = join(homedir(), ".config", "arachne", "arachne.db");

let _db: Database | null = null;

export function initDb(deps: DatabaseDependencies = {}): Database {
  if (_db !== null) {
    return _db;
  }

  const dbPath = deps.dbPath ?? DEFAULT_DB_PATH;

  if (dbPath !== ":memory:") {
    mkdirSync(dirname(dbPath), { recursive: true });
  }

  _db = new Database(dbPath);
  _db.exec("PRAGMA journal_mode = WAL");
  _db.exec("PRAGMA foreign_keys = ON");

  const migrationsDir = deps.migrationsDir ?? join(import.meta.dir, "migrations");
  runMigrations(_db, migrationsDir);

  return _db;
}

export function getDb(): Database {
  if (_db === null) {
    throw new Error("Database not initialized. Call initDb() first.");
  }
  return _db;
}

export function closeDb(): void {
  if (_db !== null) {
    _db.close();
    _db = null;
  }
}
