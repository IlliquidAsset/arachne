# Draft: Arachne Master Plan — OpenClaw Rival

## Requirements (confirmed)

### Vision
- Arachne as the full interface layer for OMO
- Two milestones: #1 MVP (manage dev from this interface), #2 True personal assistant
- MVP validation: "If I can manage the development and execution of this plan from this interface, we've accomplished #1"

### UI Overhaul — Claude.ai Project Experience
- **Full claude.ai project interface**: Card grid → click project → conversations + knowledge panel + project instructions
- **Project selector**: Discovered projects from user's base directory (/dev for Kendrick)
- **New project creation from UI**: Creates folder in user-defined base dir
- **Context firewalling**: Each project has its own context, isolated by default
- **Cross-project context**: Only shared when explicitly requested by user during sessions

### Dashboard Fixes (discovered via dogfooding)
1. **System messages leak into chat**: `[BACKGROUND TASK COMPLETED]`, injected prompts show as regular messages — should only appear in thinking drawer
2. **No message queuing**: Can't type while agent is working (CLI can, dashboard can't)
3. **Question tool doesn't render**: Interactive selection UI missing, shows "question running..." in drawer
4. **Side drawer limited**: Only shows current session thinking, not dispatched agent thinking
5. **No project switching**: Hardcoded to one OC server

### Architecture Requirements
- Multi-stream SSE aggregation (subscribe to multiple OC instances)
- Dispatch panel in UI (agent selection, project targeting)
- Plan visualization (interactive checklist, not just text)
- Agent status dashboard (who's running, what they're doing)
- Approval gates (Prometheus proposes → user approves before execution)

## Technical Decisions
- **Project isolation method**: Each project gets its own OC server instance (already how orchestrator works). Natural context firewall.
- **New project folder**: Created in user-configured base directory
- **Port range**: Config allows [4100, 4200] — 100 concurrent projects max

## Research Findings
- Orchestrator already discovers projects, manages server lifecycle, dispatches messages
- Autonomy engine (agent roster, classifier, scheduler) exists but isn't wired to UI
- Dashboard is Next.js 16 + React 19 + Tailwind 4 + Radix/shadcn
- Voice infrastructure (whisper.cpp STT, Kokoro TTS, VAD) partially built, server pending
- amanda-orchestrator is the predecessor; code absorbed into monorepo

## Decisions Resolved
1. **New project scaffolding**: git init + `.opencode/` config directory (Option 3). No language assumption.
2. **Cross-project context sharing**: TBD — will emerge from the PDD legend creation process itself (dogfooding the UX)
3. **Full Claude.ai project experience**: Confirmed. Card grid → project → conversations + knowledge panel + instructions.

