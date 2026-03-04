# Arachne — Project Context for Agents

## Architecture
- **Bun monorepo** with workspace packages under `packages/`
- **Next.js 16 + Turbopack** dashboard at `packages/dashboard` (port 3000)
- **OpenCode (OMO)** upstream server at port 4096, proxied via `packages/web-api` (port 3100)
- **SQLite** via `better-sqlite3` in dashboard API routes (Node.js runtime), `bun:sqlite` in autonomy (Bun runtime)
- DB path: `~/.config/arachne/arachne.db`

## Key Packages
- `packages/dashboard` — Next.js web UI (chat, admin, telemetry)
- `packages/autonomy` — Agent roster, scheduler, workflows, classifier
- `packages/orchestrator` — Notion integration, tool definitions, preamble
- `packages/shared` — Config schema, integrations, migrations
- `packages/budget` — Cost tracking and pricing
- `packages/web-api` — Hono API server proxying to OpenCode

## Build & Run
```bash
bun install
bun run --filter '@arachne/dashboard' build   # Build dashboard
bun run --filter '@arachne/dashboard' dev     # Dev server (port 3000)
bun run --filter '@arachne/web-api' dev       # API server (port 3100)
```

## Common Gotchas
- **Subpath imports don't resolve across packages** — e.g. `@arachne/shared/integrations` fails. Import from the package root or use local wrapper modules.
- **HTML entities in JSX** — `&#8593;` renders as literal text. Use JS unicode escapes: `{"\u2191"}`.
- **`serverExternalPackages`** in `next.config.ts` — `better-sqlite3` must be listed here.
- **Agent roster** is in `packages/autonomy/src/agent-roster.ts` — 12 agents, keyword-scored selection.

## Conventions
- User's name: Kendrick. Assistant persona: "Amanda" (Arachne's default personality).
- Default agent: Sisyphus. Default model: from OMO config.
- Skills live in `skills/` directory as SKILL.md files.
- Integrations config stored in `~/.config/arachne/integrations.json`.

## Current State (as of 2026-03-04)

### Completed (Phases 1-3)
- **Phase 1**: Scheduled task toggle fix, "Test Run" button + API, built-in tasks (notion-memory-maintenance, user-profile-update)
- **Phase 2**: Notion Memory Notebook module, integrations schema extension, memory tools (write/read/list)
- **Phase 3**: Agent/model selector in chat, @ mention autocomplete, Hephaestus added to roster, agent names in message bubbles
- **Thinking drawer fixes**: Reset thinking state between turns, "Thinking..." indicator during wait

### Pending Work

#### Model Selector — Dynamic Models from OMO
The model selector (`packages/dashboard/app/chat/components/model-selector.tsx`) currently has a hardcoded model list. It needs to:
1. **Fetch models from OpenCode config** — use `client.config.get()` from `@opencode-ai/sdk` to get available models/providers
2. **Add "Add Model" option** at the bottom of the dropdown that engages the OMO Add Model function
3. OpenCode SDK has: `client.config.get()`, `client.config.update()`, `client.config.providers()`, `client.provider.list()`
4. Model format in prompt API: `{ providerID: string, modelID: string }` or simple string `"provider/model"`

#### Phase 4: Chat "+" Attachment Menu (Notion Pages) — NOT STARTED
See plan file at `~/.claude/plans/linear-puzzling-comet.md` for full details:
- **4A**: Notion search API route (`/api/integrations/notion/search`)
- **4B**: AttachmentMenu, NotionPagePicker, NotionAttachmentCard components
- **4C**: Extend message types with `notion_page` part type
- **4D**: Server-side Notion content fetch in prompt route (truncate at 10K chars)
- **4E**: Render Notion attachment cards in message bubbles
- **4F**: Wire into chat-input.tsx (replace "+" with AttachmentMenu)

#### Other Noted Issues
- Message bubbles show "Amanda" for all agents — `agentName` prop is passed but not populated from SSE stream data yet (needs `message-list.tsx` to extract agent from message parts)
- Thinking drawer: reasoning may only appear via `message.updated` event (at end of response) rather than streaming incrementally — depends on what OpenCode SSE actually sends for reasoning parts
