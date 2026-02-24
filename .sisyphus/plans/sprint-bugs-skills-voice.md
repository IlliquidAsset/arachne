# Sprint: Dashboard Bugs → Skills Ecosystem → Security Stub → Voice Activation

## TL;DR

> **Quick Summary**: Fix 5 dashboard bugs blocking daily use, install 29 community skills and build 21 custom skills with thin selective-loading architecture, stub out admin/settings menu with security audit placeholder, and activate the existing voice pipeline (Whisper STT + Kokoro TTS) that's 80%+ built.
> 
> **Deliverables**:
> - 5 dashboard bugs fixed (sidebar pollution, question tool, thinking panel, new chat, TUI fork)
> - 50 skills installed/built with thin loading architecture
> - Overture evaluated and integrated as external planning framework if compatible
> - Admin/settings menu stub with security audit placeholder
> - Voice pipeline running end-to-end (mic → transcription → LLM → audio out)
> 
> **Estimated Effort**: XL (multi-day sprint)
> **Parallel Execution**: YES - 5 waves
> **Critical Path**: Bug fixes → Skills infra validation → Skills install/build → Security/Voice

---

## Context

### Original Request
User wants a priority-ordered sprint: bugs first, then skills ecosystem buildout (install community + build custom, with "thin" architecture to avoid token/latency bloat), then security audit feature stub, then voice activation.

### Interview Summary
**Key Discussions**:
- **Priority order**: Bugs → Skills → Security → Voice (user: "Bugs first")
- **Skills architecture**: Option B selected — "thin" selective loading via Arachne layer, not fat/always-loaded (user: "I just want you to be conscious of how the structure - whatever you choose to do - is likely going to have tradeoffs with latency and token usage")
- **Skills scope**: All 5 tiers from top-50 list. Install 29 community, build 21 custom.
- **Security**: "openclaw security audit --deep" — lives in admin/settings menu, stub menu out
- **Voice**: Activate existing pipeline, don't build from scratch — it's 80%+ done
- **Portability**: "this doesn't need to work just for me, it needs to work for whoever else installs Arachne for themselves"

**Research Findings**:
- `isRealSession()` in sidebar ignores `parentID` — root cause of sub-agent pollution
- Voice pipeline: 26 files, full STT+TTS+WebSocket+LLMBridge, dashboard already has mic button
- Skills scanner has duplicate scope paths (opencode-project and project both → `${projectRoot}/.opencode/skills`)
- OpenCode loads ALL installed skills into context — no native lazy loading
- `use-chat-stream.ts:156` checks `toolName === "mcp_question"` — needs verification against actual SSE events
- Thinking panel uses two disconnected data sources that don't coordinate properly
- LLM Bridge polls at 250ms for voice responses — adds latency

### Metis Review
**Identified Gaps** (addressed):
- SSE event shape must be inspected BEFORE coding question tool fix — added as prerequisite step
- Sidebar filter must cover 3 categories: sub-agents (parentID), voice sessions (title pattern), stubs (existing)
- Thin skill architecture may be blocked if OpenCode API doesn't support skill filtering — added validation task as gate
- Voice dependencies may not be installed locally — added validation before voice tasks
- LLM Bridge polling latency for voice — noted as known limitation, not blocking activation

---

## Work Objectives

### Core Objective
Stabilize the dashboard for daily use, build out the skill ecosystem with token-conscious architecture, stub admin infrastructure, and activate the pre-built voice pipeline.

### Concrete Deliverables
- `session-sidebar.tsx` and `projects/[id]/page.tsx` — sub-agent sessions hidden from sidebar
- `use-chat-stream.ts` — question tool rendering working for Prometheus interviews
- `use-thinking.ts` / `use-chat-stream.ts` — thinking panel shows live reasoning
- New Chat behavior — context-appropriate session creation
- TUI/UI fork — root cause documented, fix applied or deferred with rationale
- 29 community skills installed in `~/.config/opencode/skills/`
- 21 custom skills built and installed
- Thin skill loading mechanism in Arachne dispatch layer
- Overture (`SixHq/Overture`) integrated as optional MCP planning layer (prefer out-of-box)
- `/admin` route with settings menu stub
- Security audit placeholder under admin menu
- Voice pipeline running: `startVoice()` → WebSocket → mic input → STT → LLM → TTS → audio out

### Definition of Done
- [ ] `bun run build` succeeds for all packages
- [ ] Dashboard loads without console errors
- [ ] Sub-agent sessions invisible in sidebar
- [ ] Prometheus Question tool renders in dashboard
- [ ] Voice responds to mic input with audio output
- [ ] Skills load selectively per dispatch context

### Must Have
- Sub-agent sidebar fix (parentID filtering)
- Question tool rendering for Prometheus interviews
- Thin skill architecture (not fat/always-loaded)
- Voice pipeline activated and testable
- Admin menu route exists (even if stub)

### Must NOT Have (Guardrails)
- **No fat skill loading** — never inject all 50 skills into every context
- **No voice rebuild** — activate existing code, don't rewrite it
- **No full admin panel** — stub only, not a complete settings UI
- **No mobile overhaul** — separate plan (rated 4/10 but scoped out)
- **No streaming thinking rewrite** — fix the data source coordination, don't rebuild SSE
- **No AI slop**: no over-abstraction, no unnecessary utilities, no excessive error types
- **No hardcoded paths** — must work for any Arachne installer, not just Kendrick's machine
- **Prefer vendor-maintained frameworks** — when Overture fits, avoid reimplementing equivalent planning UI

---

## Verification Strategy

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.
> Every criterion is agent-executable via Playwright, bash, curl, or tmux.

### Test Decision
- **Infrastructure exists**: YES (bun test exists, packages have test files)
- **Automated tests**: Tests-after (add tests for new functionality, don't TDD the bug fixes)
- **Framework**: bun test

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

Every task includes specific Playwright/bash/curl verification scenarios. The executing agent directly verifies each deliverable.

**Verification Tool by Deliverable Type:**

| Type | Tool | How Agent Verifies |
|------|------|-------------------|
| **Dashboard UI** | Playwright | Navigate, interact, assert DOM, screenshot |
| **Skills** | Bash | Check file exists, validate YAML frontmatter, verify scanner picks it up |
| **Voice** | interactive_bash (tmux) | Start voice server, send audio, check transcription + response |
| **API/Backend** | Bash (curl) | Hit endpoints, parse responses, assert fields |

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — Bug Fixes):
├── Task 1: Sidebar sub-agent filtering (parentID + voice + stub)
├── Task 2: Question tool SSE inspection + fix
├── Task 3: Thinking panel data source coordination
├── Task 4: New Chat context investigation + fix
└── Task 5: TUI/UI fork investigation + document

Wave 2 (After Wave 1 — Skills Infrastructure):
└── Task 6: Validate thin skill architecture feasibility + implement gate

Wave 3 (After Wave 2 — Skills Install + Build):
├── Task 7: Install 29 community skills (batch)
├── Task 8: Build 21 custom skills (grouped by tier)
└── Task 9: Thin loading mechanism in dispatch layer

Wave 4 (After Wave 1 — Security/Admin, parallel with Wave 2/3):
├── Task 10: Admin/settings menu route stub
└── Task 11: Security audit placeholder

Wave 5 (After Wave 1 — Voice Activation, parallel with Wave 2/3):
├── Task 12: Validate voice dependencies locally
├── Task 13: Wire voice server to orchestrator startup
└── Task 14: E2E voice test + dashboard integration

Critical Path: Task 1-5 → Task 6 → Tasks 7-9
Parallel Speedup: ~50% faster — Waves 4+5 run alongside Wave 2+3
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 14 (voice sessions need sidebar filter) | 2, 3, 4, 5 |
| 2 | None | None | 1, 3, 4, 5 |
| 3 | None | None | 1, 2, 4, 5 |
| 4 | None | None | 1, 2, 3, 5 |
| 5 | None | None | 1, 2, 3, 4 |
| 6 | None (but logically after bugs) | 7, 8, 9 | 10, 11, 12 |
| 7 | 6 | 9 | 8 |
| 8 | 6 | 9 | 7 |
| 9 | 6, 7, 8 | None | None |
| 10 | None | 11 | 1-5, 6, 12 |
| 11 | 10 | None | 7, 8, 12, 13 |
| 12 | None | 13, 14 | 1-5, 6, 10 |
| 13 | 12 | 14 | 7, 8, 11 |
| 14 | 1, 12, 13 | None | 9, 11 |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1, 2, 3, 4, 5 | 5 parallel: quick/visual-engineering with frontend-ui-ux, playwright |
| 2 | 6 | 1 sequential: deep with no special skills |
| 3 | 7, 8, 9 | 7+8 parallel then 9 sequential |
| 4 | 10, 11 | 10 then 11 sequential: quick |
| 5 | 12, 13, 14 | Sequential: unspecified-high |

---

## TODOs

---

