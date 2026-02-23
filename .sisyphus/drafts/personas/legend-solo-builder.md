# Persona Legend: The Solo Builder

**Product**: Arachne — AI Agent Orchestration Platform
**Version**: 0.1.0 (Current State Assessment)
**Methodology**: Persona-Driven Development (PDD), CIA-Legend Depth

---

## PERSONA 1: MARISOL "MARI" QUINTERO — Solo Builder (Indie Developer)

### PART A: THE LEGEND

### Identity & Background
- **Name**: Marisol "Mari" Quintero, age 41.
- **Education**: AAS in Court Reporting from San Antonio College (2005). Self-taught Python via freeCodeCamp and MIT OCW (2020–2021). No CS degree.
- **Career Arc**:
  - **Bexar County District Court (2005–2014)**: Bilingual court stenographer. Typed at 240+ WPM across felony and immigration cases. Built an encyclopedic understanding of procedural workflows, evidence chains, and how small errors cascade into catastrophic outcomes.
  - **Texas RioGrande Legal Aid (2014–2018)**: Senior stenographer and transcript manager. Started building Python scripts to automate transcript cleanup for pro bono attorneys. Her first "software" was a regex-based anonymizer that saved 6 hours per week. Legal aid couldn't pay her for the scripts; she gave them away.
  - **Independent Legal-Tech Contractor (2018–2022)**: Built contract automation tools for small Texas law firms. Her niche: converting chaotic Word/PDF legal workflows into structured data pipelines. Revenue peaked at $127K in 2021 from 4 retainer clients. She worked alone.
  - **Solo AI-First Developer (2022–Present)**: When GPT-3.5 dropped, she immediately saw it as "a junior paralegal that never sleeps." Pivoted to building AI-augmented legal document tools. Now manages 3 active SaaS products and 2 client projects simultaneously, all as a solo operator using AI agents as her "team."
- **Defining Failure**: In 2023, she lost a $38,400 contract with a mid-size Houston law firm after shipping contradictory policy logic. The root cause: she'd been generating code across 11 tabs — ChatGPT, Claude, Cursor — and couldn't reconcile which AI session had produced which architectural decision. The firm's compliance team found two functions that enforced opposite rules for the same document type. She couldn't explain how it happened because the decision trail was scattered across disposable chat sessions. The firm canceled the contract, and she lost $6,700 in unpaid rework hours. Three months of feast/famine panic followed. **Lesson**: "If I can't reconstruct how a decision was made, I can't defend it."
- **Defining Triumph**: Built a bilingual contract analyzer that reduced a 12-attorney firm's document review time from 14 hours per deal to 2.5 hours. The firm renewed at $4,200/month for 18 months. She built it in 6 weeks using AI pair programming — her first proof that "AI agents as a team" could outperform hiring junior developers.
- **Why Arachne**: She doesn't want faster coding. She wants **fewer avoidable mistakes under pressure**. She needs one orchestrated interface where she can see what every agent decided, when, and why — the same chain-of-custody rigor she learned in court.

### Personal Life
- **Family**: Divorced. Co-parents a 12-year-old son, Diego, who splits time between her apartment in Alamo Heights and his father's house in Helotes. Every other weekend she's "off duty" — those are her deep-work sprints.
- **Routine**:
  - **6am**: Up before Diego. Strong café de olla (cinnamon coffee) on the stove while checking Stripe notifications on her phone. Scans HackerNews headlines but rarely clicks.
  - **11pm**: In bed with her iPad, reading legal-tech newsletters or listening to the *Acquired* podcast. Falls asleep mid-episode.
- **Technology**: Power user with a forensic mindset. MacBook Pro M3 for everything. She treats LLMs like "witnesses under oath" — she cross-examines outputs, demands citations, and distrusts any response that can't be traced to its source. She uses Arc Browser because she needs tab groups that survive restarts.
- **Workspace**: Standing desk in a converted breakfast nook. Single 32" LG monitor (she sold her second monitor because "it enabled tab hoarding"). An old mechanical keyboard (Das Keyboard 4) she's had since 2019. A legal pad always within reach — she writes prompt IDs by hand before sending high-stakes requests.
- **Non-Work Stress**: Diego was diagnosed with ADHD this year. She's navigating the school accommodation process, which eats her Tuesday and Thursday mornings and occasionally her focus for the rest of the day. She sees parallels between her son's attention management and her own context-switching problem.

