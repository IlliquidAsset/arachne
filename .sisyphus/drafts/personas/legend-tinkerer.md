# Persona Legend: The Tinkerer

**Product**: Arachne — AI Agent Orchestration Platform
**Version**: 0.1.0 (Current State Assessment)
**Methodology**: Persona-Driven Development (PDD), CIA-Legend Depth

---

## PERSONA 4: CALVIN "CAL" IBARRA — The Tinkerer (Weekend Hobbyist)

### PART A: THE LEGEND

### Identity & Background
- **Name**: Calvin "Cal" Ibarra, age 37.
- **Education**: Associate's degree in Health Sciences from Pima Community College (2009). Certified Registered Central Service Technician (CRCST) through HSPA (2010). No CS coursework. No bootcamp. No degree in anything related to software.
- **Career Arc**:
  - **Banner-University Medical Center, Tucson (2010–2016)**: Sterile processing technician. He decontaminates, inspects, assembles, and sterilizes surgical instrument trays — the sets of clamps, retractors, forceps, and scalpels that surgeons rely on being perfect and complete every time. He processes 40–60 trays per shift. A missing instrument can delay surgery. A contaminated one can kill. He developed an obsessive relationship with checklists, traceability, and "everything in its place."
  - **Tucson Medical Center (2016–Present)**: Senior sterile processing technician and informal team lead. He trains new hires. He wrote the department's tray assembly reference guide — a 47-page laminated binder with photo-verified layouts for every tray type. During COVID, overtime hours doubled. Tray miscount rates tripled because of staff fatigue. In November 2020, he built his first script: a Python barcode lookup tool that cross-referenced instrument barcodes against tray manifests. He wrote it in 3 weekend sessions using YouTube tutorials and Stack Overflow. It reduced miscounts by 60%. His supervisor said "nice work" and moved on. Cal realized he'd built something genuinely useful in 12 hours of hobby time, and the feeling was better than anything in his day job.
  - **Weekend Tinkerer (2021–Present)**: He now codes Friday evenings and Saturday mornings — roughly 6–8 hours per week. His primary project: a "desert birdcam" system. A Raspberry Pi 4 with a motion-triggered camera captures photos and 10-second clips of birds at a feeder in his backyard. A local Python service runs species classification (initially a fine-tuned MobileNet, now experimenting with local LLM-powered identification). A tiny web dashboard displays daily sightings with timestamps, species tags, and a running "life list." He's identified 34 species so far. The Gila Woodpecker is his favorite. He also maintains the barcode tool for work (though nobody asked him to) and occasionally builds small automation scripts for things that annoy him — a water bill tracker, a sunset alert for photography walks, a workout log that syncs to a spreadsheet.
- **Why Self-Hosted AI Specifically**: Cal works in patient privacy. HIPAA is not a concept to him — it's his daily reality. When he sees a cloud AI service, he thinks "where does that data go?" When he read about self-hosted AI on r/selfhosted, his reaction was: "Wait — the AI runs on MY machine? Nothing leaves? That's the only way I'd trust it." He doesn't care about self-hosting for ideological reasons. He cares because he spent 15 years in an environment where data leaving the controlled zone means someone could get hurt.
- **Defining Failure**: In March 2023, Cal found a Reddit post about a "5-minute local AI setup" for image classification — exactly what his birdcam needed. He cleared his Friday evening. He downloaded the repo. The README said: `docker compose up`. He didn't have Docker. He installed Docker Desktop. It needed a WSL2 update (he was on Windows at the time). The WSL2 update required a BIOS setting change. The BIOS change required a restart. After restart, Docker started but the compose file referenced a CUDA version his GPU didn't support. He spent 2 hours finding compatible driver versions. At 1:43am, he finally got one prompt through. The response was mediocre. He went to bed. The next morning, he sat on his back patio with coffee, watched a Vermilion Flycatcher land on the feeder, and thought: "I could have spent last night photographing that bird instead of fighting Docker permissions." He now evaluates every tool by one metric: **time-to-first-real-output.** If it takes longer than 20 minutes to get from install to useful result, he uninstalls. He calls this the "Friday Night Rule." **Lesson**: "My time is not a resource. It's the resource. Every minute spent configuring is a minute I didn't spend building."
- **Defining Triumph**: In October 2024, his birdcam system caught a Rufous-backed Robin — an extremely rare visitor to southern Arizona. His species classifier correctly tagged it. He posted the timestamped photo and classification log to r/birding. The post got 2,400 upvotes and a DM from an ornithology PhD student at University of Arizona who wanted to collaborate on acoustic identification. Cal printed the screenshot and pinned it above his desk next to the tray assembly guide. It was the first time his hobby and his day-job rigor produced something that mattered to someone else.
- **Why Arachne**: He doesn't want AI to write code for him. He wants a **local AI co-pilot that remembers his projects** — something that knows about his birdcam codebase, his classification pipeline, and his Raspberry Pi constraints without him re-explaining the setup every Friday. He found Arachne through a YouTube video titled "Self-Hosted AI Orchestration: Your Own Claude, Running Locally." The title was exactly right. He bookmarked it and planned to set it up the following weekend.
- **Surprising Detail**: He labels his home tool drawers with the same color-coded tape system used for OR instrument sets at the hospital. Green tape: electronics and soldering. Blue tape: woodworking. Red tape: camera equipment. His girlfriend Elena calls his garage "the sterile zone" as a joke, but he doesn't think it's funny — it's accurate.

