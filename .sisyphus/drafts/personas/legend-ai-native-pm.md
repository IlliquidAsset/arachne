# Persona Legend: The AI-Native PM

**Product**: Arachne — AI Agent Orchestration Platform
**Version**: 0.1.0 (Current State Assessment)
**Methodology**: Persona-Driven Development (PDD), CIA-Legend Depth

---

## PERSONA 5: ESTHER "ESS" PARK — AI-Native PM (Product Manager)

### PART A: THE LEGEND

### Identity & Background
- **Name**: Esther "Ess" Park, age 38.
- **Education**: BSc in Industrial Engineering from KAIST (Korea Advanced Institute of Science and Technology, 2009). Executive certificate in Product Management from Reforge (2022). She's never written a line of production code. She can read pseudocode and SQL. She understands git at a conceptual level — "branches, merges, conflicts" — but has never used a terminal.
- **Career Arc**:
  - **Korean Air, Incheon (2009–2014)**: IROPS (Irregular Operations) coordinator at the airline's operations control center. When flights disrupted — weather, mechanical, crew timeout — she was the person who rerouted aircraft, reassigned crews, and reboked passengers in real-time. She managed 12–18 simultaneous disruption streams during typhoon season. The job required: parallel decision-making under time pressure, delegation to ground crews she couldn't see, and verification through instrument panels she had to trust. She was the orchestrator. "I never flew the planes. I told the planes where to go and confirmed they landed."
  - **Coupang, Seoul (2014–2018)**: Operations PM for last-mile delivery. She designed the decision trees that automated driver routing, exception handling, and customer notification. She worked with engineering but never in engineering. Her job was to define the rules, test the outcomes, and approve the release. She got promoted twice. She left because the company scaled past the point where one PM could influence the system.
  - **Naver Health, Seoul (2018–2022)**: Senior PM for patient scheduling and telehealth. She built the product that matched patients with available specialists across 200+ partner clinics. The matching algorithm was AI-driven; Ess's job was to define the constraints, review the outputs, and approve the edge-case handling. This is where she realized: "I don't need to build AI. I need to MANAGE AI."
  - **AfterCare Health, Seoul (2022–Present)**: Co-founder and Head of Product at a 14-person startup building **AfterCare Atlas** — an AI-operated care-transition platform that coordinates post-hospital discharge: medication reminders, follow-up scheduling, transport coordination, and caregiver notifications. Ess doesn't code. Her CTO (Jaeho) and a 5-person engineering team build. But increasingly, Ess uses AI agents as her "shadow engineering team" — she drafts PRDs with Claude, generates acceptance criteria with ChatGPT, scaffolds specifications, and reviews AI-generated code diffs to verify intent alignment. She's building toward a workflow where she can describe a feature, have AI agents plan and build it, and verify the result without ever opening an IDE.
