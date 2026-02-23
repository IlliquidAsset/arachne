# Arachne Chat UI — Round 2: Bug Fixes + Project-Based Sidebar

## TL;DR

> **Quick Summary**: Fix 4 UX bugs (naming, input blocking, session titles, thinking indicator) and add project-based session grouping in the sidebar using OpenCode's existing `projectID`/`directory` fields.
> 
> **Deliverables**:
> - "Arachne" branding everywhere (placeholder, message bubbles)
> - Input stays typeable during streaming (only send button disabled)
> - Session titles from OpenCode populate sidebar with live SSE updates
> - "Thinking..." indicator between message send and first response token
> - Project-grouped sidebar (sessions organized by project directory)
> - Unified `SessionInfo` type used across all components
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 3 waves
> **Critical Path**: Task 1 (type unification) → Task 5 (session titles + SSE) → Task 6 (project grouping)

---

## Context

### Original Request
User tested the working Arachne Chat UI and reported:
- "Since mine already has a name, it should be reflected in all places" (says "Amanda" and "Assistant")
- "Session names should be populated with whatever OC assigns for that session"
- "Chats should be grouped by project EXACTLY how Claude web does it"
- "The chat window is super slow to let me type a message after Arachne responds. I should be able to type even if I can't immediately send"
- "Arachne is super slow to respond" (long delay before first token)

### Interview Summary
**Key Discussions**:
- Project grouping: User chose auto-group using OpenCode's existing `projectID`/`directory` fields
- Voice: DEFERRED — focus on chat UX this round
- Performance: Slow to START (long delay before first token) — need thinking indicator

**Research Findings**:
- OpenCode `SessionInfo` has `title`, `projectID`, `directory` fields — dashboard ignores `projectID` and `directory`
- Dashboard has TWO separate `SessionInfo` interfaces that are out of sync
- SSE events include `session.updated` with title data — can update titles reactively
- SSE subscription is directory-scoped — all sessions from one OpenCode instance share the same directory
- Session titles are assigned asynchronously by OpenCode after the first assistant response
- Input `isDisabled = isSending || isStreaming` blocks both textarea and buttons together

### Metis Review
**Identified Gaps** (addressed):
- SSE directory scoping: Since one OpenCode instance = one project directory, all sessions share the same SSE scope. No multi-SSE needed for V1.
- Dual `SessionInfo` types: Must unify before adding `projectID`/`directory` fields.
- "Thinking" state gap: Between POST completion and first SSE delta, no visual indicator exists. Need `waitingForResponse` state.
- "Attach chats to projects": Cut from scope — OpenCode controls `projectID` assignment server-side based on working directory. Dashboard can't override it.
- Mic button during streaming: Should remain disabled (dictation starts a recording flow that conflicts with streaming state).

---

## Work Objectives

### Core Objective
Transform the Arachne sidebar from a flat session list into a project-grouped, properly-titled interface with responsive UX (typing during streaming, thinking indicator).

### Concrete Deliverables
- Unified `SessionInfo` type at `app/lib/types.ts`
- Updated `message-bubble.tsx` — "Arachne" label
- Updated `chat-input.tsx` — "Message Arachne..." placeholder, separated disabled states
- Updated `use-sessions.ts` — reads `projectID`/`directory`/`title`, exposes grouped data
- Updated `use-chat-stream.ts` — handles `session.updated` events, notifies parent of title changes
- Updated `session-sidebar.tsx` — project groups, collapsible sections, proper titles
- Updated `message-list.tsx` — thinking indicator between send and first delta
- Updated `chat/page.tsx` — wires `waitingForResponse` and session update callbacks

### Definition of Done
- [x] All message bubbles say "Arachne" (not "Assistant")
- [x] Input placeholder says "Message Arachne..."
- [x] Textarea stays typeable during streaming
- [x] Sessions show OpenCode-assigned titles in sidebar
- [x] Sessions grouped by project directory in sidebar
- [x] Thinking indicator visible between message send and first response token
- [x] `bun run build` exits 0
- [x] All existing tests pass
- [x] Playwright verification of each feature

### Must Have
- "Arachne" branding in all user-facing text
- Session titles from OpenCode (not creation timestamps)
- Project grouping in sidebar using `directory` field
- Typing possible during streaming
- Visual feedback between send and response start