- [x] 1. Fix sub-agent sessions polluting sidebar

  **What to do**:
  - Add `parentID` check to `isRealSession()` in `session-sidebar.tsx:28-32`: if `session.parentID` is truthy, return `false`
  - Apply identical fix to `projects/[id]/page.tsx:19-23` (duplicate `isRealSession`)
  - Also filter voice sessions: add pattern check for title `"Amanda Voice Session"` (from `llm-bridge.ts:4`)
  - Consider adding a more general filter: any session with a title matching known system patterns (voice, task dispatch) should be hidden
  - Refactor: extract `isRealSession` into a shared utility (e.g., `app/lib/session-utils.ts`) so both files import from one place — prevents future drift

  **Must NOT do**:
  - Don't filter by title substring alone (too fragile) — `parentID` is the primary signal for sub-agents
  - Don't delete sessions from the server — only hide from sidebar UI
  - Don't hardcode session titles — use constants or patterns

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 2-file fix, ~10 lines total, well-understood root cause
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Dashboard React component changes
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed for the code change itself (QA uses it but agent loads it for QA automatically)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4, 5)
  - **Blocks**: Task 14 (voice sessions must be filtered before voice E2E test)
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `packages/dashboard/app/chat/components/session-sidebar.tsx:28-32` — Current `isRealSession()` function. Add `if (session.parentID) return false;` as the first check.
  - `packages/dashboard/app/projects/[id]/page.tsx:19-23` — Duplicate `isRealSession()`. Must get the same fix.
  - `packages/dashboard/app/chat/components/session-sidebar.tsx:10` — `STUB_TITLE_PATTERN` regex — existing title-based filter pattern to extend.

  **API/Type References**:
  - `packages/dashboard/app/lib/types.ts` — `SessionInfo` type has `parentID?: string;` already defined.

  **Documentation References**:
  - `packages/orchestrator/src/voice/llm-bridge.ts:4` — `VOICE_SESSION_TITLE = "Amanda Voice Session"` — this title will appear in sidebar if not filtered. Voice sessions don't have `parentID`, so need explicit title pattern match too.

  **Acceptance Criteria**:

  - [ ] `isRealSession()` returns `false` for sessions with `parentID` set
  - [ ] `isRealSession()` returns `false` for sessions titled "Amanda Voice Session"
  - [ ] Both `session-sidebar.tsx` and `projects/[id]/page.tsx` use the same shared utility
  - [ ] `bun run build` succeeds in `packages/dashboard`

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Sub-agent sessions hidden from sidebar
    Tool: Playwright (playwright skill)
    Preconditions: Dashboard running on localhost:3000, at least one session exists with parentID set
    Steps:
      1. Navigate to: http://localhost:3000/chat
      2. Wait for: [data-testid="sidebar-projects-section"] visible (timeout: 10s)
      3. Collect all sidebar session titles: querySelectorAll('[data-testid] a, .session-item')
      4. Assert: No session title contains "Task " prefix (task dispatch sessions)
      5. Assert: No session title contains "Wave " prefix (wave sessions)
      6. Assert: No session title equals "Amanda Voice Session"
      7. Screenshot: .sisyphus/evidence/task-1-sidebar-clean.png
    Expected Result: Sidebar shows only user-initiated sessions
    Evidence: .sisyphus/evidence/task-1-sidebar-clean.png

  Scenario: User-created sessions still visible
    Tool: Playwright (playwright skill)
    Preconditions: Dashboard running, user has real chat sessions
    Steps:
      1. Navigate to: http://localhost:3000/chat
      2. Wait for sidebar to load (timeout: 10s)
      3. Assert: At least 1 session visible in sidebar
      4. Click the first visible session
      5. Assert: Chat area loads messages for that session
      6. Screenshot: .sisyphus/evidence/task-1-real-sessions-visible.png
    Expected Result: Normal sessions render and are clickable
    Evidence: .sisyphus/evidence/task-1-real-sessions-visible.png
  ```

  **Commit**: YES
  - Message: `fix(dashboard): filter sub-agent and voice sessions from sidebar`
  - Files: `packages/dashboard/app/chat/components/session-sidebar.tsx`, `packages/dashboard/app/projects/[id]/page.tsx`, `packages/dashboard/app/lib/session-utils.ts` (new shared util)
  - Pre-commit: `bun run build` in packages/dashboard

---

 - [x] 2. Fix question tool rendering for Prometheus interviews

  **What to do**:
  - **FIRST**: Inspect live SSE events during a Prometheus interview to determine the actual tool name emitted by OpenCode. Run a Prometheus session, trigger a Question tool call, and capture the SSE `tool.execute` event's `data.props.name` field. This determines if the issue is `"mcp_question"` vs `"question"` mismatch.
  - Based on SSE inspection:
    - If tool name is `"question"`: Update `use-chat-stream.ts:156` to match `"question"` instead of `"mcp_question"`
    - If tool name IS `"mcp_question"`: The matching is correct and the bug is elsewhere — investigate the `data.props.input` shape
    - Also check `tool.result` event at line 175 for the same tool name
  - Fix `handleQuestionAnswer` in `chat/page.tsx:45-53`: currently sends answer as a plain message via `sendMessage(answer)`. It should send it as a tool result referencing the `callID`. Investigate whether OpenCode's API has a tool result submission endpoint, or if plain message is actually correct.
  - Verify the `QuestionCard` component renders properly when `pendingQuestion` state is set

  **Must NOT do**:
  - Don't guess the tool name — INSPECT the SSE events first
  - Don't change the question answer flow until understanding how OpenCode expects tool results
  - Don't remove the `mcp_question` handling — update it based on evidence

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Requires SSE event inspection before coding — investigation-then-fix pattern
  - **Skills**: [`playwright`, `frontend-ui-ux`]
    - `playwright`: Need to observe SSE events in browser devtools or intercept network
    - `frontend-ui-ux`: React component + hook changes
  - **Skills Evaluated but Omitted**:
    - `git-master`: Simple commit, not needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4, 5)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `packages/dashboard/app/hooks/use-chat-stream.ts:147-172` — `tool.execute` handler. Line 156: `if (toolName === "mcp_question")` — this is the condition to verify against actual SSE events. Lines 157-171 parse `input.questions` array and set `pendingQuestion` state.
  - `packages/dashboard/app/hooks/use-chat-stream.ts:173-185` — `tool.result` handler. Line 175: `if (data.props?.name === "mcp_question")` — clears `pendingQuestion`. Must match same tool name as line 156.
  - `packages/dashboard/app/chat/page.tsx:45-53` — `handleQuestionAnswer` callback. Currently: `dismissQuestion()` → `addOptimisticMessage(answer)` → `sendMessage(answer)`. Does NOT reference `callID` from `pendingQuestion`. If OpenCode expects tool result callback, this is broken.
  - `packages/dashboard/app/hooks/use-chat-stream.ts:27-38` — `PendingQuestion` interface with `callID?: string`.

  **API/Type References**:
  - `packages/dashboard/app/hooks/use-chat-stream.ts:27-38` — `QuestionOption` and `PendingQuestion` types
  - OpenCode SSE event format: `{ type: "tool.execute", props: { name: string, callID: string, input: unknown } }`

  **Documentation References**:
  - OpenCode API at `localhost:4100` — check if there's a tool result submission endpoint (e.g., `POST /session/{id}/tool-result`)

  **Acceptance Criteria**:

  - [ ] SSE event tool name documented (exact string captured from live event)
  - [ ] `use-chat-stream.ts` tool name check matches actual SSE events
  - [ ] Prometheus Question renders as interactive card in dashboard chat
  - [ ] Selecting an option sends the answer correctly (tool result or message — whichever OpenCode expects)
  - [ ] After answering, question card dismisses and Prometheus continues
  - [ ] `bun run build` succeeds in packages/dashboard

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: SSE event inspection for question tool
    Tool: Bash (curl + SSE monitoring)
    Preconditions: OpenCode server running on localhost:4100
    Steps:
      1. Start SSE listener: curl -N http://localhost:4100/events | tee /tmp/sse-events.log &
      2. Create a new session via API
      3. Send a message that triggers Question tool (e.g., dispatch Prometheus)
      4. Wait 30s for events to accumulate
      5. grep "tool.execute" /tmp/sse-events.log
      6. Extract the props.name field value
      7. Document the exact tool name string
    Expected Result: Captured the exact tool name OpenCode emits for Question tool
    Evidence: /tmp/sse-events.log

  Scenario: Question tool renders in dashboard
    Tool: Playwright (playwright skill)
    Preconditions: Dashboard running on localhost:3000, Prometheus session active with Question tool pending
    Steps:
      1. Navigate to: http://localhost:3000/chat
      2. Select the session where Prometheus is asking a question
      3. Wait for: question card / selection UI visible (timeout: 15s)
      4. Assert: Question text is visible
      5. Assert: At least 2 option buttons/radio buttons visible
      6. Click the first option
      7. Wait for: question card to dismiss (timeout: 5s)
      8. Assert: New assistant message appears (Prometheus continues)
      9. Screenshot: .sisyphus/evidence/task-2-question-rendered.png
    Expected Result: Interactive question UI appears and accepts answers
    Evidence: .sisyphus/evidence/task-2-question-rendered.png

  Scenario: Question tool not rendered (negative — before fix)
    Tool: Playwright (playwright skill)
    Preconditions: Verify current broken behavior first
    Steps:
      1. Navigate to dashboard with active Prometheus question
      2. Assert: No question card visible — OR — shows "question running..." in thinking drawer
      3. Screenshot: .sisyphus/evidence/task-2-before-fix.png
    Expected Result: Documents current broken state for comparison
    Evidence: .sisyphus/evidence/task-2-before-fix.png
  ```

  **Commit**: YES
  - Message: `fix(dashboard): render Prometheus question tool in chat UI`
  - Files: `packages/dashboard/app/hooks/use-chat-stream.ts`, `packages/dashboard/app/chat/page.tsx`
  - Pre-commit: `bun run build` in packages/dashboard

---

