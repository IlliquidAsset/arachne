import { describe, it, expect, beforeEach } from "bun:test";
import { WorkflowRegistry } from "../registry.js";
import { InMemoryPersistence } from "../persistence.js";
import type { Workflow } from "../types.js";

const dailyGrok: Workflow = {
  name: "daily-grok",
  entrypoint: "/tmp/daily-workflow.ts",
  description:
    "Run the daily Grok workflow — fetch tweets, get AI suggestions, post to X",
  triggers: [
    "grok",
    "daily workflow",
    "tweet suggestions",
    "daily grok",
    "run daily",
    "morning workflow",
  ],
};

const deployWorkflow: Workflow = {
  name: "deploy-staging",
  entrypoint: "/tmp/deploy.ts",
  description: "Deploy to staging environment",
  triggers: ["deploy staging", "push to staging", "staging deploy"],
};

describe("WorkflowRegistry", () => {
  let registry: WorkflowRegistry;
  let persistence: InMemoryPersistence;

  beforeEach(() => {
    persistence = new InMemoryPersistence();
    registry = new WorkflowRegistry({ persistence });
  });

  // --- CRUD ---

  describe("register", () => {
    it("registers a new workflow", () => {
      registry.register(dailyGrok);
      expect(registry.get("daily-grok")).toEqual(dailyGrok);
    });

    it("overwrites an existing workflow with the same name", () => {
      registry.register(dailyGrok);
      const updated = { ...dailyGrok, description: "Updated description" };
      registry.register(updated);
      expect(registry.get("daily-grok")?.description).toBe(
        "Updated description",
      );
      expect(registry.list()).toHaveLength(1);
    });

    it("persists the workflow", () => {
      registry.register(dailyGrok);
      expect(persistence.load()).toHaveLength(1);
    });
  });

  describe("unregister", () => {
    it("removes a registered workflow", () => {
      registry.register(dailyGrok);
      registry.unregister("daily-grok");
      expect(registry.get("daily-grok")).toBeNull();
    });

    it("is a no-op for unknown workflow names", () => {
      expect(() => registry.unregister("nonexistent")).not.toThrow();
    });

    it("removes from persistence", () => {
      registry.register(dailyGrok);
      registry.unregister("daily-grok");
      expect(persistence.load()).toHaveLength(0);
    });
  });

  describe("get", () => {
    it("returns workflow by name", () => {
      registry.register(dailyGrok);
      expect(registry.get("daily-grok")).toEqual(dailyGrok);
    });

    it("returns null for unknown name", () => {
      expect(registry.get("nonexistent")).toBeNull();
    });
  });

  describe("list", () => {
    it("returns empty array when no workflows registered", () => {
      expect(registry.list()).toEqual([]);
    });

    it("returns all registered workflows", () => {
      registry.register(dailyGrok);
      registry.register(deployWorkflow);
      expect(registry.list()).toHaveLength(2);
    });
  });

  // --- Pattern Matching ---

  describe("findMatchingWorkflow", () => {
    beforeEach(() => {
      registry.register(dailyGrok);
      registry.register(deployWorkflow);
    });

    it("exact name match → confidence 1.0", () => {
      const result = registry.findMatchingWorkflow("daily-grok");
      expect(result).not.toBeNull();
      expect(result!.workflow.name).toBe("daily-grok");
      expect(result!.confidence).toBe(1.0);
    });

    it("trigger pattern match → confidence 0.9", () => {
      const result = registry.findMatchingWorkflow("run the daily grok");
      expect(result).not.toBeNull();
      expect(result!.workflow.name).toBe("daily-grok");
      expect(result!.confidence).toBe(0.9);
    });

    it("trigger regex match → confidence 0.9", () => {
      const result = registry.findMatchingWorkflow(
        "please deploy staging now",
      );
      expect(result).not.toBeNull();
      expect(result!.workflow.name).toBe("deploy-staging");
      expect(result!.confidence).toBe(0.9);
    });

    it("fuzzy keyword match → confidence 0.5-0.8", () => {
      const result = registry.findMatchingWorkflow("grok suggestions");
      expect(result).not.toBeNull();
      expect(result!.workflow.name).toBe("daily-grok");
      expect(result!.confidence).toBeGreaterThanOrEqual(0.5);
      expect(result!.confidence).toBeLessThanOrEqual(0.8);
    });

    it("no match for unrelated description → null", () => {
      const result = registry.findMatchingWorkflow(
        "something completely novel",
      );
      expect(result).toBeNull();
    });

    it("no match for quantum physics → null", () => {
      const result = registry.findMatchingWorkflow(
        "tell me about quantum physics",
      );
      expect(result).toBeNull();
    });

    it("returns the highest confidence match among multiple", () => {
      const result = registry.findMatchingWorkflow("deploy-staging");
      expect(result).not.toBeNull();
      expect(result!.workflow.name).toBe("deploy-staging");
      expect(result!.confidence).toBe(1.0);
    });

    it("handles empty task description gracefully", () => {
      const result = registry.findMatchingWorkflow("");
      expect(result).toBeNull();
    });
  });

  // --- Run history ---

  describe("run history via persistence", () => {
    it("records and retrieves run history", () => {
      registry.register(dailyGrok);
      persistence.recordRun("daily-grok", 1234);
      persistence.recordRun("daily-grok", 5678);
      const history = persistence.getRunHistory("daily-grok");
      expect(history).toHaveLength(2);
      expect(history[0].durationMs).toBe(1234);
      expect(history[1].durationMs).toBe(5678);
    });

    it("returns empty array for unknown workflow", () => {
      expect(persistence.getRunHistory("nonexistent")).toEqual([]);
    });
  });

  // --- Hydration from persistence ---

  describe("hydration", () => {
    it("loads workflows from persistence on construction", () => {
      persistence.save(dailyGrok);
      persistence.save(deployWorkflow);

      const fresh = new WorkflowRegistry({ persistence });
      expect(fresh.list()).toHaveLength(2);
      expect(fresh.get("daily-grok")).toEqual(dailyGrok);
    });
  });
});