### Must NOT Have (Guardrails)
- NO project CRUD (create, rename, delete projects)
- NO session renaming UI
- NO markdown rendering
- NO voice changes (deferred)
- NO new npm dependencies
- NO modifications to `packages/orchestrator/`
- NO modifications to `use-voice-websocket.ts`, `use-audio-playback.ts`, or `use-tap-to-dictate.ts`
- NO new API routes
- NO multi-SSE connections (single directory scope is fine for V1)
- NO zustand/jotai/redux — React hooks only
- NO positive `tabIndex` values
- NO collapsible/expandable groups (flat grouped list with headers is sufficient)
- NO session search/filter
- NO "attach chat to project" feature (OpenCode controls project assignment)

---

## Verification Strategy

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.

### Test Decision
- **Infrastructure exists**: YES (bun test, 26+ existing tests)
- **Automated tests**: Tests-after (add tests for new behavior)
- **Framework**: bun test

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

**Verification Tool by Deliverable Type:**

| Type | Tool | How Agent Verifies |
|------|------|-------------------|
| **UI Components** | Playwright (playwright skill) | Navigate, interact, assert DOM, screenshot |
| **Build** | Bash | `bun run build` exits 0 |
| **Source checks** | Bash (grep) | Verify string literals in source files |

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Unify SessionInfo type [no dependencies]
├── Task 2: Fix "Arachne" branding [no dependencies]
└── Task 3: Fix input disabled during streaming [no dependencies]

Wave 2 (After Wave 1):
├── Task 4: Add thinking indicator [depends: 3]
└── Task 5: Session titles + SSE updates [depends: 1]

Wave 3 (After Wave 2):
└── Task 6: Project-grouped sidebar [depends: 1, 5]
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 5, 6 | 2, 3 |
| 2 | None | None | 1, 3 |
| 3 | None | 4 | 1, 2 |
| 4 | 3 | None | 5 |
| 5 | 1 | 6 | 4 |
| 6 | 1, 5 | None | None (final) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1, 2, 3 | 3 parallel quick tasks |
| 2 | 4, 5 | 2 parallel tasks |
| 3 | 6 | 1 final integration task |

---

## TODOs

- [x] 1. Unify SessionInfo type

  **What to do**:
  - Create `app/lib/types.ts` with a single `SessionInfo` interface that includes ALL fields from the OpenCode SDK:
    ```typescript
    export interface SessionInfo {
      id: string;
      title: string;
      projectID: string;
      directory: string;
      parentID?: string;
      version?: string;
      time: {
        created: number;
        updated: number;
      };
    }
    ```
  - Remove the `SessionInfo` interface from `app/hooks/use-sessions.ts` (lines 5-12) and import from `app/lib/types.ts`
  - Remove the `SessionInfo` interface from `app/chat/components/session-sidebar.tsx` (lines 6-12) and import from `app/lib/types.ts`
  - Update `use-sessions.ts` hook: the fetched data already includes these fields (API proxy passes through raw SDK data), so just update the type and ensure the sort/filter logic uses the new fields
  - Verify all consumers compile cleanly with `lsp_diagnostics`

  **Must NOT do**:
  - Do NOT change any API routes
  - Do NOT add fields that don't exist in the SDK response
  - Do NOT make `title` optional — OpenCode always returns it (may be empty string)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Tasks 5, 6
  - **Blocked By**: None

  **References**:
  - `packages/dashboard/app/hooks/use-sessions.ts:5-12` — Current dashboard SessionInfo (missing projectID, directory)
  - `packages/dashboard/app/chat/components/session-sidebar.tsx:6-12` — Duplicate SessionInfo (even more limited)
  - `packages/orchestrator/src/client/types.ts:15-27` — Canonical SessionInfo from orchestrator with all fields
  - `packages/dashboard/app/api/sessions/route.ts:19` — API proxy returns `result.data ?? []` (passes through all SDK fields)

  **Acceptance Criteria**:
  - [x] File `app/lib/types.ts` exists with unified `SessionInfo`
  - [x] No `interface SessionInfo` in `use-sessions.ts` or `session-sidebar.tsx`
  - [x] `lsp_diagnostics` clean on all changed files
  - [x] `bun run build` passes

  **Agent-Executed QA Scenarios:**
  ```
  Scenario: Type unification compiles cleanly
    Tool: Bash
    Steps:
      1. grep -r "interface SessionInfo" packages/dashboard/app/ → Assert only app/lib/types.ts
      2. bun run build → Assert exit 0
    Expected Result: Single SessionInfo definition, clean build
  ```

  **Commit**: YES
  - Message: `refactor(dashboard): unify SessionInfo type into shared types.ts`
  - Files: `app/lib/types.ts`, `app/hooks/use-sessions.ts`, `app/chat/components/session-sidebar.tsx`

