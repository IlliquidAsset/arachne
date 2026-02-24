# Daily Content Workflow: Activation & Generalization

## TL;DR

> **Quick Summary**: Activate the daily content workflow (content source → Muse enhance → DA review → post to X) by fixing critical bugs, replacing hardcoded paths with user configuration, abstracting content sources into a pluggable interface, adding time-based scheduling to the autonomy engine, and building a CLI setup wizard for onboarding any Arachne user.
> 
> **Deliverables**:
> - Fixed Chrome CDP manager (unified on `chrome-bridge.ts`)
> - Portable user config system separated from runtime state
> - `ContentSource` interface with `GrokEmailSource` adapter
> - `CronScheduler` in `packages/autonomy/` for time-based workflow execution
> - `workflow-orchestrator init` CLI wizard for user onboarding
> - End-to-end dry-run verification of the full pipeline
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES — 3 waves
> **Critical Path**: Task 1 → Task 3 → Task 5 → Task 7 → Task 9

---

## Context

### Original Request
Activate the daily content workflow pipeline (Grok emails → Muse enhance → DA review → post tweets) and generalize it so any Arachne user can install and use it — not just Kendrick.

### Interview Summary
**Key Discussions**:
- **Portability**: User confirmed this must work for ANY Arachne user, not just Kendrick. All hardcoded paths must go.
- **Content sources**: User chose "Make it pluggable" — abstract content source interface, implement Grok email adapter first. RSS and manual queue are out of scope but the interface must support them later.
- **Scheduling**: User chose "Built into Arachne" — autonomy engine manages scheduling. Requires Arachne server running. Dashboard config is future scope.
- **Onboarding**: User chose "CLI setup wizard" — `workflow-orchestrator init` asks for X handle, content source, schedule time, voice profile. Writes config file.

