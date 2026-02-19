# LessonLink | Complete Roadmap

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

### ✅ Phase 13: Stripe Integration

**Goal:** S can purchase packages via Stripe Checkout. T can send payment links.

**Completed:** February 18, 2026. Stripe checkout + webhook E2E verified. Firebase Admin SDK added for server-side writes.

#### Key Decisions

- **Dynamic `price_data`** — pricing engine in code, NO pre-created Stripe products
- **One T profile page** (`/t/[slug]`) — auth-aware, shows purchase UI for logged-in S
- **Two payment paths:** Stripe Checkout redirect (default) + email payment link (fallback for China/WeChat)
- **3% processing fee** shown to S, baked into calculated total
- **Purchase and booking stay separate** (Variant-1 compliant)
- **NO Stripe Connect** (single-teacher, not needed)
- **NO legacy pricing overrides,** promo codes, or upgrade credits (future)

**Spec Document:** `LessonLink-Phase-13-Stripe-Spec-Q2G.md`

---

### ⏳ Phase 14: Evaluations & Assessments

**Goal:** Record and analyze initial/final assessments for each unit using Strong TBLT criterion-referenced framework (Long/Norris). AI assists with analysis. Before/after comparison with cited L output.

**Status:** ⏳ Finalize button wired and tested. Parent report generation + real MiniMax API testing remain. Step 8 deferred.

**Spec Document:** `LessonLink-Phase-14-Assessment-Spec.md`

#### Implementation Steps

1. [x] Types: `AssessmentReport`, `OutputCitation`, `GseBand`, `AiAnalysis`, `ParentReport`, `AiProviderConfig` in `types.ts`; updated `StudentProgress`; cleaned `Unit`
2. [x] Firestore functions: CRUD for `assessmentReports` + `finalizeAssessmentReport`
3. [x] T-portal UI: Assessment creation form with scoring panel + citation builder
4. [x] AI integration: Multi-provider abstraction (MiniMax active, Claude/DeepSeek/Kimi ready) + API route with mock mode
5. [x] T-portal UI: Before/after comparison view
6. [x] S-portal UI: Evaluation report view under `/s-portal/evaluations`
7. [x] studentProgress integration: link assessments, update `assessmentScoreAvg`, GSE bands
8. [ ] Recording expunge: Cloud Function for timed deletion (deferred — needs Cloud Functions infrastructure)
9. [x] GSE mapping helper: utility function for scores → GSE band

#### Remaining Work (next session)

- [ ] Wire "Generate Parent Report" button (post-finalize, AI rewrites for parents)
- [ ] Test with real MiniMax API (`AI_USE_MOCK=false`)
- [ ] End-to-end test: create assessment → AI analysis → finalize → verify studentProgress

---

### ⬜ Phase 15: Homework System

**Goal:** Automated homework delivery and grading with gamified worksheets.

**Implementation:**

