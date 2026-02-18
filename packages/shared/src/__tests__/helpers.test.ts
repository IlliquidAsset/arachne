import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { initDb, getDb, closeDb } from "../db.js";
import {
  getRole,
  recordRole,
  recordSkillAction,
  recordBudget,
  registerWorkflow,
  updateWorkflowRun,
  getWorkflow,
  listWorkflows,
} from "../helpers.js";

describe("helpers", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "amanda-helpers-test-"));
    initDb({ dbPath: join(tempDir, "test.db") });
  });

  afterEach(() => {
    closeDb();
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe("commander context", () => {
    it("getRole returns null when no records exist", () => {
      const result = getRole();
      expect(result).toBeNull();
    });

    it("recordRole inserts and getRole retrieves latest", () => {
      recordRole("dad", 0.95, { timeOfDay: "evening", location: "home" });
      recordRole("work", 0.87, { calendar: "meeting" });

      const latest = getRole();
      expect(latest).not.toBeNull();
      expect(latest!.role).toBe("work");
      expect(latest!.confidence).toBe(0.87);
      expect(latest!.detected_at).toBeDefined();
    });

    it("recordRole stores signals as JSON", () => {
      const signals = { timeOfDay: "morning", device: "laptop" };
      recordRole("general", 0.5, signals);

      const db = getDb();
      const row = db
        .prepare("SELECT signals FROM commander_context ORDER BY id DESC LIMIT 1")
        .get() as { signals: string };
      expect(JSON.parse(row.signals)).toEqual(signals);
    });

    it("recordRole works without signals", () => {
      recordRole("husband", 0.9);
      const latest = getRole();
      expect(latest!.role).toBe("husband");
    });
  });

  describe("skill history", () => {
    it("recordSkillAction inserts a record", () => {
      recordSkillAction("greeting-skill", "created", "Initial creation", true);

      const db = getDb();
      const row = db.prepare("SELECT * FROM skill_history").get() as Record<string, unknown>;
      expect(row.skill_name).toBe("greeting-skill");
      expect(row.action).toBe("created");
      expect(row.diff_summary).toBe("Initial creation");
      expect(row.success).toBe(1);
    });

    it("recordSkillAction stores failure", () => {
      recordSkillAction("broken-skill", "modified", "Syntax error", false);

      const db = getDb();
      const row = db.prepare("SELECT * FROM skill_history").get() as Record<string, unknown>;
      expect(row.success).toBe(0);
    });

    it("recordSkillAction works with null diff_summary", () => {
      recordSkillAction("deleted-skill", "deleted");
      const db = getDb();
      const row = db.prepare("SELECT * FROM skill_history").get() as Record<string, unknown>;
      expect(row.diff_summary).toBeNull();
      expect(row.success).toBe(1);
    });
  });

  describe("budget records", () => {
    it("recordBudget inserts a complete record", () => {
      recordBudget("anthropic", "claude-4-opus", "2026-02-18", 1000, 500, 0.05, "amanda");

      const db = getDb();
      const row = db.prepare("SELECT * FROM budget_records").get() as Record<string, unknown>;
      expect(row.provider).toBe("anthropic");
      expect(row.model).toBe("claude-4-opus");
      expect(row.date).toBe("2026-02-18");
      expect(row.tokens_input).toBe(1000);
      expect(row.tokens_output).toBe(500);
      expect(row.estimated_cost_usd).toBe(0.05);
      expect(row.project).toBe("amanda");
    });

    it("recordBudget works without optional project", () => {
      recordBudget("xai", "grok-3", "2026-02-18", 2000, 1000, 0.03);

      const db = getDb();
      const row = db.prepare("SELECT * FROM budget_records").get() as Record<string, unknown>;
      expect(row.project).toBeNull();
    });
  });

  describe("workflow registry", () => {
    it("registerWorkflow inserts a new workflow", () => {
      registerWorkflow("daily-standup", "/skills/daily-standup.ts", "Morning standup", [
        "cron:0 9 * * *",
      ]);

      const wf = getWorkflow("daily-standup");
      expect(wf).not.toBeNull();
      expect(wf!.name).toBe("daily-standup");
      expect(wf!.entrypoint).toBe("/skills/daily-standup.ts");
      expect(wf!.description).toBe("Morning standup");
      expect(JSON.parse(wf!.triggers as string)).toEqual(["cron:0 9 * * *"]);
      expect(wf!.run_count).toBe(0);
    });

    it("registerWorkflow upserts on conflict", () => {
      registerWorkflow("wf1", "/old.ts", "Old desc", ["manual"]);
      registerWorkflow("wf1", "/new.ts", "New desc", ["cron:daily"]);

      const wf = getWorkflow("wf1");
      expect(wf!.entrypoint).toBe("/new.ts");
      expect(wf!.description).toBe("New desc");
    });

    it("getWorkflow returns null for non-existent", () => {
      const wf = getWorkflow("does-not-exist");
      expect(wf).toBeNull();
    });

    it("listWorkflows returns all workflows", () => {
      registerWorkflow("wf1", "/a.ts", "A", []);
      registerWorkflow("wf2", "/b.ts", "B", ["manual"]);

      const all = listWorkflows();
      expect(all).toHaveLength(2);
      expect(all.map((w) => w.name).sort()).toEqual(["wf1", "wf2"]);
    });

    it("listWorkflows returns empty array when none exist", () => {
      const all = listWorkflows();
      expect(all).toEqual([]);
    });

    it("updateWorkflowRun updates run stats", () => {
      registerWorkflow("wf1", "/a.ts", "A", []);

      updateWorkflowRun("wf1", 150);
      let wf = getWorkflow("wf1");
      expect(wf!.run_count).toBe(1);
      expect(wf!.avg_duration_ms).toBe(150);
      expect(wf!.last_run).toBeDefined();

      updateWorkflowRun("wf1", 250);
      wf = getWorkflow("wf1");
      expect(wf!.run_count).toBe(2);
      expect(wf!.avg_duration_ms).toBe(200); // (150+250)/2
    });

    it("updateWorkflowRun throws for non-existent workflow", () => {
      expect(() => updateWorkflowRun("nope", 100)).toThrow();
    });
  });
});