**Research Findings**:
- 4 skills exist at `~/.config/opencode/skills/`: `social-poster`, `email-reader`, `voice-learner`, `workflow-orchestrator`
- `chrome-preflight.ts` spawns Chrome with a CLEAN separate profile (no sessions) — this is a HARD BLOCKER (pipeline can't access Gmail/X without logged-in sessions)
- `chrome-bridge.ts` in `social-poster` correctly restarts user's own Chrome with CDP, preserving all sessions
- `WorkflowConfig` conflates user preferences with runtime state (`lastRun`, `postedToday`, `processedEmailIds` all in one object)
- `GrokSuggestion` type is duplicated in both `email-reader` and `workflow-orchestrator`
- `postedToday` counter never resets (no date comparison logic)
- `processedEmailIds.push()` at line 419 happens per-email BEFORE all suggestions in that email are processed — if posting fails mid-email, already-posted suggestions are marked as processed and can't be retried
- No time-based scheduler exists — `TaskQueue` is a priority-based concurrency limiter, not a cron
- `run-daily.sh` is dead code with hardcoded `/Users/kendrick` paths
- `DAILY_GROK` workflow is already registered in `builtin-workflows.ts` pointing to the skill entrypoint

### Metis Review
**Identified Gaps** (addressed):
- **E8 Chrome HARD BLOCKER**: Resolved by unifying on `chrome-bridge.ts` — replace `ensureChromeReady()` with imports from `social-poster/src/chrome-bridge`
- **E3 processedEmailIds ordering**: Move `push()` to AFTER all suggestions in an email are fully processed
- **postedToday reset**: Add date comparison in `loadConfig()` — reset counter when `lastRun` date differs from today
- **Duplicate types**: Canonical `GrokSuggestion`/`GrokEmail` stay in `email-reader`, workflow-orchestrator re-exports from there
- **Config separation**: Split `WorkflowConfig` into `UserConfig` (preferences) + `RuntimeState` (counters/processed IDs)
- **Voice profile path**: Read from `UserConfig.voiceProfilePath` instead of hardcoded path
- **No lockfile**: Add PID-based lockfile to prevent concurrent runs
- **`social-poster-v2`**: Stay on v1 for this iteration — deferred to future scope

---

## Work Objectives

### Core Objective
Transform the daily content workflow from a Kendrick-only prototype into a portable, configurable feature that any Arachne user can set up and run via CLI wizard, with pluggable content sources and Arachne-native scheduling.

### Concrete Deliverables
- `~/.config/opencode/skills/workflow-orchestrator/src/daily-workflow.ts` — rewritten with configurable paths, Chrome bridge import, content source abstraction
- `~/.config/opencode/skills/workflow-orchestrator/src/chrome-preflight.ts` — deleted (replaced by chrome-bridge.ts import)
- `~/.config/opencode/skills/workflow-orchestrator/src/types.ts` — rewritten: `UserConfig`, `RuntimeState`, `ContentSuggestion`, `ContentSource` interface
- `~/.config/opencode/skills/workflow-orchestrator/src/cli.ts` — expanded with `init` command
- `~/.config/opencode/skills/workflow-orchestrator/run-daily.sh` — deleted
- `packages/autonomy/src/cron-scheduler.ts` — new: time-based scheduler
- `packages/autonomy/src/index.ts` — updated exports
- `packages/autonomy/src/builtin-workflows.ts` — updated with schedule config

### Definition of Done
- [ ] `workflow-orchestrator init` successfully creates config for a new user
- [ ] `workflow-orchestrator dry-run` runs end-to-end without errors using the new config
- [ ] `workflow-orchestrator status` shows correct state from split config/runtime files
- [ ] `chrome-preflight.ts` and `run-daily.sh` no longer exist
- [ ] No references to `/Users/kendrick` anywhere in the skill codebase
- [ ] CronScheduler can register and trigger time-based workflow execution
- [ ] All existing `packages/autonomy` tests still pass

### Must Have
- Chrome CDP uses user's own browser sessions (chrome-bridge.ts pattern)
- User config separated from runtime state
- Voice profile path configurable via user config
- Content source abstraction with at least one adapter (GrokEmailSource)
- CLI `init` wizard with ≤5 prompts
- PID-based lockfile for concurrent run prevention
- `postedToday` resets on new day
- `processedEmailIds` only marked after full email processing completes
- CronScheduler in autonomy package
- All paths portable (no hardcoded user-specific paths)

### Must NOT Have (Guardrails)
- **G1**: MUST NOT modify `TaskQueue`, `AutonomyEngine`, `WorkflowRegistry`, `WorkflowRunner` existing APIs — CronScheduler is a new, additive module
- **G2**: MUST NOT build RSS adapter or manual queue adapter — define the `ContentSource` interface only, implement `GrokEmailSource` only
- **G3**: MUST NOT build Windows/Linux Chrome detection — macOS only for v1 (chrome-bridge.ts already macOS-specific)
- **G4**: MUST NOT restructure skills into npm packages or change the `~/.config/opencode/skills/` directory layout
- **G5**: MUST NOT touch Gmail DOM selectors in `gmail-reader.ts`, X GraphQL flags in `x-api.ts`, or voice-learner internals
- **G6**: MUST NOT build dashboard UI for workflow config
- **G7**: MUST NOT integrate `social-poster-v2` — stay on v1 imports
- **G8**: MUST NOT build a full cron framework — minimal timer wrapper using `setInterval` + cron expression parsing
- **G9**: MUST NOT add more than 5 prompts to the CLI wizard

---

## Verification Strategy

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.
> The executing agent verifies everything using tools (Bash, interactive_bash, Playwright).

### Test Decision
- **Infrastructure exists**: YES — `packages/autonomy/__tests__/scheduler.test.ts` exists with bun test
- **Automated tests**: YES (Tests-after) — add tests for CronScheduler after implementation
- **Framework**: bun test (existing)

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

All QA scenarios use Bash (CLI execution, file inspection) or interactive_bash (tmux for interactive CLI wizard). No browser testing needed — this is all backend/CLI work.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Fix Chrome CDP + bugs in daily-workflow.ts
├── Task 2: Split config into UserConfig + RuntimeState
└── Task 3: Content source abstraction + type rename

Wave 2 (After Wave 1):
├── Task 4: CLI init wizard
├── Task 5: CronScheduler in autonomy package
└── Task 6: Delete dead code + portability sweep

Wave 3 (After Wave 2):
├── Task 7: Wire CronScheduler to builtin-workflows
├── Task 8: Tests for CronScheduler
└── Task 9: End-to-end dry-run verification
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 4, 9 | 2, 3 |
| 2 | None | 4, 9 | 1, 3 |
| 3 | None | 4, 9 | 1, 2 |
| 4 | 1, 2, 3 | 9 | 5, 6 |
| 5 | None (additive) | 7, 8 | 4, 6 |
| 6 | 1, 2, 3 | 9 | 4, 5 |
| 7 | 5 | 9 | 8 |
| 8 | 5 | 9 | 7 |
| 9 | ALL | None | None (final) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1, 2, 3 | Three parallel `task(category="unspecified-high")` — independent file groups |
| 2 | 4, 5, 6 | Three parallel — 4 is CLI (unspecified-high), 5 is new module (ultrabrain), 6 is cleanup (quick) |
| 3 | 7, 8 | Two parallel — both quick wiring tasks |
| Final | 9 | Sequential — E2E verification after everything |

---

## TODOs

- [x] 1. Fix Chrome CDP Manager + Critical Bugs

  **What to do**:
  - Replace `import { ensureChromeReady } from './chrome-preflight'` with imports from `../../social-poster/src/chrome-bridge` in `daily-workflow.ts`
  - Replace the `ensureChromeReady()` call at line 307 with: `const state = await detectChrome(); if (!state.cdpEnabled) { await enableCDP(); }`
  - Replace `import { createTweet } from '../../social-poster/src/x-api'` — keep this import, it's correct, but ensure it uses the same CDP connection (chrome-bridge's `connect()`)
  - Fix `processedEmailIds.push(email.emailId)` at line 419: move it AFTER the inner `for (const suggestion of email.suggestions)` loop completes successfully. Only push if ALL suggestions were processed (posted or explicitly rejected by DA). If ANY suggestion errors during posting, do NOT mark the email as processed.
  - Fix `postedToday` counter reset: In `loadConfig()`, after loading from disk, check if `lastRun` date (YYYY-MM-DD) differs from today — if so, reset `postedToday` to 0
  - Add PID-based lockfile: At start of `runDailyWorkflow()`, create `~/.config/opencode/workflow-lock.pid` with current PID. Check if existing lockfile's PID is still running (via `process.kill(pid, 0)`). Remove lockfile in `finally` block.

  **Must NOT do**:
  - MUST NOT modify `chrome-bridge.ts` itself — import it as-is
  - MUST NOT modify `x-api.ts` — import it as-is
  - MUST NOT change Gmail DOM selectors in `gmail-reader.ts`
  - MUST NOT delete `chrome-preflight.ts` yet (Task 6 handles deletion)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Bug fixing + import rewiring across multiple files, requires careful understanding of CDP lifecycle
  - **Skills**: `[]`
    - No specialized skills needed — pure TypeScript file editing
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed — we're editing code that uses Playwright, not running Playwright ourselves
    - `git-master`: No commit in this task

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Tasks 4, 6, 9
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References** (existing code to follow):
  - `~/.config/opencode/skills/social-poster/src/chrome-bridge.ts:19-54` — `detectChrome()` function: checks if Chrome is running via `ps aux`, then probes CDP on port 9222. Returns `ChromeState { running, cdpEnabled, port }`. This is the CORRECT way to check Chrome status.
  - `~/.config/opencode/skills/social-poster/src/chrome-bridge.ts:61-123` — `enableCDP()` function: quits Chrome via AppleScript, waits for exit, relaunches with `--remote-debugging-port=9222` using `open -a`. Preserves user's browser sessions. This REPLACES `ensureChromeReady()`.
  - `~/.config/opencode/skills/social-poster/src/chrome-bridge.ts:129-142` — `connect()` function: connects to Chrome via Playwright CDP on port 9222. Returns `Browser` object. Used by `createTweet()` internally.

  **Bug References** (code to fix):
  - `~/.config/opencode/skills/workflow-orchestrator/src/daily-workflow.ts:5-7` — Imports to replace: `GmailReader` import stays, `createTweet` import stays, `ensureChromeReady` import must change to `{ detectChrome, enableCDP }` from `../../social-poster/src/chrome-bridge`
  - `~/.config/opencode/skills/workflow-orchestrator/src/daily-workflow.ts:306-308` — `ensureChromeReady()` call site: replace with `detectChrome()` + conditional `enableCDP()` pattern
  - `~/.config/opencode/skills/workflow-orchestrator/src/daily-workflow.ts:417-420` — `processedEmailIds.push()` happens inside the email loop but BEFORE the suggestion loop finishes. Must move AFTER line 416 (end of suggestion loop), and only if no unrecoverable errors occurred.
  - `~/.config/opencode/skills/workflow-orchestrator/src/daily-workflow.ts:43-60` — `loadConfig()`: add date comparison logic after line 52 to reset `postedToday` when day changes

  **Problem References** (code being replaced):
  - `~/.config/opencode/skills/workflow-orchestrator/src/chrome-preflight.ts` — ENTIRE FILE is the problem. It spawns Chrome with `--user-data-dir=${CHROME_PROFILE}` (line 35) using a CLEAN profile at `~/.chrome-cdp-profiles/social-poster`. This profile has NO logged-in Gmail or X sessions, making the entire pipeline fail. File will be deleted in Task 6.

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Chrome bridge imports resolve correctly
    Tool: Bash
    Preconditions: Skills directory exists at ~/.config/opencode/skills/
    Steps:
      1. grep -n "chrome-preflight" ~/.config/opencode/skills/workflow-orchestrator/src/daily-workflow.ts
      2. Assert: zero matches (import removed)
      3. grep -n "chrome-bridge" ~/.config/opencode/skills/workflow-orchestrator/src/daily-workflow.ts
      4. Assert: at least one match (import added)
      5. grep -n "detectChrome\|enableCDP" ~/.config/opencode/skills/workflow-orchestrator/src/daily-workflow.ts
      6. Assert: both functions referenced
    Expected Result: No references to chrome-preflight, chrome-bridge functions imported
    Evidence: grep output captured

  Scenario: processedEmailIds push is after suggestion loop
    Tool: Bash
    Preconditions: daily-workflow.ts has been modified
    Steps:
      1. Read daily-workflow.ts and find the line with processedEmailIds.push
      2. Verify it appears AFTER the closing brace of `for (const suggestion of email.suggestions)`
      3. Verify there is error-tracking logic (e.g., a boolean flag) that prevents push on failure
    Expected Result: push() is positioned after suggestion processing, with error guard
    Evidence: File content with line numbers captured

  Scenario: postedToday resets on new day
    Tool: Bash
    Preconditions: daily-workflow.ts has been modified
    Steps:
      1. Read loadConfig() function in daily-workflow.ts
      2. Verify date comparison logic exists (comparing lastRun date to current date)
      3. Verify postedToday is set to 0 when dates differ
    Expected Result: loadConfig contains date-aware counter reset
    Evidence: Function body captured

  Scenario: Lockfile prevents concurrent runs
    Tool: Bash
    Preconditions: daily-workflow.ts has been modified
    Steps:
      1. grep -n "workflow-lock\|lockfile\|\.pid" ~/.config/opencode/skills/workflow-orchestrator/src/daily-workflow.ts
      2. Assert: lockfile creation, check, and cleanup logic present
      3. Verify try/finally pattern wraps lockfile cleanup
    Expected Result: PID lockfile mechanism implemented
    Evidence: grep output + relevant code section captured
  ```

  **Commit**: YES (groups with Tasks 2, 3 — end of Wave 1)
  - Message: `fix(workflow): unify Chrome CDP on chrome-bridge, fix email processing bugs`
  - Files: `~/.config/opencode/skills/workflow-orchestrator/src/daily-workflow.ts`
  - Pre-commit: `grep -r "chrome-preflight" ~/.config/opencode/skills/workflow-orchestrator/src/ | grep -v node_modules` → empty

---

- [x] 2. Split Config into UserConfig + RuntimeState

  **What to do**:
  - Rewrite `~/.config/opencode/skills/workflow-orchestrator/src/types.ts`:
    - Rename `WorkflowConfig` → split into two interfaces:
      - `UserConfig` — user preferences written by `init` wizard, read-only at runtime:
        ```typescript
        interface UserConfig {
          xHandle: string;                    // e.g., "@kendrick"
          contentSource: string;              // e.g., "grok-email" — maps to ContentSource adapter
          scheduleTime: string;               // e.g., "09:00" — 24h format
          voiceProfilePath: string | null;    // path to voice profile file, or null
          maxPostsPerDay: number;             // default: 5
          timezone: string;                   // e.g., "America/Los_Angeles"
        }
        ```
      - `RuntimeState` — mutable runtime counters, managed by the workflow:
        ```typescript
        interface RuntimeState {
          lastRun: string | null;
          lastRunDate: string | null;         // YYYY-MM-DD for daily reset
          postedToday: number;
          processedEmailIds: string[];
        }
        ```
    - Keep `GrokSuggestion`, `GrokEmail` interfaces in this file for now (Task 3 renames them)
    - Keep `MuseOutput`, `DAReview`, `WorkflowResult` unchanged
  - Update `daily-workflow.ts`:
    - Change `CONFIG_PATH` to two paths: `USER_CONFIG_PATH` (`~/.config/opencode/workflow-user-config.json`) and `RUNTIME_STATE_PATH` (`~/.config/opencode/workflow-runtime-state.json`)
    - Split `loadConfig()` into `loadUserConfig(): UserConfig` and `loadRuntimeState(): RuntimeState`
    - Split `saveConfig()` into `saveRuntimeState(state: RuntimeState): void` (user config is never written at runtime — only by `init`)
    - Replace hardcoded `VOICE_PROFILE_PATH` with `userConfig.voiceProfilePath` in `museEnhance()`
    - Add `maxPostsPerDay` check: skip posting if `runtimeState.postedToday >= userConfig.maxPostsPerDay`
  - Update `cli.ts`:
    - `showStatus()` reads both files and displays combined info

  **Must NOT do**:
  - MUST NOT create the `init` command yet (Task 4)
  - MUST NOT modify the `GrokSuggestion`/`GrokEmail` type names (Task 3)
  - MUST NOT modify `email-reader` or `social-poster` packages
  - MUST NOT change the workflow execution logic beyond config reads

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Multi-file refactor with type changes propagating across files
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `git-master`: No commit in this task alone

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Tasks 4, 6, 9
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `~/.config/opencode/skills/workflow-orchestrator/src/types.ts:50-55` — Current `WorkflowConfig` interface: `lastRun`, `postedToday`, `processedEmailIds`. These become `RuntimeState`. Must add `lastRunDate` for daily reset.
  - `~/.config/opencode/skills/workflow-orchestrator/src/daily-workflow.ts:20-26` — Current `CONFIG_PATH` definition: single path at `~/.config/opencode/workflow-config.json`. Must split into two separate file paths.
  - `~/.config/opencode/skills/workflow-orchestrator/src/daily-workflow.ts:28-35` — `VOICE_PROFILE_PATH` hardcoded to Kendrick's machine. Must be replaced with `userConfig.voiceProfilePath` read from the new `UserConfig`.
  - `~/.config/opencode/skills/workflow-orchestrator/src/daily-workflow.ts:43-68` — `loadConfig()` and `saveConfig()` functions: these must be split into separate load/save for UserConfig and RuntimeState.
  - `~/.config/opencode/skills/workflow-orchestrator/src/daily-workflow.ts:148-154` — `museEnhance()` reads `VOICE_PROFILE_PATH`: must accept `userConfig` parameter or read from the new `loadUserConfig()`.
  - `~/.config/opencode/skills/workflow-orchestrator/src/cli.ts:7-12` — CLI reads `CONFIG_PATH`: must read both user config and runtime state.

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: UserConfig and RuntimeState interfaces exist
    Tool: Bash
    Preconditions: types.ts has been modified
    Steps:
      1. grep -n "interface UserConfig" ~/.config/opencode/skills/workflow-orchestrator/src/types.ts
      2. Assert: exactly one match
      3. grep -n "interface RuntimeState" ~/.config/opencode/skills/workflow-orchestrator/src/types.ts
      4. Assert: exactly one match
      5. grep -n "interface WorkflowConfig" ~/.config/opencode/skills/workflow-orchestrator/src/types.ts
      6. Assert: zero matches (old interface removed)
    Expected Result: Split interfaces replace monolithic WorkflowConfig
    Evidence: grep output captured

  Scenario: Two separate config file paths defined
    Tool: Bash
    Preconditions: daily-workflow.ts has been modified
    Steps:
      1. grep -n "USER_CONFIG_PATH\|RUNTIME_STATE_PATH" ~/.config/opencode/skills/workflow-orchestrator/src/daily-workflow.ts
      2. Assert: both constants defined
      3. grep -n "workflow-user-config.json" ~/.config/opencode/skills/workflow-orchestrator/src/daily-workflow.ts
      4. Assert: at least one match
      5. grep -n "workflow-runtime-state.json" ~/.config/opencode/skills/workflow-orchestrator/src/daily-workflow.ts
      6. Assert: at least one match
    Expected Result: Separate file paths for user config and runtime state
    Evidence: grep output captured

  Scenario: Voice profile path is configurable
    Tool: Bash
    Preconditions: daily-workflow.ts has been modified
    Steps:
      1. grep -n "VOICE_PROFILE_PATH" ~/.config/opencode/skills/workflow-orchestrator/src/daily-workflow.ts
      2. Assert: the old hardcoded constant is gone
      3. grep -n "voiceProfilePath" ~/.config/opencode/skills/workflow-orchestrator/src/daily-workflow.ts
      4. Assert: at least one match (read from UserConfig)
    Expected Result: Voice profile path comes from user config, not hardcoded
    Evidence: grep output captured

  Scenario: maxPostsPerDay check exists
    Tool: Bash
    Preconditions: daily-workflow.ts has been modified
    Steps:
      1. grep -n "maxPostsPerDay" ~/.config/opencode/skills/workflow-orchestrator/src/daily-workflow.ts
      2. Assert: at least one match showing comparison with postedToday
    Expected Result: Rate limiting uses configurable max
    Evidence: grep output captured
  ```

  **Commit**: YES (groups with Tasks 1, 3 — end of Wave 1)
  - Message: `refactor(workflow): split config into UserConfig + RuntimeState, make voice path configurable`
  - Files: `~/.config/opencode/skills/workflow-orchestrator/src/types.ts`, `~/.config/opencode/skills/workflow-orchestrator/src/daily-workflow.ts`, `~/.config/opencode/skills/workflow-orchestrator/src/cli.ts`

