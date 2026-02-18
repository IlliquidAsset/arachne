import { Database } from "bun:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function runMigrations(db: Database, migrationsDir: string): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  let files: string[];
  try {
    files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();
  } catch {
    return;
  }

  if (files.length === 0) return;

  const applied = new Set(
    (db.prepare("SELECT name FROM _migrations").all() as Array<{ name: string }>).map(
      (r) => r.name
    )
  );

  const insertMigration = db.prepare("INSERT INTO _migrations (name) VALUES (?)");

  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = readFileSync(join(migrationsDir, file), "utf-8");

    const applyMigration = db.transaction(() => {
      db.exec(sql);
      insertMigration.run(file);
    });

    applyMigration();
  }
}
