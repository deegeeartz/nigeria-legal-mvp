# Wigally Creative & Social Community Experience Plan

Transform Wigally from a standard legal directory into a high-retention, warm editorial social legal lounge where everyday citizens and verified lawyers connect, deliberate, and return daily.

---

## 1. User Review Required

> [!IMPORTANT]
> **Key Decisions Aligned with Your Preferences:**
> - **Visual Language:** Warm editorial aesthetic inspired by vintage legal libraries and modern literary magazines — warm parchment backgrounds (`#FAF7F2`), deep espresso text (`#1C1917`), cognac amber (`#D97706`) and forest sage accents (`#047857`), editorial serif typography paired with clean modern sans, and rich tactile cards without generic cookie-cutter pills.
> - **Community Lounge Dynamics:** Interactive Legal AMAs (scheduled and live Q&A sessions with verified lawyers), instant community polls with live breakdown statistics, and multi-faceted reaction badges (`⚖️ Legally Sound`, `💡 Life Saver`, `🔍 Clarifying Question`, `🔥 Hot Debate`).
> - **Daily Retention Engine:** A "Daily Quick Take" card carousel with bite-sized legal insights, alongside an interactive "Legal Survival Playbook" library (e.g., *Tenant Eviction Defense*, *Freelancer Non-Payment Kit*, *Startup Equity Split*) featuring bookmarking and progress tracking.

---

## 2. Proposed Changes

### A. Theme & Editorial Design System (`/src/app/globals.css` & tokens)
- Introduce warm editorial palette tokens:
  - Backgrounds: `bg-[#FAF7F2]` (warm canvas), `bg-[#F4EFEB]` (editorial warm card), `bg-[#EFE8E1]` (subtle border/divider).
  - Ink: `text-[#1C1917]` (deep espresso ink), `text-[#44403C]` (muted graphite).
  - Accents: Cognac amber (`#B45309`), deep emerald sage (`#047857`), warm terracotta (`#C2410C`).
- Enhanced micro-interaction classes: smooth hover elevations, stamp-like verification badges, tactile toggle switches, and serif headlines (`font-serif tracking-tight`).

### B. Interactive Community Lounge (`/src/app/community/page.js` & `/src/app/api/community/route.js`)
- **Live Legal AMAs (Ask Me Anything):**
  - Featured banner showcasing active or upcoming lawyer AMAs (e.g., *"Tech IP & Fair Use with Barrister Amaka"*, *"Tenant Rights Hour with Attorney David"*).
  - Real-time "Active Lawyers in the Lounge" counter (`🟢 18 verified counsels online`).
  - One-click "Raise Hand / Submit AMA Question".
- **Interactive Community Vibe Polls:**
  - Weekly legal dilemma poll (e.g., *"Can your landlord demand rent in dollars?"* or *"Can an employer read your Slack DMs?"*).
  - Instant voting with animated vote percentages and collapsible lawyer expert breakdown commentary.
- **Reaction Badges & Deliberation Threads:**
  - Multi-reaction bar on every question and response: `⚖️ Legally Sound`, `💡 Life Saver`, `🔍 Need Clarity`, `🔥 Hot Debate`.
  - Lawyer responses highlighted with gold seal borders, "Verified Counsel" ribbon, and a direct "Book Private Consult" action.
  - Anonymous author generator with relatable personas (*"Anxious Tenant"*, *"Bootstrapped Founder"*, *"Freelance Designer"*) or user profile toggle.

### C. Daily Retention Engine: Quick Takes & Bookmarkable Playbooks
- **Daily Quick Take of the Day (`/src/components/community/DailyQuickTake.js`):**
  - Interactive flip/reveal card with daily legal rights hacks: *"What to say if an officer stops you without a warrant"*, *"The 3 clauses that make a freelance contract worthless"*.
  - Streak or "Mark as Learned" tracker saved to local storage.
- **Interactive Legal Playbooks (`/src/components/community/PlaybookLibrary.js`):**
  - Practical step-by-step guides with actionable checklists:
    - *The Freelancer Non-Payment Recovery Playbook*
    - *Tenant Rent Hike & Repair Rights Manual*
    - *First-Time Co-Founder Equity Agreement*
  - Interactive checkboxes, local bookmarking tab, and exportable PDF/shareable summaries.

### D. Socialized Homepage & Navigation Integration
- **Refreshed Home Page (`/src/app/page.js`):**
  - Replace the corporate hero with an editorial magazine-style social lounge entrance:
    - Interactive "Today in the Lounge" ticker and trending legal dilemmas.
    - Quick-ask input with instant community preview.
    - Featured Playbook of the week and Quick Take card directly accessible.
- **Navigation Update (`/src/components/Navigation.js`):**
  - Ensure `/community` route is richly accessible with live indicator badge (`🟢 AMA Live`).
  - Add bookmarks quick-drawer or saved playbooks shortcut.

---

## 3. Verification Plan

### Automated Build & Syntax Checks
- Run `compile_applet` to verify Next.js builds cleanly with zero errors.
- Run `lint_applet` to ensure strict React 19 / Next.js / ESLint adherence.

### Manual & Browser Verification
- **Visual Design:** Verify warm editorial aesthetic, typography hierarchy, and smooth animations across desktop and mobile viewports.
- **Interactivity:**
  - Cast votes in community polls and verify real-time percentage updates.
  - React with badges (`⚖️ Legally Sound`, `💡 Life Saver`) and confirm persistent count updates.
  - Test the Daily Quick Take card flip and bookmarking a playbook to local storage.
  - Submit an anonymous question and view it appear in the community stream with responses.
