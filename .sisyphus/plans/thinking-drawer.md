# Thinking Drawer — Show Amanda's Reasoning Process

## TL;DR

> **Quick Summary**: Add a right-side "thinking drawer" panel to the Arachne dashboard that displays Amanda's reasoning process (thinking text), tool executions (with input/output), and step progress — both live during streaming and as full conversation history.
> 
> **Deliverables**:
> - Right-side thinking drawer panel (desktop: push layout, mobile: Sheet overlay)
> - Toggle button in header bar (brain icon, pulses during activity)
> - Full conversation thinking history, grouped per assistant response
> - Live tool execution display via SSE + post-step reasoning from message data
> - Bidirectional scroll sync between chat messages and thinking entries
> - Extended message data pipeline (reasoning + tool parts preserved from API)
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES — 3 waves
> **Critical Path**: Task 1 (data pipeline) → Task 3 (thinking hook) → Task 5 (drawer component) → Task 7 (scroll sync)

---

## Context

### Original Request
User asked Amanda: "In the Arachne project, we need to have a right drawer that shows the thinking that oh-my-opencode (OMO) or OpenCode (OC) goes through."

### Interview Summary
**Key Discussions**:
- Desktop behavior: Push layout (drawer takes ~320px, chat narrows) — like VS Code side panels
- Mobile behavior: Sheet overlay from right (reuse existing Sheet component)
- Toggle: Manual only — user clicks button to open/close, no auto-open
- Content: Live tool names via SSE + reasoning text after each step completes
- Scope: Full conversation history, grouped per assistant response
- Scroll: Bidirectional sync — scrolling chat scrolls drawer, and vice versa

**Research Findings**:
- OpenCode message parts include types: `reasoning`, `tool`, `text`, `step-start`, `step-finish`
- The messages API already returns ALL parts — `use-messages.ts` currently throws away non-text parts (lines 31-34)
- SSE `message.part.delta` only has text deltas (no reasoning)
- SSE `tool.execute`/`tool.result` have tool names but minimal detail
- Full reasoning + tool data comes from `message.updated` or the messages API
- Vercel AI Chatbot patterns: collapsible reasoning blocks, color-coded tool status badges, MutationObserver auto-scroll
- Existing Sheet component (`components/ui/sheet.tsx`) supports `side="right"` with proper animations

### Self-Identified Gaps (Metis-equivalent)
**Addressed in plan**:
1. **Scroll sync infinite loops**: Bidirectional scroll sync can cause A→B→A→B loops. Must use a "scroll source" flag to prevent.
2. **Multiple assistant messages per turn**: OpenCode fires multiple assistant messages in tool-call chains. Must group all into one "thinking session."
3. **Huge tool outputs**: Tool output can be thousands of characters. Must truncate with expand option.
4. **Empty state**: Drawer needs a meaningful empty state when no thinking data exists.
5. **Header label**: Currently says "Arachne Chat" — should say "Amanda Chat" (missed in Round 2).
6. **Performance**: Long reasoning text needs scroll virtualization consideration. Decided: defer virtualization, use max-height with overflow instead (simpler, adequate for V1).

---

## Work Objectives

### Core Objective
Build a right-side thinking drawer that exposes Amanda's internal reasoning, tool usage, and step progress to the user — providing transparency into how she works through problems.

### Concrete Deliverables
- `app/hooks/use-thinking.ts` — New hook capturing thinking data from SSE + messages API
- `app/chat/components/thinking-drawer.tsx` — Desktop panel + mobile Sheet
- `app/chat/components/thinking-entry.tsx` — Individual thinking block (reasoning text, tool cards)
- Modified `app/hooks/use-messages.ts` — Returns raw parts alongside transformed messages
- Modified `app/hooks/use-chat-stream.ts` — Captures reasoning + detailed tool data from SSE
- Modified `app/chat/page.tsx` — Layout with drawer, toggle state, scroll sync
- Modified `app/chat/components/message-list.tsx` — Exposes scroll ref for sync
- Toggle button in header bar

### Definition of Done
- [ ] Thinking drawer opens/closes via header toggle button
- [ ] Desktop: drawer pushes chat left (320px panel with border-l)
- [ ] Mobile: drawer overlays as Sheet from right
- [ ] Drawer shows reasoning text for each assistant response
- [ ] Drawer shows tool executions with name, status, input/output
- [ ] Tool names appear in real-time during streaming via SSE
- [ ] Reasoning text appears after each step completes
- [ ] Full conversation history in drawer, grouped by assistant turn
- [ ] Scrolling chat syncs drawer to matching thinking block
- [ ] Scrolling drawer syncs chat to matching message
- [ ] Toggle button pulses/glows when Amanda is actively thinking
- [ ] `bun run build` (dashboard package) exits 0
- [ ] Playwright verification of each feature

### Must Have
- Thinking drawer with toggle
- Reasoning text display (from message parts)
- Tool execution display (name + status at minimum)
- Push layout on desktop, Sheet on mobile
- Bidirectional scroll sync between chat and drawer
- Activity indicator on toggle button

### Must NOT Have (Guardrails)
- NO new npm dependencies
- NO modifications to `packages/orchestrator/`
- NO modifications to voice files (`use-voice-websocket.ts`, `use-audio-playback.ts`, `use-tap-to-dictate.ts`)
- NO new API routes
- NO zustand/jotai/redux — React hooks only
- NO markdown rendering in reasoning text (plain text only for V1)
- NO code syntax highlighting in tool outputs (plain text + monospace for V1)
- NO collapsible/expandable reasoning blocks (flat display for V1 — keep it simple)
- NO drag-to-resize drawer width (fixed 320px for V1)
- NO persisting drawer open/closed state across page refreshes (ephemeral state is fine)
- NO virtualized scrolling (max-height + overflow is sufficient for V1)
- NO editing or interacting with thinking entries (read-only display)
- NO filtering or searching thinking entries

---

## Verification Strategy

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.

### Test Decision
- **Infrastructure exists**: YES (bun test, existing tests)
- **Automated tests**: Tests-after (add tests for new behavior)
- **Framework**: bun test

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

**Verification Tool by Deliverable Type:**

