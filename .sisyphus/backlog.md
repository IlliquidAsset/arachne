# Arachne Feature Backlog

> Living list of feature requests, improvements, and ideas. 
> When ready to build, promote to a `.sisyphus/plans/` work plan.

---

## Dashboard — Rendering & Display

### Rich Content Rendering in Chat Messages
**Priority**: High
**Source**: User request (Feb 24, 2026)

Agent responses frequently contain mermaid diagrams, ASCII tables, and other structured formats that look fine in CLI but are ugly/unreadable in the dashboard. The dashboard should detect these and render them as proper visuals automatically.

**Scope**:
- Detect mermaid code blocks (` ```mermaid `) → render as SVG (via mermaid.js or server-side render)
- Detect ASCII tables → render as styled HTML tables with CSS
- Detect other structured formats (flowcharts, sequence diagrams) → appropriate visual rendering
- Fallback: if detection fails, show raw text as-is (no broken rendering)

**Open questions**:
- Client-side rendering (mermaid.js in browser) vs server-side pre-render?
- Should rendered visuals be exportable (download as SVG/PNG)?
- Does this apply to thinking drawer content too, or just main chat?

---

### Streaming Thinking (Real-Time Reasoning Display)
**Priority**: High  
**Source**: User request (Feb 24, 2026)

Currently, thinking/reasoning content appears to be buffered and shown only when the response is generated. User wants to see thinking tokens streaming in real-time as the agent works — not saved up and displayed after the fact.

**Scope**:
- Thinking drawer should show tokens as they arrive via SSE stream
- Live typing effect as reasoning happens
- No buffering — if the agent is mid-thought, the user should see it mid-thought
- Applies to both main agent thinking AND dispatched sub-agent thinking

**Open questions**:
- Is this a dashboard-side buffering issue, or is the SSE stream itself batching thinking events?
- Does the OpenCode server emit thinking tokens incrementally, or only as complete blocks?
- Performance concern: very fast token streams could cause render thrashing — may need a small debounce (50-100ms) without losing the "live" feel

---

## Dashboard — Interaction

### (From Master Plan) Message Queuing
**Priority**: Medium
**Source**: Dogfooding discovery

Can't type while agent is working (CLI can, dashboard can't). Need message queuing.

### (From Master Plan) Question Tool Rendering  
**Priority**: Medium
**Source**: Dogfooding discovery

Interactive selection UI for the Question tool is missing — shows "question running..." in drawer instead of rendering the selection options.

---

## Autonomy & Workflows

### (From Daily Workflow Plan) RSS Content Adapter
**Priority**: Low
**Source**: Daily workflow planning

`ContentSource` interface is defined. Build an RSS adapter that fetches from configured RSS feeds and maps items to `ContentSuggestion` format.

### (From Daily Workflow Plan) Manual Queue Adapter
**Priority**: Low
**Source**: Daily workflow planning

`ContentSource` interface is defined. Build a manual queue adapter where users can paste content ideas that get processed through the Muse → DA → post pipeline.

### (From Daily Workflow Plan) Dashboard Workflow Config UI
**Priority**: Medium
**Source**: Daily workflow planning

Configure workflow schedules, content sources, and voice profiles from the Arachne dashboard instead of CLI only.

---

## Infrastructure

### (From Daily Workflow Plan) social-poster-v2 Integration
**Priority**: Low
**Source**: Investigation finding

`social-poster-v2` exists with rate limiting + checkpointing improvements, but workflow imports from v1. Migrate when stable.

### (From Daily Workflow Plan) Cross-Platform Chrome Detection
**Priority**: Low
**Source**: Investigation finding

Chrome detection currently macOS-only (AppleScript, `open -a`). Support Linux Chrome/Chromium paths.

### (From Daily Workflow Plan) Skills as npm Packages
**Priority**: Low
**Source**: Investigation finding

Skills use fragile relative imports (`../../email-reader/src/...`). Consider restructuring into proper npm workspace packages for reliable resolution.