- [x] 3. Fix thinking panel showing stale/empty content

  **What to do**:
  - Root cause: Two disconnected data sources feed `useThinking`:
    1. **Persisted**: `msg.parts` from `useMessages` — contains reasoning from completed messages
    2. **Live**: `currentThinkingParts` from `useChatStream` — SSE events during active response
  - On `session.idle` (line 138-146 of `use-chat-stream.ts`), `currentThinkingParts` is cleared to `[]`. But `useThinking` then falls back to persisted data, which may be stale (previous response) or empty (current response not yet persisted).
  - Fix approach:
    - During streaming (`isStreaming === true`): show ONLY `currentThinkingParts` (live data). Don't mix with persisted.
    - After `session.idle`: trigger `refetch()` to get fresh persisted data with current response's parts, THEN clear `currentThinkingParts`.
    - Key insight: `session.idle` fires → `onStreamCompleteRef.current?.()` calls `refetch()` → but `setCurrentThinkingParts([])` happens synchronously BEFORE refetch resolves. Fix: delay clearing live parts until after refetch completes.
  - In `useThinking` hook: add the `isStreaming` flag as a parameter. When streaming, prioritize live session. When idle, show persisted only.

  **Must NOT do**:
  - Don't rebuild the SSE event handling
  - Don't add new SSE event types
  - Don't change the thinking drawer UI component itself — only fix the data flow

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Requires understanding async data flow coordination between two React hooks
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: React hooks state management pattern
  - **Skills Evaluated but Omitted**:
    - `playwright`: QA only, loaded automatically

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4, 5)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `packages/dashboard/app/hooks/use-thinking.ts:26-124` — Full `useThinking` hook. Lines 102-120: appends `currentThinkingParts` as a "live" session with `messageId: "live"`. Problem: this exists alongside persisted sessions, causing duplicates/stale data.
  - `packages/dashboard/app/hooks/use-chat-stream.ts:138-146` — `session.idle` handler. Line 144: `setCurrentThinkingParts([])` clears live data synchronously. Line 146: `onStreamCompleteRef.current?.()` triggers `refetch()` — but refetch is async, so persisted data isn't updated yet when thinking parts clear.
  - `packages/dashboard/app/hooks/use-chat-stream.ts:119-137` — `message.updated` handler. Lines 127-136: extracts reasoning parts from updated message and appends to `currentThinkingParts`. This is the ONLY source of thinking data during streaming.
  - `packages/dashboard/app/chat/page.tsx:43` — `useThinking(messages, currentThinkingParts, activeSessionId)` — the composition point where both data sources merge.

  **API/Type References**:
  - `packages/dashboard/app/hooks/use-chat-stream.ts:14-25` — `ThinkingPart` interface
  - `packages/dashboard/app/hooks/use-thinking.ts:6-18` — `ThinkingEntry` interface
  - `packages/dashboard/app/hooks/use-thinking.ts:20-24` — `ThinkingSession` interface

  **Acceptance Criteria**:

  - [ ] While agent is responding: thinking panel shows live reasoning/tool events as they arrive
  - [ ] After response completes: thinking panel shows the persisted reasoning for that response (not stale data from previous response)
  - [ ] No duplicate entries between live and persisted data
  - [ ] `bun run build` succeeds in packages/dashboard

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Thinking panel shows live data during response
    Tool: Playwright (playwright skill)
    Preconditions: Dashboard on localhost:3000, thinking drawer open
    Steps:
      1. Navigate to: http://localhost:3000/chat
      2. Select an active session
      3. Open thinking drawer (click expand button or panel)
      4. Send a message that triggers agent work (e.g., "What files are in this project?")
      5. Wait for: "thinking" or "reasoning" content to appear in drawer (timeout: 15s)
      6. Assert: At least one thinking entry visible (reasoning text or tool-start)
      7. Assert: Entries have timestamps and are ordered
      8. Screenshot: .sisyphus/evidence/task-3-live-thinking.png
    Expected Result: Live thinking content streams into panel during response
    Evidence: .sisyphus/evidence/task-3-live-thinking.png

  Scenario: Thinking panel updates after response completes
    Tool: Playwright (playwright skill)
    Preconditions: Dashboard on localhost:3000, previous scenario completed
    Steps:
      1. Wait for: agent response to complete (streaming stops, message finalizes)
      2. Wait 2s for refetch to complete
      3. Assert: Thinking panel still shows entries (not blank)
      4. Assert: Entries correspond to the LATEST response, not a previous one
      5. Screenshot: .sisyphus/evidence/task-3-post-idle-thinking.png
    Expected Result: Persisted thinking data replaces live data seamlessly
    Evidence: .sisyphus/evidence/task-3-post-idle-thinking.png
  ```

  **Commit**: YES
  - Message: `fix(dashboard): coordinate live and persisted thinking data sources`
  - Files: `packages/dashboard/app/hooks/use-thinking.ts`, `packages/dashboard/app/hooks/use-chat-stream.ts`, `packages/dashboard/app/chat/page.tsx`
  - Pre-commit: `bun run build` in packages/dashboard

---

- [x] 4. Investigate and fix New Chat project context inheritance

  **What to do**:
  - **Root cause**: SSE stream connects to a single hardcoded project directory in `use-chat-stream.ts:90-93`:
    ```typescript
    const directory = encodeURIComponent(
      process.env.NEXT_PUBLIC_PROJECT_DIR || "/Users/kendrick/Documents/dev/arachne",
    );
    ```
  - This is architectural — every session is scoped to whichever OpenCode server the dashboard connects to. "New Chat" can't create a generic (non-project) chat because there IS only one project context.
  - **Minimal fix for this sprint**: 
    - When user clicks "+ New Chat" from `/chat` (not from `/projects/[id]`), create a session without project scoping
    - Investigate: Does the sessions API support creating sessions without a directory parameter? If yes, use that for "generic" chats.
    - If NOT possible via API: Document this as an architectural limitation. The dashboard currently assumes single-project mode.
  - **For portability**: Remove the hardcoded fallback path. Either require `NEXT_PUBLIC_PROJECT_DIR` to be set, or dynamically detect it from the current project context.

  **Must NOT do**:
  - Don't implement multi-server SSE multiplexing (too complex for this sprint)
  - Don't remove project-scoped sessions (they're useful from `/projects/[id]`)
  - Don't hardcode any machine-specific paths

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Requires investigation of OpenCode session API capabilities, then decision on fix approach
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: React/Next.js routing and state
  - **Skills Evaluated but Omitted**:
    - `playwright`: QA only

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 5)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `packages/dashboard/app/hooks/use-chat-stream.ts:90-93` — Hardcoded directory for SSE connection. This is the root cause — the `directory` parameter scopes ALL events to one project.
  - `packages/dashboard/app/hooks/use-sessions.ts` — Session creation logic. Check how `createSession` works and whether it accepts a directory parameter.
  - `packages/dashboard/app/hooks/use-projects.ts` — `useProjects` hook with `ProjectCard` interface containing `absolutePath`. Could be used to dynamically determine project context.
  - `packages/dashboard/app/chat/page.tsx:21` — `createSession` from `useSessions`. This is called by "+ New Chat" button.

  **API/Type References**:
  - OpenCode API at `localhost:4100` — Check session creation endpoint: `POST /session` — what parameters does it accept? Is `directory` required?
  - `packages/orchestrator/src/client/operations.ts` — `createSession` function — check its signature and what it sends to the server.

  **Documentation References**:
  - OpenCode server API documentation (if available) — session creation with/without project scoping

  **Acceptance Criteria**:

  - [ ] No hardcoded machine-specific paths in `use-chat-stream.ts`
  - [ ] `NEXT_PUBLIC_PROJECT_DIR` or dynamic detection used for project context
  - [ ] Investigation documented: can sessions be project-agnostic?
  - [ ] If fixable: New Chat from `/chat` creates a generic session
  - [ ] If not fixable: Architectural limitation documented in code comments with TODO
  - [ ] `bun run build` succeeds in packages/dashboard

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: No hardcoded paths in built output
    Tool: Bash
    Preconditions: packages/dashboard built
    Steps:
      1. grep -r "kendrick" packages/dashboard/app/hooks/use-chat-stream.ts
      2. Assert: No matches (hardcoded path removed)
      3. grep -r "Documents/dev/arachne" packages/dashboard/app/hooks/
      4. Assert: No matches
    Expected Result: No machine-specific paths in source
    Evidence: grep output captured

  Scenario: New Chat creates session from /chat route
    Tool: Playwright (playwright skill)
    Preconditions: Dashboard running on localhost:3000
    Steps:
      1. Navigate to: http://localhost:3000/chat
      2. Click: "+ New Chat" button
      3. Assert: New session appears in sidebar
      4. Assert: Chat input is focused and ready
      5. Type a test message and send
      6. Assert: Agent responds (not stuck or errored)
      7. Screenshot: .sisyphus/evidence/task-4-new-chat.png
    Expected Result: New chat works without hardcoded project dependency
    Evidence: .sisyphus/evidence/task-4-new-chat.png
  ```

  **Commit**: YES
  - Message: `fix(dashboard): remove hardcoded project path from SSE connection`
  - Files: `packages/dashboard/app/hooks/use-chat-stream.ts`, possibly `packages/dashboard/app/hooks/use-sessions.ts`
  - Pre-commit: `bun run build` in packages/dashboard

---