| Type | Tool | How Agent Verifies |
|------|------|-------------------|
| **UI Components** | Playwright (playwright skill) | Navigate, interact, assert DOM, screenshot |
| **Build** | Bash | `bun run build` exits 0 (dashboard package) |
| **Source checks** | Bash (grep) | Verify string literals and imports |
| **LSP** | lsp_diagnostics | TypeScript compilation clean |

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Extend message data pipeline (use-messages.ts) [no dependencies]
├── Task 2: Extend SSE handler for thinking data (use-chat-stream.ts) [no dependencies]
└── Task 3*: Create use-thinking.ts hook [depends: 1, 2 — but can scaffold first]

Wave 2 (After Wave 1):
├── Task 4: Create ThinkingEntry component [depends: 1 types]
├── Task 5: Create ThinkingDrawer component [depends: 4]
└── Task 6: Fix header label + add toggle button [no hard deps]

Wave 3 (After Wave 2):
├── Task 7: Integrate drawer into page.tsx + scroll sync [depends: 5, 6]
└── Task 8: Mobile Sheet + responsive behavior [depends: 5, 7]
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 3, 4, 7 | 2, 6 |
| 2 | None | 3, 7 | 1, 6 |
| 3 | 1, 2 | 5, 7 | 6 |
| 4 | 1 (types) | 5 | 6 |
| 5 | 3, 4 | 7, 8 | 6 |
| 6 | None | 7 | 1, 2, 3, 4 |
| 7 | 5, 6 | 8 | None |
| 8 | 5, 7 | None | None |

---

## TODOs

- [ ] 1. Extend message data pipeline to include raw parts

  **What to do**:
  - In `app/hooks/use-messages.ts`:
    - Add a new interface `MessagePart` representing the raw part data:
      ```typescript
      export interface MessagePart {
        type: "text" | "reasoning" | "tool" | "step-start" | "step-finish";
        text?: string;           // For text and reasoning parts
        tool?: string;           // For tool parts — tool name
        callID?: string;         // For tool parts — unique call ID
        state?: {                // For tool parts — execution state
          status: string;
          input?: unknown;
          output?: string;
          title?: string;
          time?: { start: number; end: number };
        };
        time?: { start?: number; end?: number };
        reason?: string;         // For step-finish — "stop" | "tool-calls"
        tokens?: {               // For step-finish — token usage
          total: number;
          input: number;
          output: number;
          reasoning: number;
        };
        cost?: number;           // For step-finish
      }
      ```
    - Extend the `Message` interface to include a `parts` array:
      ```typescript
      export interface Message {
        id: string;              // ADD: message ID for scroll sync mapping
        role: "user" | "assistant";
        content: string;
        timestamp: number;
        parts: MessagePart[];    // ADD: raw parts for thinking drawer
      }
      ```
    - In `fetchMessages` (line 28-36), update the transform to preserve raw parts AND extract message IDs:
      ```typescript
      const transformed: Message[] = (Array.isArray(data) ? data : [])
        .map((msg: any) => ({
          id: msg.info?.id || `msg-${Date.now()}-${Math.random()}`,
          role: msg.info?.role === "user" ? "user" as const : "assistant" as const,
          content: (msg.parts || [])
            .filter((p: any) => p.type === "text")
            .map((p: any) => p.text || "")
            .join(""),
          timestamp: msg.info?.time?.created || Date.now(),
          parts: (msg.parts || []).map((p: any) => ({
            type: p.type,
            text: p.text,
            tool: p.tool,
            callID: p.callID,
            state: p.state,
            time: p.time,
            reason: p.reason,
            tokens: p.state?.tokens || p.tokens,
            cost: p.state?.cost || p.cost,
          })),
        }))
        .filter((msg: Message) => msg.content.trim() !== "" || msg.parts.some(p => p.type !== "text"));
      ```
    - IMPORTANT: The filter at line 37 currently removes messages with empty text content. But some assistant messages might only have tool calls (no text). Update the filter to keep messages that have ANY non-empty parts.

  **Must NOT do**:
  - Do NOT change the API route — it already returns all parts
  - Do NOT add new API calls — this is just transforming existing data
  - Do NOT break the existing `messages` array structure — `content` field must still work for MessageBubble

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - **Reason**: Simple data transformation, no UI work

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 6)
  - **Blocks**: Tasks 3, 4, 7
  - **Blocked By**: None

  **References**:
  - `packages/dashboard/app/hooks/use-messages.ts:4-8` — Current `Message` interface (text-only)
  - `packages/dashboard/app/hooks/use-messages.ts:28-37` — Current transform that filters to text parts only
  - `packages/dashboard/app/api/sessions/[id]/messages/route.ts:21-24` — API returns raw SDK data with all parts
  - `packages/dashboard/app/lib/types.ts` — Existing shared types (put `MessagePart` here or in use-messages.ts)
  - Amanda's session data (from investigation) shows actual part shapes:
    - `reasoning`: `{ type: "reasoning", text: "...", metadata: { anthropic: { signature } }, time: { start, end } }`
    - `tool`: `{ type: "tool", callID: "toolu_...", tool: "read", state: { status: "completed", input: {...}, output: "...", time: {...} } }`
    - `step-finish`: `{ type: "step-finish", reason: "stop", cost: 0, tokens: { total, input, output, reasoning, cache } }`

  **Acceptance Criteria**:
  - [ ] `Message` interface has `id: string` and `parts: MessagePart[]` fields
  - [ ] `MessagePart` interface covers reasoning, tool, step-start, step-finish types
  - [ ] Transformed messages include raw parts array
  - [ ] Messages with tool-only content (no text) are NOT filtered out
  - [ ] Existing `content` field still works (MessageBubble unchanged)
  - [ ] `lsp_diagnostics` clean on `use-messages.ts`
  - [ ] `bun run build` (dashboard) passes

  **Agent-Executed QA Scenarios:**
  ```
  Scenario: Build passes with extended Message type
    Tool: Bash
    Steps:
      1. cd packages/dashboard && bun run build
      2. Assert: exit 0
    Expected Result: No type errors from extended interface

  Scenario: Existing message rendering unaffected
    Tool: Playwright (playwright skill)
    Preconditions: Dev server on localhost:3000, logged in
    Steps:
      1. Navigate to http://localhost:3000/chat
      2. Send "hello"
      3. Wait for response (30s)
      4. Assert: div[data-role="assistant"] exists with text content
      5. Assert: div[data-role="user"] contains "hello"
      6. Screenshot: .sisyphus/evidence/task-1-messages-intact.png
    Expected Result: Chat messages render exactly as before
  ```

  **Commit**: YES
  - Message: `refactor(dashboard): extend Message type with raw parts for thinking drawer`
  - Files: `app/hooks/use-messages.ts`

