import type { ScheduledTaskStore, CreateScheduledTask } from "./scheduled-tasks.js";

/**
 * Built-in scheduled tasks that Arachne registers on startup.
 * These are idempotent — if a task with the same name already exists, it is skipped.
 */

const BUILTIN_TASKS: CreateScheduledTask[] = [
  {
    name: "notion-memory-maintenance",
    description:
      "Consolidate the Arachne Memory notebook — index sub-pages, merge duplicates, archive stale entries, rebuild table of contents.",
    prompt: [
      "You are performing scheduled maintenance on the Arachne Memory notebook in Notion.",
      "",
      "Steps:",
      "1. Use arachne_memory_list to get all sub-pages in the memory notebook.",
      "2. Review each page title and last-edited date.",
      "3. Identify duplicate pages (same or very similar titles) and merge their content into one, archiving the other.",
      "4. Archive any pages that haven't been edited in 30+ days and contain only stale or outdated information.",
      "5. Update or create a 'Table of Contents' page at the top of the notebook listing all active pages with brief descriptions.",
      "6. Report a summary of actions taken.",
    ].join("\n"),
    cronExpression: "03:00",
    timezone: "America/New_York",
    enabled: false,
    agent: "atlas",
  },
  {
    name: "user-profile-update",
    description:
      "Update the PDD-like user profile based on recent interactions, preferences, and behavioral patterns.",
    prompt: [
      "You are updating the user's evolving profile — a PDD-like personality and preference document.",
      "",
      "Steps:",
      "1. Review recent chat sessions from the past week for patterns in the user's:",
      "   - Communication style and preferences",
      "   - Technical interests and skill areas",
      "   - Tool and workflow preferences",
      "   - Decision-making patterns",
      "   - Frequently referenced projects or topics",
      "2. Use arachne_memory_read to load the current 'User Profile' page from the memory notebook.",
      "3. If it doesn't exist, use arachne_memory_write to create it with an initial profile.",
      "4. Update the profile with new observations, refining existing sections rather than appending.",
      "5. Keep the profile concise — it should be a reference document, not a log.",
      "6. Maintain these sections: Identity, Preferences, Working Style, Technical Domains, Communication Style, Active Projects.",
    ].join("\n"),
    cronExpression: "0 4 * * 1", // 4 AM every Monday
    timezone: "America/New_York",
    enabled: false,
    agent: "atlas",
  },
];

/**
 * Register built-in tasks into the scheduled_tasks DB table.
 * Idempotent: skips tasks whose names already exist.
 */
export function registerBuiltinScheduledTasks(store: ScheduledTaskStore): void {
  for (const task of BUILTIN_TASKS) {
    const existing = store.getByName(task.name);
    if (existing) continue;

    try {
      store.create(task);
      console.log(`[builtin-tasks] Registered "${task.name}"`);
    } catch (error) {
      console.error(
        `[builtin-tasks] Failed to register "${task.name}":`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}