---

- [x] 2. Fix "Arachne" branding

  **What to do**:
  - In `app/chat/components/message-bubble.tsx` line 33: change `"Assistant"` to `"Arachne"`
  - In `app/chat/components/chat-input.tsx` line 101: change `"Message Amanda..."` to `"Message Arachne..."`

  **Must NOT do**:
  - Do NOT change message-bubble styling, layout, or role logic
  - Do NOT change any other string literals in chat-input.tsx
  - Do NOT make the name configurable (hardcode "Arachne" for now)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `packages/dashboard/app/chat/components/message-bubble.tsx:33` — `{isUser ? "You" : "Assistant"}`
  - `packages/dashboard/app/chat/components/chat-input.tsx:101` — `placeholder="Message Amanda..."`

  **Acceptance Criteria**:
  - [x] `grep -c '"Arachne"' packages/dashboard/app/chat/components/message-bubble.tsx` → 1
  - [x] `grep -c '"Assistant"' packages/dashboard/app/chat/components/message-bubble.tsx` → 0
  - [x] `grep '"Message Arachne..."' packages/dashboard/app/chat/components/chat-input.tsx` → match
  - [x] `bun run build` passes

  **Agent-Executed QA Scenarios:**
  ```
  Scenario: Message bubble shows "Arachne"
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, logged in
    Steps:
      1. Navigate to http://localhost:3000/chat
      2. Send "hi"
      3. Wait for response (timeout: 30s)
      4. Assert: div[data-role="assistant"] contains text "Arachne" (not "Assistant")
      5. Screenshot: .sisyphus/evidence/task-2-arachne-label.png
    Expected Result: Assistant messages labeled "Arachne"

  Scenario: Input placeholder says "Message Arachne..."
    Tool: Playwright (playwright skill)
    Steps:
      1. Navigate to http://localhost:3000/chat
      2. Assert: textarea[data-testid="chat-input"] has placeholder "Message Arachne..."
      3. Screenshot: .sisyphus/evidence/task-2-placeholder.png
    Expected Result: Placeholder shows "Message Arachne..."
  ```

  **Commit**: YES
  - Message: `fix(dashboard): rename Assistant to Arachne in chat UI`
  - Files: `app/chat/components/message-bubble.tsx`, `app/chat/components/chat-input.tsx`

---

