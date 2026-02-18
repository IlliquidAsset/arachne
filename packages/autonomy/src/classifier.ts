import {
  agentRoster,
  type AgentEntry,
  type AgentRoster,
} from "./agent-roster.js";
import { registerBuiltinWorkflows } from "./builtin-workflows.js";
import { InMemoryPersistence } from "./persistence.js";
import { WorkflowRegistry } from "./registry.js";
import type { Workflow } from "./types.js";

const DETERMINISTIC_THRESHOLD = 0.7;

const defaultRegistry = new WorkflowRegistry({
  persistence: new InMemoryPersistence(),
});
registerBuiltinWorkflows(defaultRegistry);

export interface ClassificationResult {
  track: "deterministic" | "llm";
  workflow?: Workflow;
  agent?: AgentEntry;
  project?: string;
  confidence: number;
}

export interface ClassifierDependencies {
  registry: Pick<WorkflowRegistry, "findMatchingWorkflow">;
  roster: Pick<AgentRoster, "selectAgent">;
  project?: string;
}

function clampConfidence(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function classify(
  taskDescription: string,
  deps?: Partial<ClassifierDependencies>,
): ClassificationResult {
  const registry = deps?.registry ?? defaultRegistry;
  const roster = deps?.roster ?? agentRoster;

  const workflowMatch = registry.findMatchingWorkflow(taskDescription);
  if (workflowMatch && workflowMatch.confidence > DETERMINISTIC_THRESHOLD) {
    return {
      track: "deterministic",
      workflow: workflowMatch.workflow,
      project: deps?.project,
      confidence: workflowMatch.confidence,
    };
  }

  const agent = roster.selectAgent(taskDescription) ?? undefined;
  const fallbackConfidence = workflowMatch
    ? 1 - workflowMatch.confidence
    : agent
      ? 0.75
      : 0.4;

  return {
    track: "llm",
    agent,
    project: deps?.project,
    confidence: clampConfidence(fallbackConfidence),
  };
}
