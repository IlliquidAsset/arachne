import { describe, it, expect } from "bun:test";
import { runWorkflow } from "../runner.js";
import type { Workflow } from "../types.js";
import { resolve } from "path";

const fixtureDir = resolve(import.meta.dir, "fixtures");

const echoWorkflow: Workflow = {
  name: "echo-test",
  entrypoint: resolve(fixtureDir, "echo-test.ts"),
  description: "Simple echo test",
  triggers: [],
};

const errorWorkflow: Workflow = {
  name: "error-test",
  entrypoint: resolve(fixtureDir, "exit-error.ts"),
  description: "Exits with error code",
  triggers: [],
};

const hangWorkflow: Workflow = {
  name: "hang-test",
  entrypoint: resolve(fixtureDir, "hang.ts"),
  description: "Hangs forever",
  triggers: [],
};

const argsWorkflow: Workflow = {
  name: "args-test",
  entrypoint: resolve(fixtureDir, "echo-args.ts"),
  description: "Echoes args as JSON",
  triggers: [],
};

const missingWorkflow: Workflow = {
  name: "missing-test",
  entrypoint: "/nonexistent/path/to/script.ts",
  description: "Does not exist",
  triggers: [],
};

describe("runWorkflow", () => {
  it("executes a script and captures stdout", async () => {
    const result = await runWorkflow(echoWorkflow);
    expect(result.workflowName).toBe("echo-test");
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe("hello from test workflow");
    expect(result.stderr).toBe("");
  });

  it("captures non-zero exit code", async () => {
    const result = await runWorkflow(errorWorkflow);
    expect(result.exitCode).toBe(1);
    expect(result.stderr.trim()).toBe("workflow failed");
  });

  it("measures duration > 0", async () => {
    const result = await runWorkflow(echoWorkflow);
    expect(result.durationMs).toBeGreaterThan(0);
  });

  it("sets startedAt and completedAt", async () => {
    const before = new Date();
    const result = await runWorkflow(echoWorkflow);
    const after = new Date();

    expect(result.startedAt.getTime()).toBeGreaterThanOrEqual(
      before.getTime(),
    );
    expect(result.completedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    expect(result.completedAt.getTime()).toBeGreaterThanOrEqual(
      result.startedAt.getTime(),
    );
  });

  it("duration is less than timeout", async () => {
    const result = await runWorkflow(echoWorkflow);
    expect(result.durationMs).toBeLessThan(5 * 60 * 1000);
  });

  it("passes serialized args to the script", async () => {
    const result = await runWorkflow(argsWorkflow, { foo: "bar", count: 42 });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.stdout.trim());
    expect(parsed.args).toContain("--foo=bar");
    expect(parsed.args).toContain("--count=42");
  });

  it("handles timeout by killing the process", async () => {
    const result = await runWorkflow(hangWorkflow, undefined, {
      timeoutMs: 500,
    });
    expect(result.exitCode).not.toBe(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(400);
    expect(result.durationMs).toBeLessThan(5000);
  }, 10_000);

  it("handles missing entrypoint gracefully", async () => {
    const result = await runWorkflow(missingWorkflow);
    expect(result.exitCode).not.toBe(0);
  });
});