- [x] 5. Investigate TUI/UI message fork issue

  **What to do**:
  - User reported: after sending messages from both TUI and dashboard UI to the same session, the agent stops responding in the UI.
  - **Investigation steps**:
    1. Check OpenCode server behavior: Does it queue concurrent prompts to the same session, or reject the second one?
    2. Check if the dashboard SSE stream detects responses to messages sent from TUI
    3. Check if the session has a "busy" state that prevents new messages while processing
    4. Look at `sendMessage` in dashboard — does it check session state before sending?
  - **Likely causes**:
    - OpenCode rejects concurrent prompts → second message silently fails
    - SSE stream is filtered by session ID → but events come for ALL sessions on the directory
    - Race condition: both interfaces write to same session, response goes to whichever sent last
  - **Fix approach**: 
    - If OpenCode queues: No fix needed, just document the behavior
    - If OpenCode rejects: Add "busy" state detection in dashboard, show "Agent is working..." and queue the message
    - If it's a UI-only issue: Fix the SSE event handling to not lose messages

  **Must NOT do**:
  - Don't modify OpenCode server behavior
  - Don't implement full message queuing system (backlog item)
  - Don't block TUI usage — this is a power-user workflow

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Investigation-heavy — need to understand OpenCode server concurrency model
  - **Skills**: []
    - No special skills needed — this is mostly API investigation
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: May be needed if fix is UI-side, but investigation first
    - `playwright`: QA only

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 4)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `packages/dashboard/app/hooks/use-chat-stream.ts:96-200` — SSE event handler. Note: SSE connects to `/api/events?directory=...` — this receives ALL events for the directory, not just one session. The `sessionId` filtering happens client-side (or doesn't happen at all — need to verify).
  - `packages/dashboard/app/hooks/use-send-message.ts` — `useSendMessage` hook. Check if it has any busy-state handling.
  - `packages/orchestrator/src/client/operations.ts` — `sendMessageAsync` — check if it handles concurrent sends gracefully.

  **API/Type References**:
  - OpenCode API: `POST /session/{id}/message` — does it return an error if session is busy?
  - SSE events: Do they include a session ID field to filter by?

  **Acceptance Criteria**:

  - [ ] Root cause documented in code comment or investigation log
  - [ ] If fixable: Dashboard handles concurrent session access gracefully (either queues, shows busy state, or prevents)
  - [ ] If not fixable: Documented as known limitation with clear explanation of OpenCode's concurrency model
  - [ ] No regression: sending messages from dashboard alone still works perfectly

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Send message from dashboard while session is idle
    Tool: Playwright (playwright skill)
    Preconditions: Dashboard running, active session selected, agent idle
    Steps:
      1. Navigate to active session in dashboard
      2. Type "Hello, what time is it?" in chat input
      3. Send message
      4. Wait for: agent response (timeout: 30s)
      5. Assert: Response appears in message list
      6. Screenshot: .sisyphus/evidence/task-5-normal-send.png
    Expected Result: Normal message flow works
    Evidence: .sisyphus/evidence/task-5-normal-send.png

  Scenario: Investigate concurrent prompt behavior
    Tool: Bash (curl)
    Preconditions: OpenCode server running on localhost:4100
    Steps:
      1. Create a session: POST /session
      2. Send first message: POST /session/{id}/message {"content": "Count to 100 slowly"}
      3. Immediately send second message: POST /session/{id}/message {"content": "Actually, count to 5"}
      4. Check response codes of both POSTs
      5. Wait 30s, then GET /session/{id}/messages
      6. Document: How many responses? Which messages were processed?
    Expected Result: Understanding of OpenCode's concurrent prompt behavior
    Evidence: Response codes + message list captured
  ```

  **Commit**: YES (if fix applied) | NO (if investigation-only, document in code comments)
  - Message: `fix(dashboard): handle concurrent session access from TUI and UI` OR `docs: document TUI/UI concurrent access limitation`
  - Files: TBD based on investigation
  - Pre-commit: `bun run build` in packages/dashboard

---

- [x] 6. Validate thin skill architecture + implement loading mechanism

  **What to do**:
  - **GATE TASK**: This determines how skills work for the rest of the sprint. Must complete before Tasks 7, 8, 9.
  - **Investigation**:
    1. Check OpenCode session creation API: Does `POST /session` accept a `skills` or `systemPrompt` parameter that would allow per-session skill injection?
    2. Check if OpenCode has a skills filter/disable mechanism (env var, config, API parameter)
    3. Read the OpenCode source (oh-my-opencode or opencode repo) to understand how skills are loaded per session
    4. Evaluate `SixHq/Overture` (`overture-mcp`) as an out-of-box planning/tool framework that remains maintained upstream, and determine how to wire it into Arachne without forking it
  - **Thin architecture options** (in order of preference):
    - **Option O (Preferred when compatible)**: Adopt Overture as an external MCP server for visual planning/approval; keep it vendor-managed and configure Arachne integration points only
    - **Option A**: OpenCode API supports skill filter → pass `load_skills` from Arachne dispatch to OpenCode session creation
    - **Option B**: Filesystem manipulation → before creating a session, symlink/copy only needed skills to a temporary directory, set that as the skills path
    - **Option C**: System prompt instruction → prepend "Only use skills: X, Y, Z. Ignore all others." to the message — fragile but works as fallback
    - **Option D**: Accept always-loaded but organize skills by impact — lightweight skills (tiny SKILL.md) loaded always, heavy skills gated by system prompt
  - **Implementation**: Based on investigation, implement the thin loading mechanism in the Arachne dispatch layer. Modify `dispatch.ts` to support `load_skills` parameter.
  - **Scanner bug fix**: While here, fix the duplicate scope paths in `scanner.ts:113-118` — `opencode-project` and `project` both resolve to `${projectRoot}/.opencode/skills`.

  **Must NOT do**:
  - Don't modify OpenCode server source (we use it as a dependency)
  - Don't implement all options — pick the best one based on investigation
  - Don't make the mechanism so complex it adds latency worse than loading all skills

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Requires deep investigation of OpenCode internals, then architectural decision, then implementation
  - **Skills**: []
    - No special skills — system architecture investigation
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not frontend work
    - `git-master`: Simple commit

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 2) — must complete before Wave 3
  - **Blocks**: Tasks 7, 8, 9
  - **Blocked By**: None (logically after bugs, but no hard dependency)

  **References**:

  **Pattern References**:
  - `packages/skills/src/scanner.ts:111-119` — `getScopeDirs()`. Lines 114 and 116 both resolve to `${projectRoot}/.opencode/skills` — `opencode-project` and `project` are duplicate paths.
  - `packages/orchestrator/src/dispatch/dispatch.ts:50-60` — `resolveSessionId()`. This creates sessions. Would need to pass skill filter if OpenCode supports it.
  - `packages/orchestrator/src/dispatch/types.ts` — `DispatchOptions` type. Would need `loadSkills?: string[]` field.
  - `packages/orchestrator/src/client/operations.ts` — `createSession()`. Check what parameters it sends to OpenCode.

  **API/Type References**:
  - OpenCode API: `POST /session` — check full parameter list
  - `packages/skills/src/types.ts` — `SkillScope`, `SkillInfo`, `SkillFrontmatter` types

  **External References**:
  - OpenCode source: `~/.config/opencode/` or GitHub — how skills are loaded into agent context
  - oh-my-opencode repo (34K★): May have documentation on skill loading mechanism
  - `https://github.com/SixHq/Overture` — Overture MCP server for visual plan mapping, approval, and execution graph; candidate for out-of-box framework maintained by SixHq

  **Acceptance Criteria**:

  - [ ] Investigation documented: How OpenCode loads skills per session (with evidence from source/API)
  - [ ] Overture compatibility decision documented: adopt as-is / integrate partially / reject with rationale
  - [ ] One of Options A-D selected and justified
  - [ ] Thin loading mechanism implemented in dispatch layer
  - [ ] Scanner duplicate scope bug fixed (opencode-project ≠ project)
  - [ ] `bun test` passes for skills package
  - [ ] `bun run build` succeeds

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Verify thin loading reduces context
    Tool: Bash
    Preconditions: Multiple skills installed, thin mechanism implemented
    Steps:
      1. Dispatch a task with load_skills=["git-master"]
      2. Check the created session's system prompt / skill context
      3. Assert: Only git-master skill content is present
      4. Assert: Other installed skills (e.g., social-poster) are NOT in context
    Expected Result: Session only contains requested skills
    Evidence: Session context / system prompt captured

  Scenario: Scanner deduplicates scope paths
    Tool: Bash
    Preconditions: Skills scanner fix applied
    Steps:
      1. Run scanner tests: bun test packages/skills/
      2. Assert: All tests pass
      3. Check getScopeDirs() returns unique paths
    Expected Result: No duplicate scope directories
    Evidence: Test output captured
  ```

  **Commit**: YES
  - Message: `feat(skills): implement thin selective skill loading for dispatch`
  - Files: `packages/skills/src/scanner.ts`, `packages/orchestrator/src/dispatch/dispatch.ts`, `packages/orchestrator/src/dispatch/types.ts`, possibly `packages/orchestrator/src/client/operations.ts`
  - Pre-commit: `bun test packages/skills/ && bun run build`

---

- [x] 7. Install 29 community skills

  **What to do**:
  - Install each community skill from the top-50 list (Tiers 1-4, excluding build-ourselves items) into `~/.config/opencode/skills/`
  - For each skill:
    1. Clone or download the repo
    2. Locate the SKILL.md file(s)
    3. Copy to `~/.config/opencode/skills/{skill-name}/SKILL.md`
    4. Validate: YAML frontmatter parses correctly (has `name` and `description`)
    5. If skill needs Arachne adaptation (paths, config, dependencies): modify as needed
  - **Batch approach**: Write a shell script that processes all 29 in sequence, skipping failures with warnings. Max 5 min per skill — if download/setup takes longer, skip and log.
  - **Skills to install** (from backlog):
    1. claude-mem (thedotmack/claude-mem)
    2. Trail of Bits security skills (trailofbits/skills)
    3. planning-with-files (OthmanAdi/planning-with-files)
    4. last30days-skill (mvanhorn/last30days-skill)
    5. humanizer (blader/humanizer)
    6. supabase agent-skills (supabase/agent-skills)
    7. Claudeception (blader/Claudeception)
    8. beads (steveyegge/beads)
    9. superpowers (obra/superpowers)
    10. context-engineering-kit (NeoLabHQ/context-engineering-kit)
    11. marketingskills (coreyhaines31/marketingskills)
    12. napkin (blader/napkin)
    13. AI-Research-SKILLs (Orchestra-Research/AI-Research-SKILLs)
    14. videocut-skills (Ceeon/videocut-skills)
    15. cc-devops-skills (akin-ozer/cc-devops-skills)
    16. tapestry-skills (michalparkola/tapestry-skills-for-claude-code)
    17. SkillForge (tripleyak/SkillForge)
    18. react-native-skills (callstackincubator/agent-skills)
    19. x-article-publisher-skill (wshuyi/x-article-publisher-skill)
    20. seo-geo-claude-skills (aaron-he-zhu/seo-geo-claude-skills)
    21. lenny-skills (RefoundAI/lenny-skills)
    22. learning-opportunities (DrCatHicks/learning-opportunities)
    23. compound-engineering-plugin (EveryInc/compound-engineering-plugin)
    24. google-ai-mode-skill (PleasePrompto/google-ai-mode-skill)
    25. claude-skill-homeassistant (komal-SkyNET/claude-skill-homeassistant)
    26. smart-illustrator (axtonliu/smart-illustrator)
    27. solana-dev-skill (solana-foundation/solana-dev-skill)
    28. charlie-cfo-skill (EveryInc/charlie-cfo-skill)
    29. raptor (gadievron/raptor)
  - **Portability note**: The install script should be reusable by any Arachne user. Save it as `scripts/install-community-skills.sh` with configurable skills directory.

  **Must NOT do**:
  - Don't manually copy each one — write a script
  - Don't fail the entire batch if one skill errors — skip and continue
  - Don't modify community skill content unless necessary for Arachne compatibility
  - Don't install skills that are clearly broken or have no SKILL.md

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Batch operation, scripting, many repos to process
  - **Skills**: []
    - No special skills — shell scripting and git operations
  - **Skills Evaluated but Omitted**:
    - `git-master`: Not doing complex git operations, just cloning

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 8)
  - **Blocks**: Task 9
  - **Blocked By**: Task 6 (need to know thin loading mechanism before installing)

  **References**:

  **Pattern References**:
  - `~/.config/opencode/skills/social-poster/SKILL.md` — Example of existing installed skill. Use this directory structure as the template.
  - `packages/skills/src/scanner.ts:66-68` — Scanner expects `{skillDir}/SKILL.md` with YAML frontmatter containing at minimum `name` and `description`.
  - `packages/skills/src/scanner.ts:26-46` — `parseFrontmatter()` — the exact parsing logic. Frontmatter must match: `---\n{yaml}\n---\n{content}` with `name` and `description` fields.

  **External References**:
  - `.sisyphus/backlog.md:178-260` — Full list of 50 skills with GitHub URLs, descriptions, and tier rankings. Items #1-#40 excluding items marked "Build" are community installs.
  - Each GitHub repo URL is listed in the backlog for cloning.

  **Acceptance Criteria**:

  - [ ] `scripts/install-community-skills.sh` exists and is executable
  - [ ] Script is configurable (skills directory path, skill list)
  - [ ] At least 25 of 29 skills installed successfully (some repos may be unavailable)
  - [ ] Each installed skill has valid YAML frontmatter (verified by scanner)
  - [ ] `SkillScanner.scan()` discovers all installed skills
  - [ ] No hardcoded machine-specific paths in the script

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Install script runs and installs skills
    Tool: Bash
    Preconditions: Git available, internet access
    Steps:
      1. chmod +x scripts/install-community-skills.sh
      2. ./scripts/install-community-skills.sh 2>&1 | tee /tmp/skill-install.log
      3. Count installed skills: ls -d ~/.config/opencode/skills/*/ | wc -l
      4. Assert: At least 25 directories (was ~5 before, now 30+)
      5. Validate random skill: cat ~/.config/opencode/skills/claude-mem/SKILL.md | head -5
      6. Assert: Starts with "---" (valid frontmatter)
    Expected Result: 25+ community skills installed with valid SKILL.md files
    Evidence: /tmp/skill-install.log

  Scenario: Scanner discovers installed skills
    Tool: Bash
    Preconditions: Community skills installed
    Steps:
      1. Write a quick test script that runs SkillScanner.scan()
      2. Assert: Returns 30+ skills (5 existing + 25+ new)
      3. Assert: Each skill has name and description
    Expected Result: All installed skills are discoverable
    Evidence: Scanner output captured
  ```

  **Commit**: YES
  - Message: `feat(skills): add community skill install script and install 29 skills`
  - Files: `scripts/install-community-skills.sh`
  - Pre-commit: `bash scripts/install-community-skills.sh --dry-run` (if supported)

---

- [x] 8. Build 21 custom skills

  **What to do**:
  - Build custom SKILL.md files for skills we can't install from community repos. These are Arachne-specific or user-requested features.
  - **Tier 1 customs** (user-requested 🎯):
    1. `mermaid-renderer` — Instructions for rendering mermaid code blocks to SVG
    2. `rich-content-renderer` — ASCII tables → HTML, structured output formatting
    3. `image-input-skill` — Handle pasted images and document uploads
    4. `question-tool-renderer` — Render Prometheus interview questions
  - **Tier 3 customs**:
    5. `linkedin-poster` — Post to LinkedIn (extend social-poster pattern)
  - **Tier 5 customs** (Arachne-specific):
    6. `streaming-thinking` — Show agent thinking tokens in real-time
    7. `mobile-audit` — Playwright-based mobile viewport auditing
    8. `rss-content-source` — RSS adapter for ContentSource interface
    9. `manual-queue-source` — Manual content queue adapter
    10. `dashboard-workflow-ui` — Configure workflows from dashboard
    11. `google-photos-skill` — Browse/search Google Photos
    12. `message-queue-skill` — Queue messages while agent working
    13. `deploy-skill` — One-click deploy Arachne
    14. `test-generator` — Auto-generate tests from code
    15. `skill-installer` — CLI to browse, install, manage skills
    16. `nuxt-skills` — Vue/Nuxt expertise (from community, adapt if needed)
    17. `dotnet-skills` — .NET development expertise
    18. `book-factory` — Nonfiction book creation pipeline
    19. `reverse-skills` — Reverse engineering
    20. `playwright-bot-bypass` — Bot detection bypass
    21. `security-audit` — Deep security analysis (complements Trail of Bits)
  - **Each skill** is a `SKILL.md` file with:
    - YAML frontmatter: `name`, `description`, optional `tools`, `hooks`, `globs`
    - Body: Detailed instructions for the agent on how to use this skill
  - Install to `~/.config/opencode/skills/{skill-name}/SKILL.md`
  - **Quality bar**: Each skill should be genuinely useful, not boilerplate. If a skill's instructions would be <20 lines and add nothing an LLM doesn't already know, skip it and document why.

  **Must NOT do**:
  - Don't create placeholder skills with no real content (AI slop)
  - Don't build skills that duplicate existing ones (check before building)
  - Don't build skills that require code changes to Arachne (those are features, not skills)
  - Don't exceed 2000 tokens per skill (keep them lean for token efficiency)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 21 skills to write, each requires understanding the domain and writing quality instructions
  - **Skills**: []
    - No special skills — writing SKILL.md files
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not building UI
    - `writing`: Could help with prose quality but not critical

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 7)
  - **Blocks**: Task 9
  - **Blocked By**: Task 6

  **References**:

  **Pattern References**:
  - `~/.config/opencode/skills/social-poster/SKILL.md` — Example custom skill. Follow this format for YAML frontmatter + body structure.
  - `~/.config/opencode/skills/workflow-orchestrator/SKILL.md` — Another example. More complex skill with tool references.
  - `packages/skills/src/scanner.ts:26-46` — `parseFrontmatter()` — YAML must have `name` (string) and `description` (string) at minimum. Optional: `tools`, `hooks`, `globs`.

  **Documentation References**:
  - `.sisyphus/backlog.md:238-260` — Tier 5 custom skills list with descriptions and rationale.
  - `.sisyphus/backlog.md:178-237` — Tier 1-4 lists with 🎯 markers for user-requested items.
  - OpenCode SKILL.md format: frontmatter with `---` delimiters, followed by markdown body.

  **Acceptance Criteria**:

  - [ ] At least 18 of 21 custom skills created (some may be skipped with justification)
  - [ ] Each skill has valid YAML frontmatter (name + description)
  - [ ] Each skill body has ≥30 lines of substantive instructions (not boilerplate)
  - [ ] No skill exceeds 2000 tokens
  - [ ] All skills installed in `~/.config/opencode/skills/`
  - [ ] Scanner discovers all custom skills

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Custom skills have valid frontmatter
    Tool: Bash
    Preconditions: Custom skills built and installed
    Steps:
      1. For each custom skill directory in ~/.config/opencode/skills/:
         a. cat SKILL.md | head -20
         b. Assert: Starts with "---"
         c. Assert: Contains "name:" and "description:"
         d. Assert: Has closing "---"
      2. Count custom skills: ls -d ~/.config/opencode/skills/{mermaid-renderer,rich-content-renderer,image-input-skill,...}/ 2>/dev/null | wc -l
      3. Assert: At least 18 directories exist
    Expected Result: All custom skills have valid structure
    Evidence: Frontmatter validation output captured

  Scenario: Skills are substantive (not boilerplate)
    Tool: Bash
    Preconditions: Custom skills installed
    Steps:
      1. For each custom skill:
         a. wc -l < ~/.config/opencode/skills/{name}/SKILL.md
         b. Assert: At least 30 lines
      2. Spot check: cat ~/.config/opencode/skills/mermaid-renderer/SKILL.md
      3. Assert: Contains specific mermaid.js instructions, not generic "render things"
    Expected Result: Skills contain genuine, useful instructions
    Evidence: Line counts + content samples captured
  ```

  **Commit**: YES
  - Message: `feat(skills): build 21 custom Arachne-specific skills`
  - Files: `~/.config/opencode/skills/{skill-name}/SKILL.md` (21 files)
  - Pre-commit: Validate all frontmatter parses

---

- [x] 9. Integrate thin skill loading into dispatch layer

  **What to do**:
  - Based on Task 6's investigation results, wire the thin loading mechanism into the Arachne dispatch pipeline.
  - **If Option A** (API filter): Add `loadSkills?: string[]` to `DispatchOptions`, pass through to `createSession()`
  - **If Option B** (filesystem): Create temporary skill directories per session, symlink only requested skills, set as skill path for the session
  - **If Option C** (system prompt): Prepend skill filter instructions to the message in `dispatch.ts`
  - **If Option D** (organize by weight): Categorize all 50 skills as "lightweight" (<500 tokens) vs "heavy" (>500 tokens), always load lightweight, gate heavy ones
  - Update `mcp_task` and `mcp_arachne_dispatch` to pass `load_skills` through to the dispatch layer
  - Test: Dispatch with `load_skills=["git-master"]` → verify only git-master is in context

  **Must NOT do**:
  - Don't implement all options — only the one selected in Task 6
  - Don't break existing dispatch behavior (backwards compatible)
  - Don't add latency > 200ms to session creation

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Integration work across dispatch layer, session creation, and skill loading
  - **Skills**: []
    - No special skills needed
  - **Skills Evaluated but Omitted**:
    - `git-master`: Simple commit

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential — after Tasks 7 and 8 complete
  - **Blocks**: None
  - **Blocked By**: Tasks 6, 7, 8

  **References**:

  **Pattern References**:
  - `packages/orchestrator/src/dispatch/dispatch.ts:50-60` — `resolveSessionId()` — session creation point where skill filter would be applied
  - `packages/orchestrator/src/dispatch/types.ts` — `DispatchOptions` — add `loadSkills` field here
  - `packages/orchestrator/src/client/operations.ts` — `createSession()` — actual API call to OpenCode

  **API/Type References**:
  - Task 6 investigation output — determines which option to implement
  - `packages/skills/src/scanner.ts` — `SkillScanner.scan()` — may be used to resolve skill names to paths

  **Acceptance Criteria**:

  - [ ] `DispatchOptions` has `loadSkills?: string[]` field
  - [ ] Dispatching with `load_skills=["git-master"]` only loads git-master skill
  - [ ] Dispatching WITHOUT `load_skills` loads all skills (backwards compatible)
  - [ ] Session creation latency increase < 200ms
  - [ ] `bun test packages/orchestrator/` passes
  - [ ] `bun run build` succeeds

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Selective skill loading works
    Tool: Bash
    Preconditions: Thin mechanism implemented, skills installed
    Steps:
      1. Dispatch via Arachne API with load_skills=["git-master"]
      2. Check created session's context/system prompt
      3. Assert: git-master skill content present
      4. Assert: social-poster skill content NOT present
    Expected Result: Only specified skills loaded
    Evidence: Session context captured

  Scenario: Backward compatibility (no load_skills)
    Tool: Bash
    Preconditions: Thin mechanism implemented
    Steps:
      1. Dispatch via Arachne API WITHOUT load_skills parameter
      2. Check created session's context
      3. Assert: All installed skills are present (default behavior)
    Expected Result: Existing behavior preserved
    Evidence: Session context captured
  ```

  **Commit**: YES
  - Message: `feat(dispatch): wire thin skill loading into dispatch pipeline`
  - Files: `packages/orchestrator/src/dispatch/dispatch.ts`, `packages/orchestrator/src/dispatch/types.ts`, `packages/orchestrator/src/client/operations.ts`
  - Pre-commit: `bun test packages/orchestrator/ && bun run build`

