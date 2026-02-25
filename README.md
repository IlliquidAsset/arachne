# Arachne

Multi-project AI agent orchestrator with a streaming chat dashboard, full-duplex voice, budget tracking, and safety guardrails. Coordinates 10 specialized agents across codebases.

Built for the [oh-my-opencode](https://github.com/ohmyopencode) ecosystem on top of [OpenCode](https://github.com/opencode-ai/opencode).

![Chat Interface](docs/screenshots/chat-interface.png)

---

## What is Arachne?

Arachne turns OpenCode from a single-project CLI into a **multi-project orchestration platform**. Point it at your dev directory and it discovers every project, spins up isolated agent instances, and lets you dispatch work across them from a single dashboard — or by voice.

Under the hood it's a Bun monorepo of 12 packages that handle everything from personality design to budget alerts to kill switches.

---

## Features

### Dashboard (`@arachne/dashboard`)
- **Streaming chat** — real-time markdown rendering with syntax highlighting (React 19, Next.js 16)
- **Thinking panel** — watch agent reasoning, tool calls, and subagent activity live
- **Voice mode** — full-duplex voice with VAD, interrupt support, Whisper STT + Kokoro TTS
- **Multi-project view** — switch between projects, see server status, manage sessions
- **Admin panel** — security settings, skill management, voice config, workflow editor
- **Question cards** — interactive prompts from agents rendered inline
- **Session management** — create, switch, delete conversations with URL-based routing
- **File upload** — attach images and documents via button or paste
- **Mobile responsive** — hamburger sidebar, touch-friendly, full-width on small screens
- **Secure auth** — password-based with httpOnly cookies (30-day expiry)

### Orchestrator (`@arachne/orchestrator`)
- **Multi-project dispatch** — route tasks to the right project automatically via keyword, context, or explicit reference
- **Auto-discovery** — scans directory trees for projects, builds knowledge profiles (tech stack, description, file structure)
- **Server lifecycle** — start, stop, restart OpenCode server instances per project with configurable port ranges
- **Session management** — list, continue, or abort agent sessions across projects
- **Skill injection** — selectively load skills per dispatch
- **OpenCode plugin** — registers as a native OpenCode plugin (`arachne_dispatch`, `arachne_projects`, `arachne_server_control`, `arachne_sessions`, `arachne_abort`, `arachne_project_status`)

### Voice Pipeline
- **Full-duplex** — speak while the agent speaks; interrupt anytime
- **STT** — Whisper.cpp client (HTTP, configurable endpoint)
- **TTS** — Kokoro 82M ONNX model via `kokoro-js` with streaming sentence-level chunking
- **VAD** — browser-side Voice Activity Detection (`@ricky0123/vad-web` + Silero VAD v5)
- **WebSocket protocol** — binary audio frames + JSON control messages
- **Pipeline stages** — idle → STT → LLM → TTS → speaking, with abort at any stage

---

## Agent Roster

Arachne ships with 10 specialized agents, each auto-selected by keyword matching against your task:

| Agent | Specialty | Triggers |
|-------|-----------|----------|
| **Prometheus** | Planning & architecture | plan, strategy, architecture, design |
| **Sisyphus** | Execution & implementation | implement, build, execute, code, fix, debug |
| **Muse** | Creative / divergent thinking | brainstorm, creative, ideas, alternative |
| **Devil's Advocate** | Critical analysis | critique, stress test, adversarial, challenge |
| **Oracle** | Strategic evaluation | architecture decision, tradeoff, long-term |
| **Metis** | Gap analysis | gaps, missing, pre-plan, what am I missing |
| **Momus** | Verification & review | verify, review plan, check accuracy, validate |
| **Atlas** | Knowledge management | knowledge, document, catalog |
| **Explore** | Codebase investigation | find, search codebase, how does, where is |
| **Librarian** | External research | docs, best practice, library, how do others |

---

## Packages

```
packages/
  dashboard/      Next.js 16 chat UI + admin panel
  orchestrator/   OpenCode plugin — multi-project dispatch, discovery, voice
  autonomy/       Workflow engine, agent roster, cron scheduler, task queue
  budget/         Token counting, cost tracking, multi-provider pricing, alerts
  context/        Context engine — role detection, temporal awareness, relationships
  safety/         Kill switch, budget caps, rate limiting, modification guards
  skills/         Skill curation — scan, generate, validate, curate, diff-guard
  spdd/           Synthetic Personality Design Document — persona evolution
  bootstrap/      Zero-interaction auto-bootstrap — env scan, service/project discovery
  shared/         Types, config schema, SQLite DB, voice interfaces
  web/            Auth server (JWT), routing, user management
  integration/    Integration tests across all packages
```

### Package Details

| Package | Description |
|---------|-------------|
| **`@arachne/dashboard`** | Next.js 16 / React 19 / Tailwind / shadcn. Streaming SSE chat, thinking panel, voice overlay, admin pages (security, skills, workflows, voice config), multi-project navigation. |
| **`@arachne/orchestrator`** | OpenCode plugin that discovers projects, manages server lifecycles, dispatches tasks with intelligent routing (explicit → context → keyword → AI → ask user), and runs the voice pipeline. |
| **`@arachne/autonomy`** | Workflow registry + runner, cron scheduler, task queue with priority/tracks (deterministic vs LLM), agent roster with keyword-based selection, preamble generation, message classification. |
| **`@arachne/budget`** | Per-model pricing table (Anthropic, xAI, RunPod), token event recording, daily/range aggregation, provider reconciliation, configurable alert thresholds, provider API clients. |
| **`@arachne/context`** | Builds a `CommanderContext` from role detection (work vs social mode), time-of-day/season/day-type signals, relationship graph, and manual overrides. Persists role transitions. |
| **`@arachne/safety`** | Composable guardian pattern: kill switch (file-based), budget caps with commander override, token-bucket rate limiter with exponential backoff, daily modification limits, SPDD personality invariant checks. |
| **`@arachne/skills`** | Scans skill directories (4-scope priority: opencode-project > opencode > project > user), validates YAML frontmatter, generates skill content, curates lifecycle, diff-guards for core modifications. |
| **`@arachne/spdd`** | Loads/saves personality "Legends" (structured persona docs), generates evolution & refinement prompts, enforces invariant sections, extracts calibration markers, composes work/social mode prompts. |
| **`@arachne/bootstrap`** | Scans environment for installed tools, discovers running services (OpenCode, RunPod, APIs), finds projects in directory trees, runs health checks, adopts SPDD personality on first boot. |
| **`@arachne/shared`** | Zod config schema (ports, paths, providers, feature flags), SQLite via better-sqlite3 with migrations, voice event/interface types, common helpers. |
| **`@arachne/web`** | Lightweight HTTP router with JWT auth (generate/verify tokens), role-based access, API key user lookup. |
| **`@arachne/integration`** | Cross-package integration tests wiring bootstrap → budget → autonomy → context → safety → skills → spdd → web. |

---

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/IlliquidAsset/arachne.git
cd arachne && bun install

# 2. Start OpenCode headless server (from your project directory)
export OPENCODE_SERVER_PASSWORD="your-password"
opencode serve --port 4096

# 3. Start Arachne dashboard (new terminal)
cd arachne/packages/dashboard
bun run dev
```

Open **http://localhost:3000** and log in with your password.

### Prerequisites

- [Bun](https://bun.sh) — `curl -fsSL https://bun.sh/install | bash`
- [OpenCode CLI](https://github.com/opencode-ai/opencode) — `npm install -g @opencode-ai/cli`

### Configuration

Create `packages/dashboard/.env.local`:

```bash
OPENCODE_API_URL=http://localhost:4096
OPENCODE_SERVER_PASSWORD=your-password-here
```

---

## Architecture

```
Browser (localhost:3000)
    │  HTTP / SSE
Next.js Dashboard (port 3000)
    │  @opencode-ai/sdk
OpenCode Server (port 4096)  ← runs in your project directory
    │
Orchestrator Plugin           ← discovers projects, dispatches tasks
    │
Voice Pipeline (port 8090)   ← WebSocket, full-duplex (optional)
```

**Auth flow:** Password → httpOnly cookie → Basic Auth to OpenCode

**Message flow:** Browser → `/api/sessions/{id}/prompt` → SDK → OpenCode Server → SSE stream back

**Dispatch flow:** `arachne_dispatch` → router (explicit/context/keyword) → ensure server → create/continue session → send message

### Services

| Service | Port | Required |
|---------|------|----------|
| Dashboard | 3000 | Yes |
| OpenCode Server | 4096 | Yes |
| Voice Pipeline | 8090 | No |

---

## Screenshots

| Login | Thinking Panel |
|-------|---------------|
| ![Login](docs/screenshots/login.png) | ![Thinking Panel](docs/screenshots/thinking-panel.png) |

| Voice Mode |
|------------|
| ![Voice Mode](docs/screenshots/voice-mode.png) |

---

## Development

```bash
# Build all packages
bun run build

# Type check
bun run typecheck

# Run tests
bun test

# Dashboard dev server
cd packages/dashboard && bun run dev

# Dashboard production build
cd packages/dashboard && bun run build && bun run start
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Failed to create session" | Verify OpenCode is running: `curl http://localhost:4096/session` |
| "Invalid password" | Ensure `OPENCODE_SERVER_PASSWORD` matches in both terminals |
| Connection lost | Restart OpenCode: `opencode serve --port 4096` |
| Voice doesn't connect | Start the orchestrator voice server on port 8090 |
| WASM errors in console | Run `bun install` in `packages/dashboard` (triggers postinstall) |

---

## Detailed Guides

- [Startup Guide](ARACHNE-STARTUP.md) — full setup walkthrough
- [User Guide](ARACHNE-USER-GUIDE.md) — complete feature reference

---

## License

MIT
