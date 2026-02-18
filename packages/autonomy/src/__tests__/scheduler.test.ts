import { describe, expect, it } from "bun:test";
import { TaskQueue } from "../scheduler.js";

describe("TaskQueue", () => {
  it("enqueues and dequeues tasks", () => {
    const queue = new TaskQueue({ maxConcurrent: 3 });
    const taskId = queue.enqueue({
      id: "",
      description: "implement feature",
      track: "llm",
      priority: "normal",
      status: "queued",
    });

    expect(queue.getStatus(taskId)).toBe("queued");

    const task = queue.dequeue();
    expect(task?.id).toBe(taskId);
    expect(queue.getStatus(taskId)).toBe("running");
  });

  it("dequeues by priority critical > normal > background", () => {
    const queue = new TaskQueue({ maxConcurrent: 3 });

    const backgroundId = queue.enqueue({
      id: "",
      description: "background cleanup",
      track: "llm",
      priority: "background",
      status: "queued",
    });
    const criticalId = queue.enqueue({
      id: "",
      description: "prod incident",
      track: "llm",
      priority: "critical",
      status: "queued",
    });
    const normalId = queue.enqueue({
      id: "",
      description: "regular task",
      track: "llm",
      priority: "normal",
      status: "queued",
    });

    expect(queue.dequeue()?.id).toBe(criticalId);
    expect(queue.dequeue()?.id).toBe(normalId);
    expect(queue.dequeue()?.id).toBe(backgroundId);
  });

  it("respects max concurrency of running tasks", () => {
    const queue = new TaskQueue({ maxConcurrent: 3 });

    queue.enqueue({
      id: "",
      description: "t1",
      track: "llm",
      priority: "normal",
      status: "queued",
    });
    queue.enqueue({
      id: "",
      description: "t2",
      track: "llm",
      priority: "normal",
      status: "queued",
    });
    queue.enqueue({
      id: "",
      description: "t3",
      track: "llm",
      priority: "normal",
      status: "queued",
    });
    const fourthId = queue.enqueue({
      id: "",
      description: "t4",
      track: "llm",
      priority: "normal",
      status: "queued",
    });

    expect(queue.dequeue()).not.toBeNull();
    expect(queue.dequeue()).not.toBeNull();
    expect(queue.dequeue()).not.toBeNull();
    expect(queue.dequeue()).toBeNull();
    expect(queue.getStatus(fourthId)).toBe("queued");
  });

  it("tracks cancellation", () => {
    const queue = new TaskQueue({ maxConcurrent: 3 });
    const taskId = queue.enqueue({
      id: "",
      description: "cancel me",
      track: "llm",
      priority: "normal",
      status: "queued",
    });

    expect(queue.cancel(taskId)).toBe(true);
    expect(queue.getStatus(taskId)).toBe("cancelled");
    expect(queue.cancel("missing-id")).toBe(false);
  });
});
