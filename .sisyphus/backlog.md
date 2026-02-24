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

## Dashboard — Mobile

### Mobile Responsiveness Overhaul
**Priority**: High
**Source**: User report (Feb 24, 2026) — rated current state 4/10

Mobile experience needs significant work. User couldn't share screenshot evidence because image input doesn't exist yet (see Image Paste item below).

**Needs investigation**: What specifically is broken? Layout overflow, touch targets too small, sidebar behavior, chat input sizing, text truncation? Need to audit with Playwright at mobile viewports (375x812, 390x844, 428x926) and catalog every issue.

---

## Dashboard — Interaction

### Question Tool Rendering (BROKEN — Prometheus interviews don't work)
**Priority**: HIGH
**Source**: Dogfooding discovery + user report (Feb 24, 2026)

Interactive selection UI for the Question tool is missing — shows "question running..." in drawer instead of rendering the selection options. **This directly breaks Prometheus interview flows** — when Prometheus asks multiple-choice questions during planning, the user can't see or answer them in the dashboard.

**Impact**: Core planning workflow is broken in dashboard. Users must use CLI for Prometheus interviews.

### Image Paste + Document Upload in Chat Input
**Priority**: High
**Source**: User request (Feb 24, 2026)

Chat input should support:
- **Clipboard image paste**: Paste screenshots/images directly into the chat input (Ctrl+V / Cmd+V). Any standard method works — data URL, blob upload, base64 inline.
- **Document upload**: Upload files (PDF, images, text docs) as attachments to messages.

**Open questions**:
- How does the OpenCode server handle image/file attachments in messages? Need to check the API.
- Max file size limits?
- Preview thumbnails in chat input before sending?

### (From Master Plan) Message Queuing
**Priority**: Medium
**Source**: Dogfooding discovery

Can't type while agent is working (CLI can, dashboard can't). Need message queuing.

### Sub-Agent Sessions Polluting Sidebar (BUG — EASY FIX)
**Priority**: CRITICAL
**Source**: Screenshots Feb 24, 2026

Every `task()` dispatch (explore, librarian, sisyphus-junior) creates a new session that appears in the sidebar as a separate chat. Sidebar shows "Task 7: Wire CronScheduler...", "Wave 2A: CronScheduler...", "Research OpenCode skills e..." etc. These are sub-agent sessions and should be invisible to the user.

**Root cause found**: `isRealSession()` in `session-sidebar.tsx` and `projects/[id]/page.tsx` only checks for empty title and stub title pattern. It does NOT check `parentID`. Sub-agent sessions have `parentID` set but pass the filter because they have real titles.

**Fix**: Add `if (session.parentID) return false;` to `isRealSession()` in both files. ~2 line change.

### Thinking Panel Empty While Agent Works (BUG)
**Priority**: High
**Source**: Screenshot Feb 24, 2026

"Amanda is thinking..." shows in chat area but thinking panel on right shows nothing, or shows stale reasoning from a previous response. Thinking should stream in real-time (see Streaming Thinking backlog item).

### New Chat Inherits Project Context (UX ISSUE)
**Priority**: Medium
**Source**: Screenshot Feb 24, 2026

Clicking "+ New Chat" creates a chat scoped to the current project. User sometimes wants a generic (non-project) chat. Need either:
- A way to choose "generic" vs "project" when creating
- Or always create generic, let user assign to project after
- Or detect from URL context (if on /chat → generic, if on /projects/X → project-scoped)

### TUI/UI Message Fork (BUG — THREADING)
**Priority**: High
**Source**: User report Feb 24, 2026

Sending messages to the same session from both TUI (CLI) and dashboard UI may cause a threading fork — the agent appears to stop responding in the UI after messages sent from both interfaces. Possible race condition in session message handling.

**Needs investigation**: Does the OpenCode server handle concurrent prompt submissions to the same session? Or does the second submission silently fail?

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

---

## Top 50 Skills We Need (Ranked by Usefulness)