---

- [x] 3. Content Source Abstraction + Type Rename

  **What to do**:
  - Define `ContentSource` interface in `types.ts`:
    ```typescript
    interface ContentSuggestion {
      type: 'original_post' | 'reply' | 'thread';
      topic?: string;
      context?: string;
      draftText?: string;
      targetUrl?: string;      // renamed from targetTweet — platform-agnostic
      angle?: string;
      sourceId: string;        // unique ID from the source (email ID, RSS item ID, etc.)
    }

    interface ContentBatch {
      batchId: string;          // unique ID for this batch (email ID, feed fetch ID)
      source: string;           // e.g., "grok-email", "rss"
      fetchedAt: string;        // ISO timestamp
      suggestions: ContentSuggestion[];
    }

    interface ContentSource {
      readonly name: string;
      fetch(): Promise<ContentBatch[]>;
      markProcessed(batchId: string): Promise<void>;
    }
    ```
  - Create `~/.config/opencode/skills/workflow-orchestrator/src/sources/grok-email-source.ts`:
    - Implements `ContentSource`
    - Wraps `GmailReader` from `../../email-reader/src/gmail-reader`
    - `fetch()` calls `GmailReader.connect()`, `.navigateToGmail()`, `.searchGrokEmails()`, `.close()`
    - Maps `GrokEmail[]` → `ContentBatch[]` and `GrokSuggestion` → `ContentSuggestion`
    - `markProcessed()` updates RuntimeState's processedEmailIds
  - Create `~/.config/opencode/skills/workflow-orchestrator/src/sources/index.ts`:
    - Exports a `getContentSource(name: string): ContentSource` factory function
    - For now, only `"grok-email"` is supported
  - Update `daily-workflow.ts`:
    - Remove direct `GmailReader` import
    - Use `getContentSource(userConfig.contentSource)` to get the adapter
    - Replace `fetchGrokEmails()` with `source.fetch()`
    - Replace `filterNewEmails()` with batch-level filtering against `processedEmailIds`
    - Update the processing loop to use `ContentSuggestion` and `ContentBatch` types
    - Replace `config.processedEmailIds.push(email.emailId)` with `source.markProcessed(batch.batchId)`
  - Update `types.ts`:
    - Remove `GrokSuggestion` and `GrokEmail` interfaces (now `ContentSuggestion` and `ContentBatch`)
    - Update `MuseOutput.originalSuggestion` to use `ContentSuggestion`
    - Update `DAReview.suggestion` to use `ContentSuggestion`
    - Update `WorkflowResult.suggestion` to use `ContentSuggestion`
  - Do NOT modify `email-reader/src/gmail-reader.ts` — its `GrokSuggestion` type stays (it's the source-specific type, mapped by the adapter)

  **Must NOT do**:
  - MUST NOT build RSS adapter or manual queue adapter — interface only
  - MUST NOT modify `email-reader/src/gmail-reader.ts` — adapter wraps it
  - MUST NOT modify `social-poster/src/x-api.ts`
  - MUST NOT change the Muse/DA LLM prompt content

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Interface design + adapter pattern + multi-file type propagation. Requires careful type alignment.
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No UI involved

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Tasks 4, 6, 9
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `~/.config/opencode/skills/email-reader/src/gmail-reader.ts:1-27` — Source-specific types: `Email`, `GrokSuggestion`, `GrokEmail` as defined in email-reader. The adapter maps FROM these TO `ContentSuggestion`/`ContentBatch`. Do NOT modify these — they're the source's native types.
  - `~/.config/opencode/skills/workflow-orchestrator/src/daily-workflow.ts:74-81` — `fetchGrokEmails()`: direct GmailReader usage. This function gets replaced by `contentSource.fetch()`.
  - `~/.config/opencode/skills/workflow-orchestrator/src/daily-workflow.ts:87-94` — `filterNewEmails()`: filters by `processedEmailIds`. This logic moves into the ContentSource adapter or the main loop.
  - `~/.config/opencode/skills/workflow-orchestrator/src/daily-workflow.ts:330-420` — Main processing loop: iterates `emails → suggestions`. Must change to iterate `batches → suggestions` using new types.

  **Type References**:
  - `~/.config/opencode/skills/workflow-orchestrator/src/types.ts:7-22` — Current `GrokSuggestion` and `GrokEmail` to be replaced with `ContentSuggestion` and `ContentBatch`
  - `~/.config/opencode/skills/workflow-orchestrator/src/types.ts:25-48` — `MuseOutput`, `DAReview`, `WorkflowResult` all reference `GrokSuggestion` — must update to `ContentSuggestion`

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: ContentSource interface and ContentSuggestion type exist
    Tool: Bash
    Preconditions: types.ts has been modified
    Steps:
      1. grep -n "interface ContentSource" ~/.config/opencode/skills/workflow-orchestrator/src/types.ts
      2. Assert: exactly one match
      3. grep -n "interface ContentSuggestion" ~/.config/opencode/skills/workflow-orchestrator/src/types.ts
      4. Assert: exactly one match
      5. grep -n "interface ContentBatch" ~/.config/opencode/skills/workflow-orchestrator/src/types.ts
      6. Assert: exactly one match
      7. grep -n "interface GrokSuggestion" ~/.config/opencode/skills/workflow-orchestrator/src/types.ts
      8. Assert: zero matches (renamed)
    Expected Result: Generalized content types replace Grok-specific types
    Evidence: grep output captured

  Scenario: GrokEmailSource adapter exists and implements ContentSource
    Tool: Bash
    Preconditions: sources/ directory created
    Steps:
      1. ls ~/.config/opencode/skills/workflow-orchestrator/src/sources/
      2. Assert: grok-email-source.ts and index.ts exist
      3. grep -n "implements ContentSource" ~/.config/opencode/skills/workflow-orchestrator/src/sources/grok-email-source.ts
      4. Assert: exactly one match
      5. grep -n "GmailReader" ~/.config/opencode/skills/workflow-orchestrator/src/sources/grok-email-source.ts
      6. Assert: at least one match (wraps GmailReader)
    Expected Result: GrokEmailSource adapter wraps GmailReader behind ContentSource interface
    Evidence: File listing + grep output captured

  Scenario: daily-workflow.ts uses ContentSource, not direct GmailReader
    Tool: Bash
    Preconditions: daily-workflow.ts has been modified
    Steps:
      1. grep -n "GmailReader" ~/.config/opencode/skills/workflow-orchestrator/src/daily-workflow.ts
      2. Assert: zero matches (import removed)
      3. grep -n "getContentSource\|ContentSource" ~/.config/opencode/skills/workflow-orchestrator/src/daily-workflow.ts
      4. Assert: at least one match
      5. grep -n "ContentBatch\|ContentSuggestion" ~/.config/opencode/skills/workflow-orchestrator/src/daily-workflow.ts
      6. Assert: at least one match
    Expected Result: Workflow uses abstracted content source
    Evidence: grep output captured

  Scenario: Source factory returns GrokEmailSource for "grok-email"
    Tool: Bash
    Preconditions: sources/index.ts exists
    Steps:
      1. grep -n "grok-email" ~/.config/opencode/skills/workflow-orchestrator/src/sources/index.ts
      2. Assert: string "grok-email" handled in factory
      3. grep -n "getContentSource" ~/.config/opencode/skills/workflow-orchestrator/src/sources/index.ts
      4. Assert: function exported
    Expected Result: Factory function maps "grok-email" to GrokEmailSource
    Evidence: grep output captured
  ```

  **Commit**: YES (groups with Tasks 1, 2 — end of Wave 1)
  - Message: `refactor(workflow): abstract content sources with ContentSource interface, add GrokEmailSource adapter`
  - Files: `~/.config/opencode/skills/workflow-orchestrator/src/types.ts`, `~/.config/opencode/skills/workflow-orchestrator/src/sources/grok-email-source.ts`, `~/.config/opencode/skills/workflow-orchestrator/src/sources/index.ts`, `~/.config/opencode/skills/workflow-orchestrator/src/daily-workflow.ts`

---

- [x] 4. CLI Init Wizard

  **What to do**:
  - Add `init` command to `cli.ts` with ≤5 interactive prompts using Node.js `readline`:
    1. **X Handle**: "What's your X (Twitter) handle?" — validate starts with `@`, store as `xHandle`
    2. **Content Source**: "Content source? [grok-email]" — default to `grok-email`, validate against supported sources from `getContentSource()`
    3. **Schedule Time**: "What time should the daily workflow run? [09:00]" — validate HH:MM format, store as `scheduleTime`
    4. **Voice Profile**: "Path to voice profile file (or press Enter to skip):" — validate file exists if provided, store as `voiceProfilePath` or `null`
    5. **Timezone**: "Your timezone? [auto-detected: America/Los_Angeles]" — auto-detect via `Intl.DateTimeFormat().resolvedOptions().timeZone`, allow override
  - After prompts, run pre-flight checks:
    - Chrome installed: check if `/Applications/Google Chrome.app` exists
    - `opencode` CLI available: `which opencode` or `command -v opencode`
    - Content source validates: call `getContentSource(choice)` to verify adapter exists
  - Write `UserConfig` to `~/.config/opencode/workflow-user-config.json`
  - Initialize empty `RuntimeState` to `~/.config/opencode/workflow-runtime-state.json`
  - Print summary of what was configured
  - Add `init` to the CLI switch statement in `main()`
  - Support `--non-interactive` flag that accepts all defaults (for scripted setup)

  **Must NOT do**:
  - MUST NOT add more than 5 prompts
  - MUST NOT install any external prompt library (no inquirer, no prompts) — use Node.js built-in `readline`
  - MUST NOT create the schedule registration yet (Task 7)
  - MUST NOT modify any other skill's code

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Interactive CLI with validation logic, pre-flight checks, file I/O
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `dev-browser`: No browser interaction needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6)
  - **Blocks**: Task 9
  - **Blocked By**: Tasks 1, 2, 3 (needs UserConfig type + config paths + content source factory)

  **References**:

  **Pattern References**:
  - `~/.config/opencode/skills/workflow-orchestrator/src/cli.ts:28-44` — Current CLI `main()` function: switch statement with `run`, `dry-run`, `status`. Add `init` case here.
  - `~/.config/opencode/skills/workflow-orchestrator/src/types.ts` — `UserConfig` interface (created in Task 2): fields that the wizard must populate.
  - `~/.config/opencode/skills/workflow-orchestrator/src/sources/index.ts` — `getContentSource()` factory (created in Task 3): used for content source validation.

  **API References**:
  - Node.js `readline` module: `import * as readline from 'readline'` — use `rl.question()` for interactive prompts, wrapped in `Promise` for async flow
  - `Intl.DateTimeFormat().resolvedOptions().timeZone` — auto-detect user's timezone

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Init wizard runs with defaults (non-interactive)
    Tool: Bash
    Preconditions: Tasks 1-3 completed, no existing config files
    Steps:
      1. rm -f ~/.config/opencode/workflow-user-config.json ~/.config/opencode/workflow-runtime-state.json
      2. echo "@testuser" | timeout 10 npx tsx ~/.config/opencode/skills/workflow-orchestrator/src/cli.ts init --non-interactive 2>&1 || true
      3. Assert: exit code 0 OR output contains config summary
      4. cat ~/.config/opencode/workflow-user-config.json
      5. Assert: JSON is valid, contains "xHandle", "contentSource", "scheduleTime"
      6. cat ~/.config/opencode/workflow-runtime-state.json
      7. Assert: JSON is valid, contains "lastRun": null, "postedToday": 0
    Expected Result: Config files created with defaults
    Evidence: File contents captured

  Scenario: Init command appears in CLI help
    Tool: Bash
    Preconditions: cli.ts has been modified
    Steps:
      1. npx tsx ~/.config/opencode/skills/workflow-orchestrator/src/cli.ts 2>&1 || true
      2. Assert: output contains "init" in usage text
    Expected Result: Help text shows init command
    Evidence: CLI output captured

  Scenario: Pre-flight checks report Chrome status
    Tool: Bash
    Preconditions: cli.ts has init command
    Steps:
      1. grep -n "Chrome\|chrome" ~/.config/opencode/skills/workflow-orchestrator/src/cli.ts
      2. Assert: pre-flight check for Chrome exists
      3. grep -n "opencode\|which\|command -v" ~/.config/opencode/skills/workflow-orchestrator/src/cli.ts
      4. Assert: pre-flight check for opencode CLI exists
    Expected Result: Pre-flight checks validate Chrome and opencode
    Evidence: grep output captured
  ```

  **Commit**: YES
  - Message: `feat(workflow): add CLI init wizard with pre-flight checks`
  - Files: `~/.config/opencode/skills/workflow-orchestrator/src/cli.ts`
  - Pre-commit: `npx tsx ~/.config/opencode/skills/workflow-orchestrator/src/cli.ts 2>&1 | grep -q "init"` → matches

---

- [x] 5. CronScheduler in Autonomy Package

  **What to do**:
  - Create `packages/autonomy/src/cron-scheduler.ts`:
    - `CronScheduler` class with:
      ```typescript
      interface ScheduledJob {
        id: string;
        workflowName: string;
        cronExpression: string;     // simplified: "HH:MM" daily or standard cron "0 9 * * *"
        timezone: string;
        enabled: boolean;
        lastTriggered: Date | null;
        nextTrigger: Date | null;
      }

      interface CronSchedulerOptions {
        tickIntervalMs?: number;     // default: 60_000 (check every minute)
      }

      class CronScheduler {
        constructor(options?: CronSchedulerOptions);
        register(job: Omit<ScheduledJob, 'id' | 'lastTriggered' | 'nextTrigger'>): string;
        unregister(jobId: string): boolean;
        start(onTrigger: (job: ScheduledJob) => Promise<void>): void;
        stop(): void;
        listJobs(): ScheduledJob[];
        getJob(jobId: string): ScheduledJob | null;
      }
      ```
    - Internal `setInterval` loop that checks every `tickIntervalMs` if any job's `nextTrigger` is ≤ now
    - Simple cron parsing: support `"HH:MM"` (daily at time) and `"* * * * *"` standard 5-field cron
    - Use `Intl.DateTimeFormat` for timezone-aware time comparison
    - Calculate `nextTrigger` after each execution
    - NO external dependencies (no `node-cron` library)
  - Update `packages/autonomy/src/index.ts`:
    - Export `CronScheduler`, `ScheduledJob`, `CronSchedulerOptions`
  - Do NOT wire it to the engine yet (Task 7)

  **Must NOT do**:
  - MUST NOT modify `TaskQueue`, `AutonomyEngine`, `WorkflowRegistry`, or any existing module
  - MUST NOT install external cron libraries — implement minimal parsing inline
  - MUST NOT build a full cron framework — support daily-at-time and simple patterns only
  - MUST NOT wire to builtin-workflows yet (Task 7)

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: Algorithmic task — cron expression parsing, timezone-aware scheduling, interval-based trigger logic. Requires careful time math.
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - All skills are domain-specific (browser, git, UI) — none apply to scheduler logic

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 6)
  - **Blocks**: Tasks 7, 8
  - **Blocked By**: None (additive module, no dependencies on Wave 1)

  **References**:

  **Pattern References**:
  - `packages/autonomy/src/scheduler.ts:1-194` — Existing `TaskQueue`: follow the same code style (TypeScript, explicit types, no default exports, clone patterns for returned objects). CronScheduler is a SIBLING module, not a replacement.
  - `packages/autonomy/src/index.ts:1-64` — Export pattern: named exports grouped by module with explicit type re-exports. Add CronScheduler exports in same style.
  - `packages/autonomy/src/types.ts:1-41` — Schema pattern: Zod schemas for validation. Consider adding `ScheduledJobSchema` for persistence validation.

  **Test References**:
  - `packages/autonomy/src/__tests__/scheduler.test.ts` — Existing test patterns: `describe`/`it` blocks with `expect()` assertions via bun test. New CronScheduler tests should follow same structure.

  **External References**:
  - Standard 5-field cron: `minute hour day-of-month month day-of-week`. For this implementation, only need to support: `"0 9 * * *"` (daily at 9am) and shorthand `"09:00"`.

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: CronScheduler module exists and exports correctly
    Tool: Bash
    Preconditions: cron-scheduler.ts created
    Steps:
      1. ls packages/autonomy/src/cron-scheduler.ts
      2. Assert: file exists
      3. grep -n "export class CronScheduler" packages/autonomy/src/cron-scheduler.ts
      4. Assert: exactly one match
      5. grep -n "CronScheduler" packages/autonomy/src/index.ts
      6. Assert: at least one match (exported)
    Expected Result: CronScheduler exists and is exported from autonomy package
    Evidence: File listing + grep output

  Scenario: Existing autonomy tests still pass
    Tool: Bash
    Preconditions: cron-scheduler.ts added, index.ts updated
    Steps:
      1. cd packages/autonomy && bun test
      2. Assert: exit code 0
      3. Assert: output shows all existing tests passing
    Expected Result: Zero regressions in existing tests
    Evidence: Test output captured

  Scenario: CronScheduler API is complete
    Tool: Bash
    Preconditions: cron-scheduler.ts created
    Steps:
      1. grep -n "register\|unregister\|start\|stop\|listJobs\|getJob" packages/autonomy/src/cron-scheduler.ts
      2. Assert: all 6 methods exist
      3. grep -n "interface ScheduledJob" packages/autonomy/src/cron-scheduler.ts
      4. Assert: exists
      5. grep -n "setInterval\|clearInterval" packages/autonomy/src/cron-scheduler.ts
      6. Assert: interval-based tick loop present
    Expected Result: All required API methods and tick loop implemented
    Evidence: grep output captured
  ```

  **Commit**: YES
  - Message: `feat(autonomy): add CronScheduler for time-based workflow execution`
  - Files: `packages/autonomy/src/cron-scheduler.ts`, `packages/autonomy/src/index.ts`
  - Pre-commit: `cd packages/autonomy && bun test` → all pass

---

- [x] 6. Delete Dead Code + Portability Sweep

  **What to do**:
  - Delete `~/.config/opencode/skills/workflow-orchestrator/run-daily.sh` — dead code with hardcoded `/Users/kendrick`
  - Delete `~/.config/opencode/skills/workflow-orchestrator/src/chrome-preflight.ts` — replaced by chrome-bridge.ts imports in Task 1
  - Sweep ALL files in `~/.config/opencode/skills/workflow-orchestrator/src/` for:
    - Any remaining hardcoded paths containing `/Users/` or `kendrick`
    - Any remaining imports of `chrome-preflight`
    - Any remaining references to the old `WorkflowConfig` type name
    - Any remaining references to `GrokSuggestion` in workflow-orchestrator (should be `ContentSuggestion` after Task 3)
  - Verify no broken imports exist after deletions
  - Update `SKILL.md` and `QUICKSTART.md` to reflect new `init` command and config structure

  **Must NOT do**:
  - MUST NOT modify files in other skills (email-reader, social-poster, voice-learner)
  - MUST NOT restructure directory layout
  - MUST NOT add new functionality — this is cleanup only

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: File deletion + search-and-verify sweep. Mechanical, not complex.
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `git-master`: Could be useful for commit but grouping with Wave 2 commit

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5)
  - **Blocks**: Task 9
  - **Blocked By**: Tasks 1, 2, 3 (must wait for all replacements before deleting)

  **References**:

  **Files to Delete**:
  - `~/.config/opencode/skills/workflow-orchestrator/run-daily.sh` — Shell script with `HOME=/Users/kendrick` at line 5. Dead code — scheduling now handled by CronScheduler.
  - `~/.config/opencode/skills/workflow-orchestrator/src/chrome-preflight.ts` — 96-line file that spawns Chrome with clean profile. Replaced by chrome-bridge.ts imports in Task 1.

  **Files to Sweep**:
  - `~/.config/opencode/skills/workflow-orchestrator/src/daily-workflow.ts` — verify no hardcoded paths remain after Tasks 1-3
  - `~/.config/opencode/skills/workflow-orchestrator/src/cli.ts` — verify no old type references
  - `~/.config/opencode/skills/workflow-orchestrator/src/types.ts` — verify clean type definitions
  - `~/.config/opencode/skills/workflow-orchestrator/SKILL.md` — update CLI usage docs
  - `~/.config/opencode/skills/workflow-orchestrator/QUICKSTART.md` — update setup instructions

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Dead files are deleted
    Tool: Bash
    Preconditions: Tasks 1-3 completed
    Steps:
      1. ls ~/.config/opencode/skills/workflow-orchestrator/run-daily.sh 2>&1
      2. Assert: "No such file or directory"
      3. ls ~/.config/opencode/skills/workflow-orchestrator/src/chrome-preflight.ts 2>&1
      4. Assert: "No such file or directory"
    Expected Result: Both dead files removed
    Evidence: ls error output captured

  Scenario: No hardcoded user paths remain
    Tool: Bash
    Preconditions: All source files updated
    Steps:
      1. grep -r "/Users/" ~/.config/opencode/skills/workflow-orchestrator/src/ 2>/dev/null || echo "CLEAN"
      2. Assert: output is "CLEAN" (no matches)
      3. grep -r "kendrick" ~/.config/opencode/skills/workflow-orchestrator/src/ 2>/dev/null || echo "CLEAN"
      4. Assert: output is "CLEAN" (no matches)
    Expected Result: Zero hardcoded user-specific paths
    Evidence: grep output captured

  Scenario: No broken imports
    Tool: Bash
    Preconditions: chrome-preflight.ts deleted
    Steps:
      1. grep -r "chrome-preflight" ~/.config/opencode/skills/workflow-orchestrator/src/ 2>/dev/null || echo "CLEAN"
      2. Assert: output is "CLEAN" (no remaining imports)
      3. grep -r "WorkflowConfig" ~/.config/opencode/skills/workflow-orchestrator/src/ 2>/dev/null || echo "CLEAN"
      4. Assert: output is "CLEAN" (old type name removed)
    Expected Result: No references to deleted/renamed items
    Evidence: grep output captured

  Scenario: SKILL.md documents init command
    Tool: Bash
    Preconditions: SKILL.md updated
    Steps:
      1. grep -i "init" ~/.config/opencode/skills/workflow-orchestrator/SKILL.md
      2. Assert: init command documented
    Expected Result: Documentation reflects new CLI commands
    Evidence: grep output captured
  ```

  **Commit**: YES (groups with Tasks 4, 5 — end of Wave 2)
  - Message: `chore(workflow): delete dead code (chrome-preflight, run-daily.sh), portability sweep`
  - Files: deleted `run-daily.sh`, deleted `chrome-preflight.ts`, updated `SKILL.md`, updated `QUICKSTART.md`

