import type { Workflow, WorkflowRunResult } from "./types.js";

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export interface RunOptions {
  timeoutMs?: number;
}

function serializeArgs(args: Record<string, unknown>): string[] {
  return Object.entries(args).map(
    ([key, value]) => `--${key}=${String(value)}`,
  );
}

export async function runWorkflow(
  workflow: Workflow,
  args?: Record<string, unknown>,
  options?: RunOptions,
): Promise<WorkflowRunResult> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const serializedArgs = args ? serializeArgs(args) : [];

  const startedAt = new Date();
  const t0 = performance.now();

  let proc: ReturnType<typeof Bun.spawn>;
  try {
    proc = Bun.spawn(["bun", "run", workflow.entrypoint, ...serializedArgs], {
      stdout: "pipe",
      stderr: "pipe",
    });
  } catch (err) {
    const completedAt = new Date();
    return {
      workflowName: workflow.name,
      exitCode: 1,
      stdout: "",
      stderr: err instanceof Error ? err.message : String(err),
      durationMs: performance.now() - t0,
      startedAt,
      completedAt,
    };
  }

  const timeoutPromise = new Promise<"timeout">((resolve) =>
    setTimeout(() => resolve("timeout"), timeoutMs),
  );

  const exitPromise = proc.exited.then(() => "done" as const);
  const raceResult = await Promise.race([exitPromise, timeoutPromise]);

  if (raceResult === "timeout") {
    proc.kill();
    await proc.exited.catch(() => {});
    const completedAt = new Date();
    return {
      workflowName: workflow.name,
      exitCode: 124,
      stdout: "",
      stderr: `Workflow timed out after ${timeoutMs}ms`,
      durationMs: performance.now() - t0,
      startedAt,
      completedAt,
    };
  }

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout as ReadableStream).text(),
    new Response(proc.stderr as ReadableStream).text(),
  ]);

  const completedAt = new Date();
  return {
    workflowName: workflow.name,
    exitCode: proc.exitCode ?? 1,
    stdout,
    stderr,
    durationMs: performance.now() - t0,
    startedAt,
    completedAt,
  };
}
