import type { Workflow, WorkflowMatch } from "./types.js";
import type { WorkflowPersistence } from "./persistence.js";

/**
 * Dependencies injected into WorkflowRegistry.
 */
export interface RegistryDependencies {
  persistence: WorkflowPersistence;
}

/**
 * In-memory workflow registry with pattern-matching lookup.
 * Hydrates from persistence on construction, writes through on mutations.
 */
export class WorkflowRegistry {
  private workflows = new Map<string, Workflow>();
  private readonly persistence: WorkflowPersistence;

  constructor(deps: RegistryDependencies) {
    this.persistence = deps.persistence;
    // Hydrate from persistence
    for (const wf of this.persistence.load()) {
      this.workflows.set(wf.name, wf);
    }
  }

  /** Register or update a workflow. */
  register(workflow: Workflow): void {
    this.workflows.set(workflow.name, workflow);
    this.persistence.save(workflow);
  }

  /** Remove a workflow by name. No-op if not found. */
  unregister(name: string): void {
    this.workflows.delete(name);
    this.persistence.remove(name);
  }

  /** Get a workflow by exact name, or null. */
  get(name: string): Workflow | null {
    return this.workflows.get(name) ?? null;
  }

  /** List all registered workflows. */
  list(): Workflow[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Find the best matching workflow for a task description.
   *
   * Match priority:
   * 1. Exact name match → confidence 1.0
   * 2. Trigger pattern (regex/substring) match → confidence 0.9
   * 3. Fuzzy keyword overlap → confidence 0.5–0.8
   * 4. No match → null
   */
  findMatchingWorkflow(taskDescription: string): WorkflowMatch | null {
    if (!taskDescription.trim()) return null;

    const desc = taskDescription.toLowerCase();
    let bestMatch: WorkflowMatch | null = null;

    for (const workflow of this.workflows.values()) {
      const match = this.scoreWorkflow(workflow, desc);
      if (match && (!bestMatch || match.confidence > bestMatch.confidence)) {
        bestMatch = match;
      }
    }

    return bestMatch;
  }

  private scoreWorkflow(
    workflow: Workflow,
    descLower: string,
  ): WorkflowMatch | null {
    // 1. Exact name match
    if (descLower === workflow.name.toLowerCase()) {
      return { workflow, confidence: 1.0 };
    }

    // 2. Trigger pattern match — test each multi-word trigger as regex/substring.
    //    Single-word triggers are too broad for phrase matching; they fall
    //    through to fuzzy keyword matching (step 3).
    for (const trigger of workflow.triggers) {
      const isPhrase = trigger.trim().includes(" ");
      if (!isPhrase) continue;

      try {
        const regex = new RegExp(trigger, "i");
        if (regex.test(descLower)) {
          return { workflow, confidence: 0.9 };
        }
      } catch {
        // If trigger isn't valid regex, fall back to substring
        if (descLower.includes(trigger.toLowerCase())) {
          return { workflow, confidence: 0.9 };
        }
      }
    }

    // 3. Fuzzy keyword match — word overlap across all triggers
    const descWords = new Set(
      descLower.split(/\s+/).filter((w) => w.length > 2),
    );
    if (descWords.size === 0) return null;

    let maxOverlapRatio = 0;

    for (const trigger of workflow.triggers) {
      const triggerWords = trigger
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 2);

      for (const tw of triggerWords) {
        if (descWords.has(tw)) {
          // Count how many trigger words match
          const matchCount = triggerWords.filter((t) =>
            descWords.has(t),
          ).length;
          const ratio = matchCount / triggerWords.length;
          maxOverlapRatio = Math.max(maxOverlapRatio, ratio);
        }
      }
    }

    if (maxOverlapRatio > 0) {
      // Scale: 0.5 base + up to 0.3 based on overlap ratio
      const confidence = Math.min(0.5 + maxOverlapRatio * 0.3, 0.8);
      return { workflow, confidence };
    }

    return null;
  }
}