### Personal Life
- **Family**: Unmarried. Lives with his girlfriend Elena Reyes (34, dental hygienist) in a 2-bedroom house in Tucson's Sam Hughes neighborhood. No kids. They've talked about it. "After the birdcam is done" has become a running joke that Elena no longer finds funny. His parents (retired, Marana) come for Sunday dinner most weeks. His father Manuel was a machinist at Raytheon for 28 years — Cal's sense of precision is inherited.
- **Routine**:
  - **5:30am (weekdays)**: Up. Hospital scrubs. 12-hour shift 3 days a week (Mon/Wed/Fri). The other two weekdays he does errands, grocery runs, and "life admin."
  - **Friday 8:30pm**: The ritual. Elena goes to her friend's house for wine night. Cal makes tea (yerba mate, loose leaf). He puts on noise-canceling headphones and a lo-fi train ambience playlist. He sets a 3-hour sand timer on the desk. He flips his phone face-down into a ceramic bowl Elena made in a pottery class. He writes two sticky notes: one says "BUILD:" with tonight's goal, the other says "DONE BY 11:30." He opens the laptop. The sand timer is non-negotiable — when it runs out, the session is over regardless of state.
  - **Saturday 7:00am–10:00am**: Second tinkering window. Coffee on the patio first, checking the birdcam overnight captures. Then 2–3 hours of coding before Elena wakes up and they do weekend things.
  - **Sunday**: No code. Family dinner. Birdwatching walk if weather permits.
- **Technology**: Competent but self-taught, with gaps. He switched from Windows to a Mac Mini M2 in 2024 after the Docker incident ("I'm done fighting operating systems"). He can write Python, basic JavaScript, and shell scripts. He can SSH into his Raspberry Pi. He understands git at a surface level — commit, push, pull, but not branching strategies. He's comfortable with the terminal but doesn't live in it. He's never used tmux. He's never configured a reverse proxy. He knows what Bun is because he read about it on Hacker News, but he's never used it.
- **Workspace**: A corner desk in the spare bedroom. Mac Mini connected to a 27" Samsung monitor. A mechanical keyboard (Keychron K2) that Elena bought him for Christmas. The Raspberry Pi birdcam server sits on a shelf next to the window, connected to the yard camera via a 15-foot USB cable. The sand timer. The ceramic phone bowl. A small corkboard with: the Rufous-backed Robin screenshot, a photo of his father's machining tools, and an index card that says "KEEPERS / TOURISTS" — his system for logging tools that earned permanent residence vs. tools that were uninstalled after one session.
- **Non-Work Stress**: The hospital is understaffed. His department lost 3 techs in 2024 and hasn't replaced them. He's working mandatory overtime roughly once a month, which occasionally steals a Saturday morning session. When this happens, he's quietly furious for the rest of the weekend — not at the hospital, but at the lost time.

### Behavioral Psychology
- **MBTI**: ISFP ("The Adventurer"). Hands-on, present-focused, values-driven, learns by doing not by reading docs. Strong aesthetic sensibility — he cares about how things look and feel, not just whether they work. Quiet but deeply opinionated. He won't argue about tools; he'll just stop using the one he doesn't like.
- **Big Five**:
  - **Openness**: Moderate-High (fascinated by new tools and techniques, but only if he can start using them immediately)
  - **Conscientiousness**: High in his domain (instrument trays, birdcam quality) but Low for tasks he considers overhead (config files, environment setup, reading docs longer than one scroll)
  - **Extraversion**: Low (codes alone, prefers async, his ideal collaboration is a Reddit thread)
  - **Agreeableness**: Moderate (patient with people, impatient with systems that waste his time)
  - **Neuroticism**: Low-Moderate (generally calm, but the Docker incident and lost Saturday mornings create sharp spikes of frustration)