> Researched Feb 24, 2026. Cross-referenced against 7,300+ GitHub repos, awesome-mcp-servers (81K★),
> awesome-claude-code (25K★), awesome-claude-skills (37K★), awesome-agent-skills (8K★), and 500+ individual skills.
>
> **What we already have**: social-poster, social-poster-v2, workflow-orchestrator, voice-learner, email-reader,
> playwright, frontend-ui-ux, git-master, dev-browser
>
> **Skills explicitly requested in our discussions** are marked with 🎯

### Tier 1 — Immediately Valuable (install or build ASAP)

| # | Skill | Why | Source |
|---|-------|-----|--------|
| 1 | 🎯 **mermaid-renderer** | Render mermaid diagrams to SVG/PNG in dashboard messages. User explicitly requested. | Build (backlog item) |
| 2 | 🎯 **rich-content-renderer** | ASCII tables → HTML, code blocks → syntax-highlighted, structured output → visual. User explicitly requested. | Build (backlog item) |
| 3 | **claude-mem** (30K★) | Persistent memory across sessions — captures everything, compresses with AI, injects relevant context into future sessions. Solves our biggest pain point: context loss between sessions. | [thedotmack/claude-mem](https://github.com/thedotmack/claude-mem) |
| 4 | **Trail of Bits security skills** (2.9K★) | 28 professional security skills: CodeQL, Semgrep, variant analysis, vulnerability detection, secure contracts. Essential for shipping production code. | [trailofbits/skills](https://github.com/trailofbits/skills) |
| 5 | **planning-with-files** (14K★) | Manus-style persistent markdown planning. We already have `.sisyphus/plans/` — this would formalize it as a reusable skill other Arachne users can benefit from. | [OthmanAdi/planning-with-files](https://github.com/OthmanAdi/planning-with-files) |
| 6 | **last30days-skill** (3K★) | Research Reddit + X from last 30 days. Directly feeds into our content workflow — find trending topics before writing tweets. | [mvanhorn/last30days-skill](https://github.com/mvanhorn/last30days-skill) |
| 7 | 🎯 **image-input-skill** | Handle pasted images and document uploads in chat. User explicitly requested. | Build (backlog item) |
| 8 | **humanizer** (6.6K★) | Remove AI-generated writing signs. Critical for content workflow — ensures tweets/posts read as authentic human voice. | [blader/humanizer](https://github.com/blader/humanizer) |
| 9 | **supabase agent-skills** (1.4K★) | Postgres best practices for Supabase. If we ever use Supabase for Arachne persistence. | [supabase/agent-skills](https://github.com/supabase/agent-skills) |
| 10 | 🎯 **question-tool-renderer** | Render Prometheus interview questions in dashboard. Explicitly broken — user reported it. | Build (backlog item) |

### Tier 2 — High Value (strong ROI)

| # | Skill | Why | Source |
|---|-------|-----|--------|
| 11 | **Claudeception** (1.7K★) | Autonomous skill extraction — learns from sessions and generates new skills automatically. Meta-skill that makes us better over time. | [blader/Claudeception](https://github.com/blader/Claudeception) |
| 12 | **beads** (17K★) | Memory upgrade for coding agents. Lightweight persistent context that survives across sessions. | [steveyegge/beads](https://github.com/steveyegge/beads) |
| 13 | **superpowers** | Bundle of core engineering competencies — planning, reviewing, testing, debugging. Well-written, adaptable. | [obra/superpowers](https://github.com/obra/superpowers) |
| 14 | **context-engineering-kit** (518★) | Hand-crafted context engineering techniques with minimal token footprint. Improves agent result quality. | [NeoLabHQ/context-engineering-kit](https://github.com/NeoLabHQ/context-engineering-kit) |
| 15 | **marketingskills** (9K★) | CRO, copywriting, SEO, analytics, growth engineering. Directly useful for content workflow and growing audience. | [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) |
| 16 | **napkin** (318★) | Persistent memory of mistakes via markdown scratchpad. Prevents repeating the same errors across sessions. | [blader/napkin](https://github.com/blader/napkin) |
| 17 | **AI-Research-SKILLs** (3.8K★) | Comprehensive AI research and engineering skills. Useful for staying current with ML/AI developments. | [Orchestra-Research/AI-Research-SKILLs](https://github.com/Orchestra-Research/AI-Research-SKILLs) |
| 18 | **videocut-skills** (959★) | Video editing agent. Could extend content workflow beyond text to video content. | [Ceeon/videocut-skills](https://github.com/Ceeon/videocut-skills) |
| 19 | **cc-devops-skills** | Immensely detailed DevOps skills — IaC, deployment, CI/CD for any platform. | [akin-ozer/cc-devops-skills](https://github.com/akin-ozer/cc-devops-skills) |
| 20 | **tapestry-skills** (249★) | Download articles, PDFs, YouTube transcripts. Content research tool for the workflow. | [michalparkola/tapestry-skills-for-claude-code](https://github.com/michalparkola/tapestry-skills-for-claude-code) |

### Tier 3 — Solid Additions (worth installing)

| # | Skill | Why | Source |
|---|-------|-----|--------|
| 21 | **SkillForge** (515★) | Meta-skill for generating best-in-class skills. Build skills faster. | [tripleyak/SkillForge](https://github.com/tripleyak/SkillForge) |
| 22 | **react-native-skills** (Callstack, 922★) | Agent-optimized React Native skills. If we ever go native mobile for Arachne. | [callstackincubator/agent-skills](https://github.com/callstackincubator/agent-skills) |
| 23 | **x-article-publisher-skill** (597★) | Publish long-form articles to X. Extends social-poster beyond tweets to articles. | [wshuyi/x-article-publisher-skill](https://github.com/wshuyi/x-article-publisher-skill) |
| 24 | **seo-geo-claude-skills** (241★) | 20 SEO & GEO skills with CORE-EEAT + CITE frameworks. Content optimization. | [aaron-he-zhu/seo-geo-claude-skills](https://github.com/aaron-he-zhu/seo-geo-claude-skills) |
| 25 | **lenny-skills** (281★) | 86 product management skills from Lenny's Podcast. Good for product thinking. | [RefoundAI/lenny-skills](https://github.com/RefoundAI/lenny-skills) |
| 26 | **learning-opportunities** (254★) | Deliberate skill development during AI-assisted coding. Helps YOU learn, not just ship. | [DrCatHicks/learning-opportunities](https://github.com/DrCatHicks/learning-opportunities) |
| 27 | **compound-engineering-plugin** | Turns mistakes into lessons — skills/commands for continuous improvement. | [EveryInc/compound-engineering-plugin](https://github.com/EveryInc/compound-engineering-plugin) |
| 28 | **google-ai-mode-skill** (100★) | Free Google AI Mode search with citations. Alternative to paid search APIs. | [PleasePrompto/google-ai-mode-skill](https://github.com/PleasePrompto/google-ai-mode-skill) |
| 29 | **claude-skill-homeassistant** (290★) | Home Assistant workflows. Smart home automation via agent. | [komal-SkyNET/claude-skill-homeassistant](https://github.com/komal-SkyNET/claude-skill-homeassistant) |
| 30 | 🎯 **linkedin-poster** | Post to LinkedIn. User explicitly has social-poster for X — LinkedIn is the missing piece. | Build (extend social-poster) |

### Tier 4 — Specialized / Nice-to-Have

| # | Skill | Why | Source |
|---|-------|-----|--------|
| 31 | **smart-illustrator** (325★) | AI-powered illustration generation. Visual content for posts/docs. | [axtonliu/smart-illustrator](https://github.com/axtonliu/smart-illustrator) |
| 32 | **solana-dev-skill** (358★) | Modern Solana development. If crypto/web3 is in scope. | [solana-foundation/solana-dev-skill](https://github.com/solana-foundation/solana-dev-skill) |
| 33 | **charlie-cfo-skill** (150★) | Financial analysis and CFO perspective. Business planning. | [EveryInc/charlie-cfo-skill](https://github.com/EveryInc/charlie-cfo-skill) |
| 34 | **nuxt-skills** (559★) | Vue, Nuxt, and NuxtHub skills. Framework-specific expertise. | [onmax/nuxt-skills](https://github.com/onmax/nuxt-skills) |
| 35 | **dotnet-skills** (411★) | .NET development. If we ever need C#/F# work. | [Aaronontheweb/dotnet-skills](https://github.com/Aaronontheweb/dotnet-skills) |
| 36 | **SwiftUI-Agent-Skill** (1.7K★) | Expert SwiftUI best practices. Native iOS development. | [AvdLee/SwiftUI-Agent-Skill](https://github.com/AvdLee/SwiftUI-Agent-Skill) |
| 37 | **book-factory** | Pipeline for nonfiction book creation using specialized skills. Long-form content. | [robertguss/claude-skills](https://github.com/robertguss/claude-skills) |
| 38 | **reverse-skills** (89★) | Reverse engineering. Deep debugging and binary analysis. | [P4nda0s/reverse-skills](https://github.com/P4nda0s/reverse-skills) |
| 39 | **playwright-bot-bypass** (111★) | Bypass bot detection (CAPTCHA, etc.). Extends Playwright for scraping. | [greekr4/playwright-bot-bypass](https://github.com/greekr4/playwright-bot-bypass) |
| 40 | **raptor** (1.2K★) | Offensive/defensive security agent. Pen testing. | [gadievron/raptor](https://github.com/gadievron/raptor) |

### Tier 5 — Build Ourselves (from our discussions + Arachne-specific needs)

| # | Skill | Why | Source |
|---|-------|-----|--------|
| 41 | 🎯 **streaming-thinking** | Show agent thinking tokens in real-time, not buffered. User explicitly requested. | Build (backlog item) |
| 42 | 🎯 **mobile-audit** | Playwright-based mobile viewport auditing skill — screenshot at 375/390/428px, catalog issues. | Build (from 4/10 mobile rating) |
| 43 | 🎯 **rss-content-source** | RSS adapter for ContentSource interface. Pluggable content beyond Grok emails. | Build (backlog item) |
| 44 | 🎯 **manual-queue-source** | Manual content queue adapter. Paste ideas → Muse → DA → post pipeline. | Build (backlog item) |
| 45 | 🎯 **dashboard-workflow-ui** | Configure workflow schedules, content sources, voice profiles from dashboard. | Build (backlog item) |
| 46 | **google-photos-skill** | Browse/search Google Photos. User mentioned wanting to share phone screenshots. | Build |
| 47 | **message-queue-skill** | Queue messages while agent is working. Dashboard can't, CLI can — needs parity. | Build (backlog item) |
| 48 | **deploy-skill** | One-click deploy Arachne to Vercel/Railway/Fly.io. Essential for "anyone can install" goal. | Build |
| 49 | **test-generator** | Auto-generate unit/integration tests from code. Would accelerate our own development. | Build |
| 50 | **skill-installer** | CLI to browse, install, and manage skills. `arachne skill install trail-of-bits/security`. | Build |

### Summary

| Category | Count | Examples |
|----------|-------|---------|
| Install from community | 29 | claude-mem, Trail of Bits, humanizer, beads |
| Build ourselves (user-requested 🎯) | 12 | mermaid-renderer, image-input, question-tool, streaming-thinking |
| Build ourselves (Arachne-specific) | 9 | deploy-skill, test-generator, skill-installer |
| **Total** | **50** | |

### Key Repositories to Watch

- [awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) — 25K★, updated daily, best curated list
- [awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) — 81K★, MCP server directory
- [awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills) — 8K★, 380+ skills catalog
- [everything-claude-code](https://github.com/affaan-m/everything-claude-code) — 51K★, battle-tested configs
- [oh-my-opencode](https://github.com/code-yeongyu/oh-my-opencode) — 34K★, our agent harness