### Behavioral Psychology
- **MBTI**: ISTJ ("The Inspector"). Methodical, evidence-driven, uncomfortable with ambiguity, deeply loyal to systems that earn her trust.
- **Big Five**:
  - **Openness**: Moderate (open to new tools IF they demonstrate rigor; closed to "vibes-based" development)
  - **Conscientiousness**: Very High (obsessive about audit trails, version history, and decision provenance)
  - **Extraversion**: Low (prefers async communication; scheduled client calls are her limit)
  - **Agreeableness**: Moderate (will collaborate, but guards her processes fiercely)
  - **Neuroticism**: Moderate-High (the Houston contract loss left lasting anxiety about invisible errors)
- **Decision Style**: Evidence-first. She doesn't ask "does this feel right?" She asks "can I prove this is right?" Every major code decision gets a comment block explaining the reasoning, because she's been burned by the alternative.
- **Software Reaction**: When software fails, she doesn't rage-quit. She opens a text file and starts logging: what she did, what happened, what she expected. She treats bugs as depositions. If the software can't explain itself, she drops it.
- **Incomplete Feature Tolerance**: 3/10. She can tolerate missing features if the core is solid. She cannot tolerate features that exist but behave unpredictably. "Half a bridge is worse than no bridge."
- **Cognitive Biases**:
  - **Anchoring**: Over-trusts her first LLM response; subsequent sessions are contaminated by the initial framing.
  - **Availability Heuristic**: The Houston failure is always top of mind — she over-invests in audit trails even for low-stakes projects.
  - **Status Quo Bias**: Once she finds a workflow that works, she resists changing it even when a better option exists. She stayed on ChatGPT 3 months too long after Claude surpassed it for her use case.

### Technology Experience
- **Tools used**:
  - **Python (5 years)**: Her primary language. Comfortable with FastAPI, SQLAlchemy, basic React for frontends. Not a "full-stack" developer — she builds "enough frontend to ship."
  - **ChatGPT / Claude (2.5 years)**: Her "junior paralegal team." She maintains separate accounts for different projects to avoid context contamination.
  - **Cursor (1.5 years)**: Her primary editor since switching from VS Code. She uses it for in-file AI assistance but finds its chat disconnected from her broader project context.
  - **VS Code (6 years)**: Former primary. Still uses for Python debugging.
  - **Arc Browser (1 year)**: For tab management across her LLM sessions.
  - **tmux (3 years)**: Terminal multiplexer. She runs 4-6 panes: dev server, tests, git, and "scratch" terminal.
  - **GitHub (5 years)**: Version control and CI. She commits obsessively — multiple times per hour during active development.