- [x] 3. Fix input disabled during streaming

  **What to do**:
  - In `app/chat/components/chat-input.tsx`:
    - Change line 70 from `const isDisabled = isSending || isStreaming` to separate concerns:
      ```typescript
      const inputDisabled = isSending; // textarea only disabled while POST is in flight
      const sendDisabled = isSending || isStreaming || !input.trim();
      ```
    - On the textarea (line 103): change `disabled={isDisabled}` to `disabled={inputDisabled}`
    - On the mic button (line 89): keep disabled during streaming (`disabled={isSending || isStreaming}`) — dictation conflicts with active streaming
    - On the send button (line 125): change to `disabled={sendDisabled}`
    - In `handleSend`: the existing guard `if (!trimmed || isSending || isStreaming) return` already prevents sending during streaming. Keep this.
    - Ensure the textarea gets re-focused after streaming completes: add a `useEffect` that focuses the textarea when `isStreaming` transitions from true to false.

  **Must NOT do**:
  - Do NOT change the stop/abort button behavior
  - Do NOT change the Enter-to-send keyboard shortcut logic
  - Do NOT change the handleSend function logic (guards are correct)
  - Do NOT enable mic button during streaming

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Task 4
  - **Blocked By**: None

  **References**:
  - `packages/dashboard/app/chat/components/chat-input.tsx:70` — `const isDisabled = isSending || isStreaming`
  - `packages/dashboard/app/chat/components/chat-input.tsx:89` — mic button disabled state
  - `packages/dashboard/app/chat/components/chat-input.tsx:103` — textarea disabled state
  - `packages/dashboard/app/chat/components/chat-input.tsx:125` — send button disabled state
  - `packages/dashboard/app/chat/components/chat-input.tsx:44-46` — handleSend guard: `if (!trimmed || isSending || isStreaming) return`

  **Acceptance Criteria**:
  - [x] `lsp_diagnostics` clean on `chat-input.tsx`
  - [x] `bun run build` passes

  **Agent-Executed QA Scenarios:**
  ```
  Scenario: Can type in textarea during streaming
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, logged in, session exists
    Steps:
      1. Navigate to http://localhost:3000/chat
      2. Send "Write a 500 word essay about dogs"
      3. Wait 2s for streaming to begin
      4. Click textarea[data-testid="chat-input"]
      5. Type "next message"
      6. Assert: textarea value contains "next message"
      7. Assert: textarea is NOT disabled (no disabled attribute)
      8. Screenshot: .sisyphus/evidence/task-3-type-during-stream.png
    Expected Result: User can type while assistant is streaming

  Scenario: Send button disabled during streaming
    Tool: Playwright (playwright skill)
    Steps:
      1. (Continuing from above, during streaming)
      2. Assert: button[data-testid="stop-button"] is visible (streaming mode)
      3. Assert: No send button visible (replaced by stop)
    Expected Result: Cannot send while streaming, only stop

  Scenario: Enter key does not send during streaming
    Tool: Playwright (playwright skill)
    Steps:
      1. (During streaming) focus textarea, type "test"
      2. Press Enter
      3. Assert: textarea still contains "test" (message not sent)
      4. Wait for streaming to complete
      5. Assert: textarea still contains "test" (typed text preserved)
    Expected Result: Enter blocked during streaming, typed text preserved

  Scenario: Textarea re-focuses after streaming ends
    Tool: Playwright (playwright skill)
    Steps:
      1. Wait for streaming to complete (stop button disappears)
      2. Assert: textarea[data-testid="chat-input"] is focused
    Expected Result: User can immediately start typing after response
  ```

  **Commit**: YES
  - Message: `fix(dashboard): allow typing in input during streaming`
  - Files: `app/chat/components/chat-input.tsx`

---

- [x] 4. Add thinking indicator

  **What to do**:
  - Add a `waitingForResponse` state to bridge the gap between POST completion and first SSE delta
  - In `app/hooks/use-chat-stream.ts`:
    - Add a new state: `const [waitingForResponse, setWaitingForResponse] = useState(false)`
    - Add a new option callback: `onPromptSent?: () => void` — called by parent to signal that a prompt was just sent
    - Expose a `markWaitingForResponse` function that sets `waitingForResponse = true`
    - When `message.part.delta` or `message.updated` event arrives, set `waitingForResponse = false`
    - When `session.idle` arrives, set `waitingForResponse = false`
    - Return `waitingForResponse` from the hook
  - In `app/chat/components/message-list.tsx`:
    - Accept `waitingForResponse` from the chat stream hook
    - Show a thinking indicator below the last message when `waitingForResponse === true && !isStreaming && !currentMessage`:
      ```tsx
      {waitingForResponse && !isStreaming && (
        <div className="flex justify-start mb-4">
          <div className="bg-card text-card-foreground rounded-lg px-4 py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="animate-pulse">●</span>
              <span>Arachne is thinking...</span>
            </div>
          </div>
        </div>
      )}
      ```
  - In `app/chat/page.tsx`:
    - When `onOptimisticSend` fires (user sends message), also call a function to set `waitingForResponse = true` in the stream hook
    - Wire this through the same ref pattern used for `addOptimisticMessage`

  **Must NOT do**:
  - Do NOT add loading spinners to unrelated components
  - Do NOT block the UI — the thinking indicator is informational only
  - Do NOT change the existing tool-use indicator logic

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 5)
  - **Blocks**: None
  - **Blocked By**: Task 3

  **References**:
  - `packages/dashboard/app/hooks/use-chat-stream.ts:50-64` — Current SSE event handling (delta sets isStreaming=true)
  - `packages/dashboard/app/chat/components/message-list.tsx:83-89` — Existing tool-use indicator pattern (follow this pattern)
  - `packages/dashboard/app/chat/page.tsx:25-27` — `handleSend` callback that fires on optimistic send
  - `packages/dashboard/app/chat/components/chat-input.tsx:48-49` — Where `onOptimisticSend` is called

  **Acceptance Criteria**:
  - [x] `lsp_diagnostics` clean on all changed files
  - [x] `bun run build` passes

  **Agent-Executed QA Scenarios:**
  ```
  Scenario: Thinking indicator appears after sending message
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, logged in
    Steps:
      1. Navigate to http://localhost:3000/chat
      2. Send "Tell me about quantum computing in great detail"
      3. Immediately check for thinking indicator
      4. Assert: text "Arachne is thinking..." is visible (within 1s of sending)
      5. Wait for first streaming text to appear
      6. Assert: "Arachne is thinking..." is no longer visible
      7. Screenshot: .sisyphus/evidence/task-4-thinking-indicator.png
    Expected Result: Thinking indicator bridges the gap between send and response
  ```

  **Commit**: YES (groups with 3)
  - Message: `feat(dashboard): add thinking indicator between send and response`
  - Files: `app/hooks/use-chat-stream.ts`, `app/chat/components/message-list.tsx`, `app/chat/page.tsx`