- [ ] Create homework templates linked to sessions
- [ ] Post-session T prompt: after session completion, prompt T to write quick notes on the session
- [ ] T notes → AI + template → generate session feedback report (parent-friendly, in T's voice)
- [ ] T reviews AI draft → approves → sent to L/parent
- [ ] Auto-prompt homework after session completion (linked to the session just completed)
- [ ] Student submission interface
- [ ] Teacher grading interface
- [ ] Accuracy tracking
- [ ] Update `studentProgress` with homework stats

---

### ⬜ Phase 16: AI-Powered Feedback

**Goal:** Use AI to generate professional session feedback in teacher's voice.

**Implementation:**

- [ ] Design feedback prompt template
- [ ] Add teacher "AI voice" settings (tone, style preferences)
- [ ] After session completion, generate draft feedback
- [ ] Teacher review and edit before sending
- [ ] Send via email (SendGrid / Mailgun)
- [ ] Store feedback in `sessionFeedback` collection
- [ ] Display feedback history in student portal

**Note:** Multi-provider AI abstraction already built in Phase 14. Add `session_feedback` task to `TASK_PROVIDERS` config.

---

### ⬜ Phase 17: Petland Integration & Holistic Progress System

**Goal:** Integrate Petland reward system with LL to create a unified, real-time progress assessment that combines class participation, independent practice, formal assessments, and session attendance into one holistic view.

**Context:** Petland is a separate Firebase app that tracks student engagement outside of class (vocabulary review games, RPG activities). It generates XP (time-based measure of practice hours) and HP (accuracy/health from games). LL tracks session attendance (credit system), formal assessments (evaluations), and homework. Together, these systems provide a complete picture of student progress toward the ~200 hours per level needed to pass a proficiency level.

#### Progress Model — Three Pillars

**Pillar 1: Session Attendance (LL Credit System — already built)**

- Hours booked, completed, remaining via `studentCredit`
- Session completion tracked via `sessionInstances`
- Contributes to the ~200 hours/level target

**Pillar 2: Independent Practice (Petland — external, synced via webhook)**

- XP = measure of time spent practicing/learning outside class
- HP = accuracy/engagement score from Petland games (vocab reviews, RPG)
- One-way sync: Petland → LL via `POST /api/rewards/sync`
- XP contributes to the ~200 hours/level target alongside session hours
- Source of truth for XP/HP: Petland (LL displays only, with optional manual T adjustments stored locally)

**Pillar 3: Formal Assessment (LL — Phases 14 + 15)**

- Unit evaluations: initial + final assessment scores (Phase 14) ✅
- Homework accuracy tracking (Phase 15)
- AI-generated assessment reports (Phase 14) ✅

#### Implementation

- [ ] Build `/api/rewards/sync` webhook endpoint to receive XP/HP from Petland
- [ ] Create `studentRewards` collection (or extend existing) for XP/HP display data
- [ ] Define the holistic progress formula: how session hours (credit system) + XP (Petland) + assessment scores + homework accuracy combine into an overall progress measure
- [ ] Build unified progress calculation engine that pulls from all three pillars
- [ ] T-portal: progress overview on learner Profile & Progress tab (currently shows placeholder rewards card)
- [ ] S-portal: real-time progress display on dashboard

---

### ⬜ Phase 18: Enhanced Progress ("Check-up" Page)

**Goal:** Create engaging, themed progress dashboard with visual analytics — the parent/student-facing showcase of the holistic progress system built in Phase 17.

**"Check-up" Page Concept:**

- **Theme:** Kiddoland Doctor gives student a checkup
- **Aesthetic:** Medical chart style (clipboard, stethoscope icons)
- **Sections:**
  - **Vital Signs:** Total hours toward level (sessions + XP practice hours) out of ~200
  - **Health Report:** HP status (from Petland), session attendance rate
  - **Performance Review:** Homework accuracy, assessment scores, evaluation before/after
  - **Prescription:** AI-generated recommendations for improvement

**Implementation:**

- [ ] Create `/s-portal/checkup` route with doctor theme
- [ ] Visual charts: progress over time, accuracy trends, hours breakdown (class vs. independent)
- [ ] Calculate weighted accuracy: `homeworkAccuracyAvg`, `assessmentScoreAvg`, `evaluationScoreAvg`
- [ ] AI recommendations based on performance across all three pillars
- [ ] Exportable progress report PDF for parents

---

### ⬜ Phase 19: Transactional Email System

**Goal:** Automated email delivery for all system events.

**Implementation:**

- [ ] Email provider integration (SendGrid or Mailgun)
- [ ] Welcome email on S signup
- [ ] Payment receipt after Stripe purchase
- [ ] Session reminder (24 hours before)
- [ ] Session completion summary (for parent)
- [ ] Homework delivery email with link to submission
- [ ] Feedback report delivery
- [ ] Package expiration warning (7 days before)
- [ ] Progress report (monthly or per-unit)

---

### ⬜ Phase 20: Onboarding & First-Time Experience

**Goal:** Guided flow from signup to first booked session.

**Implementation:**

- [ ] S signup → welcome screen with next steps
- [ ] T profile auto-creation on first login (currently manual)
- [ ] Guided first purchase flow (S lands on T profile → selects package → Stripe → confirmation)
- [ ] First session booking prompt after purchase
- [ ] T onboarding: profile setup wizard, first unit creation, first S invitation
- [ ] Empty state handling across all pages (no sessions yet, no packages, no units)

---

### ⬜ Phase 21: Mobile Responsiveness

**Goal:** Full mobile support for S-portal (parents checking on phones, especially in WeChat browser).

**Implementation:**

- [ ] Responsive audit of all S-portal pages
- [ ] Responsive audit of T-portal pages
- [ ] WeChat in-app browser testing (critical for Chinese customers)
- [ ] Touch-friendly interactions (calendar, booking, chat)
- [ ] Mobile navigation pattern (bottom nav or hamburger)

---

### ⬜ Phase 22: Platform Hardening

**Goal:** Production-readiness: error handling, edge cases, admin tools, legal.

**Implementation:**

- [ ] Error boundaries on all major pages
- [ ] Payment failure handling (Stripe webhook retry, failed payment UI)
- [ ] Missed webhook recovery (manual reconciliation tool for T or admin)
- [ ] Admin dashboard: user management, revenue overview, system health
- [ ] Firestore backup strategy (scheduled exports)
- [ ] Data export for T (student records, payment history)
- [ ] Terms of Service page
- [ ] Privacy Policy page
- [ ] Rate limiting on API routes

---

### ⬜ Phase 23: Advanced Features

**Potential Future Enhancements:**

- Multi-teacher platform support
- Teacher discovery and selection flow
- Multi-currency support with currency conversion
- Advanced analytics dashboard with business intelligence
- Automated reminders via email and SMS
- Mobile app for on-the-go management
- Google Calendar API integration (auto-sync sessions)
- In-class performance tracking (post-class surveys)
- AI-powered curriculum recommendations

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
| **AI**             | MiniMax M2.5 (active), Claude/DeepSeek/Kimi (ready) | Assessment analysis, reports |
| **Hosting**        | Netlify (from GitHub)         | Production deployment         |
| **Version Control**| Git + GitHub                  | Code repository               |
| **Server-Side**    | Firebase Admin SDK            | Secure webhook writes         |

### AI Provider System (Phase 14)

| Provider | Status | Use Case | Config Key |
| -------- | ------ | -------- | ---------- |
| **MiniMax M2.5** | ✅ Active | Assessment analysis, parent reports | `MINIMAX_API_KEY` |
| **Claude (Anthropic)** | 🔧 Ready | Premium tasks (when API key added) | `ANTHROPIC_API_KEY` |
| **DeepSeek** | 🔧 Ready | Affordable alternative | `DEEPSEEK_API_KEY` |
| **Kimi** | 🔧 Ready | Alternative provider | `KIMI_API_KEY` |

Task routing configured in `src/lib/ai/providers.ts` → `TASK_PROVIDERS` object.

### Planned Integrations

- **Email:** SendGrid or Mailgun (Phase 19) for transactional emails
- **Rewards:** Petland webhook (Phase 17) for XP/HP sync
- **Calendar:** Google Calendar API (Phase 23) for automatic session sync

---

## ROUTES STRUCTURE

| Route            | Purpose                          | Access                          |
| ---------------- | -------------------------------- | ------------------------------- |
| `/`              | Landing page with dual login     | Public                          |
| `/t-portal/`     | Teacher dashboard and management | Teacher only                    |
| `/s-portal/`     | Student portal and booking       | Students only                   |
| `/admin/`        | Platform administration          | Admin only (jwag.lang@gmail.com)|
| `/t/[slug]`      | Public teacher profiles (auth-aware) | Public + logged-in S        |

### Teacher Portal Routes

- `/t-portal/` — Dashboard
- `/t-portal/students` — Learner roster with status filter [Who]
- `/t-portal/students/[id]` — Learner profile page with tabs [Who + What + When + How]
- `/t-portal/students/[id]/assessments/new` — Create new assessment [What]
- `/t-portal/students/[id]/assessments/compare` — Before/after comparison [What]
- `/t-portal/calendar` — Calendar and availability [When]
- `/t-portal/courses` — Course templates (levels: A1, A2, B1, etc.) [What]
- `/t-portal/courses/[id]/levels/[levelId]/units` — Manage units within course [What]
- `/t-portal/courses/[id]/levels/[levelId]/units/[unitId]/sessions` — Manage sessions [What]
- `/t-portal/chat` — Teacher messaging interface [Cross-cutting]
- `/t-portal/approvals` — Approval requests
- `/t-portal/settings` — Teacher settings
- `/t-portal/settings/profile` — Public profile editor
- `/t-portal/packages` — Package management [How]
- `/t-portal/reports` — Reports

### Student Portal Routes

- `/s-portal/` — Dashboard (summary cards from all domains)
- `/s-portal/calendar` — Session booking [When]
- `/s-portal/chat` — Messaging (Notifications + Communications) [Cross-cutting]
- `/s-portal/units` — My Units [What]
- `/s-portal/feedback` — Session feedback history [What]
- `/s-portal/evaluations` — Assessment results [What]
- `/s-portal/packages` — My Packages + credit balances [How]
- `/s-portal/t-profiles` — Browse Tutors [Who]
- `/s-portal/tutors/my-tutor` — My Tutor profile [Who]
- `/s-portal/checkup` — "Doctor's Checkup" progress page (Phase 18) [What]

### API Routes

- `/api/stripe/checkout` — POST: Create Stripe Checkout Session
- `/api/stripe/webhook` — POST: Handle `checkout.session.completed`
- `/api/stripe/send-link` — POST: Generate 24-hour payment link URL
- `/api/ai/analyze-assessment` — POST: AI assessment analysis (multi-provider)
- `/api/rewards/sync` — POST: Receive XP/HP updates from Petland (Phase 17)

---

## PACKAGE STRUCTURE

**Based on documented pricing scheme:**

| Package Type             | Description                  | Content                     | Discount | Use Case                                        |
| ------------------------ | ---------------------------- | --------------------------- | -------- | ------------------------------------------------ |
| **Single Session**       | Trial or makeup              | 1 session                   | 0%       | New students, one-off makeup                     |
| **10-Pack**              | Short-term commitment        | 10 hours = 4 units          | 10%      | Most common package                              |
| **Full Course (60 hrs)** | Complete proficiency level   | 60 hours = 24 units         | 20%      | Serious learners completing A1, A2, B1, etc.     |

**Kiddoland Unit Plan (Structured Learning):**

- Each unit = 4-5 sessions (30-min sessions, so 2-2.5 hours per unit)
- 10-pack = 10 hours = 4 units
- Full course (60 hours) = 24 units = complete proficiency level (A1, A2, etc.)
- 60-75 hours per level (varies by student)
- ~200 hours total per level (sessions + independent practice via Petland)

---

## CURRENT STATUS

- **Phase 12:** ✅ Complete (February 15, 2026)
- **Phase 13:** ✅ Complete (February 18, 2026). Stripe checkout + webhook E2E verified. Firebase Admin SDK added for server-side writes.
- **Phase 14:** ⏳ Finalize button wired and tested. Parent report generation + real MiniMax API testing remain. Step 8 deferred.
- **Next:** Phase 14 testing + parent report wiring → Phase 15
- **Repository:** https://github.com/jwaglang/lessonlink
- **Admin Email:** jwag.lang@gmail.com
- **Dev Environment:** VSCode + MiniMax M2.5 for code execution and codebase searches. Claude (Anthropic) for planning and architecture.

**External Work:**

- Course curriculum being built in separate "kiddoland tools" sessions
- Petland reward system is separate Firebase app (sends data to LL via webhook — Phase 17)

**Known Issues:**

- ⚠️ T profile data sparse in Firestore — avatar, reviews, experience, credentials need re-seeding
- ⚠️ AI_USE_MOCK=true — real MiniMax API not tested yet
- ⚠️ 55 pre-existing TypeScript errors (none from Phase 14)
- ⚠️ `.toFixed` bug on S-portal packages page (numeric field from webhook write may be wrong type)

---

**Last Updated:** February 18, 2026

**Version:** 4.3 — Phase 13 complete, Phase 14 finalize button wired, Firebase Admin SDK added