- **Tabs open**: 7-12 tabs organized in Arc Spaces: "Client A," "Product B," "Research." Plus Cursor, plus terminal. She closes tabs aggressively — open tabs are "open loops" and they stress her.
- **Keyboard shortcuts**: Ctrl+Shift+P (command palette addict), Ctrl+` (terminal toggle), Cmd+K (Cursor AI), custom tmux prefix.
- **Screen**: Single 32" 4K monitor. She deliberately chose one screen to force focus.

---

### PART B-0: BEFORE ARACHNE — A Day in Mari's Life

Mari wakes at 6am. Diego is still asleep. She starts the café de olla and opens her MacBook at the standing desk.

**The Triage (6:30am – 8:00am)**:
1. She opens Arc Browser. Three Spaces are waiting: "LegalFlow" (her main SaaS product), "Contrax" (a client project for a Dallas firm), and "Research."
2. She checks Stripe: $847 in overnight MRR. Good. She checks Sentry: 2 new errors in LegalFlow's PDF parser. She opens the error details in one tab and ChatGPT in another.
3. She pastes the stack trace into ChatGPT. The response is plausible but references an API version she's not using. She switches to Claude, re-pastes the same stack trace, adds "I'm using PyPDF2 3.0.1, not the latest." Claude gives a better answer. She copies the fix into Cursor.
4. **Friction**: She's now 30 minutes in and has already copied the same error across two AI tools because neither has the context of her project.

**The Context Split (8:00am – 12:00pm)**:
Diego leaves for school at 7:45. Mari shifts to the Contrax client project.
1. She opens Cursor in the Contrax directory. She opens a NEW ChatGPT conversation because the LegalFlow thread is contaminated with the wrong project context.
2. She needs to refactor the document classifier. She asks ChatGPT for an approach. It suggests a strategy. She starts implementing in Cursor.
3. At 9:30am, Cursor's AI assistant suggests a different approach mid-edit — it conflicts with what ChatGPT recommended. She now has two contradictory plans from two AI tools, neither of which knows about the other.
4. She opens a third tab: Claude. She pastes BOTH suggestions and asks Claude to arbitrate. Claude picks a third option. She laughs bitterly and picks the one she trusts most (Claude's), then spends 45 minutes re-explaining the project context that Claude lost when the conversation hit its limit yesterday.
5. **Friction**: She's maintaining parallel AI "relationships" across three tools. Each one has partial context. She is the only integration layer.

**The Tmux Juggle (12:00pm – 3:00pm)**:
Lunch is a reheated burrito at the desk.
1. She needs to test the Contrax changes. She opens tmux: pane 1 is the dev server, pane 2 is pytest, pane 3 is git, pane 4 is a scratch terminal.
2. Tests fail. She copies the test output, switches to ChatGPT (Contrax thread), pastes it. ChatGPT's context window has truncated — it's lost the first half of their conversation. "Not this again."
3. She manually re-summarizes the project state in the chat. 15 minutes of typing context that the AI should already have.
4. **Friction**: She's the human clipboard, manually ferrying context between tools that have no memory of each other.

**The Evening Merge Panic (3:00pm – 7:00pm)**:
Diego comes home at 3:30. She has until dinner at 6 to ship the Contrax update.
1. She switches back to LegalFlow to check if the morning bug fix is holding. It is. She commits.
2. She goes back to Contrax. She's lost her train of thought. She re-reads the Claude conversation to remember where she left off. The browser scrolls for 40 seconds.
3. She finishes the refactor. She writes tests. She does a PR. But in the PR description, she can't clearly explain WHY she chose the architecture she chose — the reasoning is scattered across a ChatGPT thread, a Claude thread, and Cursor's inline suggestions. She writes "Refactored document classifier per discussion" and feels the Houston ghost.
4. **Friction**: Decision provenance is lost. If the client asks "why this approach?", she'd have to reconstruct it from memory and fragments.

**End-of-Day State**:
At 10pm, after Diego's bedtime, she opens her legal pad. She writes: "Contrax: classifier refactored. LegalFlow: PDF bug patched. TODO: consolidate AI context management."
She's written this TODO before. She writes it every month.

**Emotional Signature**:
ChatGPT is her "Witness #1" — sometimes reliable, sometimes forgets the case. Claude is her "Expert Witness" — sharper, but expensive and requires re-briefing every session. Cursor is her "Court Reporter" — captures what's happening in the moment but doesn't know why. Her terminal is the "Clerk's Office" — where the real records live.

---

### PART B: A DAY IN MARI'S LIFE (Arachne)

Mari opens Arachne at 6:30am. She enters the password and lands on the chat interface.

**First-Screen Reaction**:
Her eyes go to the header: "Amanda." She doesn't know who Amanda is. She looks for a project indicator — which project is this connected to? There's a session sidebar on the left, but no project name, no project context, no status indicator. *"Is this LegalFlow or Contrax? Why don't I know?"*

**The Promising Start (7:00am – 8:00am)**:
She types: "I need to fix a PDF parser bug in LegalFlow. Here's the stack trace..." She pastes the error.
The response streams in. She sees the thinking drawer light up — the 🧠 icon pulses. She clicks it.
The drawer opens. She can see tool usage: "Using tool: mcp_grep_search..." then "Using tool: mcp_read..." *"Okay, this is what I've been wanting. I can see HOW it's thinking, not just WHAT it says."*
The response is good — better than ChatGPT because it actually read her code files. She's impressed.

**Dead-End #1: The Leaking Briefing Room (8:15am)**:
A notification appears in the chat: `[BACKGROUND TASK COMPLETED] ID: bg_4430676d`. Then another: `[SYSTEM REMINDER]` with what looks like internal system instructions.
She stops typing. *"Wait — is this... the system prompt? Can I see the agent's instructions?"* She reads it carefully. It contains internal orchestration details that should never be visible to her.
*"If a client were watching over my shoulder right now, they'd see the puppet strings."*
She feels a chill she hasn't felt since the Houston incident. If Arachne leaks its own internal state, what else might it leak?
**Behavioral result**: She closes the browser tab with the system message visible and screenshots it "for the record." She opens a text file and logs: "8:15am — System prompt/internal messages visible in chat. Security concern. Investigate."

**Dead-End #2: The Silent Question (9:30am)**:
She's working on the Contrax project. She asks the agent to help refactor the document classifier. The agent responds with what appears to be a request for clarification — the thinking drawer shows "question running..." with a loading indicator.
But nothing appears in the chat. No question. No options. No interactive UI.
She waits. 30 seconds. A minute. The thinking drawer still says "question running..."
*"It's asking me something, but I can't hear the question. This is like a court reporter whose mic is off."*
She types "What's the question?" and hits Enter — but the send button is disabled because the agent is still processing. She can type into the input box, but nothing happens when she tries to send.
**No message queuing.** She can compose text while the agent is working, but she can't send it. The thought sits in the input box, aging.
After 90 seconds, the agent appears to move on, having received no answer. It made a default choice that she would not have approved.
*"You just made an architecture decision FOR me because your UI couldn't ask me a question? Absolutely not."*

**Dead-End #3: The Single-Server Prison (10:30am)**:
She wants to switch from working on Contrax to checking LegalFlow's bug fix status. She looks for a project switcher.
There is none.
The dashboard is connected to one OpenCode server. If she wants to work on a different project, she needs to... what? Start a new server? Open a new browser tab? She has no idea.
*"I thought this was supposed to be my command center. But it's a command center for ONE project. My desk has three projects. Where are the other two?"*
She clicks through every menu. The session sidebar shows conversations, not projects. There's no project list, no way to see her portfolio.
**Behavioral result**: She opens Cursor for LegalFlow and keeps Arachne open for Contrax only. She's back to context-splitting across tools — the exact problem Arachne was supposed to solve.

**The Text Wall (11:00am – 12:00pm)**:
The agent's responses are entirely plain text. No markdown rendering. Code snippets arrive without syntax highlighting. Long responses are unformatted walls of text.
*"I'm reading raw transcripts again. In 2026."*
She selects a block of code from the response, copies it, and pastes it into Cursor just to read it with highlighting. The copy-paste loop is back.

**Session End**:
She spent 5 hours in Arachne. She completed one bug fix and half a refactor. The thinking drawer was genuinely useful — she's never seen an AI tool show its reasoning process in real-time. But the gaps are disqualifying for her workflow: no multi-project view, system message leaks, no message queuing, no interactive tools, and plain text output.

She opens her legal pad and writes:
- "Arachne thinking drawer: GOOD. Only tool that shows chain of reasoning."
- "Arachne everything else: needs 6 more months."
- "Going back to Claude + Cursor until project switching exists."

---

### PART C: THE UNCOMFORTABLE QUESTIONS

*Written in Mari's voice — terse, forensic, expecting defensible answers.*

1. *"If Arachne is my command center, why do your own system messages leak into the same pane my clients can see? I got fired once because of invisible contradictions in my output. You're creating visible ones in yours."*

2. *"Why can't I queue instructions while the agent is working? In court, I could type continuously at 240 words per minute while the judge was still talking. Your interface makes me wait like I'm on hold with the IRS."*

3. *"Your planner asked me a question through the Question tool, but it never rendered in the UI — I saw 'question running...' in the drawer and nothing in chat. The agent then made a default architecture decision without my input. How is that acceptable?"*

4. *"Where is the project home page? I have three active codebases. Your dashboard shows one. I can't even tell WHICH one it's showing without reading the conversation history. My legal pad has better project management than this."*

5. *"Why is code output rendered as plain text in 2026? No syntax highlighting, no markdown, no formatting. I have to copy your output into Cursor just to read it. That's not an AI interface — it's a terminal from 1987."*

6. *"The thinking drawer is the best feature I've seen in any AI tool — ever. But it only shows the CURRENT session's thinking. When I dispatch work to another agent, I can't see what that agent is doing. Why can I only see one room of my own house?"*

7. *"You say this is 'orchestration,' but there's no audit trail for agent decisions. I can't go back and see WHY the planner chose a particular architecture, what alternatives it considered, or when the decision was made. For someone who lost $45,000 because of untraceable AI decisions, this is a dealbreaker."*

---

### PART D: SCORECARD

| Capability | Score (0-5) | Notes |
|------------|-------------|-------|
| Project Management | 1 | No project home, no multi-project view, no project switching. Single-server prison. |
| Agent Interaction | 2 | Chat works. Thinking drawer is excellent. But Question tool doesn't render, no message queuing, system messages leak. |
| Visibility & Control | 2 | Thinking drawer shows current-session reasoning (great), but no cross-agent visibility, no decision audit trail, no agent status dashboard. |
| Onboarding / Learnability | 2 | No documentation visible in UI. No tooltips. "Amanda" branding unexplained. Login flow works but then drops you into a single chat with no orientation. |
| Adoption Likelihood | 1 | She would use the thinking drawer feature daily if it existed in Claude. But she won't adopt Arachne as primary interface until multi-project and message queuing exist. Currently reverts to Claude + Cursor. |
| **Average** | **1.6** | **FAIL** — A genuinely innovative thinking drawer trapped inside a single-project, single-session interface that cannot serve a multi-project solo operator. |

---

## PERSONALITY QUICK REFERENCE

**Name**: Marisol "Mari" Quintero
**Archetype**: The Forensic Operator
**Core Drive**: Decision provenance — she needs to trace every choice back to its origin
**Screen-Loading Behavior**: The Forensic Scanner — eyes go to timestamps, provenance indicators, and status badges before reading content
**Physical Habit**: Clicks pen 3 times before sending high-stakes prompts; writes prompt IDs on a legal pad
**Internal Monologue Voice**: Terse, forensic, evidence-first
  - *"Show me who decided this and when."*
  - *"If I can't replay the chain, it didn't happen."*
  - *"Pretty output is irrelevant; defensible output is everything."*
**Relationship to Technology**: Trusts systems that preserve evidence, not charisma
**Emotional Arc**: The Vindicated Skeptic — was burned by untraceable AI decisions, will adopt only tools that prove auditability
**Legacy Tool Signatures**:
  - ChatGPT: "Witness #1" — sometimes reliable, sometimes forgets the case
  - Claude: "Expert Witness" — sharper, but requires re-briefing every session
  - Cursor: "Court Reporter" — captures the moment but doesn't know the why
  - Terminal: "Clerk's Office" — where the real records live
**Incomplete Feature Tolerance**: 3/10
**MBTI**: ISTJ

### Calibration Markers

| Marker | Target (1-10) |
|--------|--------------|
| Forensic Rigor | 9 |
| Patience with Ambiguity | 3 |
| Tool Loyalty (once earned) | 8 |
| Context-Switching Anxiety | 7 |
| Audit Trail Dependency | 10 |

---

## CROSS-DOMAIN METAPHOR

Arachne, for Mari, is a **surgical instrument table during a long operation**.

The planner is the circulating nurse. The executor is the surgeon's hand. The evaluator is anesthesia monitoring vitals. Before Arachne, instruments are scattered across three rooms (ChatGPT, Claude, Cursor), and every handoff is someone shouting through a hallway. With Arachne, the table finally exists — but right now some clamps are mislabeled (system-message leaks), one tray slot is missing (Question tool UI), and there's no clear passing order (no message queue). The operation can still proceed, but every extra reach increases risk.

Mari doesn't want "faster surgery." She wants **fewer avoidable mistakes under pressure**.

---

## MIGRATION COMPLETENESS TABLE — Solo Builder

| Workflow Step | Legacy Tool | Time (Legacy) | Arachne Equivalent | Status | Time (Arachne) | Delta | Legacy Pain (1-5) | Innovation Opportunity |
|---------------|-------------|---------------|---------------------|--------|-----------------|-------|-------------------|----------------------|
| Bug triage across projects | Sentry + ChatGPT + Cursor | 45 min | Chat + thinking drawer | **Partial** | 30 min | +15 min | 3 | Reimagine (project-aware triage) |
| AI-assisted code refactor | Claude + Cursor | 2 hours | Chat with agent | **Partial** | 1.5 hours | +30 min | 4 | Replicate (but needs markdown) |
| Context transfer between AI tools | Manual copy-paste | 15 min per switch | Orchestrator dispatch | **Missing** | N/A | N/A | 5 | Reimagine (unified context) |
| Multi-project status check | GitHub + Stripe + Sentry tabs | 20 min | Project home page | **Missing** | N/A | N/A | 4 | Reimagine (dashboard overview) |
| Decision audit trail | Legal pad + chat history | 30 min to reconstruct | Agent decision log | **Missing** | N/A | N/A | 5 | Reimagine (automatic provenance) |
| Agent reasoning visibility | Not possible | N/A | Thinking drawer | **Replaced** | Real-time | ∞ savings | 5 | Already innovated |
| Interactive agent clarification | Manual back-and-forth | 5 min per question | Question tool | **Broken** | N/A | N/A | 3 | Replicate (render in UI) |
| Code output readability | Cursor syntax highlighting | Instant | Plain text output | **Broken** | N/A | N/A | 2 | Replicate (markdown rendering) |
| Project switching | Open new browser/terminal | 2-3 min per switch | Project selector | **Missing** | N/A | N/A | 4 | Reimagine (in-UI switching) |
| Message queuing during agent work | Type in separate window | 10 sec | Not possible | **Missing** | N/A | N/A | 3 | Replicate (input queue) |