---

- [x] 5. Session titles + SSE live updates

  **What to do**:
  - In `app/hooks/use-chat-stream.ts`:
    - Add a new option callback: `onSessionUpdated?: (sessionInfo: { id: string; title: string }) => void`
    - Handle `session.updated` event type (not currently handled):
      ```typescript
      } else if (data.type === "session.updated") {
        // Not to be confused with "message.updated"
        // This fires when OpenCode updates session metadata (title, etc.)
        if (data.properties?.info?.title) {
          onSessionUpdatedRef.current?.({
            id: data.properties.info.id,
            title: data.properties.info.title,
          });
        }
      }
      ```
    - Store the callback in a ref (same pattern as `onStreamCompleteRef`)
  
  **IMPORTANT**: The SSE event type `session.updated` is DIFFERENT from `message.updated`. Check the actual event shape from the OpenCode SDK. The events route proxies all SDK events. The event may have a different property structure — inspect the actual data by looking at:
    - `packages/orchestrator/src/events/notifier.ts:112-133` — Shows how events are structured
    - The events from `client.event.subscribe()` may use `data.type` or a different discriminator

  - In `app/hooks/use-sessions.ts`:
    - Add `updateSessionTitle(id: string, title: string)` function:
      ```typescript
      const updateSessionTitle = useCallback((id: string, title: string) => {
        setSessions((prev) => prev.map((s) => 
          s.id === id ? { ...s, title } : s
        ));
      }, []);
      ```
    - Also add periodic session refresh: `setInterval(fetchSessions, 30000)` — every 30s, re-fetch sessions to catch any missed title updates. Clean up interval on unmount.
    - Return `updateSessionTitle` from the hook

  - In `app/chat/components/message-list.tsx`:
    - Pass `onSessionUpdated` callback from `useChatStream` options
    - Wire it to a prop callback that parent (`chat/page.tsx`) provides

  - In `app/chat/page.tsx`:
    - Accept `updateSessionTitle` from `useSessions()`
    - Pass it through to `MessageList` → `useChatStream` → `onSessionUpdated`

  **Must NOT do**:
  - Do NOT add a new SSE connection — reuse the existing one
  - Do NOT add a new API route
  - Do NOT poll more frequently than 30s

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 4)
  - **Blocks**: Task 6
  - **Blocked By**: Task 1

  **References**:
  - `packages/dashboard/app/hooks/use-chat-stream.ts:21-26` — Existing ref pattern for `onStreamCompleteRef`
  - `packages/dashboard/app/hooks/use-chat-stream.ts:46-76` — Current event handlers (add `session.updated` alongside these)
  - `packages/orchestrator/src/events/notifier.ts:112-133` — SSE event structure for session updates with title
  - `packages/orchestrator/src/client/operations.ts` — Session operations showing data shapes
  - `packages/dashboard/app/hooks/use-sessions.ts` — Current hook (add `updateSessionTitle` and periodic refresh)
  - `packages/dashboard/app/chat/page.tsx:10-16` — Where `useSessions()` is called, wire `updateSessionTitle` through

  **Acceptance Criteria**:
  - [x] `lsp_diagnostics` clean on all changed files
  - [x] `bun run build` passes

  **Agent-Executed QA Scenarios:**
  ```
  Scenario: Session title appears in sidebar after first message
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, logged in
    Steps:
      1. Navigate to http://localhost:3000/chat
      2. Click "+ New Chat" to create a new session
      3. Note the sidebar shows "Untitled" or empty title for new session
      4. Send a message: "Help me refactor the authentication module"
      5. Wait for response to complete
      6. Wait additional 10s for title update (SSE or polling)
      7. Check sidebar: the session item should now show a meaningful title (not "Untitled", not "New session - 2026...")
      8. Screenshot: .sisyphus/evidence/task-5-session-title.png
    Expected Result: Sidebar shows OpenCode-assigned title

  Scenario: Session title updates without page refresh
    Tool: Playwright (playwright skill)
    Steps:
      1. (Continuing from above)
      2. Do NOT refresh the page
      3. The title should have updated via SSE event or polling
      4. Assert: sidebar title text is different from initial empty/default
    Expected Result: Title updates reactively
  ```

  **Commit**: YES
  - Message: `feat(dashboard): live session title updates via SSE and polling`
  - Files: `app/hooks/use-chat-stream.ts`, `app/hooks/use-sessions.ts`, `app/chat/components/message-list.tsx`, `app/chat/page.tsx`