- **Decision Style**: Haptic. He wants to touch and try before deciding. He doesn't read comparison articles. He doesn't watch 45-minute review videos. He installs the tool, attempts one real task, and decides in 20 minutes. His judgment is physical — it either feels right in his hands or it doesn't.
- **Software Reaction**: He has a three-strike rule. Two recoverable errors and he stays. Third error that sends him to documentation before he's gotten any output — he uninstalls. He logs the result on a small index card: tool name, date, "KEEPER" or "TOURIST," and a one-sentence reason. He has a box of 40+ cards. Most are tourists.
- **Incomplete Feature Tolerance**: 5/10. He can tolerate rough edges if the core loop works — get in, build something, get out. He cannot tolerate setup friction or configuration complexity. "I don't care if it's ugly. I care if it takes 45 minutes before I can use it."
- **Cognitive Biases**:
  - **Peak-End Rule**: He judges tools by the worst moment and the final moment of his session. A great first hour erased by a terrible last 20 minutes = "tourist."
  - **Sunk Cost Immunity**: Unlike most people, he has NO sunk cost problem. He will abandon a tool at minute 19 of a 20-minute setup if it feels wrong. His time is too scarce for "let me just finish the setup."
  - **Endowment Effect**: Once a tool earns "KEEPER" status, he becomes fiercely loyal and will defend it on Reddit threads with disproportionate passion.

### Technology Experience
- **Tools used**:
  - **Python (4 years)**: His primary and nearly only language. Comfortable with basic Flask, OpenCV, requests, pandas. He writes functional code, not elegant code. His functions are long. His variable names are descriptive to the point of comedy (`motion_detected_bird_photo_path`).
  - **VS Code (3 years)**: His editor. He uses it as-is — default settings, default theme, maybe 3 extensions. He's never customized a keyboard shortcut.
  - **ChatGPT (1.5 years)**: His "pair programmer." He pastes code, asks "why doesn't this work," and follows the instructions. He's learned to distrust long explanations and ask for "just the code."
  - **Raspberry Pi OS (3 years)**: He can SSH in, run scripts, check logs. He's comfortable with basic Linux commands but couldn't configure nginx from scratch.
  - **Git/GitHub (2 years)**: He commits and pushes. He's never made a branch. He's never resolved a merge conflict. His commit messages are all "update" or "fix."
  - **Reddit (10 years)**: His discovery layer. r/selfhosted, r/homelab, r/raspberry_pi, r/birding. This is where he finds tools, validates approaches, and occasionally evangelizes keepers.
