import type { Workflow } from "./types.js";
import type { WorkflowRegistry } from "./registry.js";
import { resolve, join } from "path";
import { homedir } from "os";
import { readFileSync, existsSync } from "fs";
import { CronScheduler } from "./cron-scheduler.js";

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

export function registerBuiltinSchedules(
  scheduler: CronScheduler,
  userConfigPath?: string,
): void {
  const configPath = userConfigPath ?? join(homedir(), ".config", "opencode", "workflow-user-config.json");

  if (!existsSync(configPath)) {
    return; // No user config — nothing to schedule
  }

  let config: { scheduleTime?: string; timezone?: string };
  try {
    config = JSON.parse(readFileSync(configPath, "utf-8"));
  } catch {
    return; // Invalid config — skip silently
  }

  if (!config.scheduleTime || !config.timezone) {
    return;
  }

  scheduler.register({
    workflowName: DAILY_GROK.name,
    cronExpression: config.scheduleTime,
    timezone: config.timezone,
    enabled: true,
  });
}