---

- [x] 6. Project-grouped sidebar

  **What to do**:
  - In `app/hooks/use-sessions.ts`:
    - Add a `groupedSessions` computed value that groups sessions by `directory`:
      ```typescript
      const groupedSessions = useMemo(() => {
        const groups = new Map<string, { directory: string; projectName: string; sessions: SessionInfo[] }>();
        
        for (const session of sessions) {
          const dir = session.directory || "unknown";
          const projectName = dir.split("/").filter(Boolean).pop() || "General";
          
          if (!groups.has(dir)) {
            groups.set(dir, { directory: dir, projectName, sessions: [] });
          }
          groups.get(dir)!.sessions.push(session);
        }
        
        // Sort groups by most recently updated session
        return Array.from(groups.values()).sort((a, b) => {
          const aLatest = Math.max(...a.sessions.map(s => s.time.updated));
          const bLatest = Math.max(...b.sessions.map(s => s.time.updated));
          return bLatest - aLatest;
        });
      }, [sessions]);
      ```
    - Return `groupedSessions` from the hook

  - In `app/chat/components/session-sidebar.tsx`:
    - Update `SessionSidebarProps` to accept `groupedSessions` instead of flat `sessions`
    - Render grouped layout in `SessionList`:
      ```
      [Project Name]
        Session 1 (title, time)
        Session 2 (title, time)
      [Project Name 2]
        Session 3 (title, time)
      ```
    - Each group header shows the project name (derived from directory basename)
    - Sessions within each group sorted by most recently updated first
    - Style group headers: text-xs, uppercase, text-muted-foreground, px-3, pt-4, pb-1 (similar to how Claude web shows project names)
    - Keep "+ New Chat" button at the top (creates session in the current project)
    - Keep delete button on each session (hover to reveal)
    - The active session highlight stays the same
    - If there's only one group, still show the group header (user should see which project they're in)

  - In `app/chat/page.tsx`:
    - Get `groupedSessions` from `useSessions()` and pass to `SessionSidebar` and `MobileSidebar`

  **Must NOT do**:
  - Do NOT add collapsible/expandable groups
  - Do NOT add project CRUD (create, rename, delete)
  - Do NOT add session search/filter
  - Do NOT add drag-and-drop between groups
  - Do NOT add project icons or colors

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Needed for sidebar grouping layout — visual hierarchy, spacing, typography decisions

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (sequential, final)
  - **Blocks**: None
  - **Blocked By**: Tasks 1, 5

  **References**:
  - `packages/dashboard/app/hooks/use-sessions.ts` — Current hook (add `groupedSessions` computed value)
  - `packages/dashboard/app/chat/components/session-sidebar.tsx` — Current sidebar (restructure for groups)
  - `packages/dashboard/app/chat/page.tsx` — Wire `groupedSessions` to sidebar components
  - `packages/orchestrator/src/client/types.ts:15-27` — Canonical SessionInfo with `projectID` and `directory` fields
  - Claude web's project sidebar as UX reference: group headers in uppercase muted text, sessions indented below, most recent first

  **Acceptance Criteria**:
  - [x] `lsp_diagnostics` clean on all changed files
  - [x] `bun run build` passes

  **Agent-Executed QA Scenarios:**
  ```
  Scenario: Sessions grouped by project in sidebar
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, logged in, multiple sessions exist
    Steps:
      1. Navigate to http://localhost:3000/chat
      2. Wait for sidebar to load
      3. Assert: at least one group header element exists in sidebar
      4. Assert: group header shows a project name (not empty, not "undefined")
      5. Assert: sessions appear under their respective group header
      6. Screenshot: .sisyphus/evidence/task-6-project-groups.png
    Expected Result: Sidebar shows sessions organized under project headers

  Scenario: Session title shown (not "New session - 2026...")
    Tool: Playwright (playwright skill)
    Steps:
      1. Check session items in sidebar
      2. Assert: No session shows text starting with "New session - 2026"
      3. Sessions should show their OpenCode-assigned title or "Untitled"
    Expected Result: Real titles displayed

  Scenario: Active session highlighted within group
    Tool: Playwright (playwright skill)
    Steps:
      1. Click a session in the sidebar
      2. Assert: clicked session has bg-sidebar-accent class (highlight)
      3. Assert: other sessions in same group do NOT have highlight
    Expected Result: Single session highlighted

  Scenario: New Chat creates session in current project
    Tool: Playwright (playwright skill)
    Steps:
      1. Click "+ New Chat"
      2. Assert: new session appears in the sidebar under the existing project group
      3. Assert: new session is selected (highlighted)
    Expected Result: New session appears in correct project group

  Scenario: Mobile sidebar shows project groups
    Tool: Playwright (playwright skill)
    Steps:
      1. Set viewport to 375x812
      2. Click hamburger (☰)
      3. Assert: sidebar shows project group headers
      4. Assert: sessions grouped under headers
      5. Click a session → sidebar closes
      6. Screenshot: .sisyphus/evidence/task-6-mobile-groups.png
    Expected Result: Project grouping works on mobile too
  ```

  **Commit**: YES
  - Message: `feat(dashboard): project-grouped sidebar using OpenCode directory`
  - Files: `app/hooks/use-sessions.ts`, `app/chat/components/session-sidebar.tsx`, `app/chat/page.tsx`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `refactor(dashboard): unify SessionInfo type` | types.ts, use-sessions.ts, session-sidebar.tsx | build |
