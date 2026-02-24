# Voice Eager Warmup — Start WebSocket First, Load Models in Background

## TL;DR

> **Quick Summary**: Restructure `startVoice()` so the WebSocket server starts immediately at boot, then STT and TTS models load in parallel in the background. Dashboard shows "Warming up..." instead of a connection error if user clicks mic during model loading.
> 
> **Deliverables**:
> - WebSocket server starts before model loading (instant connectivity)
> - STT + TTS load in parallel (faster warmup vs current sequential)
> - Dashboard shows "Warming up..." state during model loading
> - `stopVoice()` during warmup doesn't corrupt state
> 
> **Estimated Effort**: Short (1-2 hours)
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Task 1 (backend) → Task 3 (verify). Task 2 (dashboard) parallels Task 1.

---

## Context

### Original Request
User asked: "can't the server launch these things when it launches so that the user doesn't have to wait?"

### Interview Summary
**Key Discussions**:
- Server already calls `startVoice()` fire-and-forget at boot — models DO pre-load
- Problem is startup ORDER: WS server starts AFTER model loading (60-90s for whisper)
- If user clicks mic during warmup, WS connection fails — confusing UX
- Scope: just fix startup order, no pre-caching models during install

**Research Findings**:
- STT (child process) and TTS (in-process ONNX) are fully independent — safe to parallelize
- `VoiceWebSocketServer.broadcast()` is safe to call with zero connections (no-op on empty sessions map)
- No exhaustive pattern matching on ServerMessage — safe to add types
- `startVoice()` return value is unused by caller (fire-and-forget)

### Metis Review
**Identified Gaps** (addressed):
- Race condition: `stopVoice()` during background loading corrupts state → add generation counter
- Pipeline readiness guard missing in `onAudioReceived` → add check before entering pipeline
- Double-start guard incomplete: checks `"running"` but not `"starting"` → fix guard
- Both-models-fail edge case: client stuck in `warming_up` forever → broadcast error on total failure
- Client reconnect during warmup: must send current status in `onConnect` → add status check

---

## Work Objectives

### Core Objective
Start the voice WebSocket server immediately at boot so the dashboard can connect during model loading, then load STT + TTS in parallel and notify connected clients when ready.

### Concrete Deliverables
- Restructured `startVoice()` with WS-first, parallel model loading
- New `warming_up` and `ready` protocol messages
- Dashboard "Warming up..." indicator with pulsing orb
- Race-safe `stopVoice()` during warmup

### Definition of Done
- [ ] `curl http://localhost:8090` returns HTML within 1s of voice startup (not 90s)
- [ ] Dashboard shows "Warming up..." when connecting during model load
- [ ] Dashboard transitions to "Listening..." when models finish loading
- [ ] `stopVoice()` during warmup leaves state as "stopped" permanently
- [ ] `bun run build` passes
- [ ] All 134 voice tests pass

### Must Have
- WS server starts BEFORE any model loading
- STT and TTS load in parallel (not sequential)
- Readiness guard prevents audio processing during warmup
- Dashboard shows warming_up state (not error)
- stopVoice() safe during background loading

