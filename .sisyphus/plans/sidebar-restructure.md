# Sidebar Restructure: Chat-First Layout

## TL;DR

> **Quick Summary**: Restructure the Arachne dashboard from project-grid-as-homepage to ChatGPT-style layout where chat is the primary interface and projects live in the sidebar above a flat chat list.
>
> **Deliverables**:
> - `/` redirects to `/chat` (chat is the landing page)
> - `/projects` page with full project grid (accessible from sidebar)
> - Sidebar rewritten: projects section at top, flat chat list below (matching ChatGPT layout)
> - All navigation references updated (no broken links)
>
> **Estimated Effort**: Short (4-5 tasks, ~1 hour execution)
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Task 1 → Task 3 → Task 4 → Task 5

---

## Context

### Original Request
User said: "now the interface doesn't have chat. That should be the #1 function. Projects page will only popup when 'Projects' in the sidebar (not the expand button) is clicked. Projects will be grouped above chats in the sidebar. exactly like this [ChatGPT screenshot]"

### Interview Summary
**Key Discussions**:
- Chat must be the #1 function — landing page redirects to `/chat`
- Projects live in sidebar above chats, matching ChatGPT's layout exactly
- "Projects" header in sidebar → navigates to `/projects` (full grid)
- Individual project names → navigate to `/projects/[id]`
- Show first ~5 projects, "See more" link for the rest
- Flat chat list (not grouped by project)

**Research Findings**:
- `useProjects` hook already exists — returns `projects`, `isLoading`, `createProject`, `refetch`
- `useSessions` hook returns both `sessions` (flat) and `groupedSessions` (grouped by directory)
- `chat/page.tsx` currently only destructures `groupedSessions` — needs to also pass `sessions` (flat)
- `SessionSidebar` and `MobileSidebar` share the same `SessionList` component — one rewrite covers both
- `projects/[id]/page.tsx` has two `router.push("/")` calls that will break after redirect change
- `chat/page.tsx` has two `Link href="/"` references that will become no-ops after redirect

### Metis Review
**Identified Gaps** (addressed):
- **Missing file changes**: `chat/page.tsx` and `projects/[id]/page.tsx` need navigation updates (added as Task 4 and Task 5)
- **Server vs Client component**: `page.tsx` must be a server component for `redirect()` — specified in Task 1
- **MobileSidebar shares SessionList**: Rewrite covers both desktop and mobile automatically — noted in Task 3 guardrails
- **`chat/page.tsx` only destructures `groupedSessions`**: Must also pass `sessions` to sidebar — covered in Task 4
- **"See more" behavior**: Navigates to `/projects` (same as clicking "Projects" header) — not inline expand
- **Zero projects state**: Hide projects section entirely if no projects exist
- **Long project names**: Apply `truncate` CSS class to sidebar items

---

## Work Objectives

### Core Objective
Make chat the primary interface by redirecting `/` to `/chat` and embedding a ChatGPT-style sidebar with projects listed above a flat chat list.

### Concrete Deliverables
- `packages/dashboard/app/page.tsx` — 5-line server component redirect
- `packages/dashboard/app/projects/page.tsx` — Full project grid page (moved from root)
- `packages/dashboard/app/chat/components/session-sidebar.tsx` — Rewritten with projects + flat chats
- `packages/dashboard/app/chat/page.tsx` — Updated navigation targets + prop changes
- `packages/dashboard/app/projects/[id]/page.tsx` — Fixed back-navigation targets

### Definition of Done
- [ ] Navigating to `/` redirects to `/chat`
- [ ] `/projects` shows the full project card grid
- [ ] Sidebar shows projects above chats in ChatGPT layout
- [ ] All navigation links point to correct targets
- [ ] `bun run build` passes with zero errors

### Must Have
- Server-side redirect from `/` to `/chat` (no flash)
- Projects section in sidebar with clickable project names
- "Projects" header clickable → `/projects`
- Flat chat list sorted by most recent
- "See more" link when >5 projects
- Mobile sidebar matches desktop structure