| 2 | `fix(dashboard): rename Assistant to Arachne` | message-bubble.tsx, chat-input.tsx | build + grep |
| 3 | `fix(dashboard): allow typing during streaming` | chat-input.tsx | build |
| 4 | `feat(dashboard): add thinking indicator` | use-chat-stream.ts, message-list.tsx, page.tsx | build |
| 5 | `feat(dashboard): live session title updates` | use-chat-stream.ts, use-sessions.ts, message-list.tsx, page.tsx | build |
| 6 | `feat(dashboard): project-grouped sidebar` | use-sessions.ts, session-sidebar.tsx, page.tsx | build + Playwright |

---

## Success Criteria

### Verification Commands
```bash
bun run build                    # Expected: exit 0
bun test                         # Expected: all tests pass
grep '"Arachne"' packages/dashboard/app/chat/components/message-bubble.tsx  # Expected: match
grep '"Message Arachne..."' packages/dashboard/app/chat/components/chat-input.tsx  # Expected: match
```

### Final Checklist
- [x] "Arachne" label on all assistant messages
- [x] "Message Arachne..." placeholder in input
- [x] Can type during streaming (textarea not disabled)
- [x] Send button disabled during streaming
- [x] Thinking indicator visible between send and first delta
- [x] Session titles from OpenCode shown in sidebar
- [x] Titles update reactively (SSE or polling, no manual refresh)
- [x] Sessions grouped by project directory in sidebar
- [x] Group headers show project name
- [x] All existing tests pass
- [x] Build clean