### Must NOT Have (Guardrails)
- No progress percentages or loading bars — binary warm/ready
- No model pre-downloading during install
- No restructuring of VoiceDependencies interface shape
- No new REST endpoints on the WebSocket server
- No event emitter system — use existing broadcast()/sendTo()
- No changes to pipeline.ts core audio processing logic
- No changes to kokoro-service.ts or whisper-lifecycle.ts init APIs
- Do NOT fix duplicate VoiceState/ConnectionState types across dashboard files

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (134 voice tests, bun test)
- **Automated tests**: Tests-after (add tests for new behavior, don't break existing)
- **Framework**: bun test

### Agent-Executed QA Scenarios (MANDATORY)

**Scenario: WS server available during model loading**
```
Tool: Bash (curl + timing)
Preconditions: Voice system starting with slow mock STT
Steps:
  1. Start voice module
  2. Immediately (within 1s) curl http://localhost:8090
  3. Assert: HTTP 200 returned
  4. Assert: response contains HTML
Expected Result: WS server responds while models still loading
```

**Scenario: Client receives warming_up on connect during warmup**
```
Tool: Bash (bun test)
Preconditions: Voice module starting, models not yet loaded
Steps:
  1. Start voice with mock slow STT (500ms delay)
  2. Connect WebSocket immediately
  3. Read first text message
  4. Assert: message type is "warming_up"
Expected Result: Client informed of warmup state on connect
```

**Scenario: Client receives ready when loading completes**
```
Tool: Bash (bun test)
Preconditions: Voice module starting with mock STT/TTS
Steps:
  1. Start voice with mock STT (100ms) and mock TTS (100ms)
  2. Connect WebSocket
  3. Wait for messages
  4. Assert: receives "warming_up" then "ready"
Expected Result: State transitions correctly
```

**Scenario: Parallel loading is faster than sequential**
```
Tool: Bash (bun test)
Preconditions: Mock STT and TTS each taking 100ms
Steps:
  1. Start voice, time until status="running"
  2. Assert: total time < 150ms (not 200ms+ which would indicate sequential)
Expected Result: Models load concurrently
```

**Scenario: stopVoice during warmup doesn't corrupt state**
```
Tool: Bash (bun test)
Preconditions: Voice module starting with slow mock STT (500ms)
Steps:
  1. Start voice
  2. Call stopVoice() at 100ms (during loading)
  3. Assert: getVoiceStatus().status === "stopped"
  4. Wait 600ms (loading would have completed)
  5. Assert: getVoiceStatus().status === "stopped" (not corrupted)
Expected Result: State stays stopped after cancelled warmup
```

**Scenario: Audio during warmup returns warming_up (not error)**
```
Tool: Bash (bun test)
Preconditions: Voice running but STT not ready
Steps:
  1. Start voice with slow mock STT
  2. Connect WebSocket
  3. Send binary audio data
  4. Read response message
  5. Assert: message type is "warming_up" (not "error")
Expected Result: Graceful warmup rejection
```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Backend — restructure startVoice + protocol (no dashboard deps)
└── Task 2: Dashboard — add warming_up state handling (no backend deps, just string literals)

Wave 2 (After Wave 1):
└── Task 3: Build + test verification (depends on both)

Critical Path: Task 1 → Task 3
Parallel Speedup: Tasks 1+2 run simultaneously
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 3 | 2 |
| 2 | None | 3 | 1 |
| 3 | 1, 2 | None | None (final) |

---

## TODOs

- [x] 1. Backend: Restructure startVoice() + protocol messages + readiness guard

  **What to do**:

  **1a. Add protocol message types** (`packages/orchestrator/src/voice/protocol.ts`):
  - Add `| { type: "warming_up" }` and `| { type: "ready" }` to the `ServerMessage` union (line 24-32)
  - No changes to parsing/serialization — `serializeServerMessage` uses `JSON.stringify` which handles any object

  **1b. Restructure startVoice()** (`packages/orchestrator/src/voice/index.ts`):
  
  Current order (sequential, WS last):
  ```
  await STT → await TTS → create LLM bridge → create WS → create pipeline → start WS
  ```
  
  New order (WS first, models parallel in background):
  ```
  create LLM bridge → create WS → create pipeline → start WS → status="starting"
  → fire Promise.allSettled([STT, TTS]) in background
  → on each success: update currentState flags (sttRunning/ttsReady)
  → when both settled: if both ok → broadcast "ready", status="running"
                        if both failed → broadcast "error", status="error"
                        if partial → broadcast "ready" (graceful degradation, same as current)
  ```

  Add a **generation counter** (`startGeneration: number`) incremented on each `startVoice()` and `stopVoice()`. Background loading promises check `if (currentGeneration !== myGeneration) return` before updating state. This prevents stale promise callbacks from corrupting state after `stopVoice()`.

  **1c. Fix double-start guard** (line 83-86):
  - Currently: `if (currentState.status === "running")` — misses `"starting"`
  - Fix: `if (currentState.status === "running" || currentState.status === "starting")`

  **1d. Add readiness guard in onAudioReceived** (line 166-168):
  - Before calling `pipeline?.handleSpeechEnd(audio, _ws)`, check:
    ```typescript
    if (!currentState.sttRunning || !currentState.ttsReady) {
      if (wsServer) wsServer.sendTo(_ws, { type: "warming_up" })
      return
    }
    ```

  **1e. Send status to newly connecting clients** (onConnect callback, line 174-177):
  - After the existing log, add:
    ```typescript
    if (currentState.status === "starting") {
      wsServer?.sendTo(/* the connecting ws */, { type: "warming_up" })
    }
    ```
  - Note: `onConnect` currently doesn't receive the `ws` reference. Check `WebSocketDependencies` interface in websocket.ts and add the `ws` parameter to the `onConnect` callback signature if needed.

  **1f. Broadcast ready when both models finish** (in the background Promise handler):
  - After both promises settle and state is updated: `wsServer?.broadcast({ type: "ready" })`

  **Must NOT do**:
  - Don't change VoiceDependencies interface shape
  - Don't change whisper-lifecycle.ts or kokoro-service.ts init APIs
  - Don't add event emitter — use existing broadcast()/sendTo()
  - Don't add REST endpoints

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: Straightforward restructuring within a single module, no complex architecture
  - **Skills**: []
    - No special skills needed — pure TypeScript refactoring with clear patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Task 3
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `packages/orchestrator/src/voice/index.ts:76-191` — Current `startVoice()` implementation. The ENTIRE function needs restructuring. Study the dependency injection pattern (lines 98-100 for STT deps, 116-117 for TTS deps) — keep this identical.
  - `packages/orchestrator/src/voice/index.ts:193-232` — `stopVoice()` function. The generation counter must be checked here too — increment on stop to invalidate in-flight loading promises.
  - `packages/orchestrator/src/voice/index.ts:164-183` — WebSocket dependency callbacks (`onAudioReceived`, `onConnect`, etc). The readiness guard goes in `onAudioReceived`. Status message on connect goes in `onConnect`.
  - `packages/orchestrator/src/voice/websocket.ts:133-137` — `broadcast()` method. Use this to notify all connected clients of state changes.
  - `packages/orchestrator/src/voice/websocket.ts:143-145` — `sendTo()` method. Use this to notify individual clients on connect.

  **API/Type References**:
  - `packages/orchestrator/src/voice/protocol.ts:24-32` — `ServerMessage` union type. Add `warming_up` and `ready` here.
  - `packages/orchestrator/src/voice/websocket.ts:11-17` — `WebSocketDependencies` interface. Check if `onConnect` receives `ws` parameter — may need to add it.
  - `packages/orchestrator/src/voice/index.ts:15-22` — `VoiceState` interface. The `status` field transitions: `"stopped" → "starting" → "running"`. Keep this, but `"starting"` now means WS is up but models loading.
  - `packages/orchestrator/src/voice/index.ts:13` — `VoiceStatus` type: `"stopped" | "starting" | "running" | "error"`. No changes needed.

  **Test References**:
  - `packages/orchestrator/src/voice/` — 134 existing tests across 10 files. Run ALL after changes.
  - New tests needed for: parallel loading timing, stopVoice during warmup, readiness guard, status messages on connect.

  **Acceptance Criteria**:
  - [ ] `ServerMessage` union includes `{ type: "warming_up" }` and `{ type: "ready" }`
  - [ ] WebSocket server starts BEFORE any model loading in `startVoice()`
  - [ ] STT and TTS load via `Promise.allSettled()` (parallel, not sequential `await`)
  - [ ] Generation counter prevents stale loading callbacks from updating state after stop
  - [ ] `onAudioReceived` sends `warming_up` message (not error) when models aren't ready
  - [ ] `onConnect` sends `warming_up` to client if status is `"starting"`
  - [ ] `broadcast({ type: "ready" })` sent when models finish loading
  - [ ] Double-start guard checks both `"running"` and `"starting"`
  - [ ] Both-models-fail broadcasts error (not stuck in warming_up)
  - [ ] `bun test src/voice/` in `packages/orchestrator` → all 134 tests pass + new tests pass

  **Commit**: YES
  - Message: `feat(voice): start WebSocket before model loading for instant connectivity`
  - Files: `packages/orchestrator/src/voice/index.ts`, `packages/orchestrator/src/voice/protocol.ts`, `packages/orchestrator/src/voice/websocket.ts` (if onConnect signature changes)
  - Pre-commit: `cd packages/orchestrator && bun test src/voice/`

---

- [x] 2. Dashboard: Handle warming_up voice state

  **What to do**:

  **2a. Add warming_up to VoiceState** (`packages/dashboard/app/hooks/use-voice-websocket.ts`):
  - Add `| "warming_up"` to the `VoiceState` type union (line 4-12)
  - Add case in `handleTextMessage` switch (lines 69-94):
    ```typescript
    case "warming_up":
      setState("warming_up");
      break;
    case "ready":
      setState("listening");
      break;
    ```

  **2b. Add warming_up to voice-overlay.tsx** (`packages/dashboard/app/components/voice-overlay.tsx`):
  - Add `| "warming_up"` to the duplicate `VoiceState` type (line 5-13)
  - Add to `STATE_LABELS` (line 26-35): `warming_up: "Warming up..."`
  - Add to `orbClasses` switch (line 49-68): use a pulsing amber/warm style similar to `connecting`:
    ```typescript
    case "warming_up":
      return `${base} border-amber-500 bg-amber-500/10 shadow-[0_0_30px_rgba(234,179,8,0.2)] animate-pulse`
    ```

  **2c. Verify auto-dismiss doesn't trigger** (`packages/dashboard/app/components/voice-button.tsx`):
  - Line 31: `voice.state === "error"` — since `warming_up !== "error"`, the auto-dismiss timer will NOT trigger. No code change needed here, just verify.

  **Must NOT do**:
  - Don't fix the duplicate VoiceState type between use-voice-websocket.ts and voice-overlay.tsx
  - Don't add reconnection/retry logic
  - Don't add progress indicators or percentages

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small changes across 2-3 files, adding a string to type unions and a switch case
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Task 3
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `packages/dashboard/app/hooks/use-voice-websocket.ts:4-12` — `VoiceState` type union. Add `"warming_up"` here.
  - `packages/dashboard/app/hooks/use-voice-websocket.ts:69-94` — `handleTextMessage` switch statement. Add `warming_up` and `ready` cases following existing pattern.
  - `packages/dashboard/app/components/voice-overlay.tsx:5-13` — Duplicate `VoiceState` type. Must also add `"warming_up"` here.
  - `packages/dashboard/app/components/voice-overlay.tsx:26-35` — `STATE_LABELS` record. Add `warming_up: "Warming up..."`.
  - `packages/dashboard/app/components/voice-overlay.tsx:49-68` — `orbClasses` function. Add `warming_up` case with pulsing amber style (like processing/thinking but softer).

  **Verification References**:
  - `packages/dashboard/app/components/voice-button.tsx:28-39` — Auto-dismiss logic. Verify `warming_up` doesn't trigger it (it checks `voice.state === "error"`, so `warming_up` is safe).

  **Acceptance Criteria**:
  - [ ] `VoiceState` type includes `"warming_up"` in both `use-voice-websocket.ts` and `voice-overlay.tsx`
  - [ ] `handleTextMessage` handles `warming_up` → sets state to `"warming_up"`
  - [ ] `handleTextMessage` handles `ready` → sets state to `"listening"` (user is ready to speak)
  - [ ] `STATE_LABELS` shows `"Warming up..."` for warming_up state
  - [ ] `orbClasses` returns pulsing amber styling for warming_up
  - [ ] Voice button auto-dismiss does NOT trigger for warming_up state
  - [ ] `bun run build` passes (TypeScript compiles)

  **Commit**: YES (groups with Task 1)
  - Message: `feat(dashboard): show warming-up indicator for voice model loading`
  - Files: `packages/dashboard/app/hooks/use-voice-websocket.ts`, `packages/dashboard/app/components/voice-overlay.tsx`
  - Pre-commit: `bun run build`

---

- [x] 3. Build + test verification

  **What to do**:
  - Run full build: `bun run build`
  - Run all voice tests: `cd packages/orchestrator && bun test src/voice/`
  - Run dispatch tests (no regressions): `cd packages/orchestrator && bun test src/dispatch/`
  - Verify scanner tests: `cd packages/orchestrator && bun test src/skills/`

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Just running verification commands
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (after Tasks 1 + 2)
  - **Blocks**: None (final)
  - **Blocked By**: Tasks 1, 2

  **Acceptance Criteria**:
  - [ ] `bun run build` → exits 0
  - [ ] `bun test src/voice/` → all tests pass (134 existing + new)
  - [ ] `bun test src/dispatch/` → 16 tests pass
  - [ ] `bun test src/skills/` → 7 tests pass

  **Commit**: NO (verification only)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(voice): start WebSocket before model loading for instant connectivity` | voice/index.ts, voice/protocol.ts, voice/websocket.ts | bun test src/voice/ |
| 2 | `feat(dashboard): show warming-up indicator for voice model loading` | use-voice-websocket.ts, voice-overlay.tsx | bun run build |

---

## Success Criteria

### Verification Commands
```bash
bun run build                                          # Expected: exits 0
cd packages/orchestrator && bun test src/voice/        # Expected: all pass
cd packages/orchestrator && bun test src/dispatch/     # Expected: 16 pass
cd packages/orchestrator && bun test src/skills/       # Expected: 7 pass
```

### Final Checklist
- [ ] WebSocket server starts before model loading
- [ ] STT + TTS load in parallel
- [ ] Dashboard shows "Warming up..." during model load
- [ ] stopVoice() safe during warmup
- [ ] All existing tests pass
- [ ] No new dependencies added
- [ ] Works for any Arachne installer (no hardcoded paths)