### Must NOT Have (Guardrails)
- DO NOT modify `useSessions` hook — it already returns both `sessions` and `groupedSessions`
- DO NOT modify `useProjects` hook — it works as-is
- DO NOT redesign the chat header — only update navigation targets
- DO NOT add search, filter, project creation, or drag-and-drop to sidebar
- DO NOT separate mobile and desktop sidebar implementations — preserve the shared `SessionList` pattern
- DO NOT touch `projects/[id]/page.tsx` beyond updating the two `router.push("/")` calls
- DO NOT extract `CreateProjectModal` into a shared component — just move it into `projects/page.tsx`
- DO NOT add project-scoped chat creation from sidebar
- DO NOT refactor `session-sidebar.tsx` into multiple component files — keep as single file
- DO NOT remove `groupedSessions` from `useSessions` — `projects/[id]/page.tsx` still uses directory filtering
- DO NOT add skeleton loading for projects in sidebar — simple conditional rendering is fine
- DO NOT try to match ChatGPT pixel-perfectly — match structure and hierarchy, not exact visual design

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.
> Every criterion MUST be verifiable by running a command or using a tool.

### Test Decision
- **Infrastructure exists**: NO (no test framework configured in dashboard)
- **Automated tests**: NO
- **Framework**: none

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

> QA scenarios are the PRIMARY verification method for every task.
> The executing agent DIRECTLY verifies each deliverable by running it.

**Verification Tool by Deliverable Type:**

| Type | Tool | How Agent Verifies |
|------|------|-------------------|
| **Page redirect** | Bash (curl) | Follow redirect chain, assert destination |
| **Page renders** | Playwright | Navigate, assert DOM elements present |
| **Sidebar layout** | Playwright | Assert element order, visibility, click behavior |
| **Navigation links** | Playwright | Click links, assert URL changes |
| **Build passes** | Bash (bun) | Run build, assert exit code 0 |

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Revert page.tsx to server redirect (no dependencies)
└── Task 2: Create projects/page.tsx with grid (no dependencies)

Wave 2 (After Wave 1):
├── Task 3: Rewrite session-sidebar.tsx (depends: none directly, but conceptually after 1+2)
├── Task 4: Update chat/page.tsx navigation + props (depends: Task 3 for new sidebar interface)
└── Task 5: Fix projects/[id]/page.tsx navigation (depends: Task 1 for redirect being in place)

Final:
└── Build verification + QA scenarios
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 5 | 2 |
| 2 | None | None | 1 |
| 3 | None | 4 | 1, 2 |
| 4 | 3 | None | 5 |
| 5 | 1 | None | 3, 4 |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1, 2 | `task(category="quick", load_skills=["frontend-ui-ux"], run_in_background=false)` |
| 2 | 3, 4, 5 | `task(category="visual-engineering", load_skills=["frontend-ui-ux"], run_in_background=false)` |

---

## TODOs

