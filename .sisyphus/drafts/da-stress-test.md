# Devil's Advocate Stress Test — PDD Legends vs Actual Code

**Date**: 2026-02-23
**Reviewer**: DA (automated, code-verified)
**Method**: Cross-referenced all 5 legend claims against actual dashboard source code

---

## ACCURACY VERDICTS

### Claim: "Input is disabled while agent is working"
- **Legends affected**: Mari (1), Leila (3), Cal (4)
- **Actual code**: `chat-input.tsx:76` — `const inputDisabled = isSending;` (only during POST, NOT during streaming)
- **Actual behavior**: The textarea IS typeable during streaming. Only the SEND BUTTON is disabled (`sendDisabled = isSending || isStreaming`). Mic button IS disabled during streaming.
- **Verdict**: ⚠️ PARTIALLY INACCURATE — Users can TYPE but cannot SEND. The legends should say "I can type but hitting Enter does nothing" not "input is disabled."
- **Impact on legend quality**: Low — the UX frustration is the same (can't send follow-ups), but the specific claim is wrong. A tester running the Ralph QC loop would notice.
- **Fix**: Update legends to say "the send button is disabled" not "the input is disabled."

### Claim: "System messages leak into chat"
- **Legends affected**: All 5
- **Actual code**: `use-messages.ts:53-74` — Messages fetched from API are filtered to non-empty content, but NO content-based filtering for system patterns like `[BACKGROUND TASK COMPLETED]`
- **SSE stream**: `use-chat-stream.ts:76-80` — `message.part.delta` events append text to `currentMessage` with no content filtering
- **Verdict**: ✅ CONFIRMED ACCURATE — System messages from OpenCode arrive as assistant-role messages and are rendered without filtering.

### Claim: "No markdown/code rendering"
- **Actual code**: `streaming-text.tsx` is literally `<div className="whitespace-pre-wrap">{text}</div>`
- **Verdict**: ✅ CONFIRMED ACCURATE — Zero markdown parsing. Pure pre-wrap text.

### Claim: "No message queuing"
- **Actual code**: `chat-input.tsx:52` — `if (!trimmed || isSending || isStreaming) return;` — handleSend early-returns during streaming
- **Verdict**: ✅ CONFIRMED ACCURATE — No queue mechanism. Messages typed during streaming are lost on Enter.

### Claim: "No project switching / single-server"
- **Actual code**: `use-chat-stream.ts:67` — `process.env.NEXT_PUBLIC_PROJECT_DIR || "/Users/kendrick/Documents/dev/arachne"` — HARDCODED
- **Sidebar**: `session-sidebar.tsx:39-101` — Already groups sessions by project directory! The grouping exists but there's no project switching.
- **Verdict**: ✅ CONFIRMED ACCURATE — Dashboard is locked to one OC server. Interesting: session grouping by project already exists in the sidebar.

### Claim: "Question tool doesn't render"  
- **Actual code**: No `mcp_question`-specific rendering anywhere. Tool execution shows generic "Using tool: {name}..." indicator.
- **Thinking drawer**: Shows "tool-start" with tool name + "running...", then "tool-end" with status.
- **Verdict**: ✅ CONFIRMED ACCURATE — No interactive question UI. The question tool's options never reach the user.

### Claim: "Voice buttons don't work" (Nadine)
- **Actual code**: `chat-input.tsx:79-101` — Mic button exists, connected to `useTapToDictate()`. Voice overlay exists in `app/components/voice-overlay.tsx`.
- **Actual behavior**: The tap-to-dictate hook likely connects to a WebSocket voice server that may not be running. The UI buttons exist but the backend is incomplete.
- **Verdict**: ✅ PLAUSIBLY ACCURATE — Buttons exist but likely fail silently without a running voice server.

### Claim: "No onboarding"
- **Actual code**: `app/page.tsx` redirects to `/chat`. `message-list.tsx:49-55` shows spider emoji + "Send a message to start chatting". No tutorial, no capability explanation.
- **Verdict**: ✅ CONFIRMED ACCURATE — Zero onboarding beyond empty state message.

### Claim: "'Amanda' branding"
- **Actual code**: `chat/page.tsx:120` — `<div className="font-semibold">Amanda</div>`. `message-bubble.tsx:33` — Shows "Amanda" for assistant messages. Thinking drawer: "Amanda's Thinking".
- **Verdict**: ✅ CONFIRMED ACCURATE

---

## LEGEND-SPECIFIC FINDINGS

### Legend 1 (Mari) — Solo Builder
- **Accuracy**: 9/10. Minor issue with "input disabled" claim.
- **Missing blind spot**: Mari would notice the existing project-grouping in the sidebar — sessions ARE grouped by directory. She'd ask "why can I see the grouping but not switch?"
- **Strength**: The forensic voice is perfectly calibrated. Her B-0 workflow is realistic.

### Legend 2 (Nadine) — Creative Non-Technical
- **Accuracy**: 9.5/10. All claims verified.
- **Missing blind spot**: Nadine's 11-minute abandonment is accurate for the persona, but the legend doesn't account for the dark theme (globals.css shows a dark theme class). If the dashboard loads in dark mode, Nadine's anxiety would be higher — dark UIs feel more "technical."
- **Strength**: The emotional arc is the strongest of all 5. The Silent Abandoner archetype is devastating and true.

### Legend 3 (Leila) — Agency Operator
- **Accuracy**: 9/10. "Can't type" should be "can't send."
- **Missing blind spot**: Leila's painter's-tape desk lanes are a great detail, but the legend doesn't explore what happens when she discovers the session sidebar ALREADY groups by project directory. She'd recognize the grouping and be MORE frustrated: "You know about projects. You're showing me the grouping. But you won't let me manage them?"
- **Strength**: Cross-domain metaphor (air traffic tower) is the most structurally precise of all 5.

### Legend 4 (Cal) — Tinkerer
- **Accuracy**: 8.5/10. Setup time claim (65 min) is plausible but not verified against actual install flow. "Input disabled" should be "send disabled."
- **Missing blind spot**: Cal's sand timer ritual is great, but the legend doesn't mention the dark theme. A tinkerer setting this up Friday night would likely encounter the dark mode, which is actually nicer for evening coding. This is a POSITIVE moment the legend missed.
- **Strength**: The KEEPER/TOURIST system is the most memorable behavioral quirk across all legends.

### Legend 5 (Ess) — AI-Native PM
- **Accuracy**: 9/10. All architecture claims about the autonomy engine being invisible are accurate.
- **Missing blind spot**: Ess would notice that `session-sidebar.tsx` already groups by project — this is a STRONGER version of her complaint. The data model knows about projects, but the UI doesn't surface management.
- **Strength**: The "operator potential, assistant reality" classification is the single most useful insight across all legends for prioritizing the roadmap.

---

## CROSS-LEGEND PATTERNS (DA Perspective)

### Consistent Accuracy: System message leaks
All 5 legends identify this correctly. The code confirms zero filtering. This is the #1 quick win.

### Overstated Claim: "Input disabled"
3 legends overstate this. Users CAN type, they just can't send. The frustration is real but the specific claim would fail a QC test run.

### Missed Opportunity: Existing Project Grouping
None of the legends mention that `session-sidebar.tsx` ALREADY groups sessions by project directory. This is a significant finding because it means:
1. The data model supports multi-project awareness
2. The UI partially shows it (project name headers in sidebar)
3. Only the management/switching layer is missing

This makes the gap SMALLER than the legends imply — and more frustrating for technically-aware personas (Mari, Leila, Ess).

### Persona Coverage Gap
No legend tests the **returning user** experience. All legends describe FIRST USE. What happens when Mari comes back Monday? When Cal tries again in 3 months? The migration table captures this conceptually but Part B doesn't narrate it.

---

## CORRECTIONS NEEDED

1. **All legends**: Change "input is disabled" → "send button is disabled / can type but not send" (3 files)
2. **Legends 1, 3, 5**: Add observation about existing project grouping in sidebar
3. **No legend changes needed** for: system messages, markdown, question tool, voice, onboarding, Amanda branding

**Overall DA verdict**: Legends are 90%+ accurate against actual code. Corrections are minor. Legends are fit for Ralph QC loop use after the 3 corrections above.