---

- [ ] 2. Extend SSE handler to capture thinking data in real-time

  **What to do**:
  - In `app/hooks/use-chat-stream.ts`:
    - Add new state for live thinking data:
      ```typescript
      const [currentThinkingParts, setCurrentThinkingParts] = useState<ThinkingPart[]>([]);
      ```
    - Define `ThinkingPart` type (or import from shared types):
      ```typescript
      interface ThinkingPart {
        type: "tool-start" | "tool-end" | "reasoning" | "step-start" | "step-finish";
        tool?: string;
        callID?: string;
        status?: string;
        input?: unknown;
        output?: string;
        text?: string;
        reason?: string;
        tokens?: { total: number; input: number; output: number; reasoning: number };
        timestamp: number;
      }
      ```
    - In the `tool.execute` handler (line 89), push a new thinking part instead of just setting tool name:
      ```typescript
      } else if (data.type === "tool.execute") {
        setCurrentToolUse(data.props?.name || "unknown"); // Keep existing behavior
        setCurrentThinkingParts(prev => [...prev, {
          type: "tool-start",
          tool: data.props?.name || "unknown",
          callID: data.props?.callID,
          timestamp: Date.now(),
        }]);
      }
      ```
    - In the `tool.result` handler (line 91), push a tool-end part:
      ```typescript
      } else if (data.type === "tool.result") {
        setCurrentToolUse(null); // Keep existing behavior
        setCurrentThinkingParts(prev => [...prev, {
          type: "tool-end",
          tool: data.props?.name,
          callID: data.props?.callID,
          output: typeof data.props?.result === "string" ? data.props.result.slice(0, 500) : undefined,
          status: "completed",
          timestamp: Date.now(),
        }]);
      }
      ```
    - In the `message.updated` handler (line 77), extract reasoning parts from the full message:
      ```typescript
      } else if (data.type === "message.updated") {
        if (hasReceivedDeltaRef.current) {
          setCurrentMessage("");
          hasReceivedDeltaRef.current = false;
        }
        // Extract reasoning parts from the updated message
        const parts = data.parts || data.data?.parts || [];
        if (Array.isArray(parts)) {
          const reasoningParts = parts
            .filter((p: any) => p.type === "reasoning" && p.text)
            .map((p: any) => ({
              type: "reasoning" as const,
              text: p.text,
              timestamp: p.time?.start || Date.now(),
            }));
          if (reasoningParts.length > 0) {
            setCurrentThinkingParts(prev => [...prev, ...reasoningParts]);
          }
        }
      }
      ```
    - In the `session.idle` handler (line 82), reset thinking parts:
      ```typescript
      } else if (data.type === "session.idle") {
        // ... existing reset code ...
        setCurrentThinkingParts([]); // Reset for next response
      }
      ```
    - Return `currentThinkingParts` from the hook
    - Add a new callback option `onThinkingUpdate?: (parts: ThinkingPart[]) => void` and call it when parts change

  **Must NOT do**:
  - Do NOT break existing `isStreaming`, `currentMessage`, `currentToolUse` behavior
  - Do NOT add console.log statements (remove any debug logging from Round 2 fixes)
  - Do NOT create new SSE connections

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: []
  - **Reason**: State management changes in existing hook, moderate complexity

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 6)
  - **Blocks**: Tasks 3, 7
  - **Blocked By**: None

  **References**:
  - `packages/dashboard/app/hooks/use-chat-stream.ts:58-107` — Current SSE event handler with all event types
  - `packages/dashboard/app/hooks/use-chat-stream.ts:89-92` — Current tool.execute/tool.result handling (just sets name)
  - `packages/dashboard/app/hooks/use-chat-stream.ts:77-81` — Current message.updated handler
  - Amanda's session messages — real `message.updated` data shows `parts` array with reasoning and tool types
  - SSE event `tool.execute` shape: `{ type: "tool.execute", props: { name: "read", callID: "toolu_..." } }`
  - SSE event `tool.result` shape: `{ type: "tool.result", props: { name: "read", callID: "toolu_...", result: "..." } }`

  **Acceptance Criteria**:
  - [ ] `currentThinkingParts` state added and returned from hook
  - [ ] Tool start/end captured in real-time from SSE events
  - [ ] Reasoning text extracted from `message.updated` parts
  - [ ] Thinking parts reset on `session.idle`
  - [ ] Existing streaming behavior unchanged
  - [ ] `lsp_diagnostics` clean
  - [ ] `bun run build` (dashboard) passes

  **Agent-Executed QA Scenarios:**
  ```
  Scenario: Build passes with extended hook
    Tool: Bash
    Steps:
      1. cd packages/dashboard && bun run build
      2. Assert: exit 0
    Expected Result: No type errors

  Scenario: Existing streaming behavior preserved
    Tool: Playwright (playwright skill)
    Preconditions: Dev server on localhost:3000, logged in
    Steps:
      1. Navigate to http://localhost:3000/chat
      2. Send "Write a haiku about coding"
      3. Wait for response (30s)
      4. Assert: response text appears in message bubble
      5. Assert: stop button appears then disappears
      6. Screenshot: .sisyphus/evidence/task-2-streaming-preserved.png
    Expected Result: Streaming works exactly as before
  ```

  **Commit**: YES
  - Message: `feat(dashboard): capture thinking data from SSE events in chat stream hook`
  - Files: `app/hooks/use-chat-stream.ts`

---