---

- [x] 10. Create admin/settings menu route stub

  **What to do**:
  - Create a new Next.js route at `/admin` (or `/settings`) in the dashboard
  - Include a sidebar/nav menu with placeholder items:
    - Settings (general)
    - Security
    - Skills Management
    - Workflows
    - Voice
  - Each menu item links to a sub-route (e.g., `/admin/security`, `/admin/skills`)
  - For now, each sub-route shows a placeholder: "Coming soon" with the section name
  - Add a link to the admin page from the main navigation (gear icon or "Settings" link)
  - Follow existing dashboard patterns: use shadcn/ui components, match current theme

  **Must NOT do**:
  - Don't build actual settings functionality (just stubs)
  - Don't add authentication/authorization (future concern)
  - Don't create complex layouts — simple sidebar + content area

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Creating new UI route with navigation, needs to look good
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Next.js App Router routes, shadcn/ui components
  - **Skills Evaluated but Omitted**:
    - `playwright`: QA only

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (can start anytime after Wave 1)
  - **Blocks**: Task 11
  - **Blocked By**: None (independent of skills/voice work)

  **References**:

  **Pattern References**:
  - `packages/dashboard/app/chat/page.tsx` — Existing page pattern with sidebar + main content area
  - `packages/dashboard/app/projects/page.tsx` — Another page pattern
  - `packages/dashboard/components/ui/` — shadcn/ui components available (Button, Separator, Sheet, etc.)
  - `packages/dashboard/app/layout.tsx` — Root layout where nav links live

  **API/Type References**:
  - None (stub only, no API calls)

  **Acceptance Criteria**:

  - [ ] `/admin` route exists and renders
  - [ ] Sidebar menu with 5 section links visible
  - [ ] Each sub-route (`/admin/security`, `/admin/skills`, etc.) renders placeholder
  - [ ] Navigation link from main layout to `/admin` exists
  - [ ] Matches existing dashboard theme (dark mode, same fonts/colors)
  - [ ] `bun run build` succeeds in packages/dashboard

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Admin page renders with menu
    Tool: Playwright (playwright skill)
    Preconditions: Dashboard running on localhost:3000
    Steps:
      1. Navigate to: http://localhost:3000/admin
      2. Wait for: page content visible (timeout: 5s)
      3. Assert: Page title or heading contains "Settings" or "Admin"
      4. Assert: Sidebar has at least 5 menu items
      5. Assert: "Security" menu item visible
      6. Assert: "Skills" menu item visible
      7. Screenshot: .sisyphus/evidence/task-10-admin-page.png
    Expected Result: Admin page with navigation menu renders correctly
    Evidence: .sisyphus/evidence/task-10-admin-page.png

  Scenario: Sub-routes render placeholders
    Tool: Playwright (playwright skill)
    Preconditions: Dashboard running
    Steps:
      1. Navigate to: http://localhost:3000/admin/security
      2. Assert: Page contains "Security" and "Coming soon" or placeholder text
      3. Navigate to: http://localhost:3000/admin/skills
      4. Assert: Page contains "Skills" and placeholder text
      5. Screenshot: .sisyphus/evidence/task-10-admin-security.png
    Expected Result: Each sub-route shows relevant placeholder
    Evidence: .sisyphus/evidence/task-10-admin-security.png

  Scenario: Nav link from main layout
    Tool: Playwright (playwright skill)
    Preconditions: Dashboard running
    Steps:
      1. Navigate to: http://localhost:3000/chat
      2. Look for: settings/admin icon or link in navigation
      3. Click the settings/admin link
      4. Assert: Navigated to /admin
      5. Screenshot: .sisyphus/evidence/task-10-nav-link.png
    Expected Result: Admin accessible from main navigation
    Evidence: .sisyphus/evidence/task-10-nav-link.png
  ```

  **Commit**: YES
  - Message: `feat(dashboard): add admin/settings menu route stub`
  - Files: `packages/dashboard/app/admin/page.tsx`, `packages/dashboard/app/admin/layout.tsx`, `packages/dashboard/app/admin/security/page.tsx`, `packages/dashboard/app/admin/skills/page.tsx`, `packages/dashboard/app/admin/workflows/page.tsx`, `packages/dashboard/app/admin/voice/page.tsx`, `packages/dashboard/app/admin/settings/page.tsx`
  - Pre-commit: `bun run build` in packages/dashboard

---

- [x] 11. Add security audit placeholder under admin menu

  **What to do**:
  - In the `/admin/security` route (created in Task 10), add a "Security Audit" section
  - UI elements:
    - Heading: "Security Audit"
    - Description: "Run a deep security analysis of your codebase"
    - Button: "Run Security Audit" (disabled, with tooltip "Coming soon")
    - Info card: Explains what the audit will do (CodeQL, Semgrep, dependency scanning, secret detection)
    - Reference to Trail of Bits skills (installed in Task 7)
  - This is a STUB — the button doesn't actually run anything yet
  - The concept is `openclaw security audit --deep` equivalent in the UI

  **Must NOT do**:
  - Don't implement actual security scanning logic
  - Don't add CLI commands
  - Don't install security scanning tools

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple UI stub — one page with static content
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: React component with shadcn/ui
  - **Skills Evaluated but Omitted**:
    - `playwright`: QA only

  **Parallelization**:
  - **Can Run In Parallel**: YES (after Task 10)
  - **Parallel Group**: Wave 4 (sequential after Task 10)
  - **Blocks**: None
  - **Blocked By**: Task 10

  **References**:

  **Pattern References**:
  - `packages/dashboard/app/admin/security/page.tsx` — Created in Task 10, extend this page
  - `packages/dashboard/components/ui/button.tsx` — shadcn Button with disabled state
  - `packages/dashboard/components/ui/` — Available UI components

  **External References**:
  - Trail of Bits skills: `trailofbits/skills` repo — 28 security skills. Reference in the UI description.
  - `.sisyphus/backlog.md:185` — Trail of Bits entry with description

  **Acceptance Criteria**:

  - [ ] `/admin/security` shows "Security Audit" section
  - [ ] "Run Security Audit" button exists but is disabled
  - [ ] Info card describes what the audit will cover
  - [ ] `bun run build` succeeds in packages/dashboard

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Security audit stub renders
    Tool: Playwright (playwright skill)
    Preconditions: Dashboard running, Task 10 complete
    Steps:
      1. Navigate to: http://localhost:3000/admin/security
      2. Wait for: page content visible (timeout: 5s)
      3. Assert: Heading "Security Audit" visible
      4. Assert: Button "Run Security Audit" visible
      5. Assert: Button is disabled (has disabled attribute or aria-disabled)
      6. Assert: Description text mentions security analysis
      7. Screenshot: .sisyphus/evidence/task-11-security-stub.png
    Expected Result: Security audit placeholder with disabled button
    Evidence: .sisyphus/evidence/task-11-security-stub.png
  ```

  **Commit**: YES (groups with Task 10)
  - Message: `feat(dashboard): add security audit placeholder in admin menu`
  - Files: `packages/dashboard/app/admin/security/page.tsx`
  - Pre-commit: `bun run build` in packages/dashboard

