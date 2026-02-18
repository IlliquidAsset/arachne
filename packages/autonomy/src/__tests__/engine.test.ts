import { describe, expect, it } from "bun:test";
import { resolve } from "path";
import { classify } from "../classifier.js";
import { AutonomyEngine } from "../engine.js";
import { InMemoryPersistence } from "../persistence.js";
import * as roster from "../agent-roster.js";
import { WorkflowRegistry } from "../registry.js";
import { TaskQueue } from "../scheduler.js";
import type { Workflow } from "../types.js";

function makeRegistry(): WorkflowRegistry {
  const registry = new WorkflowRegistry({ persistence: new InMemoryPersistence() });
  const workflow: Workflow = {
    name: "daily-grok-local",
    entrypoint: resolve(import.meta.dir, "fixtures", "echo-test.ts"),
    description: "Run local deterministic workflow",
    triggers: ["daily grok", "run daily"],
  };
  registry.register(workflow);
  return registry;
}

describe("AutonomyEngine", () => {
  it("routes deterministic tasks through workflow execution", async () => {
    const scheduler = new TaskQueue({ maxConcurrent: 3 });
    const registry = makeRegistry();

    const engine = new AutonomyEngine({
      registry,
      scheduler,
      roster,
      classifier: classify,
      dispatchFn: async () => {
        throw new Error("dispatch should not be called for deterministic tasks");
      },
    });

    const result = await engine.process("run daily grok", {
      project: "northstar",
      priority: "normal",
    });

    expect(result.track).toBe("deterministic");
    expect(result.workflow?.name).toBe("daily-grok-local");
    expect(result.status).toBe("completed");
    expect(engine.getTaskStatus(result.taskId)).toBe("completed");
  });

  it("routes llm tasks to the selected agent with preamble", async () => {
    const dispatchCalls: Array<{
      project: string;
      message: string;
      opts?: { agent?: string };
    }> = [];

    const engine = new AutonomyEngine({
      registry: makeRegistry(),
      scheduler: new TaskQueue({ maxConcurrent: 3 }),
      roster,
      classifier: classify,
      dispatchFn: async (project, message, opts) => {
        dispatchCalls.push({ project, message, opts });
      },
    });

    const result = await engine.process("brainstorm ideas for onboarding", {
      project: "watserface",
      priority: "normal",
    });

    expect(result.track).toBe("llm");
    expect(result.agent?.name).toBe("muse");
    expect(result.status).toBe("completed");

    expect(dispatchCalls).toHaveLength(1);
    expect(dispatchCalls[0]?.project).toBe("watserface");
    expect(dispatchCalls[0]?.opts?.agent).toBe("muse");
    expect(dispatchCalls[0]?.message).toContain(
      "Amanda needs creative exploration. Diverge freely",
    );
  });

  it("keeps tasks queued when scheduler concurrency is saturated", async () => {
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const engine = new AutonomyEngine({
      registry: makeRegistry(),
      scheduler: new TaskQueue({ maxConcurrent: 3 }),
      roster,
      classifier: classify,
      dispatchFn: async () => {
        await gate;
      },
    });

    const runningOne = engine.process("debug auth bug", { project: "northstar" });
    const runningTwo = engine.process("debug state bug", { project: "northstar" });
    const runningThree = engine.process("debug render bug", { project: "northstar" });

    const queued = await engine.process("debug logging bug", {
      project: "northstar",
    });

    expect(queued.track).toBe("llm");
    expect(queued.status).toBe("queued");
    expect(engine.getActiveCount()).toBe(3);

    release?.();
    await Promise.all([runningOne, runningTwo, runningThree]);
    expect(engine.getActiveCount()).toBe(0);
  });
});