- [ ] 3. Create use-thinking.ts hook — unified thinking data provider

  **What to do**:
  - Create `app/hooks/use-thinking.ts`:
    - This hook combines data from two sources:
      1. **Historical**: reasoning + tool parts from fetched messages (via `use-messages.ts`)
      2. **Live**: real-time thinking parts from SSE (via `use-chat-stream.ts`)
    - Define the unified `ThinkingSession` type:
      ```typescript
      export interface ThinkingSession {
        messageId: string;           // Links to the assistant message
        messageIndex: number;        // Index in messages array (for scroll sync)
        entries: ThinkingEntry[];    // Ordered list of thinking events
      }

      export interface ThinkingEntry {
        id: string;                  // Unique key for React rendering
        type: "reasoning" | "tool-start" | "tool-end" | "step-start" | "step-finish";
        text?: string;               // Reasoning text
        tool?: string;               // Tool name
        callID?: string;             // Tool call ID (links start → end)
        status?: string;             // Tool status
        input?: unknown;             // Tool input params
        output?: string;             // Tool output (truncated)
        reason?: string;             // Step finish reason
        tokens?: { total: number; input: number; output: number; reasoning: number };
        timestamp: number;
      }
      ```
    - Accept `messages` (from `use-messages.ts`) and `currentThinkingParts` (from `use-chat-stream.ts`) as inputs
    - Transform into `ThinkingSession[]`:
      ```typescript
      export function useThinking(
        messages: Message[],
        currentThinkingParts: ThinkingPart[],
        activeSessionId: string | null,
      ): ThinkingSession[] {
        return useMemo(() => {
          const sessions: ThinkingSession[] = [];

          // 1. Historical: extract from fetched messages
          messages.forEach((msg, index) => {
            if (msg.role !== "assistant") return;
            const entries: ThinkingEntry[] = msg.parts
              .filter(p => p.type !== "text") // Everything except visible text
              .map((p, i) => ({
                id: `${msg.id}-part-${i}`,
                type: mapPartType(p.type),
                text: p.text,
                tool: p.tool,
                callID: p.callID,
                status: p.state?.status,
                input: p.state?.input,
                output: typeof p.state?.output === "string" ? p.state.output.slice(0, 500) : undefined,
                reason: p.reason,
                tokens: p.tokens,
                timestamp: p.time?.start || msg.timestamp,
              }));

            if (entries.length > 0) {
              sessions.push({ messageId: msg.id, messageIndex: index, entries });
            }
          });

          // 2. Live: append current thinking parts as a temporary session
          if (currentThinkingParts.length > 0) {
            sessions.push({
              messageId: "live",
              messageIndex: messages.length, // After all existing messages
              entries: currentThinkingParts.map((p, i) => ({
                id: `live-${i}`,
                ...p,
              })),
            });
          }

          return sessions;
        }, [messages, currentThinkingParts]);
      }
      ```
    - The `mapPartType` helper converts raw part types to ThinkingEntry types:
      - `"reasoning"` → `"reasoning"`
      - `"tool"` → `"tool-start"` (with callID, input) or `"tool-end"` (with output) based on `state.status`
      - `"step-start"` → `"step-start"`
      - `"step-finish"` → `"step-finish"`

  **Must NOT do**:
  - Do NOT fetch data — this hook only transforms data from other hooks
  - Do NOT duplicate SSE subscription
  - Do NOT add state management beyond `useMemo`

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: []
  - **Reason**: Data transformation hook, moderate complexity

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 1 and 2 types)
  - **Parallel Group**: Wave 1.5 (after 1 and 2, before 4)
  - **Blocks**: Tasks 5, 7
  - **Blocked By**: Tasks 1, 2

  **References**:
  - `packages/dashboard/app/hooks/use-messages.ts` — Source of historical message data with parts
  - `packages/dashboard/app/hooks/use-chat-stream.ts` — Source of live thinking parts
  - `packages/dashboard/app/lib/types.ts` — Shared types location
  - Amanda's session data — real part structures to map from

  **Acceptance Criteria**:
  - [ ] `use-thinking.ts` created with `useThinking` hook
  - [ ] `ThinkingSession` and `ThinkingEntry` types exported
  - [ ] Historical messages correctly transformed into thinking sessions
  - [ ] Live thinking parts appended as temporary session
  - [ ] Each ThinkingSession has correct `messageIndex` for scroll sync
  - [ ] `lsp_diagnostics` clean
  - [ ] `bun run build` (dashboard) passes

  **Agent-Executed QA Scenarios:**
  ```
  Scenario: Types compile cleanly
    Tool: Bash
    Steps:
      1. cd packages/dashboard && bun run build
      2. Assert: exit 0
    Expected Result: New hook compiles without errors
  ```

  **Commit**: YES
  - Message: `feat(dashboard): add use-thinking hook for unified thinking data`
  - Files: `app/hooks/use-thinking.ts`

---

