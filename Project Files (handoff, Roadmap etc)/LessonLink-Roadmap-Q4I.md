# LessonLink | Complete Roadmap (Q4I — April 19, 2026)

---

## PRODUCT VISION

**LessonLink is not just a booking system — it's a complete Learning Management System (LMS) for independent online teachers.**

### Core Problem Being Solved

Teachers create lesson plans, homeworks, and assessments, then recreate them manually for each student. Parents don't see the structure or value they're paying for. Teachers spend hours on repetitive admin work (feedback reports, progress tracking, homework delivery).

### The Solution

- **For Teachers:** Create content once → system handles delivery forever. AI generates personalized feedback in teacher's voice. Progress tracking automated.
- **For Students/Parents:** Professional course structure with curriculum, automated homework delivery, regular feedback reports, visual progress tracking ("Check-up" page), and assessment storage.
- **For LessonLink (Business):** Subscription revenue from teachers who want to professionalize their practice and scale without administrative burnout.

### Key Differentiators

1. **Reusable Curriculum:** Build units once, apply to any student with one click
2. **AI-Powered Feedback:** Transform brief notes into professional reports (in teacher's voice)
3. **Gamified Engagement:** Integration with Petland reward system (XP/HP tracking)
4. **Value Showcase:** Parents see structured courses with Big Questions and measurable progress
5. **Automation:** Homework prompted after sessions, feedback auto-generated, progress auto-tracked

---

## FOUR-DOMAIN ARCHITECTURE (Established February 14, 2026)

**All UI decisions in LessonLink are organized by four universal domains:**

| Domain   | Question                | Teacher Side                                                        | Student Side                                                    | Function                                                             |
| -------- | ----------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------- |
| **Who**  | Who are the parties?    | Learner Roster                                                      | My Tutor                                                        | Identifies parties and their relationship                            |
| **What** | What is the product?    | Course/Unit/Session mgmt, progress, feedback, homework, rewards     | My Units, Browse, Feedback, Evaluations                         | Curriculum, structure, and pedagogical artifacts                      |
| **When** | When does it happen?    | Calendar, session lifecycle                                         | Calendar, booking                                               | Scheduling lifecycle: book → attend → complete → cancel              |
| **How**  | How is it paid for?     | Packages, credits, payments                                         | My Package (under Courses)                                      | Financial lifecycle: purchase → consume → settle                     |

**Chat** is a cross-cutting utility — it carries signals between domains but owns no data of its own.

**Key Principle:** Actions live in one domain. Effects ripple to others.
*Example:* Session completion (When) triggers progress update (What) and credit settlement (How).

### Student Portal Sidebar Structure

- **Dashboard** — no expand; the hub, summary cards from all domains
- **Calendar** [When]
  - Schedule
  - Availability
- **Chat** [Cross-cutting]
  - Notifications
  - Communications
- **Courses** [What + How]
  - My Units
  - Browse Units
  - Feedback
  - Evaluations
  - My Package
- **Tutors** [Who]
  - My Tutor
  - Browse Tutors

### Teacher Portal Learner Management

- **Learners** (sidebar)
  - **Roster** — list with status filter [Who]
    - **Learner Profile Page** (`/t-portal/students/[id]`)
      - Tab 1: Profile & Progress [Who + What]
      - Tab 2: Sessions [When]
      - Tab 3: Packages & Credits [How]
      - Tab 4: Payments [How]

---

## CURRICULUM STRUCTURE

### Course Architecture

- **LEVEL** (60-75 hours total, e.g., A1, A2, B1)
  - **UNITS** (modular, can be taken in any order)
    - Big Question (BQ) — Overarching theme that no one can answer
    - Initial Assessment (recorded + analyzed)
    - **SESSIONS** (4-5 per unit, bookable)
      - Little Question (LQ) — Breaks down the Big Question
      - Graphics + Description
      - Linked Homework (gamified worksheets)
      - Schedulable by student
    - Final Project (TBLT task or graded reader)
    - Final Evaluation (recorded + analyzed)

### Key Terminology

- ❌ "Lessons" → ✅ **"Sessions"** (4-5 per unit, 30 or 60 minutes each)
- ❌ Units are sequential → ✅ **Units are modular** (student can take in any order)
- ✅ **Unit = 4-5 sessions** on one topic
- ✅ **10-pack = 10 hours = 4 units** (not 10 lessons)
- ✅ **Full course = 60 hours = 6 × 10-packs = 24 units**

### Unit Completion Requirements (All Three)

1. All 4-5 sessions completed ✅
2. Final evaluation submitted ✅
3. Final project completed ✅

---

## PHASES

---

### ✅ Phase 1: Foundation

- Teacher Dashboard with revenue metrics, active students, upcoming sessions, and at-risk student alerts
- Firebase App Hosting with published version
- GitHub Backup with version control established
- Firebase Firestore Integration with persistent database storage

---

### ✅ Phase 2: Core Business Logic

- Payment Tracking System with full implementation of payment status tracking (paid, unpaid, deducted from prepaid package)
- Prepaid Package Management with package values, automatic deductions, balance monitoring
- Student Status Management with automated status updates
- Revenue Reporting with detailed reports on session frequency, student attendance, and revenue by time period

---

### ✅ Phase 3: Student Portal & Booking

- Student Authentication with secure login system
- Student Portal with interface to view sessions, package balance, and payment history
- Session Booking System allowing students to book available session slots directly
- Timezone handling for students and teachers

---

### ✅ Phase 4: Reschedule & Cancel System

- Reschedule and cancel functionality with time-based rules
- Late-notice approval system (reschedule within 12 hours, cancel within 24 hours requires teacher approval)
- Approval request queue for teachers

---

### ✅ Phase 5: Public Profiles & Reviews

- Public teacher profiles at `/t/username` with professional presentation
- Review system allowing students to leave ratings and comments after sessions
- Admin panel for managing platform
- Profile editor for teachers to customize their public presence
- iTalki data seeding with imported reviews and profile information

---

### ✅ Phase 6: Landing Page & Routing Updates

- Landing page at root (`/`) with dual portal login (Learners and Tutors)
- Teacher portal migrated to `/t-portal/` with all subpages
- Student portal at `/s-portal/` with booking functionality
- Admin button in sidebar (visible only to jwag.lang@gmail.com)
- Find a Tutor button on booking page with profile viewer modal
- All broken links fixed from route changes

---

### ✅ Phase 7: Credit System

- `studentCredit` collection created with all fields
- Credit management functions: `getStudentCredit`, `createStudentCredit`, `updateStudentCredit`, `reserveCredit`
- Teacher unit assignment UI with credit checking
- Credit reservation workflow (uncommitted → committed on assignment)
- System architecture documented with flows and decisions

---

### ✅ Phase 8: Student Portal & Messaging

- `studentProgress` entries created when units assigned
- Student notifications sent when units assigned
- Student portal modernized (sidebar, Purchase Plan card, My Units page)
- Two-channel messaging system (Notifications + Communications)

---

### ✅ Phase 9: Communication (Chat System)

**Goal:** Internal messaging between students and teachers.

**Completed:** February 2, 2026; rebuilt February 10, 2026; verified February 14, 2026

**Implementation:**

- Internal chat system for student ↔ teacher communication
- Real-time messaging via Firebase (`onSnapshot` listeners)
- Chat appears in sidebar for both teacher and student
- Two-channel system: Notifications + Communications
- Unread count badges on both channels
- UID-based architecture (teacher UID ↔ student ID)
- Bi-directional message queries (dual sent + received listeners)
- Teacher split-view interface (student list + messages)
- Student tabbed interface (Notifications / Communications)
- Security rules enforce proper read/write permissions
- Message structure: `type`, `from`, `to`, `fromType`, `toType`, `content`, `timestamp`
- **Full verification** (February 14, 2026): S→T, T→S, mark-as-read both directions

**Architecture Notes:**

- Messages use UIDs (not emails) for future scalability
- Teacher profile stored in `teacherProfiles` collection with UID as document ID
- Students have `assignedTeacherId` field linking to teacher UID
- Real-time listeners use dual queries (sent + received) merged via refs
- `participants` field removed — not used (February 10, 2026)

---

### ✅ Phase 10: Backend Stabilization

**Goal:** Lock down domain architecture and eliminate technical debt.

**Completed:** February 9, 2026

**Firestore Rules v5** — Published and stable (February 10, 2026)

- Safe `isAssignedTeacher()` helper (won't crash on missing field)
- Tightened `studentProgress`, `studentCredit`, `messages` rules
- Any teacher can read students (needed for Find Learner flow)
- Teachers can send system notifications

**Clean Backend Baseline** — `src/lib/firestore.ts`

- Variant-1 compliant (Approval ≠ Booking)
- No legacy `lessons` references
- No nested exports or duplicated functions
- Uses `type: "communications"` consistently
- Matches Firestore Rules v5

**Variant-1 Architecture Locked**

- `resolveApprovalRequest`: Creates `studentProgress` only
- `bookLesson`: Hard-gated on existing `studentProgress` + `studentCredit`
- `completeSession`: Updates progress + settles credit (idempotent)
- Approval sends notification: "Approved. Please complete payment to book."

**Domain Invariants Enforced**

- `sessions` = curriculum templates only
- `sessionInstances` = booked/actual classes ONLY
- Approval ≠ Booking
- Payment creates `studentCredit`
- Approval creates `studentProgress`
- Booking creates `sessionInstance`
- Completion settles credit + updates progress
- No `lessons` collection anywhere

**assignedTeacherId Auto-Assignment** (February 10, 2026)

- Set when T finds learner by email
- Fallback set when T assigns unit (if missing)

---

### ✅ Phase 11: Stale Cleanup & Session Completion

**Goal:** Remove stale v7 references and verify full session lifecycle.

**Completed:** February 14, 2026

- All stale `studentAuthUid` removed from page-level code (3 files)
- `getOrCreateStudentByEmail` replaced with `getStudentById` in S calendar
- Chat verified: S→T, T→S, mark-as-read both directions
- S Booking flow E2E verified
- Session completion flow verified (progress + credit settlement)
- **Four-Domain Architecture** designed (Who / What / When / How)
- **Learner Management Spec** created (T-side profile page with tabs)
- **S Portal v2 design** created (matches real sidebar, domain-tagged)

---

### ✅ Phase 12: Package Expiration & Learner Management

**Goal:** Build package expiration/pause system, T-side learner management, and S/T portal enrichments.

**Completed:** February 15, 2026

**Design Documents:**

- ✅ `LessonLink-Learner-Management-Spec.md` — full spec with data model, tabs, implementation order
- ✅ Interactive design mockups (JSX) for T-side and S-side

**All 14 implementation steps completed:**

1. Type updates (StudentPackage + Student status expansion)
2. T roster page with status filter (`/t-portal/students`)
3. T learner profile page with tab shell (`/t-portal/students/[id]`)
4. Tab 1: Profile & Progress
5. Tab 2: Sessions
6. Tab 3: Packages & Credits (with pause/unpause UI)
7. Tab 4: Payments (placeholder/manual, pre-Stripe)
8. S sidebar sub-items (expandable pattern)
9. S Dashboard enrichment (progress, package, rewards cards)
10. S My Package page under Courses
11. Cloud Function: `checkExpiredPackages` (daily, midnight UTC)
12. T Dashboard expiration warning card (packages expiring within 7 days)
13. S Dashboard expiration banner
14. S My Tutor page under Tutors

---

### ✅ Phase 13: Stripe Payments

**Goal:** Stripe Checkout integration for package purchases.

**Completed:** February 18, 2026. Stripe checkout + webhook E2E verified. Firebase Admin SDK added for server-side writes. **Webhook production fix March 1** (Node version).

#### Key Decisions

- **Dynamic `price_data`** — pricing engine in code, NO pre-created Stripe products
- **One T profile page** (`/t/[slug]`) — auth-aware, shows purchase UI for logged-in S
- **Two payment paths:** Stripe Checkout redirect (default) + email payment link (fallover for China/WeChat)
- **3% processing fee** shown to S, baked into calculated total
- **Purchase and booking stay separate** (Variant-1 compliant)
- **NO Stripe Connect** (single-teacher, not needed)
- **NO legacy pricing overrides,** promo codes, or upgrade credits (future)
- **Course-agnostic credit** (Feb 24) — `StudentCredit` no longer keyed on courseId. One credit pool per L. Top Up adds hours without requiring course selection.

**Spec Document:** `LessonLink-Phase-13-Stripe-Spec-Q2G.md`

---

### ✅ Phase 14: Evaluations & Assessments

**Goal:** Record and analyze initial/final assessments for each unit using Strong TBLT criterion-referenced framework (Long/Norris). AI assists with analysis. Before/after comparison with cited L output.

**Completed:** February 20, 2026. Finalize button + Generate Parent Report fully wired. AI generation (MiniMax) + translation (DeepSeek) + inline editing + Save & Send with email delivery (Resend).

**Status:** ✅ Complete. Real API testing remains (AI_USE_MOCK=true).

**Spec Document:** `LessonLink-Phase-14-Assessment-Spec.md`

---

### ✅ Phase 15/15&16: Session Feedback & Email Delivery

**Goal:** Automated session feedback pipeline with AI generation and email delivery to parents.

**Completed:** February 20, 2026.

**Implementation:**

- SessionFeedback type and Firestore CRUD
- AI feedback generation API (MiniMax, with provider picker for DeepSeek/Claude)
- Session feedback prompts (parent-friendly, no jargon)
- Inline feedback UI in T-portal calendar dialog (notes → generate → edit → translate → Save & Send)
- Translation via DeepSeek (ZH/PT)
- Resend email integration (notifications@updates.kiddoland.co, reply-to: kiddo@kiddoland.co)
- HTML email templates with Kiddoland purple branding (session feedback, parent report, session reminder)
- Email wired to Save & Send on both feedback and assessment pages
- "Write Feedback" button on completed sessions in L profile sessions tab

**Email Templates Built:**

- `sessionFeedbackEmail` — after-session report for parents
- `parentReportEmail` — assessment/evaluation report for parents
- `sessionReminderEmail` — 24-hour reminder (template ready, trigger not wired)

---

### ✅ Phase 15-C: Admin Import Tools

**Goal:** Import existing learner session history and unit plans from external sources.

**Completed:** February 20, 2026.

**Implementation:**

- Admin import page at `/admin/import` (admin-only: jwag.lang@gmail.com)
- Two tabs: Learner History import + Unit Plan (UPT) import
- Claude prompt templates for converting Obsidian notes and UPT output to JSON
- Learner import writes to `sessionFeedback` + `importedPayments` collections
- Unit import writes to `units` + `sessions` collections with full lesson plan data
- All imports tagged with `source: 'obsidian_import'` or `source: 'upt_import'`

---

### ✅ Phase 15-D: iCal Calendar Export

**Goal:** Allow T and L to sync their LL calendar with external calendars.

**Completed:** February 20, 2026.

**Implementation:**

- `/api/calendar/ical/tutor/route.ts` — T calendar iCal feed
- `/api/calendar/ical/learner/route.ts` — L calendar iCal feed
- "Copy Calendar Link" buttons on both T-portal and S-portal calendar pages
- Standard .ics format compatible with Google Calendar, Apple Calendar, Outlook

---

### ✅ Phase 15-E: Learner Settings Page

**Goal:** Provide learners a path to complete their profile post-signup (birthday, gender, school, messaging contacts, parent/guardian info).

**Completed:** February 24, 2026.

---

### ✅ Booking Gate & T-Selection Flow

**Goal:** Allow Ls to book sessions without T pre-assigning a unit. Enable Ls to browse and request Ts through the UI.

**Completed:** March 3, 2026

---

### ✅ Phase 15-B: Homework System

**Goal:** T assigns homework linked to sessions, L/parent uploads JSON results from external Kiddoland workbooks, T grades, LL tracks accuracy in `studentProgress`.

**Completed:** March 24, 2026. Email attachment added April 1.

**Spec Document:** `LessonLink-Phase-15B-Homework-Spec.md`

---

### ✅ Phase 16: Petland Pet Shop & Dork Economy

**Goal:** Build end-to-end pet shop system with Dork Economy (XP ↔ Dorks conversion) for Petland reward integration.

**Completed:** April 12–13, 2026. All features end-to-end tested and production-ready.

- ✅ Pet Shop core feature (create → browse → purchase → wear) — AI image generation via Gemini
- ✅ Firebase Storage with signed URL authentication
- ✅ Collection Management System — 14-icon theme system, three-view toggle, collapsible collections
- ✅ Dork Economy — XP ↔ Dorks Cash-In Station, denomination display (Gold/Silver/Copper), critical math bug fixed
- ✅ xpSpent backfill — completed Q47 for all active learners (Arina, Luke, Gordon, Mark)

---

### ✅ Phase 17A: Live Session Background & Rewards (Partial)

**Goal:** Full-screen display page T shows via ManyCam during live sessions. Kids see immersive game screen, not a dashboard.

**Status:** ✅ Core complete (Q4G). Grammar/phonics diary inputs and session-end flow still pending.

**Route:** `/t-portal/sessions/live/[sessionInstanceId]`

**Completed (Steps 1–9, 11):**
- ✅ Types in `src/lib/types.ts`
- ✅ Route + page shell
- ✅ Space background (twinkling stars, comets, 3 planets with Saturn ring illusion, nebulas)
- ✅ Display layout (top/left/right/bottom/center)
- ✅ All 7 reward animations (Treasure Chest, Wow, Boom, Oopsie, Out-to-lunch, Chatterbox, Disruptive)
- ✅ Content addition dialogs — vocab wired to Firestore
- ✅ Firestore integration (`sessionProgress` collection)
- ✅ Session initialization (link to lesson plan data, practice mode)
- ✅ Magic Word input (wired to Firestore via `updateSessionGoals`)

**Remaining:**
- ⬜ Grammar/phonics diary inputs → Firestore (`addSessionGrammar`, `addSessionPhonics`)
- ⬜ Session End button + `endSession()` flow
- ⬜ End-of-session scoreboard/summary overlay (Phase 17C)
- ⬜ Ocean/Farm/Desert/City backgrounds (one per week; Ocean next)

**Five Themed Backgrounds:**
- 🌌 Space — ✅ **COMPLETE**
- 🌊 Ocean — not started (next)
- 🌾 Farm — not started
- 🏜️ Desert — not started
- 🏙️ City — not started

**Deploy note:** `firebase deploy --only firestore:rules` needed for `phonicsRepository` rules (added Q4G).

---

### ✅ Phase 17B: Review System Integration → Petland

**Goal:** Automatically push classroom vocabulary/grammar/phonics into Petland's spaced repetition system after session ends.

**Status:** ✅ **COMPLETE** (confirmed Q47) — grammar/phonics from live sessions already wired into unified SRS flashcard review in Petland. No additional build required.

---

### 🔧 Phase 17C: End-of-Session Scoreboard

**Goal:** Celebratory scoreboard overlay when session ends — total XP, reward breakdown, behavior summary, celebration animations.

**Status:** ⬜ Not started. **Next priority after grammar/phonics diary inputs.**

**Implementation:**

- [ ] Scoreboard overlay triggered on session close
- [ ] Total XP + breakdown (Treasure Chest, Wow count, Oopsie count, behavior deductions, vocab/grammar/phonics counts)
- [ ] Celebration animations for high performance
- [ ] Comparison to last 3 sessions (personal record badge)
- [ ] Persist `sessionScoreboard` data for historical tracking
- [ ] Link to Phase 18 (Check-up page) for trend visualization

---

### ✅ Kiddoland Landing Page — `/kiddoland` (Q47)

**Goal:** Public marketing page for Kiddoland, hosted inside LessonLink repo. No auth required.

**Completed:** April 19, 2026.

**Route:** `src/app/kiddoland/page.tsx` (server component, no 'use client')

**Sections:** Sticky nav, hero (Logo Star Big.png with marble bounce physics animation), About Jon (bio + stats), Program (cyclical learning + 6 dragon levels), Courses (4 types), Media (4 logos), CTA + footer.

**All CTAs** → `/` (LessonLink signup page).

**Pending:**
- [ ] Real photo of Jon → replace placeholder in About section
- [ ] DNS: kiddoland.co → /kiddoland (Captain configures)

**Architecture:**
```
kiddoland.co            → /kiddoland    (public marketing)
kiddoland.co/ or /app   → /             (LessonLink login)
kiddoland.co/petland    → /petland      (future kids portal)
```

---

### 🔧 Curriculum-Building Architecture (Phases A/B/C)

**Goal:** Transform LL from session-management into a curriculum-building platform. Reusable homework templates on units, provider-agnostic AI layer, and three integrated modules (KTFT/KCBT/KUPT).

**Status:** Specs complete (March 23–29, 2026). Build not started.

**Spec Documents:**
- `LessonLink-Curriculum-AI-Architecture-Spec-Q3N.md` — main spec
- `LessonLink-Module-Architecture-KTFT-KCBT-KUPT-Q3S.md` — module split spec

**Three Modules (all inside LL):**

- **KTFT** — universal pedagogical reference. Seven dragon levels, Robinson dimensions, 4-track system, linguistic emergence.
- **KCBT** — per-course planning. Course aims, unit slots, communicative targets, track assignments, build status. Backed by `courseBlueprint` Firestore collection.
- **KUPT** — per-unit design. Currently external HTML tool. Stacked for LL integration (requires stable AI layer).

**Phase A: Foundation (Build First)**
- [ ] A1–A4: HomeworkTemplate, VocabularyMasteryRecord, AI types, templateId on HomeworkAssignment
- [ ] A5–A8: Firestore CRUD, rules, indexes for new collections
- [ ] A9: CourseBlueprint, LevelBlueprint, UnitBlueprint types
- [ ] A10: Blueprint Firestore CRUD
- [ ] A11: Firestore rules for courseBlueprints
- [ ] A12: KTFT seed data file (static data from KTFT v6)

**Phase B: AI Integration Layer (Build Second)**
- [ ] B1–B10: Provider adapters (Claude, DeepSeek, MiniMax, Qwen, OpenAI-compatible), resolver, usage logging

**Phase C: UI (Build Third)**
- [ ] C1–C13: HW template management, KTFT reference page, KCBT blueprint UI

**Stacked:** Phase D (Vocab Tracker), Phase E (AI Advisor), Phase F (Admin AI Settings), KUPT integration

---

### ⬜ Phase 18: Enhanced Progress ("Check-up" Page)

**Status:** Stacked until Phases 17/17C complete.

- **Theme:** Kiddoland Doctor gives student a checkup
- **Sections:** Vital Signs, Health Report, Performance Review, Prescription (AI recommendations)

---

### ⬜ Phase 19–23: Email System, Onboarding, Mobile, Hardening, Advanced

*(See full roadmap archive for detailed specs.)*

---

## TECHNICAL INFRASTRUCTURE

### Current Stack

| Layer              | Technology                    | Purpose                       |
| ------------------ | ----------------------------- | ----------------------------- |
| **Framework**      | Next.js 15.5.9 (App Router)  | Full-stack React framework    |
| **Language**       | TypeScript 5.x               | Type-safe development         |
| **Styling**        | Tailwind CSS 3.4.1 + shadcn/ui | UI components and styling   |
| **Database**       | Firebase Firestore            | NoSQL cloud database          |
| **Authentication** | Firebase Authentication       | Email/password auth           |
| **Payments**       | Stripe (Checkout + Webhooks)  | Package purchases, payment links |
| **AI**             | DeepSeek (primary), MiniMax (failover), Claude (ready) | Assessment analysis, reports, translation |
| **Hosting**        | Netlify (from GitHub)         | Production deployment         |
| **Version Control**| Git + GitHub                  | Code repository               |
| **Server-Side**    | Firebase Admin SDK            | Secure webhook writes         |
| **Node.js**        | v24 LTS (pinned via `.node-version`) | Runtime — ⛔ DO NOT UPDATE without testing |

### AI Provider System

| Provider | Status | Use Case | Config Key |
| -------- | ------ | -------- | ---------- |
| **DeepSeek** | ✅ Primary | Assessment analysis, parent reports, session feedback, translation (ZH/PT) | `DEEPSEEK_API_KEY` |
| **MiniMax M2.5** | ⚠️ Failover | Failover target (empty response issue, likely balance) | `MINIMAX_API_KEY` |
| **Claude (Anthropic)** | 🔧 Ready | Premium tasks (when API key added) | `ANTHROPIC_API_KEY` |
| **Kimi** | 🔧 Ready | Alternative provider | `KIMI_API_KEY` |

---

## ROUTES STRUCTURE

| Route            | Purpose                          | Access                          |
| ---------------- | -------------------------------- | ------------------------------- |
| `/`              | Landing page with dual login     | Public                          |
| `/kiddoland`     | Kiddoland public marketing page  | Public                          |
| `/t-portal/`     | Teacher dashboard and management | Teacher only                    |
| `/s-portal/`     | Student portal and booking       | Students only                   |
| `/admin/`        | Platform administration          | Admin only (jwag.lang@gmail.com)|
| `/t/[slug]`      | Public teacher profiles (auth-aware) | Public + logged-in S        |

### Teacher Portal Routes

- `/t-portal/` — Dashboard
- `/t-portal/students` — Learner roster [Who]
- `/t-portal/students/[id]` — Learner profile with tabs [Who + What + When + How]
- `/t-portal/calendar` — Calendar and availability [When]
- `/t-portal/courses` — Course templates [What]
- `/t-portal/chat` — Teacher messaging [Cross-cutting]
- `/t-portal/approvals` — Approval requests
- `/t-portal/settings` — Teacher settings
- `/t-portal/packages` — Package management [How]
- `/t-portal/sessions/live/[sessionInstanceId]` — Live Session Page (Phase 17, ManyCam display)

### Student Portal Routes

- `/s-portal/` — Dashboard
- `/s-portal/calendar` — Session booking [When]
- `/s-portal/chat` — Messaging [Cross-cutting]
- `/s-portal/courses` — My Units, Browse, Feedback, Evaluations, My Package [What + How]
- `/s-portal/tutors` — My Tutor, Browse Tutors [Who]
- `/s-portal/settings` — Learner profile settings
- `/s-portal/top-up` — Package purchase page
- `/s-portal/checkup` — Progress page (Phase 18) [What]
- `/s-portal/homework` — Homework list view

---

## ENVIRONMENT SAFETY RULES

⛔ **NEVER update Node.js, npm, Python, or any system-level tool without checking compatibility first.**

On March 1, 2026, a routine Glary Utilities run auto-updated Node.js from v24 LTS to v27, silently breaking the Firebase Admin SDK. Stripe webhook returned 500 errors and took an entire day to diagnose.

**Rules:**

1. **Node.js:** ONLY use LTS versions. Currently pinned to v24 LTS via `.node-version`. Never accept "update available" prompts.
2. **Glary Utilities / system cleaners:** Exclude Node.js, npm, Python, and Git from auto-updates.
3. **npm packages:** Only run `npm update` or `npm install [package]` when specifically needed and discussed with Claude first.
4. **Before any debugging session:** If a previously working feature suddenly breaks, FIRST ask "Did anything change in my environment?" Check `node --version`.
5. **Netlify Node version:** Controlled by `.node-version` file. Currently `24`. Do not change without testing.

---

## DEBUGGING PROTOCOL (Added March 1, 2026)

1. **FIRST:** Check environment — `node --version`, recent system updates, recent npm installs
2. **SECOND:** Test locally with `npm run dev` before burning Netlify deploys
3. **THIRD:** For webhook debugging, use Stripe CLI locally
4. **FOURTH:** Only deploy to Netlify after confirming the fix works locally
5. **NEVER** iterate debugging on production deploys

---

## KNOWN ISSUES & WORKAROUNDS

- ✅ ~~AI_USE_MOCK~~ — **AI_USE_MOCK=false**. DeepSeek live in production.
- ✅ ~~Resend domain verification~~ — DNS fully verified. Sending operational.
- ✅ ~~Stripe webhook 500 errors~~ — Fixed March 1. Node 24 LTS pinned.
- ✅ ~~xpSpent missing field~~ — Backfilled for all active learners (Q47).
- ⚠️ **Booking flow requires courseId** — UX from Top Up → Book not seamless yet.
- ⚠️ **Calendar tab-switch refresh** — Availability doesn't re-fetch when switching tabs. Requires page reload.
- ⚠️ **MiniMax returns empty responses** — likely balance/credits issue. Not blocking (DeepSeek is primary).
- ⚠️ **No Anthropic API key** — Claude failover target inactive without `ANTHROPIC_API_KEY` in env.
- ⚠️ **Session reminder trigger** — Email template built but no cron/scheduled function to fire it.
- ⚠️ **Firestore rules for scheduleTemplates** — currently `allow read, write: if true`. Tighten to `request.auth != null` when stable.
- ⚠️ **Dead API routes** — `/api/homework/[id]/upload-results` and `/api/homework/[id]/grade` are unused. Deletion pending.
- ⚠️ **Gordon `studentProgress.unitId`** — currently `'starter'`. Captain must update to actual unit in Firebase Console.
- ⚠️ **Kiddoland landing page photo** — placeholder in About section. Captain to supply real photo of Jon.

---

## PACKAGE STRUCTURE

| Package Type             | Description                  | Content                     | Discount | Use Case                                        |
| ------------------------ | ---------------------------- | --------------------------- | -------- | ------------------------------------------------ |
| **Single Session**       | Trial or makeup              | 1 session                   | 0%       | New students, one-off makeup                     |
| **10-Pack**              | Short-term commitment        | 10 hours = 4 units          | 10%      | Most common package                              |
| **Full Course (60 hrs)** | Complete proficiency level   | 60 hours = 24 units         | 20%      | Serious learners completing A1, A2, B1, etc.     |

---

## XP BUDGET PER LEVEL

**Minimum 5,000 XP to complete one level.** 60% Engagement / 40% Mastery.

| Source | Pillar | Max XP | % of Total |
|--------|--------|--------|------------|
| Treasure Chests (in-session) | Engagement | ~1,800 | 30% |
| Petland SRS practice | Engagement | ~1,200+ | 20%+ |
| Homework | Mastery | ~800 | 13% |
| TBLT evaluations (×20) | Mastery | ~720 | 12% |
| Midterm evaluation | Mastery | ~240 | 4% |
| Final evaluation | Mastery | ~240 | 4% |

---

## DORK ECONOMY

| XP | Copper | Silver | Gold |
|----|--------|--------|------|
| 1 | 1 | — | — |
| 10 | 10 | 1 | — |
| 100 | 100 | 10 | 1 |

All balances stored in Firestore as integers (Copper). Gold/Silver/Copper is a display layer only.

---

## CURRENT STATUS (April 19, 2026 — Updated Q47)

- ✅ **Phases 1–16:** Complete and production-ready
- ✅ **Phase 17A:** Core live session + all 7 reward animations + vocab → Firestore wired. Grammar/phonics diary + session-end flow pending.
- ✅ **Phase 17B:** Review system confirmed wired into SRS (grammar/phonics already flowing from live sessions).
- ✅ **Dork Economy + xpSpent:** Complete and backfilled for all active learners.
- ✅ **Sidebar collapse:** Both portals — icon rail on collapse, hover to expand, cascade animation. OPEN_DELAY 200ms.
- ✅ **iPad responsiveness:** Calendar, Petland, Live Session panels, S/T dashboards all responsive at 768px+.
- ✅ **Kiddoland landing page:** `/kiddoland` — full marketing page with marble bounce hero, dragon levels, courses, media logos.
- ✅ **Enrollment flow:** Trial → active pipeline fully wired. All 4 real learners clean.
- 🔧 **In progress:** Phase 17 — grammar/phonics diary inputs → session-end flow → Phase 17C scoreboard
- ⬜ **Stacked:** Phases A/B/C (Curriculum AI), Phases 18–23, Language translation, Ocean/Farm/Desert/City themes (Ocean next)
- **Next session:** Grammar/phonics diary inputs → `endSession()` → Phase 17C scoreboard → Ocean background
- **Captain action items:** Create courses in Firebase Console for Arina/Luke/Gordon/Mark → update `studentProgress.unitId`; configure DNS kiddoland.co → /kiddoland; supply real photo of Jon for landing page