---

- [x] 12. Validate voice pipeline dependencies locally

  **What to do**:
  - The voice pipeline exists but may never have been run end-to-end. Before wiring it up, validate all dependencies are available:
  - **Check list**:
    1. **Whisper.cpp binary**: Does `whisper-server` or equivalent exist? Check the path used by `stt/whisper-lifecycle.ts`
    2. **Whisper model**: Is the `large-v3-turbo` model downloaded? Check expected path
    3. **CoreML model**: Has the CoreML conversion been run?
    4. **Kokoro TTS**: Is the ONNX model downloaded? Check `tts/kokoro-service.ts` for expected paths
    5. **Python 3**: Required for whisper setup
    6. **CMake**: Required for whisper compilation
    7. **Xcode CLT**: Required for CoreML
  - Use the existing `setup.ts` script: `packages/orchestrator/src/voice/setup.ts` has `runFullSetup()` that checks all prerequisites
  - Run the setup and capture what passes/fails
  - If dependencies are missing: run the setup to install them, or document what's needed

  **Must NOT do**:
  - Don't rewrite the setup script
  - Don't skip dependency validation — the whole voice pipeline depends on this
  - Don't assume dependencies are installed just because the code exists

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: System-level dependency validation, may need compilation (whisper.cpp), model downloads
  - **Skills**: []
    - No special skills — system administration
  - **Skills Evaluated but Omitted**:
    - All skills irrelevant for system dependency checking

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (can start alongside Wave 2)
  - **Blocks**: Tasks 13, 14
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `packages/orchestrator/src/voice/setup.ts` — `runFullSetup()`: 5-step setup (prereqs, compile whisper, download model, CoreML conversion, verify Kokoro). This is the script to run.
  - `packages/orchestrator/src/voice/stt/whisper-lifecycle.ts` — Whisper process management. Check `WHISPER_BINARY_PATH` or equivalent for expected binary location.
  - `packages/orchestrator/src/voice/tts/kokoro-service.ts` — Kokoro ONNX TTS. Check model path expectations.

  **Documentation References**:
  - `packages/orchestrator/src/voice/setup.ts` — Has inline documentation about each setup step

  **Acceptance Criteria**:

  - [ ] All 7 dependencies checked and status documented
  - [ ] `runFullSetup()` completes without errors — OR — missing deps documented with install instructions
  - [ ] Whisper binary exists and is executable
  - [ ] Whisper model file exists at expected path
  - [ ] Kokoro ONNX model exists at expected path
  - [ ] All voice tests pass: `bun test packages/orchestrator/src/voice/`

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Voice setup script runs
    Tool: Bash
    Preconditions: Node/bun available
    Steps:
      1. Run voice setup: bun run packages/orchestrator/src/voice/setup.ts 2>&1 | tee /tmp/voice-setup.log
      2. Check each step result in the output
      3. Assert: No "FATAL" or "CRITICAL" errors
      4. Check whisper binary: which whisper-server || ls {expected-path}
      5. Check model: ls {expected-model-path}
    Expected Result: All dependencies validated or installed
    Evidence: /tmp/voice-setup.log

  Scenario: Voice tests pass
    Tool: Bash
    Preconditions: Dependencies validated
    Steps:
      1. bun test packages/orchestrator/src/voice/ 2>&1 | tee /tmp/voice-tests.log
      2. Assert: All tests pass (or document which fail and why)
    Expected Result: Voice module tests pass
    Evidence: /tmp/voice-tests.log
  ```

  **Commit**: NO (validation only, no code changes)

---

- [x] 13. Wire voice server to orchestrator startup

  **What to do**:
  - The voice module has `startVoice()` and `stopVoice()` exports in `voice/index.ts`
  - Wire `startVoice()` into the orchestrator's startup sequence so voice is available when Arachne starts
  - **Steps**:
    1. Find the orchestrator's main startup function (likely in `packages/orchestrator/src/index.ts` or server lifecycle)
    2. Add `startVoice(config)` call during startup
    3. Add `stopVoice()` call during shutdown/cleanup
    4. Make voice startup optional: configurable via `arachne.config.ts` or environment variable (`ARACHNE_VOICE_ENABLED=true`)
    5. Handle startup failure gracefully: if voice dependencies aren't installed, log warning and continue without voice
  - Ensure the WebSocket server starts on the configured port (default from voice config)

  **Must NOT do**:
  - Don't make voice mandatory — it should be opt-in
  - Don't block orchestrator startup if voice fails
  - Don't change the voice module's internal logic

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Integration across orchestrator modules, config schema, lifecycle management
  - **Skills**: []
    - No special skills needed
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not frontend work

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential — after Task 12
  - **Blocks**: Task 14
  - **Blocked By**: Task 12

  **References**:

  **Pattern References**:
  - `packages/orchestrator/src/voice/index.ts:71-186` — `startVoice(config)` function. Takes `VoiceConfig`, starts STT + TTS + WebSocket server.
  - `packages/orchestrator/src/voice/index.ts:188-220` — `stopVoice()` function. Cleans up all voice resources.
  - `packages/orchestrator/src/voice/index.ts:12-21` — `VoiceState` interface with status tracking.
  - `packages/orchestrator/src/config/schema.ts` — `VoiceConfig` type. Check what config fields exist.
  - `packages/orchestrator/src/index.ts` — Main orchestrator exports. Find or create the startup sequence.
  - `packages/orchestrator/src/server/lifecycle.ts` — Server lifecycle management. Voice startup should integrate here.

  **API/Type References**:
  - `packages/orchestrator/src/config/schema.ts` — Full config schema including voice section

  **Acceptance Criteria**:

  - [ ] `startVoice()` called during orchestrator startup (when enabled)
  - [ ] `stopVoice()` called during orchestrator shutdown
  - [ ] Voice is opt-in via config or env var
  - [ ] Orchestrator starts successfully even if voice dependencies are missing
  - [ ] Voice WebSocket server accessible on configured port when enabled
  - [ ] `bun run build` succeeds

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Voice starts with orchestrator
    Tool: Bash
    Preconditions: Voice dependencies installed (Task 12), voice enabled in config
    Steps:
      1. Start orchestrator with voice enabled
      2. Wait 5s for startup
      3. Check voice WebSocket: curl -s http://localhost:{voice-port}/health || wscat -c ws://localhost:{voice-port}
      4. Assert: WebSocket server responds
      5. Check orchestrator logs for "Voice started" or similar
    Expected Result: Voice server running alongside orchestrator
    Evidence: Startup logs + WebSocket response captured

  Scenario: Orchestrator starts without voice when disabled
    Tool: Bash
    Preconditions: Voice disabled in config (ARACHNE_VOICE_ENABLED=false)
    Steps:
      1. Start orchestrator with voice disabled
      2. Assert: Orchestrator starts without errors
      3. Assert: No voice WebSocket server on voice port
      4. Check logs: "Voice disabled" or similar message
    Expected Result: Orchestrator works fine without voice
    Evidence: Startup logs captured
  ```

  **Commit**: YES
  - Message: `feat(orchestrator): wire voice pipeline into startup lifecycle`
  - Files: `packages/orchestrator/src/index.ts` or `packages/orchestrator/src/server/lifecycle.ts`, config files
  - Pre-commit: `bun run build`