## PDD Integration
- **Methodology**: Full PDD applied to Arachne itself
- **Legends**: 5 CIA-legend depth personas for Arachne users (NOT Kendrick's personal legend)
- **Purpose**: Drive the Ralph QC loop — personas as executable specifications for Arachne's quality
- **Legend Schema**: Must conform to SPDD LegendSchema (partA, partB0, partB, partC, partD, personalityQuickReference)

### Proposed 5 Persona Archetypes
1. **The Solo Builder** — Indie developer using Arachne as their primary AI development interface. Power user, multiple projects, wants CLI-level power in a GUI.
2. **The Creative Non-Technical** — Content creator/entrepreneur who wants an AI assistant but doesn't code. Voice-first, simple mental model, zero tolerance for jargon.
3. **The Agency Operator** — Runs a small dev shop, manages 5-10 client projects. Needs multi-project visibility, delegation, budget tracking, client-facing outputs.
4. **The Tinkerer** — Hobbyist developer who builds side projects on weekends. Impatient, wants instant gratification, abandons tools that require setup.
5. **The AI-Native PM** — Product manager who grew up with AI tools. Expects conversational interfaces to "just work." Wants to plan, approve, and verify without touching code.

## PDD Legends — COMPLETED

All 5 CIA-legend depth personas have been created. Located in `.sisyphus/drafts/personas/`.

### Legend Summary

| # | Name | Role | MBTI | Age | Location | Score | File |
|---|------|------|------|-----|----------|-------|------|
| 1 | Marisol "Mari" Quintero | Solo Builder (indie legal-tech dev) | ISTJ | 41 | San Antonio, TX | 1.6 | `legend-solo-builder.md` |
| 2 | Nadine Brooks | Creative Non-Technical (funeral celebrant) | ENFJ | 48 | Detroit, MI | 0.2 | `legend-creative-nontechnical.md` |
| 3 | Leila Haddad | Agency Operator (6-person dev shop) | ENTP | 35 | Montreal, QC | 1.4 | `legend-agency-operator.md` |
| 4 | Calvin "Cal" Ibarra | Tinkerer (weekend hobbyist) | ISFP | 37 | Tucson, AZ | 1.6 | `legend-tinkerer.md` |
| 5 | Esther "Ess" Park | AI-Native PM (product manager) | ESTJ | 38 | Seoul, KR | 1.0 | `legend-ai-native-pm.md` |

### Cross-Persona Comparison Matrix

#### Scorecard Comparison

| Capability | Mari (1) | Nadine (2) | Leila (3) | Cal (4) | Ess (5) | AVG |
|------------|----------|------------|-----------|---------|---------|-----|
| Project Management | 1 | 0 | 0.5 | 0.5 | 0.5 | **0.5** |
| Agent Interaction | 2 | 1 | 2.5 | 3 | 2 | **2.1** |
| Visibility & Control | 2 | 0 | 1.5 | 2 | 1 | **1.3** |
| Onboarding / Learnability | 2 | 0 | 1.5 | 1 | 1 | **1.1** |
| Adoption Likelihood | 1 | 0 | 1 | 1.5 | 0.5 | **0.8** |
| **Person Average** | **1.6** | **0.2** | **1.4** | **1.6** | **1.0** | **1.2** |

#### Time-to-Abandon

| Persona | Time in Arachne | Classification | Revisit? |
|---------|-----------------|---------------|----------|
| Mari | 5 hours | Thinking drawer: excellent. Everything else: needs 6 months. | Yes, when multi-project ships |
| Nadine | 11 minutes | Silent Abandoner. Never returned. | No — unless someone she trusts demonstrates it |
| Leila | 2.5 hours | "Demo-friendly, operator-hostile" | Yes, in 6 months |
| Cal | ~2 hours (65 min setup + ~55 min use) | TOURIST (front of the box) | Yes, in 3-6 months |
| Ess | ~1.5 hours | "Operator potential, assistant reality" | Monthly GitHub monitoring |

#### Critical Gaps by Persona Need

| Gap | Who It Blocks | Severity |
|-----|--------------|----------|
| **No project switching / project home** | ALL 5 | 🔴 Critical — every persona needs this |
| **System messages leak into chat** | ALL 5 (especially Nadine, Cal, Ess) | 🔴 Critical — trust-breaking for all |
| **No message queuing** | Mari (4), Leila (3), Cal (4), Ess (5) | 🔴 Critical — blocks flow for 4/5 personas |
| **No markdown/code rendering** | Mari (1), Leila (3), Cal (4), Ess (5) | 🟡 High — blocks usability for 4/5 |
| **Question tool doesn't render** | Mari (1), Cal (4) | 🟡 High — causes wrong defaults |
| **No file upload / multimodal** | Nadine (2) | 🟡 High — dealbreaker for non-technical |
| **No onboarding / tutorial** | Nadine (2), Cal (4), Ess (5) | 🟡 High — first-run failure for 3/5 |
| **Voice doesn't work** | Nadine (2) | 🟡 High — broken promise |
| **Thinking drawer: technical language** | Nadine (2) | 🟡 Medium — frightens non-technical |
| **Thinking drawer: current session only** | Mari (1), Leila (3), Ess (5) | 🟡 Medium — blocks audit/review |
| **Autonomy engine not surfaced** | Ess (5) | 🔴 Critical for PM persona |
| **No stage gates / approval workflow** | Ess (5), Leila (3) | 🔴 Critical for management personas |
| **No decision audit trail** | Mari (1), Leila (3), Ess (5) | 🟡 High — blocks accountability |
| **Setup complexity** | Cal (4), Nadine (2) | 🟡 High — 65 min vs 20 min tolerance |

#### Persona Archetypes as Product Signals

| Persona | What They Represent | Product Priority Signal |
|---------|--------------------|-----------------------|
| **Nadine (0.2)** | Accessibility floor — if she can't use it, the product excludes non-technical users entirely | Onboarding, voice, file upload, plain-language thinking drawer |
| **Mari (1.6)** | Core user — solo developer who would switch from Claude+Cursor if multi-project + audit trail existed | Project system, markdown rendering, decision provenance |
| **Cal (1.6)** | Adoption barrier — if setup takes >20 min, hobbyists (largest potential audience) won't try | One-command setup, quick-start wizard, project selector |
| **Leila (1.4)** | Scale test — if agencies can't use it, growth is capped at individual users | Message queuing, parallel execution, client firewalling |
| **Ess (1.0)** | Future vision — if PMs can't manage through it, Arachne stays a dev tool forever | Orchestration UI, stage gates, role separation, approval workflow |

### Aggregated Migration Completeness

| Status | Count | % | Example |
|--------|-------|---|---------|
| **Already Innovated** | 5 | 10% | Thinking drawer (all personas), code-aware agent (Cal) |
| **Partial** | 8 | 16% | Chat quality, session persistence, basic interaction |
| **Broken** | 8 | 16% | Voice, plain text rendering, system message leaks, setup time |
| **Missing** | 29 | 58% | Project system, message queue, file upload, audit trail, orchestration UI, stage gates, approval workflow |

**Bottom line**: Arachne has innovated in ONE area (thinking drawer / agent reasoning visibility) that every persona recognized as genuinely superior. But 74% of the migration table is Broken or Missing. The product is a proof-of-concept, not an MVP.

## Open Questions
- Project home — should it be the root `/` route replacing the current login → chat flow?

## Scope Boundaries
- INCLUDE: Dashboard overhaul, project system, message fixes, thinking drawer upgrade
- INCLUDE: New project creation with folder scaffolding
- INCLUDE: Context firewalling per project
- INCLUDE: 5 PDD legends for Arachne QA ✅ COMPLETED
- EXCLUDE: Voice server implementation (Phase 2)
- EXCLUDE: Multi-user support (Phase 3)
- EXCLUDE: Deployment/Docker (Phase 3)
- EXCLUDE: Plugin marketplace (Phase 3)