- **Why She Gravitates Toward Orchestration**: Her mother Soo-yeon suffered a stroke in 2021. Ess became a part-time caregiver — managing medications, rehab appointments, home nurse schedules, and insurance claims. She can make high-leverage decisions in focused 45-minute bursts between caregiving responsibilities. She cannot disappear into 4-hour deep-work blocks. She needs to steer, not row. AI orchestration — plan, delegate, verify — maps perfectly to her life constraints.
- **Defining Failure**: In August 2024, Ess used an AI-generated implementation (built via Cursor + ChatGPT scaffolding, reviewed by her CTO) for AfterCare Atlas's medication reminder system. The demo looked perfect. CI/CD checks were green. She approved the release after a walkthrough where the system correctly handled 5 test patients. What she didn't know: the test suite had been configured to quarantine "flaky" edge-case tests — tests for patients on multiple medications with overlapping schedules. Those tests were marked "skip" in the config. They never ran. In production, 23 patients received duplicate medication reminders over 6 days. Three patients called their doctors in confusion. One caregiver called AfterCare's support line in tears, thinking her father was being over-prescribed. The pilot hospital paused the rollout. A six-figure expansion contract was delayed 4 months. Ess spent the next two weeks conducting a post-mortem. The root cause wasn't the code — it was that her verification process relied on green signals and polished demos. She had approved confidence theater, not behavioral proof. **Lesson**: "Green checks and smooth demos are performance. I need a counterexample packet — show me three ways this fails and how we detect each one — before I sign off on anything." She now demands failure evidence alongside success evidence for every release.
- **Why Arachne**: She doesn't want AI that writes code. She wants AI that she can MANAGE — a system where she can define objectives, delegate to specialized agents (planner, executor, evaluator), set approval gates, and verify outcomes without reading code. She read about Arachne's autonomy engine — the agent roster with planner, executor, and evaluator roles — and thought: "This is my airline operations center, but for software. This is what I've been looking for." The architecture matches her mental model perfectly. The question is whether the product does.
- **Surprising Detail**: Her kitchen refrigerator is covered in magnetic tiles labeled with airport codes — ICN, GMP, NRT, PVG — arranged in three swim lanes labeled "Planning," "Executing," "Verifying." She uses this as her personal kanban for AfterCare Atlas features. Jaeho has seen it and finds it "endearing and terrifying."

### Personal Life
- **Family**: Married to Kim Doha, 40, a patent attorney. One daughter, Yuna (6), in first grade at Seoul International School. Her mother Soo-yeon (68) lives in a care-assisted apartment in Bundang, 25 minutes from Ess's home in Pangyo. Ess visits three times a week and manages Soo-yeon's care coordination — the same type of work AfterCare Atlas is designed to automate.
- **Routine**:
  - **6:00am**: Up. Checks Slack on her phone. Reviews any overnight commits from the engineering team (she reads PR titles and descriptions, not code). Sends Yuna off to school by 7:30.
  - **8:00am–12:00pm**: AfterCare office in Pangyo Techno Valley. This is her decision window — PRD reviews, AI-assisted feature scoping, stakeholder calls.
  - **12:30pm–2:00pm**: Three times a week, drives to Bundang to check on Soo-yeon. Manages her care schedule, talks to nurses, handles insurance paperwork.
  - **2:30pm–6:00pm**: Back at office or working remotely. Verification sessions, sprint reviews, partner calls.
  - **9:30pm**: After Yuna's bedtime. One final check on the AI agents she's left running — she reviews outputs, approves or rejects, and queues instructions for the next morning.
- **Technology**: Strategic user, not a power user. MacBook Air M3. She uses Safari (default, never changed). She has no terminal on her dock. She uses Notion for everything that isn't Slack. She's proficient in Figma (for reviewing designs, not creating them). She uses Loom extensively for async communication. She can navigate a GitHub PR page and understand the diff summary, but she cannot run `git clone`.
- **Workspace**: Her office desk has three physical clipboards: one labeled **Intent** (what she asked for), one labeled **Evidence** (what the AI/team produced as proof), one labeled **Decision** (her approval or rejection with reasoning). Nothing gets approved unless it physically moves through all three clipboards. Her team has learned to present work in this format. The clipboards are color-coded: blue, green, red. The red clipboard currently has two items waiting for counterexample packets.
- **Non-Work Stress**: Soo-yeon's condition is stable but requires constant coordination. Ess is simultaneously the product manager of AfterCare Atlas AND its most demanding beta user — she tests every care-transition feature against her mother's real schedule. When the product fails, it's not abstract. It's her mother's missed appointment.