---

- [x] 7. Wire CronScheduler to Builtin Workflows

  **What to do**:
  - Update `packages/autonomy/src/builtin-workflows.ts`:
    - Add schedule configuration to `DAILY_GROK` workflow or alongside it
    - Create a `registerBuiltinSchedules(scheduler: CronScheduler, userConfigPath?: string)` function:
      - Reads `UserConfig` from `~/.config/opencode/workflow-user-config.json` if it exists
      - If config exists and has `scheduleTime`, registers a cron job for `daily-grok` workflow
      - Job uses `userConfig.scheduleTime` and `userConfig.timezone`
    - Export the new function
  - Update `packages/autonomy/src/index.ts`:
    - Export `registerBuiltinSchedules`
  - Add `schedule` command to `~/.config/opencode/skills/workflow-orchestrator/src/cli.ts`:
    - `workflow-orchestrator schedule` — shows current schedule status
    - Reads UserConfig, displays when next run is configured
    - Note: actual scheduling happens when Arachne server starts (not via CLI)

  **Must NOT do**:
  - MUST NOT modify `AutonomyEngine`, `TaskQueue`, `WorkflowRegistry` APIs
  - MUST NOT implement the Arachne server startup wiring (that's for the server's init code, out of scope)
  - MUST NOT auto-start the scheduler from CLI — it requires Arachne server running

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small wiring task — read config file, call `scheduler.register()`, add one CLI command
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 8)
  - **Blocks**: Task 9
  - **Blocked By**: Task 5 (needs CronScheduler)

  **References**:

  **Pattern References**:
  - `packages/autonomy/src/builtin-workflows.ts:1-30` — Current `DAILY_GROK` definition and `registerBuiltinWorkflows()`. Add `registerBuiltinSchedules()` in same style — simple function that takes a scheduler and registers jobs.
  - `packages/autonomy/src/cron-scheduler.ts` — CronScheduler API (created in Task 5): `register()` takes `{ workflowName, cronExpression, timezone, enabled }`.

  **Config References**:
  - `~/.config/opencode/workflow-user-config.json` — `UserConfig` (created in Task 2/4): `scheduleTime` ("09:00") and `timezone` ("America/Los_Angeles") fields drive the cron job.

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: registerBuiltinSchedules function exists and exports
    Tool: Bash
    Preconditions: builtin-workflows.ts updated
    Steps:
      1. grep -n "registerBuiltinSchedules" packages/autonomy/src/builtin-workflows.ts
      2. Assert: function defined
      3. grep -n "registerBuiltinSchedules" packages/autonomy/src/index.ts
      4. Assert: exported
      5. grep -n "CronScheduler" packages/autonomy/src/builtin-workflows.ts
      6. Assert: imported and used
    Expected Result: Schedule registration function exists and is exported
    Evidence: grep output captured

  Scenario: CLI schedule command exists
    Tool: Bash
    Preconditions: cli.ts updated
    Steps:
      1. grep -n "schedule" ~/.config/opencode/skills/workflow-orchestrator/src/cli.ts
      2. Assert: schedule case in switch statement
    Expected Result: Schedule command in CLI
    Evidence: grep output captured

  Scenario: Existing tests still pass
    Tool: Bash
    Preconditions: builtin-workflows.ts and index.ts updated
    Steps:
      1. cd packages/autonomy && bun test
      2. Assert: exit code 0
    Expected Result: No regressions
    Evidence: Test output captured
  ```

  **Commit**: YES (groups with Task 8)
  - Message: `feat(autonomy): wire CronScheduler to builtin workflows, add schedule CLI command`
  - Files: `packages/autonomy/src/builtin-workflows.ts`, `packages/autonomy/src/index.ts`, `~/.config/opencode/skills/workflow-orchestrator/src/cli.ts`

---

- [x] 8. Tests for CronScheduler

  **What to do**:
  - Create `packages/autonomy/src/__tests__/cron-scheduler.test.ts`:
    - Test `register()`: returns job ID, job appears in `listJobs()`
    - Test `unregister()`: removes job, returns false for non-existent ID
    - Test `getJob()`: returns correct job, null for non-existent
    - Test cron parsing: `"09:00"` maps to daily-at-9am, `"0 9 * * *"` equivalent
    - Test timezone handling: job with `America/New_York` timezone calculates correct next trigger
    - Test `start()`/`stop()`: callback fires when time matches, stops after `stop()` called
    - Test tick logic: mock time (via fake timers or direct `nextTrigger` manipulation) to verify trigger fires at correct time
    - Test edge case: job with `enabled: false` doesn't trigger
    - Test `listJobs()` returns cloned objects (mutations don't affect internal state)
  - Follow existing test patterns from `scheduler.test.ts`
  - Run with `cd packages/autonomy && bun test`

  **Must NOT do**:
  - MUST NOT modify existing test files
  - MUST NOT install additional test libraries
  - MUST NOT test integration with workflows (unit tests only)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Straightforward test writing following existing patterns
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 7)
  - **Blocks**: Task 9
  - **Blocked By**: Task 5 (needs CronScheduler implementation to test against)

  **References**:

  **Test References**:
  - `packages/autonomy/src/__tests__/scheduler.test.ts` — Existing test file: follow its `describe`/`it` structure, `expect()` assertions, and file organization pattern.

  **Implementation References**:
  - `packages/autonomy/src/cron-scheduler.ts` — The module under test (created in Task 5): CronScheduler API with register/unregister/start/stop/listJobs/getJob methods.

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: CronScheduler tests exist and pass
    Tool: Bash
    Preconditions: cron-scheduler.test.ts created
    Steps:
      1. ls packages/autonomy/src/__tests__/cron-scheduler.test.ts
      2. Assert: file exists
      3. cd packages/autonomy && bun test src/__tests__/cron-scheduler.test.ts
      4. Assert: exit code 0
      5. Assert: output shows multiple test cases passing
    Expected Result: All CronScheduler tests pass
    Evidence: Test output captured

  Scenario: All autonomy tests pass together
    Tool: Bash
    Preconditions: New test file added
    Steps:
      1. cd packages/autonomy && bun test
      2. Assert: exit code 0
      3. Assert: output includes both scheduler.test.ts and cron-scheduler.test.ts
    Expected Result: No regressions, all tests green
    Evidence: Full test output captured
  ```

  **Commit**: YES (groups with Task 7)
  - Message: `test(autonomy): add CronScheduler unit tests`
  - Files: `packages/autonomy/src/__tests__/cron-scheduler.test.ts`
  - Pre-commit: `cd packages/autonomy && bun test` → all pass