- [x] 1. Revert `page.tsx` to server-side redirect

  **What to do**:
  - Replace the entire contents of `packages/dashboard/app/page.tsx` with a server component that redirects to `/chat`
  - Remove `"use client"` directive
  - Use `import { redirect } from "next/navigation"`
  - The entire file should be ~5 lines:
    ```typescript
    import { redirect } from "next/navigation";

    export default function Home() {
      redirect("/chat");
    }
    ```
  - All existing components (`ProjectCardItem`, `CreateProjectModal`, `SkeletonCards`, `ProjectsHome`) are moved to Task 2 — they are NOT deleted, they are relocated

  **Must NOT do**:
  - DO NOT keep `"use client"` — `redirect()` must be used in a server component
  - DO NOT use `useEffect` + `router.push` (causes flash)
  - DO NOT delete the components — they move to `projects/page.tsx` in Task 2

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file replacement, ~5 lines of code, zero ambiguity
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Next.js App Router conventions (server components, redirect)
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed for this task (no browser verification)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Task 5
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `packages/dashboard/app/page.tsx:1-235` — Current file content to be replaced. Contains components (`ProjectCardItem`, `CreateProjectModal`, `SkeletonCards`, `ProjectsHome`) that must be preserved for Task 2

  **API/Type References**:
  - Next.js `redirect()` from `next/navigation` — Server-side redirect function, returns `never`, throws internally

  **Acceptance Criteria**:

  - [ ] File `packages/dashboard/app/page.tsx` exists and is ~5 lines
  - [ ] File does NOT contain `"use client"`
  - [ ] File imports `redirect` from `next/navigation`
  - [ ] File exports a default function that calls `redirect("/chat")`

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Root URL redirects to /chat
    Tool: Bash (curl)
    Preconditions: Dev server running on localhost:3000
    Steps:
      1. curl -s -o /dev/null -w "%{redirect_url}\n%{http_code}" http://localhost:3000/
      2. Assert: HTTP status is 307 (temporary redirect)
      3. Assert: redirect_url contains "/chat"
    Expected Result: Server-side redirect to /chat
    Evidence: curl output captured

  Scenario: No flash of project grid content
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running on localhost:3000
    Steps:
      1. Navigate to: http://localhost:3000/
      2. Wait for: navigation to /chat (timeout: 5s)
      3. Assert: URL is http://localhost:3000/chat (possibly with ?session= param)
      4. Assert: No element with text "Create Project" is visible (project grid not rendered)
      5. Screenshot: .sisyphus/evidence/task-1-redirect-no-flash.png
    Expected Result: Immediate redirect to /chat, no project grid flash
    Evidence: .sisyphus/evidence/task-1-redirect-no-flash.png
  ```

  **Commit**: YES (groups with Task 2)
  - Message: `refactor(dashboard): redirect root to /chat, move project grid to /projects`
  - Files: `packages/dashboard/app/page.tsx`, `packages/dashboard/app/projects/page.tsx`
  - Pre-commit: `bun run build`

---

- [x] 2. Create `/projects` page with project grid

  **What to do**:
  - Create new file `packages/dashboard/app/projects/page.tsx`
  - Move the following components from the old `page.tsx` into this file:
    - `ProjectCardItem` (lines 16-55)
    - `CreateProjectModal` (lines 57-122)
    - `SkeletonCards` (lines 124-146)
    - `ProjectsHome` (lines 148-221) — rename to `ProjectsPage` or keep name
    - Default export with `Suspense` wrapper (lines 223-235)
  - Keep all imports intact: `useState`, `useCallback`, `Suspense`, `useRouter`, `useProjects`, Card components, Button, Input
  - Update the "Skip to chat" button in the empty state to use `router.push("/chat")` (currently `router.push("/chat")` — already correct)
  - The page header should say "Arachne" with a "← Back" link to `/chat` and the "+ Create Project" button

  **Must NOT do**:
  - DO NOT redesign the project card grid — move it verbatim
  - DO NOT extract `CreateProjectModal` into a shared component
  - DO NOT add new features (search, filter, sorting)
  - DO NOT change the Card component styling or layout
  - DO NOT modify the `useProjects` hook

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Mostly copy-paste relocation of existing components with minor adjustments
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Next.js routing conventions, component organization
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed — this is file creation, not verification

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `packages/dashboard/app/page.tsx:16-55` — `ProjectCardItem` component to move verbatim
  - `packages/dashboard/app/page.tsx:57-122` — `CreateProjectModal` component to move verbatim
  - `packages/dashboard/app/page.tsx:124-146` — `SkeletonCards` component to move verbatim
  - `packages/dashboard/app/page.tsx:148-221` — `ProjectsHome` main component to move (update header nav)
  - `packages/dashboard/app/page.tsx:223-235` — Default export with Suspense wrapper

  **API/Type References**:
  - `packages/dashboard/app/hooks/use-projects.ts:4-12` — `ProjectCard` interface imported by the components
  - `packages/dashboard/components/ui/card.tsx` — Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
  - `packages/dashboard/components/ui/button.tsx` — Button component
  - `packages/dashboard/components/ui/input.tsx` — Input component (used in CreateProjectModal)

  **Acceptance Criteria**:

  - [ ] File `packages/dashboard/app/projects/page.tsx` exists
  - [ ] File contains `"use client"` directive
  - [ ] File contains `ProjectCardItem`, `CreateProjectModal`, `SkeletonCards` components
  - [ ] File has a default export with Suspense wrapper
  - [ ] Header includes a back link to `/chat`
  - [ ] `bun run build` succeeds with the new route registered

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Projects page renders project grid
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running on localhost:3000
    Steps:
      1. Navigate to: http://localhost:3000/projects
      2. Wait for: page load (timeout: 10s)
      3. Assert: Page title or heading contains "Arachne"
      4. Assert: Project cards are visible (CSS selector matching Card components)
      5. Assert: "+ Create Project" button is visible
      6. Screenshot: .sisyphus/evidence/task-2-projects-page.png
    Expected Result: Full project grid page renders with all discovered projects
    Evidence: .sisyphus/evidence/task-2-projects-page.png

  Scenario: Projects page has back navigation to chat
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running on localhost:3000
    Steps:
      1. Navigate to: http://localhost:3000/projects
      2. Wait for: page load
      3. Find and click the back/home link (← arrow or "Arachne" text linking to /chat)
      4. Wait for: navigation (timeout: 5s)
      5. Assert: URL contains "/chat"
    Expected Result: Back link navigates to /chat
    Evidence: Navigation verified

  Scenario: Create project modal works on /projects page
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running on localhost:3000
    Steps:
      1. Navigate to: http://localhost:3000/projects
      2. Click: button with text "+ Create Project" or "Create Project"
      3. Wait for: modal overlay visible (timeout: 3s)
      4. Assert: Input placeholder "Project name" is visible
      5. Assert: "Create" and "Cancel" buttons are visible
      6. Click: "Cancel" button
      7. Assert: Modal is no longer visible
      8. Screenshot: .sisyphus/evidence/task-2-create-modal.png
    Expected Result: Create project modal opens and closes correctly
    Evidence: .sisyphus/evidence/task-2-create-modal.png
  ```

  **Commit**: YES (groups with Task 1)
  - Message: `refactor(dashboard): redirect root to /chat, move project grid to /projects`
  - Files: `packages/dashboard/app/page.tsx`, `packages/dashboard/app/projects/page.tsx`
  - Pre-commit: `bun run build`

