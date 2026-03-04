import { CronScheduler, type ScheduledJob } from "./cron-scheduler.js";
import { ScheduledTaskStore, type ScheduledTask } from "./scheduled-tasks.js";
import { registerBuiltinScheduledTasks } from "./builtin-scheduled-tasks.js";

export interface ScheduledTaskDispatcher {
  (
    prompt: string,
    opts: { project?: string; agent?: string; skills?: string[] },
  ): Promise<void>;
}

export interface ScheduledTaskRunnerOptions {
  store: ScheduledTaskStore;
  dispatcher: ScheduledTaskDispatcher;
  tickIntervalMs?: number;
}

/**
 * Bridges the CronScheduler (in-memory polling) with the ScheduledTaskStore (SQLite persistence)
 * and the dispatch system. On start, loads all enabled tasks from DB into the scheduler.
 * When a cron job fires, it dispatches the task's prompt via the provided dispatcher function.
 */
export class ScheduledTaskRunner {
  private readonly scheduler: CronScheduler;
  private readonly store: ScheduledTaskStore;
  private readonly dispatcher: ScheduledTaskDispatcher;
  // Maps scheduler job IDs to DB task IDs
  private readonly jobToTask = new Map<string, number>();
  // Maps DB task IDs to scheduler job IDs
  private readonly taskToJob = new Map<number, string>();

  constructor(opts: ScheduledTaskRunnerOptions) {
    this.store = opts.store;
    this.dispatcher = opts.dispatcher;
    this.scheduler = new CronScheduler({
      tickIntervalMs: opts.tickIntervalMs,
    });
  }

  /**
   * Load all enabled tasks from DB into the scheduler and start polling.
   * Registers built-in tasks on first call (idempotent).
   */
  start(): void {
    registerBuiltinScheduledTasks(this.store);
    this.syncFromDb();

    this.scheduler.start(async (job: ScheduledJob) => {
      await this.handleTrigger(job);
    });
  }

  stop(): void {
    this.scheduler.stop();
  }

  /**
   * Reload tasks from DB (e.g., after a task is created/updated/deleted via the API).
   */
  reload(): void {
    // Clear existing scheduler jobs
    for (const jobId of this.jobToTask.keys()) {
      this.scheduler.unregister(jobId);
    }
    this.jobToTask.clear();
    this.taskToJob.clear();

    this.syncFromDb();
  }

  private syncFromDb(): void {
    const tasks = this.store.listEnabled();

    for (const task of tasks) {
      try {
        const jobId = this.scheduler.register({
          workflowName: task.name,
          cronExpression: task.cronExpression,
          timezone: task.timezone,
          enabled: true,
        });
        this.jobToTask.set(jobId, task.id);
        this.taskToJob.set(task.id, jobId);
      } catch (error) {
        console.error(
          `[scheduled-tasks] Failed to register task "${task.name}":`,
          error instanceof Error ? error.message : String(error),
        );
      }
    }
  }

  private async handleTrigger(job: ScheduledJob): Promise<void> {
    const taskId = this.jobToTask.get(job.id);
    if (taskId === undefined) return;

    const task = this.store.get(taskId);
    if (!task || !task.enabled) return;

    console.log(`[scheduled-tasks] Triggering "${task.name}" (id=${task.id})`);

    this.store.markRunning(task.id);

    try {
      await this.dispatcher(task.prompt, {
        project: task.project ?? undefined,
        agent: task.agent ?? undefined,
        skills: task.skills ?? undefined,
      });
      this.store.recordRun(task.id, "success");
      console.log(`[scheduled-tasks] "${task.name}" dispatched successfully`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.store.recordRun(task.id, "failed", message);
      console.error(`[scheduled-tasks] "${task.name}" failed: ${message}`);
    }
  }
}
