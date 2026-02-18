import { z } from "zod";

/**
 * Zod schema for a registered workflow.
 * `inputSchema` is intentionally not part of the Zod validation —
 * it's a runtime Zod schema attached to the workflow for validating args.
 */
export const WorkflowSchema = z.object({
  name: z.string().min(1),
  entrypoint: z.string().min(1),
  description: z.string(),
  triggers: z.array(z.string()),
});

/**
 * A registered workflow definition.
 */
export type Workflow = z.infer<typeof WorkflowSchema> & {
  inputSchema?: z.ZodType;
};

/**
 * Result of executing a workflow.
 */
export interface WorkflowRunResult {
  workflowName: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  startedAt: Date;
  completedAt: Date;
}

/**
 * Workflow match result from pattern matching.
 */
export interface WorkflowMatch {
  workflow: Workflow;
  confidence: number;
}