---

- [x] 9. End-to-End Dry-Run Verification

  **What to do**:
  - Create a test user config via `workflow-orchestrator init --non-interactive` (or write config JSON directly)
  - Run `workflow-orchestrator dry-run` and verify the full pipeline executes without errors
  - Verify each stage produces output:
    - Config loads correctly (UserConfig + RuntimeState)
    - Chrome CDP check runs (may fail if Chrome not running — that's OK in dry-run, verify error message is clear)
    - Content source factory resolves `"grok-email"` to `GrokEmailSource`
    - If Chrome IS running with CDP: email fetch attempts to run
    - Status command shows correct output after dry-run
  - Run `bun run build` in the Arachne monorepo to verify no TypeScript compilation errors from autonomy changes
  - Run `cd packages/autonomy && bun test` to verify all tests pass
  - Grep the entire workflow-orchestrator skill for any remaining hardcoded paths

  **Must NOT do**:
  - MUST NOT actually post tweets (dry-run only)
  - MUST NOT modify any code — this is verification only
  - MUST NOT skip the portability grep

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Integration verification requiring careful interpretation of CLI output, multiple verification steps
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (final task)
  - **Blocks**: None (final)
  - **Blocked By**: ALL previous tasks

  **References**:

  **Verification Commands**:
  - `npx tsx ~/.config/opencode/skills/workflow-orchestrator/src/cli.ts init --non-interactive` — should create config
  - `npx tsx ~/.config/opencode/skills/workflow-orchestrator/src/cli.ts dry-run` — should attempt full pipeline
  - `npx tsx ~/.config/opencode/skills/workflow-orchestrator/src/cli.ts status` — should show config/state
  - `npx tsx ~/.config/opencode/skills/workflow-orchestrator/src/cli.ts schedule` — should show schedule info
  - `cd packages/autonomy && bun test` — all tests pass
  - `bun run build` — monorepo builds clean
  - `grep -r "/Users/" ~/.config/opencode/skills/workflow-orchestrator/src/` — zero matches

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Init creates valid config files
    Tool: Bash
    Preconditions: All tasks 1-8 completed
    Steps:
      1. rm -f ~/.config/opencode/workflow-user-config.json ~/.config/opencode/workflow-runtime-state.json
      2. npx tsx ~/.config/opencode/skills/workflow-orchestrator/src/cli.ts init --non-interactive 2>&1
      3. Assert: exit code 0
      4. cat ~/.config/opencode/workflow-user-config.json | python3 -m json.tool
      5. Assert: valid JSON with xHandle, contentSource, scheduleTime, timezone
      6. cat ~/.config/opencode/workflow-runtime-state.json | python3 -m json.tool
      7. Assert: valid JSON with lastRun: null, postedToday: 0
    Expected Result: Both config files created with valid structure
    Evidence: JSON contents captured

  Scenario: Dry-run executes pipeline stages
    Tool: Bash
    Preconditions: Config files exist from init
    Steps:
      1. npx tsx ~/.config/opencode/skills/workflow-orchestrator/src/cli.ts dry-run 2>&1
      2. Assert: output contains "[workflow] Starting DRY RUN"
      3. Assert: output mentions Chrome/CDP check (success or clear error)
      4. Assert: output mentions content source
      5. Assert: no unhandled exceptions or stack traces
    Expected Result: Dry-run completes with clear stage-by-stage output
    Evidence: Full CLI output captured

  Scenario: Status command shows correct state
    Tool: Bash
    Preconditions: Dry-run has been executed
    Steps:
      1. npx tsx ~/.config/opencode/skills/workflow-orchestrator/src/cli.ts status 2>&1
      2. Assert: output shows Last Run timestamp
      3. Assert: output shows Posted Today count
      4. Assert: output shows Processed Emails count
    Expected Result: Status reflects post-dry-run state
    Evidence: CLI output captured

  Scenario: Schedule command shows configured time
    Tool: Bash
    Preconditions: Config files exist
    Steps:
      1. npx tsx ~/.config/opencode/skills/workflow-orchestrator/src/cli.ts schedule 2>&1
      2. Assert: output mentions schedule time from config
    Expected Result: Schedule info displayed
    Evidence: CLI output captured

  Scenario: Autonomy package tests all pass
    Tool: Bash
    Preconditions: CronScheduler + tests added
    Steps:
      1. cd packages/autonomy && bun test 2>&1
      2. Assert: exit code 0
      3. Assert: scheduler.test.ts passes
      4. Assert: cron-scheduler.test.ts passes
    Expected Result: All tests green
    Evidence: Test output captured

  Scenario: Monorepo builds clean
    Tool: Bash
    Preconditions: All code changes complete
    Steps:
      1. bun run build 2>&1
      2. Assert: exit code 0
      3. Assert: no TypeScript errors
    Expected Result: Clean build
    Evidence: Build output captured

  Scenario: Zero hardcoded paths remain
    Tool: Bash
    Preconditions: All cleanup done
    Steps:
      1. grep -r "/Users/" ~/.config/opencode/skills/workflow-orchestrator/src/ 2>/dev/null || echo "CLEAN"
      2. Assert: "CLEAN"
      3. grep -r "kendrick" ~/.config/opencode/skills/workflow-orchestrator/src/ 2>/dev/null || echo "CLEAN"
      4. Assert: "CLEAN"
      5. grep -r "chrome-preflight" ~/.config/opencode/skills/workflow-orchestrator/src/ 2>/dev/null || echo "CLEAN"
      6. Assert: "CLEAN"
    Expected Result: No hardcoded paths, no deleted file references
    Evidence: grep output captured
  ```

  **Commit**: NO (verification only, no code changes)

---

## Commit Strategy

| After Task(s) | Message | Key Files | Verification |
|----------------|---------|-----------|--------------|
| 1, 2, 3 (Wave 1) | `fix(workflow): unify Chrome CDP, split config, abstract content sources` | daily-workflow.ts, types.ts, sources/*.ts | grep for old imports → empty |
| 4 | `feat(workflow): add CLI init wizard with pre-flight checks` | cli.ts | `cli.ts init --non-interactive` → exit 0 |
| 5 | `feat(autonomy): add CronScheduler for time-based workflow execution` | cron-scheduler.ts, index.ts | `bun test` → pass |
| 6 | `chore(workflow): delete dead code, portability sweep` | -run-daily.sh, -chrome-preflight.ts, SKILL.md | `grep -r /Users/` → empty |
| 7, 8 (Wave 3) | `feat(autonomy): wire CronScheduler to builtins, add tests` | builtin-workflows.ts, cron-scheduler.test.ts | `bun test` → all pass |

---

## Success Criteria

### Verification Commands
```bash
# All autonomy tests pass
cd packages/autonomy && bun test              # Expected: all pass

# Monorepo builds
bun run build                                  # Expected: exit 0

# CLI commands work
npx tsx ~/.config/opencode/skills/workflow-orchestrator/src/cli.ts init --non-interactive  # Expected: config created
npx tsx ~/.config/opencode/skills/workflow-orchestrator/src/cli.ts status                   # Expected: shows state
npx tsx ~/.config/opencode/skills/workflow-orchestrator/src/cli.ts dry-run                  # Expected: pipeline runs
npx tsx ~/.config/opencode/skills/workflow-orchestrator/src/cli.ts schedule                 # Expected: shows schedule

# Portability
grep -r "/Users/" ~/.config/opencode/skills/workflow-orchestrator/src/    # Expected: empty
grep -r "kendrick" ~/.config/opencode/skills/workflow-orchestrator/src/   # Expected: empty
grep -r "chrome-preflight" ~/.config/opencode/skills/workflow-orchestrator/src/  # Expected: empty
```

### Final Checklist
- [ ] All "Must Have" items present
- [ ] All "Must NOT Have" guardrails respected
- [ ] All autonomy package tests pass
- [ ] Monorepo builds clean
- [ ] CLI init → dry-run → status pipeline works end-to-end
- [ ] Zero hardcoded user-specific paths
- [ ] CronScheduler can register and list scheduled jobs
- [ ] chrome-preflight.ts and run-daily.sh deleted
- [ ] Content source abstraction in place with GrokEmailSource adapter
