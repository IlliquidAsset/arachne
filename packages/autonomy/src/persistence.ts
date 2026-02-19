import type { Workflow } from "./types.js";

/**
 * Run history entry for a single workflow execution.
 */
export interface WorkflowRunRecord {
  workflowName: string;
  durationMs: number;
  timestamp: Date;
}

/**
 * Persistence interface for workflow registry.
 * In-memory impl now; SQLite via @arachne/shared later.
 */
export interface WorkflowPersistence {
  save(workflow: Workflow): void;
  remove(name: string): void;
  load(): Workflow[];
  recordRun(name: string, durationMs: number): void;
  getRunHistory(name: string): WorkflowRunRecord[];
}

/**
 * In-memory persistence — suitable for testing and initial development.
 */
export class InMemoryPersistence implements WorkflowPersistence {
  private workflows = new Map<string, Workflow>();
  private runHistory: WorkflowRunRecord[] = [];

  save(workflow: Workflow): void {
    this.workflows.set(workflow.name, workflow);
  }

  remove(name: string): void {
    this.workflows.delete(name);
  }

  load(): Workflow[] {
    return Array.from(this.workflows.values());
  }

  recordRun(name: string, durationMs: number): void {
    this.runHistory.push({
      workflowName: name,
      durationMs,
      timestamp: new Date(),
    });
  }

  getRunHistory(name: string): WorkflowRunRecord[] {
    return this.runHistory.filter((r) => r.workflowName === name);
  }
}
