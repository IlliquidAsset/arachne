import type { Workflow } from "./types.js";
import type { WorkflowRegistry } from "./registry.js";
import { resolve } from "path";
import { homedir } from "os";

export const DAILY_GROK: Workflow = {
  name: "daily-grok",
  entrypoint: resolve(
    homedir(),
    ".config/opencode/skills/workflow-orchestrator/src/daily-workflow.ts",
  ),
  description:
    "Run the daily Grok workflow — fetch tweets, get AI suggestions, post to X",
  triggers: [
    "grok",
    "daily workflow",
    "tweet suggestions",
    "daily grok",
    "run daily",
    "morning workflow",
  ],
};

const BUILTIN_WORKFLOWS: Workflow[] = [DAILY_GROK];

export function registerBuiltinWorkflows(registry: WorkflowRegistry): void {
  for (const wf of BUILTIN_WORKFLOWS) {
    registry.register(wf);
  }
}