---

- [x] 3. Rewrite sidebar with projects section + flat chat list

  **What to do**:
  - Rewrite `packages/dashboard/app/chat/components/session-sidebar.tsx` to match ChatGPT sidebar layout
  - **New sidebar structure** (top to bottom):
    1. `+ New Chat` button (keep existing)
    2. `Separator`
    3. **Projects section**:
       - "Projects" header — clickable, navigates to `/projects` via `useRouter`
       - List of project items (max 5 shown) — each is a clickable link to `/projects/[id]`
       - Each project item: small folder icon + project name (truncated)
       - "See more" link if >5 projects — navigates to `/projects`
       - If 0 projects: hide entire projects section
    4. `Separator`
    5. **"Your chats" header** (static text, not clickable)
    6. **Flat chat list** — all sessions sorted by `time.updated` descending
       - Each item: title (truncated) + relative time + delete button on hover
       - Active session highlighted
       - No grouping by project directory
  - **Data flow**: The sidebar will call `useProjects()` hook internally for the projects section. The flat sessions list will come from a new `sessions` prop (flat `SessionInfo[]` array) instead of `groupedSessions`
  - **Update `SessionSidebarProps` interface**:
    - Remove `groupedSessions: SessionGroup[]`
    - Add `sessions: SessionInfo[]` (flat array, already sorted by parent)
    - Keep all other props: `activeSessionId`, `onSessionSelect`, `onNewChat`, `onDeleteSession`, `className`
  - **Preserve `MobileSidebar`**: It uses the shared `SessionList` internal component. The rewrite of `SessionList` automatically updates mobile. Do NOT create separate implementations.
  - **Keep `SessionGroup` export** — it's used by `projects/[id]/page.tsx` indirectly through `useSessions`... actually verify: `SessionGroup` is only referenced in `session-sidebar.tsx` and `chat/page.tsx`. Since we're changing the prop, we can remove the export if nothing else imports it. BUT to be safe, keep the export for now (it's harmless).
  - **Use `useRouter`** from `next/navigation` for project link navigation
  - **Use `Link`** from `next/link` for the "Projects" header and "See more" links (better semantics)
  - **Add `data-testid` attributes** for QA: `sidebar-projects-section`, `sidebar-projects-header`, `sidebar-project-item`, `sidebar-chats-section`, `sidebar-see-more`
  - **Filter stub sessions**: Apply the same `STUB_TITLE_PATTERN` filter from `projects/[id]/page.tsx` — sessions with titles matching `/^New session - \d{4}-\d{2}-\d{2}T/` should be hidden from the flat list

  **Must NOT do**:
  - DO NOT create separate desktop/mobile sidebar components
  - DO NOT add project creation capability to the sidebar
  - DO NOT add search or filter to the sidebar
  - DO NOT add skeleton loading for projects — just hide section while loading
  - DO NOT try to pixel-match ChatGPT styling — match structure/hierarchy
  - DO NOT refactor into multiple files — keep as single `session-sidebar.tsx`
  - DO NOT modify `useProjects` or `useSessions` hooks

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: This is the core UI work — restructuring sidebar layout, component hierarchy, styling
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Sidebar layout patterns, ChatGPT-style UI conventions, Next.js Link/Router usage
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed during implementation (verification is separate)

  **Parallelization**:
  - **Can Run In Parallel**: YES (but Task 4 depends on this)
  - **Parallel Group**: Wave 2 (start after Wave 1, but can run alongside Task 5)
  - **Blocks**: Task 4
  - **Blocked By**: None (logically after Wave 1, but no code dependency)

  **References**:

  **Pattern References**:
  - `packages/dashboard/app/chat/components/session-sidebar.tsx:1-159` — Current sidebar implementation to rewrite. Key patterns to preserve: `SessionList` shared component (line 23), `MobileSidebar` (line 115), `getRelativeTime` (line 148), `SessionSidebarProps` interface (line 14), hover delete button pattern (lines 83-95), active session highlighting (line 59)
  - `packages/dashboard/app/projects/[id]/page.tsx:17-22` — `STUB_TITLE_PATTERN` and `isRealSession` filter — reuse this pattern for filtering stub sessions in the flat chat list

  **API/Type References**:
  - `packages/dashboard/app/hooks/use-projects.ts:4-12` — `ProjectCard` interface: `id`, `name`, `description`, `absolutePath`, `techStack`, `detectedFiles`, `lastActivity`
  - `packages/dashboard/app/hooks/use-projects.ts:14-66` — `useProjects` hook: returns `projects`, `isLoading`, `error`, `createProject`, `refetch`
  - `packages/dashboard/app/lib/types.ts` — `SessionInfo` interface: `id`, `title`, `projectID`, `directory`, `parentID?`, `time: { created: number; updated: number }`
  - `packages/dashboard/components/ui/separator.tsx` — `Separator` component (already imported)
  - `packages/dashboard/components/ui/button.tsx` — `Button` component (already imported)

  **ChatGPT Reference Layout** (from user screenshot):
  ```
  Sidebar:
  ├── [+ New Chat button]
  ├── ─── separator ───
  ├── "Projects" header (clickable → /projects)
  ├── PROJECT LIST (with folder icons):
  │   ├── 📁 BMW M4
  │   ├── 📁 TriStar Capital
  │   ├── 📁 Wealth Advisor
  │   ├── 📁 Home Network
  │   └── 📁 Palisade
  ├── "See more" link (if >5 projects)
  ├── ─── separator ───
  ├── "Your chats" header
  ├── FLAT CHAT LIST (most recent first):
  │   ├── AI Revolution Opportunities (active)
  │   ├── UI design request
  │   ├── Subject-to Trust Transfer Risks
  │   └── ... more chats
  └── [bottom padding]
  ```

  **WHY Each Reference Matters**:
  - `session-sidebar.tsx` — The file being rewritten. Must preserve `MobileSidebar`, `getRelativeTime`, and the shared pattern
  - `use-projects.ts` — Hook to call internally for project data. Need `projects` array and `isLoading` state
  - `STUB_TITLE_PATTERN` — Reuse for filtering empty sessions from the flat list (consistency with project detail page)
  - ChatGPT layout — The structural specification from the user

  **Acceptance Criteria**:

  - [ ] `SessionSidebarProps` interface accepts `sessions: SessionInfo[]` instead of `groupedSessions: SessionGroup[]`
  - [ ] Sidebar renders projects section above chats section
  - [ ] Projects section shows ≤5 projects with folder icon and truncated name
  - [ ] "Projects" header is clickable and links to `/projects`
  - [ ] "See more" link appears when >5 projects and links to `/projects`
  - [ ] Projects section hidden when 0 projects
  - [ ] Chat list is flat (no project group headers)
  - [ ] Chat list sorted by most recent first
  - [ ] Stub sessions (matching `STUB_TITLE_PATTERN`) are filtered out
  - [ ] Active session is highlighted
  - [ ] Delete button appears on hover
  - [ ] `MobileSidebar` works with the same updated structure
  - [ ] `data-testid` attributes present: `sidebar-projects-section`, `sidebar-projects-header`, `sidebar-project-item`, `sidebar-chats-section`, `sidebar-see-more`

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Sidebar shows projects section above chats
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running on localhost:3000, at least 1 project discovered
    Steps:
      1. Navigate to: http://localhost:3000/chat
      2. Wait for: [data-testid="session-sidebar"] visible (timeout: 10s)
      3. Assert: [data-testid="sidebar-projects-section"] is visible
      4. Assert: [data-testid="sidebar-projects-header"] text contains "Projects"
      5. Assert: [data-testid="sidebar-project-item"] count >= 1
      6. Assert: [data-testid="sidebar-chats-section"] is visible
      7. Assert: [data-testid="sidebar-projects-section"] appears BEFORE [data-testid="sidebar-chats-section"] in DOM order
      8. Screenshot: .sisyphus/evidence/task-3-sidebar-layout.png
    Expected Result: Projects section renders above chats section
    Evidence: .sisyphus/evidence/task-3-sidebar-layout.png

  Scenario: Clicking "Projects" header navigates to /projects
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running on localhost:3000
    Steps:
      1. Navigate to: http://localhost:3000/chat
      2. Wait for: [data-testid="sidebar-projects-header"] visible
      3. Click: [data-testid="sidebar-projects-header"]
      4. Wait for: navigation (timeout: 5s)
      5. Assert: URL is http://localhost:3000/projects
    Expected Result: Navigates to full projects page
    Evidence: URL assertion

  Scenario: Clicking project name navigates to project detail
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running on localhost:3000, at least 1 project
    Steps:
      1. Navigate to: http://localhost:3000/chat
      2. Wait for: [data-testid="sidebar-project-item"] visible
      3. Note the text of the first project item
      4. Click: first [data-testid="sidebar-project-item"]
      5. Wait for: navigation (timeout: 5s)
      6. Assert: URL matches /projects/[some-id]
    Expected Result: Navigates to project detail page
    Evidence: URL assertion

  Scenario: Chat list is flat (no grouping headers)
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running on localhost:3000
    Steps:
      1. Navigate to: http://localhost:3000/chat
      2. Wait for: [data-testid="session-sidebar"] visible
      3. Assert: [data-testid="project-group-header"] count is 0 (old grouped headers removed)
      4. Assert: [data-testid="session-item"] count >= 1 (flat chat items exist)
      5. Screenshot: .sisyphus/evidence/task-3-flat-chat-list.png
    Expected Result: No project group headers, flat list of chat sessions
    Evidence: .sisyphus/evidence/task-3-flat-chat-list.png

  Scenario: Maximum 5 projects shown with "See more" link
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running on localhost:3000, >5 projects discovered (currently 8)
    Steps:
      1. Navigate to: http://localhost:3000/chat
      2. Wait for: [data-testid="sidebar-projects-section"] visible
      3. Assert: [data-testid="sidebar-project-item"] count is exactly 5
      4. Assert: [data-testid="sidebar-see-more"] is visible
      5. Assert: [data-testid="sidebar-see-more"] text contains "See more" or "more"
      6. Click: [data-testid="sidebar-see-more"]
      7. Wait for: navigation (timeout: 5s)
      8. Assert: URL is http://localhost:3000/projects
    Expected Result: Only 5 projects shown, "See more" navigates to /projects
    Evidence: Assertions verified

  Scenario: Mobile sidebar shows same structure
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running on localhost:3000
    Steps:
      1. Set viewport: width=375, height=812
      2. Navigate to: http://localhost:3000/chat
      3. Click: [data-testid="hamburger"] (mobile menu trigger)
      4. Wait for: sidebar sheet visible (timeout: 3s)
      5. Assert: [data-testid="sidebar-projects-section"] is visible
      6. Assert: [data-testid="sidebar-project-item"] count >= 1
      7. Assert: [data-testid="session-item"] count >= 1
      8. Screenshot: .sisyphus/evidence/task-3-mobile-sidebar.png
    Expected Result: Mobile sidebar has same projects + flat chats structure
    Evidence: .sisyphus/evidence/task-3-mobile-sidebar.png
  ```

  **Commit**: YES (groups with Task 4)
  - Message: `feat(dashboard): add projects to sidebar, flatten chat list to match ChatGPT layout`
  - Files: `packages/dashboard/app/chat/components/session-sidebar.tsx`, `packages/dashboard/app/chat/page.tsx`
  - Pre-commit: `bun run build`

---

- [x] 4. Update `chat/page.tsx` navigation and sidebar props

  **What to do**:
  - Update `packages/dashboard/app/chat/page.tsx` to:
    1. Change the `useSessions()` destructuring to include `sessions` (flat array) in addition to existing destructured values
    2. Pass `sessions` (flat array) to `SessionSidebar` instead of `groupedSessions`
    3. Pass `sessions` to `MobileSidebar` instead of `groupedSessions`
    4. Update `Link href="/"` on line 129 (← back arrow) to `Link href="/projects"` — this is the "Back to projects" link visible on desktop
    5. Update `Link href="/"` on line 142 (Arachne text) to `Link href="/projects"` — clicking "Arachne" goes to projects page
  - The sidebar interface changed in Task 3: `groupedSessions` → `sessions`

  **Must NOT do**:
  - DO NOT rearrange or redesign the chat header layout
  - DO NOT add or remove any header elements
  - DO NOT change the thinking drawer, message list, or chat input
  - DO NOT modify any hooks

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 5 targeted line-level changes in a single file, zero ambiguity
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: React prop passing, Next.js Link component
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed for these edits

  **Parallelization**:
  - **Can Run In Parallel**: NO (sequential after Task 3)
  - **Parallel Group**: Wave 2 (after Task 3 completes)
  - **Blocks**: None
  - **Blocked By**: Task 3 (sidebar interface change)

  **References**:

  **Pattern References**:
  - `packages/dashboard/app/chat/page.tsx:17-24` — `useSessions()` destructuring. Currently only gets `groupedSessions`. Must add `sessions` to destructuring.
  - `packages/dashboard/app/chat/page.tsx:116-123` — Desktop `SessionSidebar` usage. Change `groupedSessions={groupedSessions}` to `sessions={sessions}`
  - `packages/dashboard/app/chat/page.tsx:128-134` — Desktop back arrow link. Change `href="/"` to `href="/projects"`
  - `packages/dashboard/app/chat/page.tsx:135-141` — `MobileSidebar` usage. Change `groupedSessions={groupedSessions}` to `sessions={sessions}`
  - `packages/dashboard/app/chat/page.tsx:142` — Arachne text link. Change `href="/"` to `href="/projects"`

  **API/Type References**:
  - `packages/dashboard/app/hooks/use-sessions.ts:154-155` — `useSessions` return value already includes `sessions` (flat array, line 155) alongside `groupedSessions` (line 156)
  - Task 3's updated `SessionSidebarProps` interface — `sessions: SessionInfo[]` replaces `groupedSessions: SessionGroup[]`

  **Acceptance Criteria**:

  - [ ] `useSessions()` destructuring includes `sessions`
  - [ ] `SessionSidebar` receives `sessions={sessions}` prop (NOT `groupedSessions`)
  - [ ] `MobileSidebar` receives `sessions={sessions}` prop (NOT `groupedSessions`)
  - [ ] Back arrow `Link` points to `/projects`
  - [ ] "Arachne" text `Link` points to `/projects`
  - [ ] `bun run build` passes with zero errors
  - [ ] No TypeScript errors in `chat/page.tsx`

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Arachne header link navigates to /projects
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running on localhost:3000
    Steps:
      1. Navigate to: http://localhost:3000/chat
      2. Wait for: page load (timeout: 5s)
      3. Click: the "Arachne" text link in the chat header
      4. Wait for: navigation (timeout: 5s)
      5. Assert: URL is http://localhost:3000/projects
    Expected Result: Clicking "Arachne" navigates to projects page
    Evidence: URL assertion

  Scenario: Back arrow navigates to /projects
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running on localhost:3000, viewport width >= 1024 (desktop)
    Steps:
      1. Navigate to: http://localhost:3000/chat
      2. Wait for: page load
      3. Find: link with aria-label "Back to projects" (the ← arrow)
      4. Click: the back arrow link
      5. Wait for: navigation (timeout: 5s)
      6. Assert: URL is http://localhost:3000/projects
    Expected Result: Back arrow navigates to projects page
    Evidence: URL assertion
  ```

  **Commit**: YES (groups with Task 3)
  - Message: `feat(dashboard): add projects to sidebar, flatten chat list to match ChatGPT layout`
  - Files: `packages/dashboard/app/chat/components/session-sidebar.tsx`, `packages/dashboard/app/chat/page.tsx`
  - Pre-commit: `bun run build`

---

- [x] 5. Fix navigation in `projects/[id]/page.tsx`

  **What to do**:
  - Update `packages/dashboard/app/projects/[id]/page.tsx`:
    1. Line 282: Change `router.push("/")` to `router.push("/projects")` — this is the "Back to projects" button in the error state
    2. Line 301: Change `router.push("/")` to `router.push("/projects")` — this is the ← back button in the header
  - These are the only two changes needed in this file

  **Must NOT do**:
  - DO NOT touch any other part of this file
  - DO NOT modify `KnowledgePanel`, `InstructionsEditor`, `SessionItem`, or any other component
  - DO NOT change the `handleStartConversation` function
  - DO NOT modify how sessions are fetched or filtered

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Two identical string replacements in a single file, zero ambiguity
  - **Skills**: []
    - No skills needed — this is a trivial find-and-replace
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not needed for a 2-line string replacement

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 4)
  - **Blocks**: None
  - **Blocked By**: Task 1 (redirect must be in place for navigation to make sense)

  **References**:

  **Pattern References**:
  - `packages/dashboard/app/projects/[id]/page.tsx:282` — Error state "Back to projects" button: `router.push("/")` → `router.push("/projects")`
  - `packages/dashboard/app/projects/[id]/page.tsx:301` — Header back button: `router.push("/")` → `router.push("/projects")`

  **Acceptance Criteria**:

  - [ ] Line 282: `router.push("/projects")` (was `router.push("/")`)
  - [ ] Line 301: `router.push("/projects")` (was `router.push("/")`)
  - [ ] No other changes in the file
  - [ ] `bun run build` passes

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Project detail back button navigates to /projects
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running on localhost:3000, at least 1 project exists
    Steps:
      1. Navigate to: http://localhost:3000/projects
      2. Wait for: project cards visible
      3. Click: first project card
      4. Wait for: navigation to /projects/[id] (timeout: 5s)
      5. Assert: URL matches /projects/[some-id]
      6. Click: ← back button (aria-label "Back to projects")
      7. Wait for: navigation (timeout: 5s)
      8. Assert: URL is http://localhost:3000/projects
    Expected Result: Back button returns to /projects, not /
    Evidence: URL assertion

  Scenario: Project detail error state back button navigates to /projects
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running on localhost:3000
    Steps:
      1. Navigate to: http://localhost:3000/projects/nonexistent-id-12345
      2. Wait for: error message visible (timeout: 10s)
      3. Assert: text "Project not found" or error message is visible
      4. Click: "Back to projects" button
      5. Wait for: navigation (timeout: 5s)
      6. Assert: URL is http://localhost:3000/projects
    Expected Result: Error state back button returns to /projects
    Evidence: URL assertion
  ```

  **Commit**: YES (standalone)
  - Message: `fix(dashboard): update project detail back navigation to /projects`
  - Files: `packages/dashboard/app/projects/[id]/page.tsx`
  - Pre-commit: `bun run build`

---

## Commit Strategy

| After Tasks | Message | Files | Verification |
|-------------|---------|-------|--------------|
| 1, 2 | `refactor(dashboard): redirect root to /chat, move project grid to /projects` | `app/page.tsx`, `app/projects/page.tsx` | `bun run build` |
| 3, 4 | `feat(dashboard): add projects to sidebar, flatten chat list to match ChatGPT layout` | `app/chat/components/session-sidebar.tsx`, `app/chat/page.tsx` | `bun run build` |
| 5 | `fix(dashboard): update project detail back navigation to /projects` | `app/projects/[id]/page.tsx` | `bun run build` |

---

## Success Criteria

### Verification Commands
```bash
# Build passes
bun run build  # Expected: exit code 0, all routes compiled

# Root redirects
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/  # Expected: 307

# Projects page loads
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/projects  # Expected: 200

# Chat page loads
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/chat  # Expected: 200
```

### Final Checklist
- [ ] `/` redirects to `/chat` (server-side, no flash)
- [ ] `/projects` shows full project card grid with create button
- [ ] Sidebar has projects section (≤5 items + "See more") above flat chat list
- [ ] "Projects" header in sidebar → `/projects`
- [ ] Project names in sidebar → `/projects/[id]`
- [ ] Chat list is flat (no project grouping)
- [ ] All navigation links updated (no broken back buttons)
- [ ] Mobile sidebar matches desktop structure
- [ ] `bun run build` passes with zero errors
- [ ] All "Must NOT Have" guardrails respected
