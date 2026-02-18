import {
  classify,
  type ClassificationResult,
  type ClassifierDependencies,
} from "./classifier.js";
import type { AgentEntry, AgentRoster } from "./agent-roster.js";
import { generatePreamble } from "./preamble.js";
import { WorkflowRegistry } from "./registry.js";
import {
  TaskQueue,
  type QueuedTask,
  type TaskPriority,
  type TaskStatus,
} from "./scheduler.js";
import { runWorkflow } from "./runner.js";
import type { Workflow } from "./types.js";

export interface EngineDependencies {
  registry: WorkflowRegistry;
  scheduler: TaskQueue;
  roster: AgentRoster;
  classifier: typeof classify;
  dispatchFn?: (
    project: string,
    message: string,
    opts?: { agent?: string },
  ) => Promise<unknown>;
}

export interface EngineProcessOptions {
  project?: string;
  priority?: string;
}

export interface EngineResult {
  taskId: string;
  track: "deterministic" | "llm";
  agent?: AgentEntry;
  workflow?: Workflow;
  status: TaskStatus;
}

const DEFAULT_PROJECT = "default";

function normalizePriority(priority?: string): TaskPriority {
  if (priority === "critical") return "critical";
  if (priority === "background") return "background";
  return "normal";
}

function buildQueuedTask(
  description: string,
  classification: ClassificationResult,
  priority: TaskPriority,
): QueuedTask {
  return {
    id: "",
    description,
    track: classification.track,
    priority,
    status: "queued",
    agent: classification.agent?.name,
    project: classification.project,
  };
}

function toClassifierDeps(
  deps: EngineDependencies,
  project?: string,
): Partial<ClassifierDependencies> {
  return {
    registry: deps.registry,
    roster: deps.roster,
    project,
  };
}

function defaultDispatchFn(): Promise<never> {
  return Promise.reject(new Error("No dispatch function configured"));
}

export class AutonomyEngine {
  private readonly registry: WorkflowRegistry;
  private readonly scheduler: TaskQueue;
  private readonly roster: AgentRoster;
  private readonly classifier: typeof classify;
  private readonly dispatchFn: NonNullable<EngineDependencies["dispatchFn"]>;

  constructor(deps: EngineDependencies) {
    this.registry = deps.registry;
    this.scheduler = deps.scheduler;
    this.roster = deps.roster;
    this.classifier = deps.classifier;
    this.dispatchFn = deps.dispatchFn ?? defaultDispatchFn;
  }

  async process(
    taskDescription: string,
    opts?: EngineProcessOptions,
  ): Promise<EngineResult> {
    const classification = this.classifier(
      taskDescription,
      toClassifierDeps(
        {
          registry: this.registry,
          scheduler: this.scheduler,
          roster: this.roster,
          classifier: this.classifier,
          dispatchFn: this.dispatchFn,
        },
        opts?.project,
      ),
    );

    const priority = normalizePriority(opts?.priority);
    const taskId = this.scheduler.enqueue(
      buildQueuedTask(taskDescription, classification, priority),
    );

    const dequeuedTask = this.scheduler.dequeue();
    if (!dequeuedTask || dequeuedTask.id !== taskId) {
      return {
        taskId,
        track: classification.track,
        agent: classification.agent,
        workflow: classification.workflow,
        status: this.scheduler.getStatus(taskId),
      };
    }

    if (classification.track === "deterministic") {
      return this.runDeterministicTask(taskId, classification);
    }

    return this.runLlmTask(taskId, taskDescription, classification, opts);
  }

  getActiveCount(): number {
    return this.scheduler.getActiveCount();
  }

  getTaskStatus(taskId: string): TaskStatus {
    return this.scheduler.getStatus(taskId);
  }

  private async runDeterministicTask(
    taskId: string,
    classification: ClassificationResult,
  ): Promise<EngineResult> {
    if (!classification.workflow) {
      this.scheduler.markFailed(taskId, "Missing workflow for deterministic task");
      return {
        taskId,
        track: "deterministic",
        workflow: undefined,
        status: this.scheduler.getStatus(taskId),
      };
    }

    const runResult = await runWorkflow(classification.workflow);
    if (runResult.exitCode === 0) {
      this.scheduler.markCompleted(taskId, runResult);
    } else {
      this.scheduler.markFailed(taskId, runResult);
    }

    return {
      taskId,
      track: "deterministic",
      workflow: classification.workflow,
      status: this.scheduler.getStatus(taskId),
    };
  }

  private async runLlmTask(
    taskId: string,
    taskDescription: string,
    classification: ClassificationResult,
    opts?: EngineProcessOptions,
  ): Promise<EngineResult> {
    const selectedAgent =
      classification.agent ??
      this.roster.selectAgent(taskDescription) ??
      this.roster.getAgent("prometheus");

    if (!selectedAgent) {
      this.scheduler.markFailed(taskId, "No suitable agent found");
      return {
        taskId,
        track: "llm",
        status: this.scheduler.getStatus(taskId),
      };
    }

    const message = generatePreamble(selectedAgent, {
      project: opts?.project,
      taskSummary: taskDescription,
    });

    try {
      await this.dispatchFn(opts?.project ?? DEFAULT_PROJECT, message, {
        agent: selectedAgent.name,
      });
      this.scheduler.markCompleted(taskId);
    } catch (error) {
      this.scheduler.markFailed(taskId, error);
    }

    return {
      taskId,
      track: "llm",
      agent: selectedAgent,
      status: this.scheduler.getStatus(taskId),
    };
  }
}