- **Tabs open**: 4-6. VS Code, ChatGPT, one reference page (Stack Overflow or docs), the birdcam dashboard, maybe Reddit.
- **Keyboard shortcuts**: Cmd+S (compulsive saver), Cmd+Z (heavy user), Cmd+` (terminal toggle in VS Code). That's about it.
- **Screen**: Single 27" Samsung monitor from the Mac Mini. He tried a dual-monitor setup and returned the second monitor within a week — "too many things looking at me."

---

### PART B-0: BEFORE ARACHNE — A Day in Cal's Life

**Friday 8:30pm — The Setup Ritual**:

Elena leaves for wine night at 8:15. Cal hears the door close. He exhales.

He walks to the kitchen. Fills the kettle. While it heats, he goes to the spare bedroom. He flips his phone face-down into the ceramic bowl. He puts on the Bose QC45s. He opens Spotify: "Lofi Train Sounds." He tears two sticky notes from the pad:

- **BUILD**: "Add nighttime IR mode to birdcam classification pipeline"
- **DONE BY 11:30**

He sticks them to the monitor bezel. He flips the sand timer. Three hours. Start.

1. He opens VS Code. The birdcam project is already loaded — he never closes it. He reads the last few lines of code he wrote last Saturday. It takes him 8 minutes to remember where he left off. He's lost context from 6 days of not touching this.
2. He opens ChatGPT. New conversation. He types: "I have a Python script that classifies bird photos using MobileNet. I want to add a mode for infrared photos captured at night. The camera switches to IR mode automatically after sunset. Here's my current classify function..." He pastes 40 lines of code.
3. ChatGPT responds with a reasonable approach. Cal starts implementing. He hits a problem — the IR images have different color channels and his preprocessing pipeline assumes RGB.
4. He goes back to ChatGPT: "The IR images are grayscale. How do I convert them to 3-channel so MobileNet can process them?" ChatGPT gives two options. He picks the simpler one.
5. **Friction**: 45 minutes in, he's spent 15 minutes re-explaining his project to ChatGPT. It doesn't know about his camera setup, his Pi constraints, his file naming convention, or the fact that his MobileNet is a custom fine-tuned version. Every session is groundhog day.

**Friday 9:30pm — The Flow (and the Loss)**:

1. He's coding now. Real flow. The IR preprocessing works. He's testing with sample images he captured last week. Two of three classify correctly. He's optimizing the threshold.
2. He hits a dependency issue. OpenCV's IR handling needs a specific build flag that his Pi doesn't have. He Googles. Stack Overflow has an answer from 2021 that references an older OpenCV version.
3. He opens a NEW ChatGPT conversation (the previous one is now 30 messages deep and responses are slower). He explains the OpenCV issue from scratch. Again. "I'm running OpenCV 4.8.1 on a Raspberry Pi 4 with Python 3.11..."
4. ChatGPT suggests a workaround. It involves installing opencv-contrib-python. Cal tries `pip install opencv-contrib-python` on the Pi via SSH. It starts compiling from source. Estimated time: 47 minutes.
5. **Friction**: He's now waiting. The sand timer keeps flowing. He has 1.5 hours left. He could work on something else, but his brain is in IR-classification mode. He opens Reddit. He reads r/birding for 20 minutes. When he comes back, the install failed — insufficient memory on the Pi.

**Friday 10:45pm — The Surrender**:

1. He's spent 25 minutes trying to fix the memory issue. He's tried a swap file. He's tried cross-compiling. Each attempt involves re-explaining the context to ChatGPT in a new conversation because the old one is "too slow now."
2. The sand timer has 40 minutes left. He looks at the two sticky notes. BUILD: "Add nighttime IR mode." He's not done. He's not even close. He spent 2 hours and 15 minutes making progress, then the last 45 minutes were consumed by a dependency rabbit hole.
3. He peels the BUILD sticky note off the monitor. He writes "→ SAT AM" on it and sticks it to his keyboard.
4. He flips the sand timer face-down (his signal: session ended early). He takes off the headphones. He retrieves his phone from the bowl. Elena texted: "Home by 11:30. Want ice cream?" He responds: "Yes."

**End-of-Day State**:
He got 2 hours of productive work out of a 3-hour window. 30 minutes were lost to context re-establishment with ChatGPT. 45 minutes were lost to a dependency spiral. The IR mode is half-done. He'll try to finish Saturday morning, but he'll have to re-establish context again.

He opens the index card box. He writes:
- **ChatGPT** — KEEPER (provisionally) — "Fast answers, zero memory. Goldfish brain."

**Emotional Signature**:
ChatGPT is "The Friendly Amnesiac" — helpful every time, but every time is the first time. VS Code is "The Workbench" — solid, reliable, never surprising. The Raspberry Pi is "The Patient" — alive but fragile, always needing something. Stack Overflow is "The Archive" — answers exist but are often from a different era. Reddit is "The Bar" — where he goes to commiserate and discover.

---

### PART B: A DAY IN CAL'S LIFE (Arachne)

Cal bookmarked the YouTube video two weeks ago: "Self-Hosted AI Orchestration: Your Own Claude, Running Locally." Tonight is the night.

**Friday 8:30pm — The Setup Ritual (Modified)**:

Same ritual. Tea. Headphones. Phone in bowl. But tonight's sticky notes are different:

- **BUILD**: "Install Arachne. Test with birdcam project."
- **DONE BY 11:30**

He flips the sand timer. Three hours.

**The Installation (8:35pm – 9:25pm)**:

1. He opens the GitHub repo. The README is comprehensive. It mentions: Bun, TypeScript, monorepo, OpenCode plugin. He knows what TypeScript is (vaguely). He's never used Bun. He's never heard of OpenCode.
2. He needs to install Bun first. He runs the curl command. It works. `bun --version` — 1.2.x. Good. 4 minutes.
3. He clones the repo. `bun install`. Dependencies install. It takes 90 seconds. He's cautiously optimistic.
4. He reads the setup instructions. There are multiple packages. He needs to configure... something. He's not sure what. The docs mention "OpenCode server," "orchestrator plugin," "dashboard." He doesn't know which one to start with. He doesn't know what an "orchestrator plugin" is.
5. He tries `bun run dev` from the root. An error. He tries `bun run start`. Another error. He opens the `package.json`. There are 15 scripts. He doesn't know which one launches the thing he saw in the YouTube video.
6. He spends 20 minutes reading docs, trying different commands, and Googling error messages. He finally gets the dashboard running on localhost:3000 and an OpenCode server on port 4096.
7. **50 minutes to install and configure**. His Friday Night Rule says 20 minutes max. He's already in violation. But the YouTube video was so compelling that he pushes through.

**The First Screen (9:25pm)**:

He opens http://localhost:3000. He logs in with the password he set during config.
He sees: a chat interface. A sidebar with "Sessions." A header that says "Amanda."
*"Who's Amanda?"*
He types: "Hello, I'm Cal. I build a bird species classifier that runs on a Raspberry Pi. Can you help me add infrared photo support?"
The response is... good. Really good. It asks clarifying questions about his setup. It understands Raspberry Pi constraints. It references OpenCV directly.
He clicks the thinking drawer. He sees tool usage: `mcp_read`, `mcp_grep_search`. *"It's reading my files? Wait — which files? Is it looking at the birdcam repo?"*
He realizes the OpenCode server is pointed at the Arachne repo directory, not his birdcam project. The agent is reading Arachne's own source code, not his.
*"How do I point this at my project?"*

**Dead-End #1: The Config Rabbit Hole (9:40pm)**:

He needs to reconfigure the server to point at his birdcam directory. He doesn't know how. The dashboard has no "change project" option. He goes back to the terminal. He reads the config files. He finds what looks like a project path setting. He changes it. He restarts the server. The dashboard reconnects.
He types: "Can you see my birdcam project files now?"
The agent confirms — it can see the Python files. It starts analyzing his classification pipeline.
*"Okay. That took 15 more minutes of config. I'm now 65 minutes into setup. But it's working."*
**Total time before first real interaction with his own project: 65 minutes.**
The sand timer shows 1 hour 55 minutes remaining. He's lost a third of his session to setup.

**Dead-End #2: The Blocked Momentum (10:00pm)**:

The agent is helping him with the IR preprocessing. It's better than ChatGPT — it actually read his code files and understands the pipeline structure. He doesn't have to re-explain the project. This is new. This is what he wanted.
He asks: "What about the OpenCV dependency issue? My Pi doesn't have opencv-contrib compiled with the right flags."
The agent starts working on a detailed response. The thinking drawer shows multiple tool calls.
While it's working, Cal has an idea. He wants to type: "Also, can you check if there's a lighter alternative to opencv-contrib for IR processing?"
The send button is disabled. The agent is still processing. He can type into the input — the textarea accepts keystrokes — but hitting Enter does nothing. The thought just sits there, unsendable.
He waits. 30 seconds. 45 seconds. A minute.
His idea is evaporating. He's an ISFP — his insights are fleeting, sensory, in-the-moment. If he can't capture them immediately, they dissolve. He reaches for a sticky note and writes the question down by hand, annoyed.
*"The whole point of an AI assistant is that it's faster than me. But I'm literally writing notes on paper because your send button is grayed out."*
The agent finishes. Good response. He types his follow-up question from the sticky note. But the phrasing is different now — he's reconstructing the thought, not expressing it. The energy is gone.
**Behavioral result**: He now types shorter, more cautious prompts because he's afraid of being blocked if the agent takes too long. His interaction pattern has degraded from conversational to transactional.

**Dead-End #3: The System Message Intrusion (10:30pm)**:

He's deep in the IR pipeline work when a message appears in the chat that looks different from the agent's responses:
```
[BACKGROUND TASK COMPLETED] ID: bg_7742ab1e
```
Followed by what appears to be system instructions — internal orchestration text about agent roles and capabilities.

Cal stops. He reads it slowly. His sterile processing brain activates — the part that checks instrument trays for contamination. Something that should be internal is now external. A boundary has been breached.

*"In my work, if a sterile field is broken, we stop the procedure. Period. You just showed me your internal state in my conversation. If boundaries leak here, what else leaks? Does my project data leak? Do other users' contexts leak?"*

He doesn't know that there are no other users — this is self-hosted. But the principle is visceral and immediate. If the system can't maintain the boundary between "system messages" and "user messages," he doesn't trust it to maintain any boundary.

**Behavioral result**: He closes the browser tab. He opens his index card box. He writes:
- **Arachne** — TOURIST — "65 min to first real output. Input blocked during agent work. System boundaries leak. Promising core, hostile setup."

He looks at the sand timer. 55 minutes remain. He opens VS Code and his ChatGPT tab. He spends the rest of the session working on the IR pipeline the old way — re-explaining context to ChatGPT, fighting the same dependency issue. It's worse than Arachne would have been. But it's predictable.

Elena comes home at 11:20. "How was coding night?"
"Promising. Frustrating. I'll try again in a few months."
He puts the Arachne index card in the TOURIST side of the box. But he doesn't throw it away. He puts it at the front.

---

### PART C: THE UNCOMFORTABLE QUESTIONS

*Written in Cal's voice — patient, hands-on, measuring every word against his limited time.*

1. *"Why does this feel like it's built for someone with a company sprint calendar? I have three hours and one brain. Your setup took sixty-five minutes. I build surgical instrument trays faster than I could get your tool running."*

2. *"Can I get to first useful output before I touch a config file, or is this another Friday-night installer simulator? I've got a box of 40 index cards that say 'TOURIST' on them. Every one started with a promising README."*

3. *"If the agent is thinking, why can't I queue my next thought? My best ideas come in the middle of something else. They last about 8 seconds. Your locked input box is an idea graveyard."*

4. *"Why did your system show me its own internal messages? I work in sterile environments. When a barrier fails, we don't rationalize it — we stop the procedure. You showed me your system prompt in my chat. That's a broken sterile field."*

5. *"I code 6 hours a week. That's 312 hours a year. You took 65 of my minutes for setup — that's 1.7% of my annual coding time gone. Do you understand what that number means to someone who isn't paid to do this?"*

6. *"Your thinking drawer showed me the agent reading my code files. That was the best moment — better than anything I've experienced with ChatGPT. Then the input locked, the system messages leaked, and the moment was over. Why does your best feature live next to your worst ones?"*

7. *"I want to use this for my birdcam project AND my workout tracker AND my water bill script. But your dashboard connects to one project. Do you expect hobbyists to have one hobby?"*

---

### PART D: SCORECARD

| Capability | Score (0-5) | Notes |
|------------|-------------|-------|
| Project Management | 0.5 | No multi-project support. Changing projects requires server reconfiguration and restart. No project home. No way to see multiple hobby projects in one interface. Barely above zero because you CAN connect to one project. |
| Agent Interaction | 3 | When it works, it's the best AI coding experience he's had — the agent actually reads his code files. But no message queuing kills flow for someone whose ideas are fleeting. System message leaks undermine trust. |
| Visibility & Control | 2 | Thinking drawer is genuinely revelatory — seeing the agent navigate his codebase in real-time. But limited to current session, and the system message leaks mix signals with noise. |
| Onboarding / Learnability | 1 | 65 minutes to first useful interaction. The README is comprehensive but assumes developer-hours, not hobbyist-hours. No quick-start path for "I just want to talk to my project." No guided setup wizard. |
| Adoption Likelihood | 1.5 | Classified as "TOURIST" but placed at the front of the box. He saw genuine value (code-aware agent, thinking drawer) that he can't get elsewhere. He WILL check back in 3-6 months. But he won't try again until setup is under 15 minutes and message queuing exists. |
| **Average** | **1.6** | **FAIL** — Arachne's code-aware AI interaction is genuinely superior to anything Cal has used, but the 65-minute setup cost, blocked input, and system message leaks make it incompatible with a 3-hour hobby window. The product assumes its user has all day. Cal has until 11:30. |

---

## PERSONALITY QUICK REFERENCE

**Name**: Calvin "Cal" Ibarra
**Archetype**: The Sacred-Time Builder
**Core Drive**: Time-to-value — every minute spent not-building is a minute stolen from a finite, precious window
**Screen-Loading Behavior**: The 20-Minute Stopwatch — mentally starts a countdown from first install command; if he hasn't gotten useful output by minute 20, the tool is on borrowed time
**Physical Habit**: Flips a 3-hour sand timer at session start; writes BUILD/DONE sticky notes on monitor; puts phone face-down in a ceramic bowl; logs tools as "KEEPER" or "TOURIST" on index cards
**Internal Monologue Voice**: Patient, hands-on, measuring time in minutes not features
  - *"Is this building time or setup time?"*
  - *"Three hours. That's all I get. Spend them wisely."*
  - *"If I can't use it by the time the kettle cools, it's a tourist."*
**Relationship to Technology**: Installs, attempts one real task, decides in 20 minutes. No reviews, no comparisons — only direct experience.
**Emotional Arc**: The Reluctant Tourist — saw genuine promise, classified it as tourist anyway because setup cost was incompatible with his time constraints. Will check back.
**Legacy Tool Signatures**:
  - ChatGPT: "The Friendly Amnesiac" — helpful every time, but every time is the first time
  - VS Code: "The Workbench" — solid, reliable, never surprising
  - Raspberry Pi: "The Patient" — alive but fragile, always needing something
  - Stack Overflow: "The Archive" — answers exist but are often from a different era
  - Reddit: "The Bar" — where he goes to commiserate and discover
**Incomplete Feature Tolerance**: 5/10
**MBTI**: ISFP

### Calibration Markers

| Marker | Target (1-10) |
|--------|--------------|
| Setup Friction Sensitivity | 10 |
| Time-to-Value Obsession | 10 |
| Sunk Cost Immunity | 9 |
| Aesthetic Sensitivity (tool feel) | 7 |
| Patience with Documentation | 3 |

---

## CROSS-DOMAIN METAPHOR

Arachne, for Cal, is **a surgical instrument tray that arrives unassembled**.

Every clamp, retractor, and forcep is high-quality — individually, they're better than what he has. The thinking drawer is a better retractor than ChatGPT's. The code-aware agent is a sharper scalpel than anything in his current kit. But the tray arrived as loose parts in a cardboard box with a 47-step assembly guide.

In the hospital, instrument trays arrive pre-assembled, sterilized, and verified. The surgeon opens the wrap and operates. In Cal's hobby world, the equivalent would be: install, point at project, start building. Instead, he spent 65 minutes assembling the tray — and by the time it was ready, half his OR time was gone.

He doesn't doubt the instruments. He doubts whether he'll ever have time to assemble them before the patient — his weekend project — needs them.

---

## MIGRATION COMPLETENESS TABLE — Tinkerer

| Workflow Step | Legacy Tool | Time (Legacy) | Arachne Equivalent | Status | Time (Arachne) | Delta | Legacy Pain (1-5) | Innovation Opportunity |
|---------------|-------------|---------------|---------------------|--------|-----------------|-------|-------------------|----------------------|
| Session context restoration | Re-explaining project to ChatGPT | 15 min per session | Code-aware agent | **Replaced** | 0 min (reads files) | +15 min saved | 5 | Already innovated |
| Tool installation + config | Varies per tool | 20 min (his limit) | Bun install + config | **Broken** | 65 min | -45 min | 5 | Reimagine (one-command setup, wizard) |
| AI code assistance | ChatGPT (stateless) | Immediate (but context-free) | Chat with agent | **Partial** | Good when working | ~same | 3 | Extend (persistent project memory) |
| Idea capture during AI processing | Sticky notes / second tab | 10 sec | Message queue | **Missing** | N/A | N/A | 3 | Replicate (input queue) |
| Multi-project switching | Close/open VS Code directory | 2 min | Server reconfiguration | **Broken** | 15 min | -13 min | 3 | Reimagine (project selector) |
| Dependency troubleshooting | ChatGPT + Stack Overflow | 30 min avg | Agent with codebase context | **Partial** | 20 min | +10 min | 4 | Extend (Pi-aware dependency resolution) |
| Agent reasoning visibility | Not possible | N/A | Thinking drawer | **Replaced** | Real-time | ∞ savings | 4 | Already innovated |
| Build output readability | VS Code syntax highlighting | Instant | Plain text output | **Broken** | N/A | N/A | 2 | Replicate (markdown/code rendering) |
| Weekend progress continuity | Memory + sticky notes | 8 min to remember last state | Persistent sessions | **Partial** | 5 min | +3 min | 4 | Extend (session summaries) |
| System trust / boundary integrity | N/A (ChatGPT is cloud) | N/A | System message isolation | **Broken** | N/A (trust breached) | N/A | 5 | Fix (filter system messages from chat) |
