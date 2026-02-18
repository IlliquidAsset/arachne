const PRIORITY_RANK: Record<TaskPriority, number> = {
  critical: 3,
  normal: 2,
  background: 1,
};

const DEFAULT_MAX_CONCURRENT = 3;

export type TaskPriority = "critical" | "normal" | "background";
export type TaskTrack = "deterministic" | "llm";
export type TaskLifecycleStatus = "queued" | "running" | "completed" | "failed";
export type TaskStatus = TaskLifecycleStatus | "cancelled" | "not_found";

export interface QueuedTask {
  id: string;
  description: string;
  track: TaskTrack;
  priority: TaskPriority;
  status: TaskLifecycleStatus;
  agent?: string;
  project?: string;
  result?: unknown;
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
}

export interface TaskQueueOptions {
  maxConcurrent?: number;
}

function cloneTask(task: QueuedTask): QueuedTask {
  return {
    ...task,
    startedAt: task.startedAt ? new Date(task.startedAt) : undefined,
    completedAt: task.completedAt ? new Date(task.completedAt) : undefined,
  };
}

function getDurationMs(startedAt?: Date, completedAt?: Date): number | undefined {
  if (!startedAt || !completedAt) return undefined;
  return completedAt.getTime() - startedAt.getTime();
}

export class TaskQueue {
  private readonly maxConcurrent: number;
  private readonly tasks = new Map<string, QueuedTask>();
  private readonly queue: string[] = [];
  private readonly running = new Set<string>();
  private readonly cancelled = new Set<string>();

  constructor(options?: TaskQueueOptions) {
    this.maxConcurrent = options?.maxConcurrent ?? DEFAULT_MAX_CONCURRENT;
  }

  enqueue(task: QueuedTask): string {
    const id = crypto.randomUUID();
    const queuedTask: QueuedTask = {
      ...task,
      id,
      status: "queued",
      startedAt: undefined,
      completedAt: undefined,
      durationMs: undefined,
    };

    this.tasks.set(id, queuedTask);
    this.queue.push(id);
    return id;
  }

  dequeue(): QueuedTask | null {
    if (this.running.size >= this.maxConcurrent) {
      return null;
    }

    const nextId = this.pickNextTaskId();
    if (!nextId) return null;

    const task = this.tasks.get(nextId);
    if (!task || task.status !== "queued") {
      return null;
    }

    task.status = "running";
    task.startedAt = new Date();
    this.running.add(nextId);

    return cloneTask(task);
  }

  getStatus(taskId: string): TaskStatus {
    if (this.cancelled.has(taskId)) return "cancelled";
    const task = this.tasks.get(taskId);
    if (!task) return "not_found";
    return task.status;
  }

  cancel(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || this.cancelled.has(taskId)) {
      return false;
    }

    this.queueRemove(taskId);

    if (this.running.has(taskId)) {
      this.running.delete(taskId);
    }

    const completedAt = new Date();
    task.completedAt = completedAt;
    task.durationMs = getDurationMs(task.startedAt, completedAt);
    task.status = "failed";
    this.cancelled.add(taskId);

    return true;
  }

  markCompleted(taskId: string, result?: unknown): boolean {
    const task = this.tasks.get(taskId);
    if (!task || this.cancelled.has(taskId)) {
      return false;
    }

    const completedAt = new Date();
    task.status = "completed";
    task.result = result;
    task.completedAt = completedAt;
    task.durationMs = getDurationMs(task.startedAt, completedAt);
    this.running.delete(taskId);
    return true;
  }

  markFailed(taskId: string, result?: unknown): boolean {
    const task = this.tasks.get(taskId);
    if (!task || this.cancelled.has(taskId)) {
      return false;
    }

    const completedAt = new Date();
    task.status = "failed";
    task.result = result;
    task.completedAt = completedAt;
    task.durationMs = getDurationMs(task.startedAt, completedAt);
    this.running.delete(taskId);
    return true;
  }

  getTask(taskId: string): QueuedTask | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;
    return cloneTask(task);
  }

  getActiveCount(): number {
    return this.running.size;
  }

  private pickNextTaskId(): string | null {
    if (this.queue.length === 0) return null;

    let selectedId: string | null = null;
    let selectedIndex = -1;
    let selectedPriority = -1;

    for (let index = 0; index < this.queue.length; index += 1) {
      const taskId = this.queue[index];
      if (!taskId) continue;

      const task = this.tasks.get(taskId);
      if (!task || task.status !== "queued") continue;

      const rank = PRIORITY_RANK[task.priority];
      if (rank > selectedPriority) {
        selectedPriority = rank;
        selectedId = taskId;
        selectedIndex = index;
      }
    }

    if (!selectedId || selectedIndex < 0) return null;

    this.queue.splice(selectedIndex, 1);
    return selectedId;
  }

  private queueRemove(taskId: string): void {
    const index = this.queue.indexOf(taskId);
    if (index >= 0) {
      this.queue.splice(index, 1);
    }
  }
}