### Behavioral Psychology
- **MBTI**: ESTJ ("The Executive"). Organized, decisive, systems-oriented, expects tools and people to deliver on their stated purpose. Low tolerance for ambiguity in operational contexts. She delegates confidently but verifies relentlessly. She's the person who reads the SLA before signing the contract.
- **Big Five**:
  - **Openness**: Moderate (open to new workflows, skeptical of new tools that don't immediately demonstrate operational value)
  - **Conscientiousness**: Very High (the clipboard system, the counterexample packets, the airport-code kanban — everything has a process)
  - **Extraversion**: Moderate-High (energized by stakeholder conversations and team syncs, drained by solo tooling setup)
  - **Agreeableness**: Moderate-Low (direct and expectation-setting; she's not rude but she's not accommodating when deliverables are unclear)
  - **Neuroticism**: Moderate (the medication reminder incident created a persistent "what am I not verifying?" anxiety that she manages through process rigor)
- **Decision Style**: Outcome-first, evidence-gated. She defines the outcome she wants, delegates the execution, and evaluates the evidence of completion. She doesn't care HOW something was built — she cares whether the evidence of correctness is defensible. "Show me the failure modes, not the happy path."
- **Software Reaction**: When she opens a new tool, she performs a fit test within the first 60 seconds. She asks the tool (or herself): "What is this tool's objective? What are its non-goals? What can it NOT prove yet?" If the tool doesn't make these explicit, she classifies it as "assistant" (useful but not trustworthy for management) vs. "operator" (trusted for end-to-end workflow). Most tools are assistants.
- **Incomplete Feature Tolerance**: 3/10. She's building a company on the premise that AI can be managed, not just used. A tool that promises orchestration but delivers chat is worse than a tool that promises chat and delivers chat. Broken promises are more damaging than missing features.
- **Cognitive Biases**:
  - **Authority Bias**: She over-trusts AI outputs that are presented with confidence and structure. The medication reminder failure was partly because the AI's demo was polished and articulate — "it sounded like it knew what it was doing."
  - **Confirmation Bias**: She tends to seek evidence that supports her product thesis (AI-managed development) and under-examine counterevidence.
  - **Automation Complacency**: Despite the medication incident, she still defaults to trusting automated checks over manual review — she's working to correct this but it's deeply ingrained from airline operations where automated systems were generally reliable.

### Technology Experience
- **Tools used**:
  - **Claude (1.5 years)**: Her primary AI for strategic work — PRDs, feature specifications, competitive analysis, stakeholder communication. She maintains project-specific conversations. She considers Claude her "chief of staff."
  - **ChatGPT (2 years)**: Her secondary AI for acceptance criteria generation, edge-case brainstorming, and quick research. She uses it more transactionally than Claude.
  - **Cursor (observing, 6 months)**: She's watched Jaeho use Cursor and understands the concept. She's tried it twice for reviewing AI-generated code but found the interface too code-centric for her workflow.
  - **Notion (5 years)**: Her operating system. PRDs, sprint plans, meeting notes, OKRs, care coordination for her mother — all in Notion.
  - **Slack (7 years)**: Communication backbone. She uses threads religiously. She has a #decisions channel where every significant product decision is posted with rationale.
  - **Figma (3 years, review-only)**: For design review. She leaves precise, measurement-aware comments.
  - **Loom (3 years)**: For async demos and reviews. She records 3-5 Looms per week for the team. She reviews incoming Looms at 1.5x speed.
  - **GitHub (2 years, reading-only)**: She can navigate the PR interface, read diff summaries, and check CI status. She cannot operate git from the command line.
  - **Linear (1 year)**: AfterCare's task tracker. She uses the PM view — roadmap, cycles, triage — not the engineering view.
- **Tabs open**: 8-12. Notion, Slack, Claude, Linear, GitHub (PR page), maybe Figma. She's a moderate tab user — each tab represents an active decision context.
- **Keyboard shortcuts**: Cmd+T (new tab), Cmd+W (close tab), Cmd+C/V. She uses trackpad gestures for desktop switching.
- **Screen**: MacBook Air, single screen. She uses macOS Spaces — three desktops: Communication (Slack/email), Production (Notion/Linear/GitHub), AI (Claude/ChatGPT).

---

### PART B-0: BEFORE ARACHNE — A Day in Ess's Life

**Monday 8:15am — The Planning Session**:

Ess arrives at the Pangyo office. Coffee from the lobby CU convenience store. She opens her MacBook and reviews the week's sprint.

1. She opens Notion. The current sprint has 14 items across 3 epics. She needs to scope a new feature: automated caregiver notification when a patient misses a medication window. She opens Claude.
2. "I need to write a PRD for an automated caregiver notification system. Here's the context: AfterCare Atlas monitors medication schedules for post-discharge patients. When a patient misses a medication window by more than 30 minutes, we need to notify their designated caregiver via SMS and push notification. Here are the constraints..."
3. Claude produces a structured PRD in 4 minutes. It's good — clear user stories, edge cases identified, acceptance criteria drafted. Ess copies it into Notion and starts editing.
4. She opens ChatGPT in another tab: "Given this feature spec [pastes], generate 5 edge cases that could cause false positive notifications." ChatGPT identifies: timezone mismatches, daylight saving transitions, medication schedule changes not yet synced, patients who self-reported taking meds but didn't use the app, and caregiver notification fatigue from multiple patients.
5. She adds these to the PRD. She sends it to Jaeho for engineering review.
6. **Friction**: She used two AI tools to build this PRD. Each had partial context. Claude didn't know about ChatGPT's edge cases. ChatGPT didn't know about Claude's architecture suggestions. She is the integration layer between two AI "planners" that don't talk to each other.

**Monday 10:00am — The Verification Gap**:

1. Jaeho pings on Slack: "The discharge summary parser from last sprint is ready for review." He sends a Loom walkthrough.
2. Ess watches the Loom at 1.5x. The parser handles the three demo cases correctly. The UI looks clean. The data flows.
3. She opens the GitHub PR. She reads the diff summary. 47 files changed, 2,200 lines added. She can see the file names but the code is opaque.
4. She checks CI: all green. She checks the test count: 34 tests pass.
5. She reaches for the red clipboard. She writes: "EVIDENCE: Loom demo (3 cases), CI green, 34 tests pass." Then: "MISSING: Counterexample packet. What happens when discharge summary is incomplete? When timezone differs? When patient has no caregiver listed?"
6. She messages Jaeho: "Before I approve: show me the failure modes. What happens when it breaks? I need 3 specific failure scenarios with expected behavior."
7. **Friction**: She can't verify code directly. She can verify outcomes, but only if someone (human or AI) generates the failure scenarios for her. She's dependent on Jaeho to produce the counterexamples — which means her verification bottleneck is her engineering team's availability, not her own capacity.

**Monday 2:30pm — After Bundang Visit**:

Back from checking on Soo-yeon. Her mother's nurse changed the medication schedule — this is exactly the scenario AfterCare Atlas should handle. Ess makes a note.

1. She wants to test whether the current Atlas prototype would correctly handle a mid-week schedule change. She opens Claude: "Simulate this scenario: a patient's nurse changes their medication from twice daily (8am/8pm) to three times daily (8am/2pm/8pm). What should AfterCare Atlas do?"
2. Claude gives a reasonable answer — but it's Claude's imagination, not AfterCare Atlas's actual behavior. Claude doesn't have access to the codebase, the database schema, or the actual notification logic.
3. She opens ChatGPT with the same question for a second opinion. ChatGPT gives a slightly different answer.
4. **Friction**: She's asking AI to simulate a product that AI didn't build. She needs to test the actual system, but she can't run tests herself — she doesn't know how. She needs an AI that can read the codebase, understand the logic, AND execute the test. No tool she has can do all three.

**Monday 9:30pm — The Evening Review**:

Yuna is asleep. Ess opens her MacBook on the couch.

1. She checks Slack: Jaeho sent the counterexample packet. Three failure scenarios with expected behavior and test results. Two pass. One fails — the "no caregiver listed" case. He's fixing it tomorrow.
2. She opens Claude to draft tomorrow's stakeholder update. She re-explains the sprint context from scratch. Claude doesn't remember last Monday.
3. She moves the parser from the Evidence clipboard to the Decision clipboard: "CONDITIONAL APPROVE — pending no-caregiver edge case fix."
4. She opens Linear and updates the ticket.
5. She opens Notion and updates the sprint doc.
6. She opens Slack and posts in #decisions: "Parser approved conditionally. Blocking issue: no-caregiver case. Fix ETA: tomorrow."
7. **Friction**: She updated 4 tools to record one decision. The decision lives in four places, none of which is the source of truth. Her clipboard is the source of truth, and it's a piece of physical cardboard.

**Emotional Signature**:
Claude is "The Chief of Staff" — brilliant in the room, but forgets the previous meeting. ChatGPT is "The Junior Analyst" — fast research, no institutional memory. Notion is "The Filing Cabinet" — comprehensive but inert; it doesn't think. Linear is "The Departure Board" — shows what's scheduled but not what's real. GitHub is "The Black Box" — she can see what went in and what came out, but not what happened inside.

---

### PART B: A DAY IN ESS'S LIFE (Arachne)

Ess read about Arachne in a product newsletter. The article described: "An AI orchestration platform with a planner, executor, and evaluator agent — like having your own AI engineering team." She immediately recognized her airline operations center. She asked Jaeho to set it up.

She opens the browser. http://localhost:3000. She enters the password Jaeho configured.

**First-Screen Reaction**:

She performs her 60-second fit test. She asks herself: "What is this tool's objective? What are its non-goals? What can it NOT prove yet?"

She sees: a chat interface. A session sidebar. A header that says "Amanda."

She looks for: (1) a way to define a project objective, (2) a way to delegate to specific agent roles, (3) a way to set an approval gate. She finds none.

She types: "What can you do? Specifically, can I delegate tasks to different agent roles — like a planner, an executor, and an evaluator — and approve their output at each stage?"

The response explains that yes, there's an autonomy engine with these roles, but it works "behind the scenes" and isn't directly controllable from the UI.

*"Behind the scenes. So the architecture I need exists, but I can't see it, direct it, or approve its stages. You built my operations center and then bricked the windows."*

She classifies Arachne: **"Operator potential, assistant reality."**

**Dead-End #1: The Invisible Orchestration (9:00am)**:

She decides to push further. She types: "I need to scope a new feature for AfterCare Atlas: automated caregiver notification on missed medication windows. Please create a PRD with user stories, edge cases, and acceptance criteria."

The agent produces excellent output — better structured than Claude, with more specific edge cases than ChatGPT. She's impressed.

But she can't tell: did a PLANNER agent do this? Or a generic chat agent? Was there an internal planning step, an execution step, a review step? The thinking drawer shows tool usage — `mcp_read`, `mcp_grep_search` — but no agent-role differentiation.

She clicks through the thinking drawer carefully. She sees raw tool calls and reasoning text. She does NOT see: which agent role produced which part, whether there was internal review, whether alternatives were considered and rejected.

*"I can see that something is happening. I cannot see WHO is doing WHAT. In my airline days, I could see which coordinator was handling which flight on which screen. Here, I see one screen with one stream. I'm managing a team I can't see."*

She wants to say: "Now have the evaluator review this PRD against our existing patient data schema." But there's no way to address a specific agent role. There's no way to insert an approval gate between planning and execution.

**Behavioral result**: She copies the PRD into Notion (where she can manage it with her clipboard system) and continues the planning work in Claude (where at least the conversation is persistent within a session). Arachne produced the best first draft — but she can't MANAGE the process that produced it.

**Dead-End #2: The Plan-Delegate-Verify Loop is Broken (10:00am)**:

She tries a more ambitious test. She types: "Based on the PRD we just created, I want you to plan the implementation, then build the notification service, then verify it handles the edge cases we identified."

The agent starts working. The thinking drawer shows activity. But everything happens in one continuous stream — planning, building, and verification blur into a single monologue.

She can't pause after planning to review and approve. She can't redirect after execution to add a new edge case. She can't request a counterexample packet before the evaluator (if there even is one) marks it complete.

The input is disabled while the agent works. She wants to type: "Stop. Show me the plan before you build anything." But she can't. Message queuing doesn't exist.

When the agent finishes, it presents a complete implementation with tests. It's technically impressive. But she has no way to verify it.

She asks: "Did an evaluator agent review this? What failure modes did it test? Show me the counterexample analysis."

The agent responds with a post-hoc analysis — it's generating failure scenarios NOW, not recalling them from an evaluation step that already happened.

*"You're writing fiction about your own review process. There was no evaluator. There was no gate. You planned, built, and declared victory in one breath. That's not orchestration — that's a developer who QA'd their own code."*

**Behavioral result**: She opens her red clipboard. Under "Arachne" she writes: "EVIDENCE: Excellent generation quality. MISSING: Governance. No stage gates. No role separation. No approval workflow. No counterexample standard. Tool generates and self-approves. Classification: ungoverned."

**Dead-End #3: The System Leaks Its Own Architecture (10:30am)**:

A message appears in the chat:
```
[BACKGROUND TASK COMPLETED] ID: bg_9918cc2f
```
Followed by system-level text that appears to contain internal prompts and agent instructions.

Ess reads it with the precision of someone who reads SLAs for a living.

*"This is internal system state. In my airline ops center, I could see the system status on the controller's screens — but PASSENGERS never saw it. You're showing the passenger the air traffic control radio feed."*

She's not frightened like Nadine. She's not angered like Cal. She's DISQUALIFIED. In her mental model, a tool that leaks internal state to the user interface is a tool with broken access control. If it can't separate system messages from user messages, it can't separate planning from execution from evaluation. The architectural discipline is missing at the UI layer.

**Behavioral result**: She opens a new Notion page and writes a thorough evaluation:
```
ARACHNE EVALUATION — Esther Park, 2026-02-23

STRENGTHS:
- Generation quality exceeds Claude + ChatGPT combination
- Thinking drawer: first tool I've seen with real-time agent reasoning
- Code-aware context: agent reads codebase, not just conversation
- Autonomy engine architecture (planner/executor/evaluator) matches my needs exactly

FATAL GAPS:
1. Orchestration engine exists but is not manageable from UI
2. No stage gates or approval workflow
3. No role-separated agent visibility
4. No counterexample/failure-mode standard in evaluation
5. System messages leak into user interface (access control failure)
6. No message queuing (PM cannot steer during execution)
7. No project separation (multi-product management impossible)

VERDICT: Best AI architecture I've evaluated. Worst AI governance.
The engine I need is running under the hood, but I'm given a chat window and a steering wheel that's not connected to anything.

REVISIT: When orchestration UI ships. Monitor GitHub releases.
```

She bookmarks the Arachne GitHub repo. She sets a monthly calendar reminder: "Check Arachne releases."

---

### PART C: THE UNCOMFORTABLE QUESTIONS

*Written in Ess's voice — strategic, outcome-focused, expecting answers that would satisfy a board presentation.*

1. *"If I can't see which agent made which decision, what exactly am I approving — delivery, or confidence theater? I approved a release once because the checks were green and the demo was smooth. Twenty-three patients got duplicate medication reminders. I don't approve black boxes anymore."*

2. *"Your docs describe a planner, executor, and evaluator architecture. Your UI gives me one chat window. Are you a developer workspace with agent features, or an orchestration system where I manage outcomes end-to-end? Because right now you're promising me an operations center and delivering a very sophisticated chat app."*

3. *"Why does your product narrative promise planner → executor → evaluator, but your interface only gives me one long conversation? I managed 18 simultaneous flight disruptions in a single shift. I can handle agent complexity. What I can't handle is a tool that hides its own capabilities."*

4. *"Where are the stage gates? When the planner finishes, I want to review and approve before the executor starts. When the executor finishes, I want a counterexample packet before the evaluator signs off. You're running all three in a single stream with no pause, no review, no approval. That's not orchestration — that's a developer who QA'd their own code."*

5. *"Your system showed me its own internal prompts in the chat. In my airline days, passengers never saw the air traffic control feed. You're showing me the cockpit instruments while I'm trying to be the operations director. This isn't transparency — it's an access control failure."*

6. *"I don't write code. I define objectives, delegate execution, and verify outcomes. Your entire interface assumes I'm the person writing code. Where is the PM view? Where is the outcome dashboard? Where is the evidence-of-completion layer?"*

7. *"I evaluate tools by asking three questions in the first 60 seconds: What is its objective? What are its non-goals? What can it not prove yet? Arachne answered zero of these. The onboarding was a blank chat window and a name — Amanda — that means nothing to me. If your tool can't articulate its own purpose in 60 seconds, how can I trust it to articulate my product's purpose to an AI engineering team?"*

---

### PART D: SCORECARD

| Capability | Score (0-5) | Notes |
|------------|-------------|-------|
| Project Management | 0.5 | No project concept, no multi-project view, no project objectives, no deliverable tracking. Sessions are conversations, not managed initiatives. The PM's clipboard system outperforms the interface. |
| Agent Interaction | 2 | Generation quality is excellent — best she's seen. Thinking drawer shows real-time reasoning. But no role-separated interaction, no stage gates, no approval workflow, no message queuing. She can talk TO agents but cannot MANAGE them. |
| Visibility & Control | 1 | Thinking drawer shows current activity (useful). But no portfolio view, no agent-role attribution, no decision audit trail, no counterexample standard, no historical reasoning review. System messages leak. She cannot distinguish system state from agent output. |
| Onboarding / Learnability | 1 | Zero onboarding. No explanation of capabilities, limitations, or intended workflow. Her 60-second fit test found nothing that communicated "this is an orchestration platform." It communicated "this is a chat app." |
| Adoption Likelihood | 0.5 | She will not adopt. She will MONITOR. Monthly GitHub release checks. She sees the architecture she needs — planner/executor/evaluator is exactly her mental model — but the governance layer doesn't exist yet. She'll return when stage gates, role separation, and approval workflows ship. She is the most patient non-adopter. |
| **Average** | **1.0** | **FAIL** — Arachne contains the exact architecture Ess needs, invisible behind an interface designed for a different user. The engine matches her operations-center mental model; the UI matches a developer's chat tool. She is Arachne's future power user, currently locked out by the interface layer. |

---

## PERSONALITY QUICK REFERENCE

**Name**: Esther "Ess" Park
**Archetype**: The Operations Director
**Core Drive**: Governable outcomes — she needs to define, delegate, gate, and verify through agent roles she can see and direct
**Screen-Loading Behavior**: The 60-Second Fit Test — mentally asks "What is the objective? What are the non-goals? What can it not prove?" If the tool can't answer in a minute, it's an "assistant, not an operator"
**Physical Habit**: Three color-coded clipboards (Intent/Evidence/Decision); reads AI output backward starting from rollback plan; fridge kanban with airport-code magnets
**Internal Monologue Voice**: Strategic, evidence-gated, measuring outcomes not implementations
  - *"Show me how it fails, not how it works."*
  - *"Who decided this, and did anyone review the decision?"*
  - *"I don't approve black boxes."*
**Relationship to Technology**: Classifies every tool as "assistant" (useful) or "operator" (trusted for management). Most tools are assistants.
**Emotional Arc**: The Patient Monitor — recognized the architecture she needs, documented the gaps precisely, set a calendar reminder, and will return when governance ships. She is not frustrated. She is waiting.
**Legacy Tool Signatures**:
  - Claude: "The Chief of Staff" — brilliant in the room, forgets the previous meeting
  - ChatGPT: "The Junior Analyst" — fast research, no institutional memory
  - Notion: "The Filing Cabinet" — comprehensive but inert
  - Linear: "The Departure Board" — shows what's scheduled, not what's real
  - GitHub: "The Black Box" — she can see inputs and outputs, not the process
**Incomplete Feature Tolerance**: 3/10
**MBTI**: ESTJ

### Calibration Markers

| Marker | Target (1-10) |
|--------|--------------|
| Governance Expectation | 10 |
| Code Literacy | 2 |
| Orchestration Need (plan→delegate→verify) | 10 |
| Patience with Immature Tools | 6 |
| Evidence-Over-Narrative Insistence | 9 |

---

## CROSS-DOMAIN METAPHOR

Arachne, for Ess, is **a hospital with a world-class triage protocol written on the wall, but no nurse station to run it**.

The protocol exists. It's good — better than anything she's seen at competitors. Planner triages the case. Executor performs the procedure. Evaluator checks the outcome. It's textbook. It's exactly how she'd design an AI operations center.

But there is no nurse station. No one is staffing the protocol. The patients (her product features) arrive and are handled by whoever happens to be in the room (a single chat agent) using whatever tools are nearby (the conversation). The triage protocol hangs on the wall, beautifully designed, gathering dust.

Ess doesn't need the protocol explained to her. She needs a STATION — a physical place in the interface where she can sit, see all incoming cases, assign them to the right roles, approve handoffs between stages, and verify the discharge. The protocol without the station is architecture without governance. It's an operations manual with no operations center.

She will return when the nurse station is built.

---

## MIGRATION COMPLETENESS TABLE — AI-Native PM

| Workflow Step | Legacy Tool | Time (Legacy) | Arachne Equivalent | Status | Time (Arachne) | Delta | Legacy Pain (1-5) | Innovation Opportunity |
|---------------|-------------|---------------|---------------------|--------|-----------------|-------|-------------------|----------------------|
| Feature scoping / PRD drafting | Claude + ChatGPT + Notion | 45 min | Chat with agent | **Partial** | 30 min | +15 min | 3 | Extend (project-aware, persistent context) |
| Acceptance criteria generation | ChatGPT | 15 min | Chat with agent | **Partial** | 10 min | +5 min | 2 | Extend (code-aware criteria from codebase) |
| Code review (PM level) | GitHub PR page + Loom | 30 min per PR | Agent-assisted review | **Missing** | N/A | N/A | 4 | Reimagine (PM-facing code explanation) |
| Counterexample / failure mode analysis | Manual request to engineering | 2-4 hours (blocked by eng) | Evaluator agent | **Missing** | N/A | N/A | 5 | Reimagine (automated counterexample packet) |
| Stage-gated plan→execute→evaluate | Not possible | N/A | Autonomy engine (surfaced) | **Missing** | N/A | N/A | 5 | Reimagine (visible orchestration with gates) |
| Multi-project portfolio view | Notion + Linear + Slack | 20 min to assemble | Project dashboard | **Missing** | N/A | N/A | 4 | Reimagine (unified PM dashboard) |
| Decision audit trail | #decisions Slack channel + Notion | 5 min per decision (4 tools) | Agent decision log | **Missing** | N/A | N/A | 5 | Reimagine (automatic decision provenance) |
| Agent reasoning visibility | Not possible | N/A | Thinking drawer | **Replaced** | Real-time | ∞ savings | 5 | Already innovated |
| Role-separated agent interaction | Not possible | N/A | Addressable agent roles | **Missing** | N/A | N/A | 5 | Reimagine (talk to planner vs executor) |
| Agent output formatting | Copy-paste + Notion reformat | 10 min per output | Markdown rendering | **Broken** | N/A | N/A | 3 | Replicate (rendered output) |
| Approval workflow | Physical clipboards | 5 min per item | Digital approval gates | **Missing** | N/A | N/A | 4 | Reimagine (in-UI approval workflow) |
| Async instruction queuing | Slack messages to Jaeho | Variable | Message queue | **Missing** | N/A | N/A | 3 | Replicate (queue while agent works) |
