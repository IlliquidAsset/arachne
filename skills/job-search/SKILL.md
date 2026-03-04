---
name: job-search
description: Autonomous job search, application tailoring, and pipeline management
---

# Job Search Skill

You are conducting an autonomous job search on behalf of a candidate. This skill defines the end-to-end workflow for finding, evaluating, tailoring, and tracking job applications.

## Prerequisites

Before starting, you must have access to:
- The candidate's resume(s) and/or resume templates
- The candidate's LinkedIn profile or professional summary
- Any cover letter templates or examples
- The candidate's preferences: role types, locations, remote policy, compensation floor, dealbreakers
- A Notion database or tracker for application pipeline management (preferred) or local tracking

## Phase 1: Opportunity Discovery

### Search Strategy
1. **Define search terms** from the candidate's target roles, skills, and industry. Use multiple variations (e.g., "Staff Engineer", "Staff Software Engineer", "Principal Engineer").
2. **Search across channels:**
   - Job boards: LinkedIn Jobs, Indeed, Wellfound (AngelList), Dice, Hired
   - Company career pages for target companies
   - Aggregators: Google Jobs, SimplyHired
   - Niche boards relevant to the candidate's field
3. **Filter aggressively:**
   - Must match >70% of stated requirements
   - Location/remote policy must align
   - Compensation range (if posted) must meet floor
   - Company stage/size must match preferences
4. **Capture structured data for each opportunity:**
   - Job title, company, location, remote policy
   - Posted date, source URL, application URL
   - Key requirements (skills, experience years, education)
   - Compensation range (if available)
   - Application method (easy apply, direct, referral possible)

### Deduplication
- **Same role on multiple boards:** Identify by job title + company + location. Apply through the highest-quality channel only (referral > company career page > LinkedIn > other boards).
- **Similar roles at same company:** Flag as separate opportunities but note the overlap.
- **Reposted roles:** Check if a role was previously applied to. If yes, skip unless >90 days have passed and the listing appears genuinely new.

## Phase 2: Evaluation & Ranking

Score each opportunity on these dimensions (1-10):
- **Fit score:** How well the candidate's skills match the requirements
- **Career value:** Growth potential, title progression, industry positioning
- **Compensation potential:** Expected total comp relative to candidate's targets
- **Application effort:** Easy apply (low effort) vs custom portal + cover letter (high effort)
- **Probability of response:** Company size, role demand, candidate's competitive position

Rank and categorize:
- **Tier 1 — Apply Now:** Score >= 7 average, strong fit, high career value
- **Tier 2 — Worth Applying:** Score 5-7, decent fit, reasonable effort
- **Tier 3 — Monitor:** Interesting but not urgent, or stretch roles

Recommend no more than 3 Tier 1 applications per session to maintain quality.

## Phase 3: Application Preparation

### Resume Tailoring
For each Tier 1 application:
1. Start from the candidate's base resume
2. Reorder bullet points to lead with most relevant experience
3. Adjust keyword density to match the job posting's language (natural integration, not stuffing)
4. Ensure measurable achievements are prominent (numbers, percentages, scale)
5. Match the role's seniority level in how experience is framed

### Cover Letter (When Appropriate)
Write a cover letter only when:
- The application explicitly requests one
- The company is known to read them (smaller companies, mission-driven orgs)
- The candidate has a unique angle that a resume can't convey

Structure:
- **Para 1:** Why this specific company/role (2-3 sentences, specific to the company)
- **Para 2:** What you bring that matches their needs (evidence-backed, 3-4 sentences)
- **Para 3:** Close with enthusiasm and call to action (2 sentences)

Total length: 200-300 words maximum.

### Credential Management
- When a job board or company portal requires an account, check the credential store first
- If no existing credentials, create an account with the candidate's professional email
- Store new credentials securely in the credential vault
- Never reuse passwords across sites

## Phase 4: Submission & Tracking

### Application Submission
1. Use the best available channel (referral > direct > aggregator)
2. Complete all required fields accurately
3. Upload tailored resume (not the generic version)
4. Attach cover letter only when prepared
5. Answer screening questions thoughtfully (not just keyword-matching)

### Pipeline Tracking
Log every application to the tracking system (Notion preferred) with:
- Company name, role title, application date
- Source URL, application channel used
- Resume version submitted
- Cover letter: yes/no
- Status: Applied / Screened / Phone Screen / Interview / Offer / Rejected / Ghosted
- Follow-up date (1 week after application)
- Notes on any custom screening answers or notable details

### Follow-Up Protocol
- **Day 7:** If no response, note in tracker. No action yet.
- **Day 14:** If high-priority role, consider a brief follow-up via LinkedIn or email to the recruiter (if identifiable).
- **Day 21:** Mark as "No Response" and deprioritize. Move on.

## Phase 5: Reporting

After each search session, produce a summary:

### Session Report Format
```
## Job Search Report — [Date]

### New Opportunities Found: [N]
### Applications Submitted: [N]
### Pipeline Status: [Active] / [Awaiting Response] / [Closed]

### Tier 1 Applications
1. [Role] at [Company] — [Status] — [Fit Score]/10
   - Why: [1-sentence rationale]
   - Next: [Follow-up date or next action]

### Tier 2 Candidates (For Next Session)
- [Role] at [Company] — [Brief note]

### Market Observations
- [Any trends noticed: hot skills, salary patterns, hiring freezes, etc.]
```

## Constraints

- **Quality over quantity.** 3 well-tailored applications > 20 spray-and-pray submissions.
- **Never misrepresent** the candidate's qualifications. Optimize presentation, don't fabricate.
- **Respect rate limits** on job boards. Don't scrape aggressively enough to trigger blocks.
- **Maintain candidate privacy.** Don't share personal information beyond what's required for applications.
- **Track everything.** An untracked application is a wasted application.