- [ ] 4. Create ThinkingEntry component

  **What to do**:
  - Create `app/chat/components/thinking-entry.tsx`:
    - Renders a single thinking entry (reasoning block, tool card, or step indicator)
    - For **reasoning** entries:
      ```tsx
      <div className="mb-3">
        <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
          <span>💭</span>
          <span>Reasoning</span>
          {entry.timestamp && (
            <span className="text-xs opacity-50">
              {new Date(entry.timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground bg-muted/30 rounded-md border border-border/50 p-2.5 max-h-48 overflow-y-auto whitespace-pre-wrap">
          {entry.text}
        </div>
      </div>
      ```
    - For **tool-start** entries:
      ```tsx
      <div className="mb-2">
        <div className="flex items-center gap-2 text-xs rounded-md border p-2">
          <span className="animate-pulse text-yellow-500">●</span>
          <span className="font-mono font-medium">{entry.tool}</span>
          <span className="text-muted-foreground">running...</span>
        </div>
      </div>
      ```
    - For **tool-end** entries:
      ```tsx
      <div className="mb-3">
        <div className="rounded-md border p-2">
          <div className="flex items-center gap-2 text-xs mb-1">
            <span className="text-green-500">✓</span>
            <span className="font-mono font-medium">{entry.tool}</span>
            <span className="text-muted-foreground">{entry.status}</span>
          </div>
          {entry.output && (
            <pre className="text-xs text-muted-foreground bg-muted/50 rounded p-2 mt-1 max-h-32 overflow-y-auto font-mono whitespace-pre-wrap break-all">
              {entry.output}
            </pre>
          )}
        </div>
      </div>
      ```
    - For **step-finish** entries:
      ```tsx
      <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground border-t border-border/30 pt-2">
        <span>📊</span>
        <span>Step complete — {entry.tokens?.total} tokens</span>
        {entry.reason && <span className="opacity-50">({entry.reason})</span>}
      </div>
      ```
    - For **step-start** entries: render a subtle separator/divider
    - Accept a `ThinkingEntry` as prop and render based on `entry.type`

  **Must NOT do**:
  - Do NOT add markdown rendering
  - Do NOT add code syntax highlighting
  - Do NOT add collapsible/expandable sections
  - Do NOT add interactive elements (buttons, links)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Component needs good visual hierarchy — reasoning vs tools vs steps need distinct styling

  **Parallelization**:
  - **Can Run In Parallel**: YES (after Task 1 types exist)
  - **Parallel Group**: Wave 2 (with Tasks 5, 6)
  - **Blocks**: Task 5
  - **Blocked By**: Task 1 (needs ThinkingEntry type)

  **References**:
  - `packages/dashboard/app/chat/components/message-bubble.tsx` — Existing component pattern (follow same structure)
  - `packages/dashboard/app/chat/components/message-list.tsx:105-111` — Existing tool-use indicator (similar visual)
  - Vercel AI Chatbot `reasoning.tsx` — Production reasoning block pattern (max-h-48, text-11px, bg-muted/30)
  - Vercel AI Chatbot `tool.tsx` — Production tool card pattern (color-coded status badges)

  **Acceptance Criteria**:
  - [ ] `thinking-entry.tsx` created with exported `ThinkingEntryComponent`
  - [ ] Renders correctly for each entry type: reasoning, tool-start, tool-end, step-start, step-finish
  - [ ] Reasoning text has max-height with overflow scroll
  - [ ] Tool output truncated at 500 chars with overflow scroll
  - [ ] Visual hierarchy: reasoning (muted bg), tools (bordered cards), steps (subtle dividers)
  - [ ] `lsp_diagnostics` clean
  - [ ] `bun run build` (dashboard) passes

  **Agent-Executed QA Scenarios:**
  ```
  Scenario: Component compiles and renders
    Tool: Bash
    Steps:
      1. cd packages/dashboard && bun run build
      2. Assert: exit 0
    Expected Result: New component compiles

  Scenario: Visual verification (deferred to Task 7 integration)
    Tool: Note
    Details: Full visual verification happens in Task 7 when component is integrated into drawer
  ```

  **Commit**: YES (group with Task 5)
  - Message: `feat(dashboard): add ThinkingEntry component for reasoning and tool display`
  - Files: `app/chat/components/thinking-entry.tsx`

---

