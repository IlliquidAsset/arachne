import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { initDb, getDb, closeDb } from "../db.js";
import type { DatabaseDependencies } from "../db.js";

describe("db", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "amanda-db-test-"));
  });

  afterEach(() => {
    closeDb();
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe("initDb", () => {
    it("creates the database file at the specified path", () => {
      const dbPath = join(tempDir, "test.db");
      const deps: DatabaseDependencies = { dbPath };
      initDb(deps);
      const db = getDb();
      expect(db).toBeDefined();
      expect(existsSync(dbPath)).toBe(true);
    });

    it("uses WAL journal mode", () => {
      const dbPath = join(tempDir, "test.db");
      initDb({ dbPath });
      const db = getDb();
      const result = db.prepare("PRAGMA journal_mode").get() as { journal_mode: string };
      expect(result.journal_mode).toBe("wal");
    });

    it("creates missing directories for the db path", () => {
      const dbPath = join(tempDir, "nested", "deep", "test.db");
      initDb({ dbPath });
      const db = getDb();
      expect(db).toBeDefined();
      expect(existsSync(dbPath)).toBe(true);
    });

    it("is idempotent - calling initDb twice returns same instance", () => {
      const dbPath = join(tempDir, "test.db");
      initDb({ dbPath });
      const db1 = getDb();
      initDb({ dbPath });
      const db2 = getDb();
      expect(db1).toBe(db2);
    });

    it("runs migrations on init", () => {
      const dbPath = join(tempDir, "test.db");
      initDb({ dbPath });
      const db = getDb();

      const tables = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        )
        .all() as Array<{ name: string }>;

      const tableNames = tables.map((t) => t.name).sort();
      expect(tableNames).toContain("_migrations");
      expect(tableNames).toContain("budget_records");
      expect(tableNames).toContain("commander_context");
      expect(tableNames).toContain("commander_relationships");
      expect(tableNames).toContain("sessions");
      expect(tableNames).toContain("skill_history");
      expect(tableNames).toContain("workflow_registry");
    });

    it("supports in-memory database via :memory:", () => {
      initDb({ dbPath: ":memory:" });
      const db = getDb();
      expect(db).toBeDefined();
      db.prepare("SELECT 1").get();
    });

    it("records migration in _migrations table", () => {
      const dbPath = join(tempDir, "test.db");
      initDb({ dbPath });
      const db = getDb();

      const migrations = db
        .prepare("SELECT name FROM _migrations")
        .all() as Array<{ name: string }>;
      expect(migrations.length).toBeGreaterThan(0);
      expect(migrations[0].name).toBe("001_initial.sql");
    });

    it("is idempotent for migrations - running twice applies each migration once", () => {
      const dbPath = join(tempDir, "test.db");
      initDb({ dbPath });
      closeDb();
      initDb({ dbPath });
      const db = getDb();

      const migrations = db.prepare("SELECT name FROM _migrations").all() as Array<{ name: string }>;
      const names = migrations.map((m) => m.name);
      const uniqueNames = [...new Set(names)];
      expect(names.length).toBe(uniqueNames.length);
    });
  });

  describe("getDb", () => {
    it("throws if called before initDb", () => {
      expect(() => getDb()).toThrow();
    });
  });

  describe("closeDb", () => {
    it("closes the database connection", () => {
      const dbPath = join(tempDir, "test.db");
      initDb({ dbPath });
      getDb();
      closeDb();
      expect(() => getDb()).toThrow();
    });

    it("is safe to call when no db is open", () => {
      expect(() => closeDb()).not.toThrow();
    });
  });
});