---

- [x] 14. E2E voice test + dashboard integration verification

  **What to do**:
  - Run the full voice pipeline end-to-end: mic input → Whisper STT → LLM Bridge → Kokoro TTS → audio output
  - **Test steps**:
    1. Start voice server (from Task 13)
    2. Connect via WebSocket (use the test client at `voice/client/index.html` or programmatic)
    3. Send audio data (pre-recorded WAV or generate test tone)
    4. Verify: audio transcribed by Whisper
    5. Verify: transcription sent to LLM via LLM Bridge (creates OpenCode session, sends prompt)
    6. Verify: LLM response received
    7. Verify: response converted to audio by Kokoro TTS
    8. Verify: audio sent back via WebSocket
  - **Dashboard integration**:
    1. Open dashboard at `/chat`
    2. Click mic button (`VoiceButton` component)
    3. Verify: `VoiceOverlay` appears
    4. Verify: WebSocket connection established (check `useVoiceWebSocket` hook)
    5. Speak (or simulate audio input)
    6. Verify: transcription appears
    7. Verify: audio response plays
  - **Fix issues**: If any step fails, debug and fix. Common issues:
    - WebSocket URL mismatch between dashboard and voice server
    - CORS issues
    - Audio format incompatibility
    - LLM Bridge can't connect to OpenCode at localhost:4100

  **Must NOT do**:
  - Don't rewrite the voice pipeline
  - Don't change audio formats without understanding current expectations
  - Don't skip any verification step

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: E2E integration testing across multiple subsystems (WebSocket, STT, LLM, TTS, dashboard)
  - **Skills**: [`playwright`, `frontend-ui-ux`]
    - `playwright`: Browser-based voice UI testing
    - `frontend-ui-ux`: Dashboard component debugging
  - **Skills Evaluated but Omitted**:
    - `git-master`: Simple commit

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential — final task in Wave 5
  - **Blocks**: None (final task)
  - **Blocked By**: Tasks 1, 12, 13

  **References**:

  **Pattern References**:
  - `packages/orchestrator/src/voice/pipeline.ts:79-148` — `handleSpeechEnd()`. Full pipeline: audio → transcribe → LLM prompt → TTS → send audio response.
  - `packages/orchestrator/src/voice/websocket.ts` — WebSocket server handling client connections and audio streaming.
  - `packages/orchestrator/src/voice/llm-bridge.ts:1-30` — LLM Bridge config. `DEFAULT_BASE_URL = "http://127.0.0.1:4100"`, `VOICE_SESSION_TITLE = "Amanda Voice Session"`, poll interval 250ms.
  - `packages/orchestrator/src/voice/client/index.html` — Test client for voice WebSocket. Use this for manual/automated testing.
  - `packages/dashboard/app/components/voice-button.tsx` — VoiceButton component in dashboard.
  - `packages/dashboard/app/components/voice-overlay.tsx` — Voice overlay UI.
  - `packages/dashboard/app/hooks/use-voice-websocket.ts` — WebSocket hook connecting dashboard to voice server.
  - `packages/dashboard/app/chat/components/chat-input.tsx` — Chat input with mic button integration.

  **API/Type References**:
  - `packages/orchestrator/src/voice/protocol.ts` — WebSocket message protocol types
  - `packages/orchestrator/src/voice/audio-utils.ts` — PCM to WAV conversion utilities

  **Acceptance Criteria**:

  - [ ] Voice WebSocket accepts connections
  - [ ] Audio data is transcribed by Whisper (transcription text returned)
  - [ ] Transcription is sent to LLM via Bridge (OpenCode session created)
  - [ ] LLM response is received (non-empty text)
  - [ ] Response is converted to audio by Kokoro TTS
  - [ ] Audio is sent back to client via WebSocket
  - [ ] Dashboard mic button opens voice overlay
  - [ ] Dashboard WebSocket connects to voice server
  - [ ] Voice session (titled "Amanda Voice Session") does NOT appear in sidebar (Task 1 filter)

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Voice pipeline processes audio end-to-end
    Tool: Bash + interactive_bash (tmux)
    Preconditions: Voice server running (Task 13), OpenCode server at localhost:4100
    Steps:
      1. Start voice server (if not already running)
      2. Use wscat or custom script to connect to voice WebSocket
      3. Send a pre-recorded WAV file (or generate test audio)
      4. Wait for transcription response (timeout: 15s)
      5. Assert: Transcription text is non-empty and reasonable
      6. Wait for LLM response (timeout: 30s)
      7. Assert: LLM response text received
      8. Wait for TTS audio response (timeout: 15s)
      9. Assert: Audio data received (non-empty binary)
    Expected Result: Full pipeline works: audio in → text → LLM → text → audio out
    Evidence: Transcription text + LLM response + audio data size captured

  Scenario: Dashboard voice button works
    Tool: Playwright (playwright skill)
    Preconditions: Dashboard on localhost:3000, voice server running
    Steps:
      1. Navigate to: http://localhost:3000/chat
      2. Look for: mic button in chat input area
      3. Click mic button
      4. Wait for: voice overlay to appear (timeout: 5s)
      5. Assert: Voice overlay is visible
      6. Assert: WebSocket connection status shows "connected" or similar
      7. Screenshot: .sisyphus/evidence/task-14-voice-overlay.png
    Expected Result: Voice UI activates and connects to voice server
    Evidence: .sisyphus/evidence/task-14-voice-overlay.png

  Scenario: Voice session hidden from sidebar
    Tool: Playwright (playwright skill)
    Preconditions: Voice pipeline has been used (creates "Amanda Voice Session")
    Steps:
      1. Navigate to: http://localhost:3000/chat
      2. Wait for sidebar to load
      3. Collect all session titles
      4. Assert: "Amanda Voice Session" does NOT appear in sidebar
      5. Screenshot: .sisyphus/evidence/task-14-no-voice-sidebar.png
    Expected Result: Voice sessions filtered from user view
    Evidence: .sisyphus/evidence/task-14-no-voice-sidebar.png
  ```

  **Commit**: YES
  - Message: `feat(voice): activate end-to-end voice pipeline with dashboard integration`
  - Files: Any fixes discovered during E2E testing (WebSocket URL, CORS, format issues)
  - Pre-commit: `bun run build`

---

## Commit Strategy

| After Task | Message | Key Files | Verification |
|------------|---------|-----------|--------------|
| 1 | `fix(dashboard): filter sub-agent and voice sessions from sidebar` | session-sidebar.tsx, page.tsx | bun run build |
| 2 | `fix(dashboard): render Prometheus question tool in chat UI` | use-chat-stream.ts, page.tsx | bun run build |
| 3 | `fix(dashboard): coordinate live and persisted thinking data sources` | use-thinking.ts, use-chat-stream.ts | bun run build |
| 4 | `fix(dashboard): remove hardcoded project path from SSE connection` | use-chat-stream.ts | bun run build |
| 5 | `fix/docs(dashboard): handle TUI/UI concurrent access` | TBD | bun run build |
| 6 | `feat(skills): implement thin selective skill loading` | scanner.ts, dispatch.ts | bun test + build |
| 7 | `feat(skills): install 29 community skills` | install script | Script runs |
| 8 | `feat(skills): build 21 custom skills` | SKILL.md files | Frontmatter valid |
| 9 | `feat(dispatch): wire thin skill loading into dispatch` | dispatch.ts, types.ts | bun test + build |
| 10 | `feat(dashboard): add admin/settings menu route stub` | admin/ routes | bun run build |
| 11 | `feat(dashboard): add security audit placeholder` | admin/security/page.tsx | bun run build |
| 13 | `feat(orchestrator): wire voice into startup lifecycle` | index.ts, lifecycle.ts | bun run build |
| 14 | `feat(voice): activate E2E voice pipeline` | Various fixes | bun run build |

---

## Success Criteria

### Verification Commands
```bash
# All packages build
bun run build                        # Expected: no errors

# Dashboard loads
curl -s http://localhost:3000/chat    # Expected: 200 OK

# Admin route exists
curl -s http://localhost:3000/admin   # Expected: 200 OK

# Skills installed
ls ~/.config/opencode/skills/ | wc -l  # Expected: 50+

# Voice server responds
curl -s http://localhost:{voice-port}/health  # Expected: 200 or WebSocket upgrade

# No hardcoded paths
grep -r "kendrick" packages/dashboard/app/  # Expected: no matches
```

### Final Checklist
- [ ] All 5 bugs addressed (fixed or documented with rationale if architectural)
- [ ] 50 skills installed/built (29 community + 21 custom)
- [ ] Thin skill loading mechanism implemented and verified
- [ ] Admin/settings menu stub at /admin with 5 sections
- [ ] Security audit placeholder with disabled button
- [ ] Voice pipeline runs end-to-end
- [ ] Voice sessions hidden from sidebar
- [ ] No hardcoded machine-specific paths anywhere
- [ ] All packages build successfully
- [ ] No AI slop: no unnecessary abstractions, no boilerplate skills, no over-engineering