- [ ] 5. Create ThinkingDrawer component (desktop panel + mobile Sheet)

  **What to do**:
  - Create `app/chat/components/thinking-drawer.tsx`:
    - **Desktop**: A div that sits alongside `<main>` in the flex layout:
      ```tsx
      interface ThinkingDrawerProps {
        isOpen: boolean;
        thinkingSessions: ThinkingSession[];
        isThinking: boolean;       // Whether Amanda is currently thinking
        scrollRef?: React.RefObject<HTMLDivElement>;  // For scroll sync
      }

      export function ThinkingDrawer({ isOpen, thinkingSessions, isThinking, scrollRef }: ThinkingDrawerProps) {
        if (!isOpen) return null;

        return (
          <aside
            className="hidden lg:flex lg:w-80 lg:flex-col border-l bg-background"
            data-testid="thinking-drawer"
          >
            <div className="p-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">Amanda's Thinking</span>
                {isThinking && (
                  <span className="animate-pulse text-xs text-muted-foreground">● active</span>
                )}
              </div>
            </div>
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-3"
              data-testid="thinking-scroll"
            >
              {thinkingSessions.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm mt-8">
                  <div className="text-2xl mb-2">🧠</div>
                  <div>Amanda's reasoning will appear here</div>
                  <div className="text-xs mt-1">Send a message to see how she thinks</div>
                </div>
              ) : (
                thinkingSessions.map((session) => (
                  <div
                    key={session.messageId}
                    className="mb-4"
                    data-thinking-for={session.messageId}
                    data-message-index={session.messageIndex}
                  >
                    <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                      Response {session.messageIndex + 1}
                    </div>
                    {session.entries.map((entry) => (
                      <ThinkingEntryComponent key={entry.id} entry={entry} />
                    ))}
                  </div>
                ))
              )}
            </div>
          </aside>
        );
      }
      ```
    - **Mobile**: A separate `MobileThinkingDrawer` using the Sheet component:
      ```tsx
      export function MobileThinkingDrawer({ isOpen, onOpenChange, thinkingSessions, isThinking }: MobileThinkingDrawerProps) {
        return (
          <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-[85vw] sm:max-w-sm p-0">
              <SheetHeader className="p-3 border-b">
                <SheetTitle className="text-sm">Amanda's Thinking</SheetTitle>
                <SheetDescription className="sr-only">
                  Shows Amanda's reasoning process and tool usage
                </SheetDescription>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto p-3">
                {/* Same content as desktop */}
              </div>
            </SheetContent>
          </Sheet>
        );
      }
      ```
    - Add `data-thinking-for` and `data-message-index` attributes on each thinking session div — these are used by Task 7 for scroll sync

  **Must NOT do**:
  - Do NOT add drag-to-resize
  - Do NOT add collapsible sections
  - Do NOT add any interactive elements beyond scroll
  - Do NOT add the toggle button here (that's in Task 6)
  - Do NOT implement scroll sync here (that's Task 7)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Layout component needs good spacing, visual hierarchy, empty state design

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 6)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 7, 8
  - **Blocked By**: Tasks 3, 4

  **References**:
  - `packages/dashboard/app/chat/components/session-sidebar.tsx` — Left sidebar pattern (mirror for right drawer)
  - `packages/dashboard/components/ui/sheet.tsx` — Sheet component for mobile version
  - `packages/dashboard/app/chat/components/session-sidebar.tsx` — MobileSidebar pattern (follow for MobileThinkingDrawer)
  - `packages/dashboard/app/chat/page.tsx:34-41` — How left sidebar is rendered in flex layout

  **Acceptance Criteria**:
  - [ ] `thinking-drawer.tsx` created with `ThinkingDrawer` and `MobileThinkingDrawer` exports
  - [ ] Desktop version: 320px wide panel with border-l
  - [ ] Mobile version: Sheet with side="right"
  - [ ] Empty state when no thinking data
  - [ ] Activity indicator when Amanda is thinking
  - [ ] `data-thinking-for` and `data-message-index` attributes on session divs
  - [ ] `lsp_diagnostics` clean
  - [ ] `bun run build` (dashboard) passes

  **Agent-Executed QA Scenarios:**
  ```
  Scenario: Component compiles
    Tool: Bash
    Steps:
      1. cd packages/dashboard && bun run build
      2. Assert: exit 0
    Expected Result: Drawer component compiles cleanly
  ```

  **Commit**: YES (group with Task 4)
  - Message: `feat(dashboard): add ThinkingDrawer component with desktop panel and mobile Sheet`
  - Files: `app/chat/components/thinking-drawer.tsx`, `app/chat/components/thinking-entry.tsx`

---

- [ ] 6. Fix header label + add thinking drawer toggle button

  **What to do**:
  - In `app/chat/page.tsx`:
    - Fix the header label from "Arachne Chat" to "Amanda" (line 53):
      ```tsx
      <div className="font-semibold">Amanda</div>
      ```
    - Add a toggle button for the thinking drawer in the header bar, right side (after ConnectionStatus):
      ```tsx
      <div className="flex items-center gap-2">
        <ConnectionStatus />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDrawerOpen(prev => !prev)}
          className="relative"
          aria-label={drawerOpen ? "Close thinking drawer" : "Open thinking drawer"}
          data-testid="thinking-toggle"
        >
          🧠
          {isThinking && (
            <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
          )}
        </Button>
      </div>
      ```
    - Add `drawerOpen` state:
      ```tsx
      const [drawerOpen, setDrawerOpen] = useState(false);
      ```
    - The `isThinking` value comes from `waitingForResponse || isStreaming` — already available from existing hooks

  **Must NOT do**:
  - Do NOT add the drawer component itself here (that's Task 7)
  - Do NOT change any other header elements
  - Do NOT use an SVG icon — use emoji 🧠 for now (consistent with existing emoji usage in the codebase: 🕸️, ⏹, ↑, 🎤)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - **Reason**: Small UI change — header label fix + button addition

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Task 7
  - **Blocked By**: None

  **References**:
  - `packages/dashboard/app/chat/page.tsx:53` — Current "Arachne Chat" label
  - `packages/dashboard/app/chat/page.tsx:55` — ConnectionStatus position (toggle goes after this)
  - `packages/dashboard/app/chat/components/connection-status.tsx` — Pattern for header bar element
  - `packages/dashboard/components/ui/button.tsx` — Button component

  **Acceptance Criteria**:
  - [ ] Header says "Amanda" (not "Arachne Chat")
  - [ ] Toggle button exists with 🧠 emoji
  - [ ] Toggle button has `data-testid="thinking-toggle"`
  - [ ] `drawerOpen` state toggles on click
  - [ ] Pulse indicator appears when `isThinking` is true
  - [ ] `lsp_diagnostics` clean
  - [ ] `bun run build` (dashboard) passes

  **Agent-Executed QA Scenarios:**
  ```
  Scenario: Header shows "Amanda" and toggle button exists
    Tool: Playwright (playwright skill)
    Preconditions: Dev server on localhost:3000, logged in
    Steps:
      1. Navigate to http://localhost:3000/chat
      2. Assert: header contains text "Amanda"
      3. Assert: header does NOT contain text "Arachne Chat"
      4. Assert: button[data-testid="thinking-toggle"] exists
      5. Click button[data-testid="thinking-toggle"]
      6. Screenshot: .sisyphus/evidence/task-6-header-toggle.png
    Expected Result: Header updated, toggle button visible and clickable

  Scenario: Pulse indicator during thinking
    Tool: Playwright (playwright skill)
    Steps:
      1. Send a message
      2. Assert: thinking toggle button has a child with class "animate-pulse" (within 5s)
      3. Screenshot: .sisyphus/evidence/task-6-pulse-active.png
    Expected Result: Pulse indicator visible while Amanda is thinking
  ```

  **Commit**: YES
  - Message: `fix(dashboard): rename header to Amanda, add thinking drawer toggle`
  - Files: `app/chat/page.tsx`

---

- [ ] 7. Integrate drawer into page layout + bidirectional scroll sync

  **What to do**:
  - In `app/chat/page.tsx`:
    - Import and wire up `ThinkingDrawer`, `MobileThinkingDrawer`, `useThinking`
    - Add the drawer after `<main>` in the flex layout:
      ```tsx
      <>
        <SessionSidebar ... />
        <main className="flex-1 flex flex-col min-w-0">
          {/* header */}
          <MessageList
            sessionId={activeSessionId}
            onStreamingChange={handleStreamingChange}
            addOptimisticMessageRef={addOptimisticMessageRef}
            markWaitingRef={markWaitingRef}
            onSessionUpdated={updateSessionTitle}
            scrollRef={messageScrollRef}  // NEW: expose scroll container
          />
          <ChatInput ... />
        </main>
        <ThinkingDrawer
          isOpen={drawerOpen}
          thinkingSessions={thinkingSessions}
          isThinking={isStreaming || waitingForResponse}
          scrollRef={thinkingScrollRef}
        />
      </>
      ```
    - Get `thinkingSessions` from `useThinking(messages, currentThinkingParts, activeSessionId)`
    - This requires `messages` and `currentThinkingParts` to be accessible in page.tsx. Currently `messages` is inside `MessageList`. Options:
      - **Option A**: Lift `useMessages` up to page.tsx and pass messages down to MessageList
      - **Option B**: Expose messages via a ref from MessageList
      - **Recommended**: Option A — lift hooks up. It's cleaner and needed for scroll sync anyway.

  - **Lift hooks to page.tsx**:
    - Move `useMessages(sessionId)` call from `message-list.tsx` to `page.tsx`
    - Move `useChatStream(sessionId, options)` call from `message-list.tsx` to `page.tsx`
    - Pass results down to `MessageList` as props
    - This is a refactor but necessary for the drawer to access the same data

  - **Bidirectional scroll sync**:
    - Add `messageScrollRef` and `thinkingScrollRef` as refs
    - Use IntersectionObserver or scroll position tracking to detect which message is currently visible
    - When chat scrolls: find the visible message index → find matching ThinkingSession by `messageIndex` → scroll thinking drawer to that session's `[data-message-index]` element
    - When thinking drawer scrolls: find the visible thinking session's `messageIndex` → scroll chat to the message at that index
    - **CRITICAL**: Use a `scrollSourceRef` to prevent infinite loops:
      ```typescript
      const scrollSourceRef = useRef<"chat" | "thinking" | null>(null);

      const handleChatScroll = () => {
        if (scrollSourceRef.current === "thinking") return; // Prevent loop
        scrollSourceRef.current = "chat";
        // ... find visible message, scroll thinking drawer ...
        requestAnimationFrame(() => { scrollSourceRef.current = null; });
      };

      const handleThinkingScroll = () => {
        if (scrollSourceRef.current === "chat") return; // Prevent loop
        scrollSourceRef.current = "thinking";
        // ... find visible thinking session, scroll chat ...
        requestAnimationFrame(() => { scrollSourceRef.current = null; });
      };
      ```
    - Attach scroll listeners to both containers
    - Use `behavior: "instant"` for sync scrolls (no smooth animation lag)

  - **Expose scroll ref from MessageList**:
    - Modify `message-list.tsx` to accept an optional `scrollRef` prop
    - Pass it to the scrollable div instead of the internal `scrollRef`
    - Or use `forwardRef` on MessageList

  - **Mobile drawer**:
    - Add `MobileThinkingDrawer` next to `MobileSidebar` in header area
    - Triggered by the same toggle button on mobile (toggle shows Sheet instead of panel)
    - Mobile: no scroll sync (too complex for Sheet overlay, defer to V2)

  **Must NOT do**:
  - Do NOT add smooth scroll animation for sync (use `behavior: "instant"`)
  - Do NOT implement scroll sync on mobile (Sheet overlay makes it impractical)
  - Do NOT break existing MessageList rendering
  - Do NOT change the messages API or SSE connection

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Complex layout integration, scroll sync UX requires careful handling

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (sequential)
  - **Blocks**: Task 8
  - **Blocked By**: Tasks 5, 6

  **References**:
  - `packages/dashboard/app/chat/page.tsx` — Current layout (add drawer after main)
  - `packages/dashboard/app/chat/components/message-list.tsx` — Currently owns useMessages and useChatStream (lift up)
  - `packages/dashboard/app/chat/components/session-sidebar.tsx:40` — Left sidebar class pattern to mirror
  - Vercel AI Chatbot `use-scroll-to-bottom.tsx` — Scroll sync patterns (MutationObserver, user scroll detection)
  - `packages/dashboard/app/chat/components/message-list.tsx:50-52` — Current auto-scroll to bottom logic

  **Acceptance Criteria**:
  - [ ] ThinkingDrawer renders alongside chat on desktop
  - [ ] Chat narrows when drawer is open (flex layout)
  - [ ] Toggle button opens/closes drawer
  - [ ] Drawer shows reasoning text from previous messages
  - [ ] Drawer shows tool executions from previous messages
  - [ ] Live tool names appear during streaming
  - [ ] Scrolling chat syncs thinking drawer to matching entry
  - [ ] Scrolling drawer syncs chat to matching message
  - [ ] No infinite scroll loops
  - [ ] `lsp_diagnostics` clean on all changed files
  - [ ] `bun run build` (dashboard) passes

  **Agent-Executed QA Scenarios:**
  ```
  Scenario: Drawer opens and shows thinking data
    Tool: Playwright (playwright skill)
    Preconditions: Dev server on localhost:3000, logged in, session with messages exists
    Steps:
      1. Navigate to http://localhost:3000/chat
      2. Send "Explain how quantum computing works in detail"
      3. Wait for response to complete (60s)
      4. Click button[data-testid="thinking-toggle"]
      5. Assert: aside[data-testid="thinking-drawer"] is visible
      6. Assert: thinking drawer contains at least one thinking entry
      7. Screenshot: .sisyphus/evidence/task-7-drawer-open.png
    Expected Result: Drawer opens showing reasoning and/or tool data

  Scenario: Drawer pushes chat layout
    Tool: Playwright (playwright skill)
    Steps:
      1. (Continuing from above)
      2. Measure main element width
      3. Assert: main element is narrower than viewport - sidebar - 320px
      4. Click toggle again
      5. Assert: thinking drawer is NOT visible
      6. Assert: main element width has increased (expanded back)
      7. Screenshot: .sisyphus/evidence/task-7-layout-push.png
    Expected Result: Chat narrows when drawer opens, expands when closed

  Scenario: Scroll sync (chat → thinking)
    Tool: Playwright (playwright skill)
    Preconditions: Session with multiple messages
    Steps:
      1. Open thinking drawer
      2. Scroll chat to top
      3. Wait 500ms
      4. Check thinking drawer scroll position
      5. Assert: thinking drawer is near top
      6. Scroll chat to bottom
      7. Wait 500ms
      8. Assert: thinking drawer is near bottom
      9. Screenshot: .sisyphus/evidence/task-7-scroll-sync.png
    Expected Result: Thinking drawer follows chat scroll position

  Scenario: Live tool display during streaming
    Tool: Playwright (playwright skill)
    Steps:
      1. Open thinking drawer
      2. Send "What files are in the current directory?"
      3. Wait for tool execution (Amanda should use read/glob tools)
      4. Assert: thinking drawer shows tool name with "running..." text
      5. Wait for response complete
      6. Assert: tool shows "completed" status
      7. Screenshot: .sisyphus/evidence/task-7-live-tools.png
    Expected Result: Tool executions appear in real-time in drawer

  Scenario: Empty state
    Tool: Playwright (playwright skill)
    Steps:
      1. Create new session (click "+ New Chat")
      2. Open thinking drawer
      3. Assert: drawer shows empty state text "Amanda's reasoning will appear here"
      4. Screenshot: .sisyphus/evidence/task-7-empty-state.png
    Expected Result: Meaningful empty state displayed
  ```

  **Commit**: YES
  - Message: `feat(dashboard): integrate thinking drawer with layout and scroll sync`
  - Files: `app/chat/page.tsx`, `app/chat/components/message-list.tsx`

---

- [ ] 8. Mobile Sheet drawer + responsive behavior

  **What to do**:
  - In `app/chat/page.tsx`:
    - Add `MobileThinkingDrawer` component usage:
      ```tsx
      {/* Mobile thinking drawer - only renders on mobile */}
      <MobileThinkingDrawer
        isOpen={drawerOpen && isMobile}
        onOpenChange={(open) => setDrawerOpen(open)}
        thinkingSessions={thinkingSessions}
        isThinking={isStreaming || waitingForResponse}
      />
      ```
    - Determine mobile with a simple check:
      ```typescript
      const [isMobile, setIsMobile] = useState(false);
      useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 1024);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
      }, []);
      ```
    - On mobile, the toggle button should open the Sheet (not the panel)
    - The desktop `ThinkingDrawer` already has `className="hidden lg:flex ..."` so it won't render on mobile
    - Ensure the toggle button on mobile triggers `setDrawerOpen(true)` which opens the Sheet

  - In `thinking-drawer.tsx`:
    - Verify `MobileThinkingDrawer` works with the Sheet component
    - Include proper accessibility: `SheetTitle`, `SheetDescription`
    - Test that Sheet slides in from right and has close button

  **Must NOT do**:
  - Do NOT implement scroll sync on mobile (defer to V2)
  - Do NOT add bottom sheet (stick with right Sheet for consistency)
  - Do NOT add swipe gestures (Sheet component handles its own close)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Responsive behavior needs testing across breakpoints

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (after Task 7)
  - **Blocks**: None
  - **Blocked By**: Tasks 5, 7

  **References**:
  - `packages/dashboard/app/chat/components/session-sidebar.tsx` — MobileSidebar pattern with Sheet (follow exactly)
  - `packages/dashboard/components/ui/sheet.tsx` — Sheet component API
  - `packages/dashboard/app/chat/page.tsx:46-52` — How MobileSidebar is rendered

  **Acceptance Criteria**:
  - [ ] Mobile thinking drawer opens as Sheet from right
  - [ ] Sheet has proper title and description for accessibility
  - [ ] Sheet has close button
  - [ ] Toggle button on mobile opens Sheet (not panel)
  - [ ] Desktop panel does NOT render on mobile (hidden lg:flex)
  - [ ] Mobile Sheet does NOT render on desktop
  - [ ] Thinking content displays correctly in Sheet
  - [ ] `bun run build` (dashboard) passes

  **Agent-Executed QA Scenarios:**
  ```
  Scenario: Mobile thinking drawer opens as Sheet
    Tool: Playwright (playwright skill)
    Steps:
      1. Set viewport to 375x812 (iPhone)
      2. Navigate to http://localhost:3000/chat
      3. Assert: aside[data-testid="thinking-drawer"] is NOT visible (desktop only)
      4. Click button[data-testid="thinking-toggle"]
      5. Assert: Sheet content is visible (role="dialog")
      6. Assert: Sheet has title "Amanda's Thinking"
      7. Screenshot: .sisyphus/evidence/task-8-mobile-sheet.png
    Expected Result: Sheet slides in from right on mobile

  Scenario: Desktop panel hidden on mobile
    Tool: Playwright (playwright skill)
    Steps:
      1. Set viewport to 375x812
      2. Assert: no aside[data-testid="thinking-drawer"] in DOM or hidden
    Expected Result: Desktop panel not rendered on mobile

  Scenario: Sheet closes on X button
    Tool: Playwright (playwright skill)
    Steps:
      1. (Mobile viewport, Sheet open)
      2. Click the close button (X icon)
      3. Assert: Sheet is closed
      4. Assert: chat is visible
      5. Screenshot: .sisyphus/evidence/task-8-mobile-closed.png
    Expected Result: Sheet closes cleanly
  ```

  **Commit**: YES
  - Message: `feat(dashboard): add mobile Sheet for thinking drawer`
  - Files: `app/chat/page.tsx`, `app/chat/components/thinking-drawer.tsx`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `refactor(dashboard): extend Message type with raw parts` | use-messages.ts | build |
| 2 | `feat(dashboard): capture thinking data from SSE events` | use-chat-stream.ts | build |
| 3 | `feat(dashboard): add use-thinking hook` | use-thinking.ts | build |
| 4+5 | `feat(dashboard): add ThinkingDrawer and ThinkingEntry components` | thinking-drawer.tsx, thinking-entry.tsx | build |
| 6 | `fix(dashboard): rename header to Amanda, add toggle` | page.tsx | build + Playwright |
| 7 | `feat(dashboard): integrate thinking drawer with scroll sync` | page.tsx, message-list.tsx | build + Playwright |
| 8 | `feat(dashboard): add mobile Sheet for thinking drawer` | page.tsx, thinking-drawer.tsx | build + Playwright |

---

## Success Criteria

### Verification Commands
```bash
cd packages/dashboard && bun run build   # Expected: exit 0
```

### Final Checklist
- [ ] Thinking drawer toggles open/closed via 🧠 button
- [ ] Desktop: drawer pushes chat left (320px panel)
- [ ] Mobile: drawer slides in as Sheet from right
- [ ] Reasoning text displayed for assistant responses
- [ ] Tool executions displayed with name and status
- [ ] Tool names appear in real-time during streaming
- [ ] Full conversation thinking history visible
- [ ] Bidirectional scroll sync (desktop only)
- [ ] Toggle button pulses during active thinking
- [ ] Header says "Amanda" (not "Arachne Chat")
- [ ] Empty state when no thinking data
- [ ] No infinite scroll loops
- [ ] All existing features still work (chat, sidebar, streaming)
- [ ] Build clean (dashboard package)
