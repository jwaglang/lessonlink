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

### ✅ Phase 13: Stripe Payments

**Goal:** Stripe Checkout integration for package purchases.

**Completed:** February 18, 2026. Stripe checkout + webhook E2E verified. Firebase Admin SDK added for server-side writes. **Webhook production fix March 1** (Node version).

#### Key Decisions

- **Dynamic `price_data`** — pricing engine in code, NO pre-created Stripe products
- **One T profile page** (`/t/[slug]`) — auth-aware, shows purchase UI for logged-in S
- **Two payment paths:** Stripe Checkout redirect (default) + email payment link (fallback for China/WeChat)
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

#### Remaining Work

- [x] Wire "Generate Parent Report" button (post-finalize, AI rewrites for parents)
- [x] Test with real MiniMax API (`AI_USE_MOCK=false`)
- [ ] End-to-end test: create assessment → AI analysis → finalize → verify studentProgress

---

### ✅ Phase 15/16: Session Feedback & Email Delivery

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

**Implementation:**

- L Settings page at `/s-portal/settings` — replaced empty "Account settings coming soon!" placeholder
- 6 cards: Account Info, Learner Details, Messaging Contacts, Primary Contact, Secondary Contact
- All signup fields now editable post-signup
- Conditional required logic — parent contact required if under 18 (red asterisks + yellow warning banner)
- Messaging contacts use add/remove dialog pattern (Option B — structured data, not comma-separated)
- Parent contact dialog includes ALL 10 fields from signup
- School field with DB update note (program type + grade coming later)
- Firestore undefined bug fixed — conditional spread pattern (`...(value && {field: value})`) instead of `|| undefined`
- Nested undefined bug fixed — `cleanContact()` helper strips undefined from ParentContact fields
- Gender field alignment — lowercase values (`boy`, `girl`, `other`), removed unauthorized "Prefer not to say"
- Firestore security rules fixed — added `|| isOwner(studentId)` to students update rule (was blocking saves)
- T Settings design patterns mirrored — cards, icons, save button, success/error banner, gradient titles

**Files Modified:**

- `src/app/s-portal/settings/page.tsx` — Complete rebuild
- `firestore.rules` (line ~52) — Added `|| isOwner(studentId)` to students update/delete rule

---

### ✅ Booking Gate & T-Selection Flow

**Goal:** Allow Ls to book sessions without T pre-assigning a unit. Enable Ls to browse and request Ts through the UI.

**Completed:** March 3, 2026

**Architecture Changes:**

- `bookLesson()` gate replaced: was `studentProgress` query → now `assignedTeacherId` + `studentCredit` check
- `reserveCredit()` called at booking time (was defined but never wired up)
- `unitId`, `sessionId`, `courseId` optional on `bookLesson()` input and `SessionInstance` type
- `teacherUid` on calendar page derived from `student.assignedTeacherId` (was hardcoded email)
- Firestore rules: Ls can update own `studentCredit` (restricted to uncommitted ↔ committed shifts)

**T-Selection Flow:**

- `tutor_assignment` type added to `ApprovalRequestType`
- Browse Tutors page: three-state card rendering (My Tutor / Request Pending / Request button)
- `resolveApprovalRequest()`: sets `assignedTeacherId` on approval, sends in-app notification
- T-portal approvals page: handles new type with label, icon, confirmation dialogs

**Credit Lifecycle (now fully wired):**

- Purchase → `uncommittedHours` (via Stripe webhook)
- Book → `uncommittedHours` decremented, `committedHours` incremented (via `reserveCredit()` in `bookLesson()`)
- Complete → `committedHours` decremented, `completedHours` incremented (via `completeSession()`)

**Known Issues:**

- Old T profile `A9YKGu2jOgRAEVtR8n0E` — stacked, contains seed data for migration. Disabled in Firestore.
- E2E approval flow needs fresh retest (first test had wrong `teacherUid` from old profile)
- `isNewStudent` field on Melinda's doc disagrees with `isNewStudent()` function return value

---

### ✅ Phase 15-B: Homework System

**Goal:** T assigns homework linked to sessions, L/parent uploads JSON results from external Kiddoland workbooks, T grades, LL tracks accuracy in `studentProgress`.

**Completed:** March 24, 2026. T assigns homework, L/T uploads JSON, T grades. Client-side Firestore pattern (no API routes for DB writes). teacherInstructions field added. **Email attachment added April 1** — T can attach HTML workbook/worksheet to homework email. File size guard at 6MB. Email failure warning toast. Status flips to 'delivered' on successful email send.

**Spec Document:** `LessonLink-Phase-15B-Homework-Spec.md`

**Architecture Decision:** Kiddoland workbook/worksheet HTML mini-apps stay independent. LL handles the assign → notify → collect → grade → track pipeline only. Database writes go client-side (T is logged in). API routes only for server secrets (emails). This pattern prevents the permission bug from recurring.

**Files from build:**
- `src/app/api/homework/assign/route.ts` — email-only route (sends homework email with optional attachment)
- `src/app/api/email/send-homework-graded/route.ts` — email-only route for graded notification
- `src/components/assign-homework-form.tsx` — teacherInstructions textarea, file attachment, email error handling, status flip to 'delivered'
- `src/app/t-portal/students/[id]/components/homework-tab.tsx` — upload + grade via client-side Firestore

**Dead code (deletion pending):**
- `src/app/api/homework/[id]/upload-results/route.ts` — homework-tab does this client-side now
- `src/app/api/homework/[id]/grade/route.ts` — homework-tab does this client-side now

---

### 🔧 Curriculum-Building Architecture (Phases A/B/C)

**Goal:** Transform LL from session-management into a curriculum-building platform. Reusable homework templates on units, provider-agnostic AI layer, and three integrated modules (KTFT/KCBT/KUPT).

**Status:** Specs complete (March 23–29, 2026). Build not started.

**Spec Documents:**
- `LessonLink-Curriculum-AI-Architecture-Spec-Q3N.md` — main spec (homework templates, AI layer, advisor, vocab tracker)
- `LessonLink-Module-Architecture-KTFT-KCBT-KUPT-Q3S.md` — module split spec (KTFT/KCBT/KUPT)

**Three Modules (all inside LL):**

- **KTFT** (Kiddoland Task Framework Tool) — universal pedagogical reference. Seven dragon levels, Robinson dimensions, 4-track system, linguistic emergence. NEW: developmental sequence cross-level view (WHITE→BLACK trajectory). Read-only page in T-portal.
- **KCBT** (Kiddoland Course Building Tool) — per-course planning. Course aims, unit slots, communicative targets, track assignments, build status. Backed by `courseBlueprint` Firestore collection. Does NOT duplicate KTFT data.
- **KUPT** (Kiddoland Unit Plan Tool) — per-unit design. Currently external HTML tool. Stacked for LL integration (requires stable AI layer).

**Phase A: Foundation (Build First)**
- [ ] A1–A4: HomeworkTemplate, VocabularyMasteryRecord, AI types, templateId on HomeworkAssignment
- [ ] A5–A8: Firestore CRUD, rules, indexes for new collections
- [ ] A9: CourseBlueprint, LevelBlueprint, UnitBlueprint types
- [ ] A10: Blueprint Firestore CRUD
- [ ] A11: Firestore rules for courseBlueprints
- [ ] A12: KTFT seed data file (static data from KTFT v6)

**Phase B: AI Integration Layer (Build Second)**
- [ ] B1: AI types + shared interface
- [ ] B2–B6: Provider adapters (Claude, DeepSeek, MiniMax, Qwen, OpenAI-compatible)
- [ ] B7: Provider resolver (T override → admin default)
- [ ] B8: AI service entry point
- [ ] B9: AI completion API route (server-side)
- [ ] B10: Usage logging

**Phase C: UI (Build Third)**
- [ ] C1–C5: HW template management (list, add/edit, completeness badge, assign form update)
- [ ] C6–C7: KTFT reference page in T-portal with developmental sequence view
- [ ] C8–C11: KCBT blueprint UI (overview, level detail, unit slots, create-from-slot)
- [ ] C12: Auto-create blueprint on course creation
- [ ] C13: Grammar jargon warning on aims input

**Stacked (not in current build):**
- Phase D: Vocabulary Tracker
- Phase E: AI Advisor
- Phase F: Admin AI Settings
- KUPT integration into LL
- Kiddoland Song Worksheet Generator (Option B — inside LL, requires AI layer)

**Key Decisions:**
- AI layer is provider-agnostic: Claude, DeepSeek, MiniMax, Qwen, OpenAI-compatible
- Admin sets default provider, T can override with own API key
- Database writes go client-side, API routes only for server secrets (emails, Stripe, AI)
- KCBT references KTFT seed data (no duplication of emergence/Robinson/GSE)
- Developmental sequences are descriptive (expected emergence), never prescriptive (grammar targets)
- Phase B is not deferrable — needed for session feedback, assessments, HW descriptions, unit descriptions

---

### 🔧 Phase Next: Course Architecture & Session History

**Status:** Both specs complete (February 23, 2026). Not started. Build after Phases A/B/C.

**Spec Documents:**
- `LessonLink-Unified-Session-History-Spec.md`
- `LessonLink-Course-Page-Architecture-Spec.md`

**Unified Session History (10 steps, ~3-5 sessions):**

- [ ] Reusable `<UnifiedTimeline>` component (sessions + feedback + homework + assessments)
- [ ] Embeds in T-portal L profile Tab 2 + S-portal Dashboard/Courses
- [ ] Filterable by type, unit, date range; groupable chronologically or by unit
- [ ] No new sidebar items, no new collections

**Course Page Architecture (12 steps, ~4-6 sessions):**

- [ ] Standalone `<CoursePage>` component with auth-aware rendering
- [ ] Routes: `/courses` (browse), `/courses/[courseId]` (public), `/t/[slug]/courses/[courseId]`
- [ ] Visitors see marketing; enrolled Ls see progress overlay; browsing Ls see purchase CTA
- [ ] S-portal sidebar: "My Courses" + "Browse Courses" replaces "Browse Units"
- [ ] Foundational for multi-T launch

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
| **AI**             | DeepSeek (primary), MiniMax (failover), Claude (ready) | Assessment analysis, reports, translation |
| **Hosting**        | Netlify (from GitHub)         | Production deployment         |
| **Version Control**| Git + GitHub                  | Code repository               |
| **Server-Side**    | Firebase Admin SDK            | Secure webhook writes         |
| **Node.js**        | v24 LTS (pinned via `.node-version`) | Runtime — ⛔ DO NOT UPDATE without testing |

### AI Provider System (Phase 14)

| Provider | Status | Use Case | Config Key |
| -------- | ------ | -------- | ---------- |
| **DeepSeek** | ✅ Primary | Assessment analysis, parent reports, session feedback, translation (ZH/PT) | `DEEPSEEK_API_KEY` |
| **MiniMax M2.5** | ⚠️ Failover | Failover target (empty response issue, likely balance) | `MINIMAX_API_KEY` |
| **Claude (Anthropic)** | 🔧 Ready | Premium tasks (when API key added) | `ANTHROPIC_API_KEY` |
| **Kimi** | 🔧 Ready | Alternative provider | `KIMI_API_KEY` |

Task routing configured in `src/lib/ai/providers.ts` → `TASK_PROVIDERS` object.

### Planned Integrations

- **Email:** ✅ Resend (Phase 15/16) — transactional emails from notifications@updates.kiddoland.co
- **Rewards:** Petland webhook (Phase 17) for XP/HP sync
- **Calendar:** ✅ iCal export (Phase 15-D) — subscribe from Google Calendar, Apple Calendar, Outlook

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
  - Schedule
  - Availability
- `/s-portal/chat` — Messaging (Notifications + Communications) [Cross-cutting]
- `/s-portal/courses` — [What + How]
  - My Units
  - Browse Units
  - Feedback
  - Evaluations
  - My Package
- `/s-portal/tutors` — [Who]
  - My Tutor
  - Browse Tutors
- `/s-portal/settings` — Learner profile settings
- `/s-portal/top-up` — Package purchase page
- `/s-portal/checkup` — "Doctor's Checkup" progress page (Phase 18) [What]
- `/s-portal/homework` — Homework list view

### API Routes

- `/api/stripe/checkout` — POST: Create Stripe Checkout Session
- `/api/stripe/webhook` — POST: Handle `checkout.session.completed`
- `/api/stripe/send-link` — POST: Generate 24-hour payment link URL
- `/api/ai/analyze-assessment` — POST: AI assessment analysis (multi-provider)
- `/api/homework/assign` — POST: Send homework assignment email with optional attachment
- `/api/email/send-homework-graded` — POST: Send homework graded notification email
- `/api/rewards/sync` — POST: Receive XP/HP updates from Petland (Phase 17)
- `/api/calendar/ical/tutor` — GET: T calendar iCal feed
- `/api/calendar/ical/learner` — GET: L calendar iCal feed

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
- **Phase 13:** ✅ Complete (February 18, 2026). Stripe checkout + webhook E2E verified. Firebase Admin SDK added for server-side writes. **Webhook production fix March 1** (Node version).
- **Phase 14:** ✅ Complete. Parent report fully wired with AI generation, translation, email delivery.
- **Phase 15/16:** ✅ Complete. Session feedback pipeline + Resend email integration. Duplicate bug fixed (Feb 23).
- **Phase 15-C:** ✅ Admin import tools (Obsidian + UPT).
- **Phase 15-D:** ✅ iCal calendar export.
- **Phase 15-E:** ✅ Complete (February 24, 2026). L Settings page built, Firestore rules fixed, profile completion path works.
- **Booking Gate Rewrite:** ✅ Complete (March 3, 2026). Unit-assignment gate replaced with T-L relationship + credit check. `reserveCredit()` wired into booking flow.
- **T-Selection & Approval Flow:** ✅ Built (March 3, 2026). Browse Tutors → Request as My Tutor → T Approves → `assignedTeacherId` set. E2E retest pending.
- **Phase 15-B:** ✅ Complete (March 24, 2026). T assigns homework, L/T uploads JSON, T grades. Client-side Firestore pattern. teacherInstructions field added. **Email attachment added April 1** — T can attach HTML workbook/worksheet to homework email. File size guard at 6MB. Email failure warning toast. Status flips to 'delivered' on successful email send.
- **Curriculum-AI Architecture Spec:** ✅ Complete (March 23, 2026). Homework templates, AI integration layer, AI content generation, AI advisor, vocabulary mastery tracker.
- **Module Architecture (KTFT/KCBT/KUPT):** ✅ Spec complete (March 29, 2026). Three-module design: KTFT (reference + developmental sequences), KCBT (per-course blueprint), KUPT (unit design, stacked). All modules inside LL.
- **Kiddoland Template Updates:** ✅ All four templates updated to Export Standard v1 (Song Worksheet and Sentence Switcher applied post-April 1).
- **Content Production Pipeline:** 🔧 Clone-and-reskin workflow established for song worksheets (April 1). **Homework Generator spec complete (April 4)** — standalone HTML tool covering Workbooks (WHITE), Song Worksheets, Phonics Workbooks. Build planned for next session. LL module (Option B) stacked for after AI layer.
- **Course Architecture + Session History:** 🔧 Both specs complete (Feb 23). Build after Phases A/B/C.
- **Calendar:** ✅ Availability delay fixed (writeBatch), column-fill drag, Schedule Template feature (save/load/apply weekly patterns). Feb 23.
- **TypeScript:** ✅ 0 errors (55 resolved Feb 23).
- **S-Portal:** Major redesign — permanent top bar (Book/Top Up), restructured sidebar, enhanced dashboard with credit/progress/rewards cards, Calendar Availability tab, Browse Tutors refactor. Top Up page built (Feb 24).
- **AI APIs:** ✅ Live. DeepSeek primary with failover chain. `AI_USE_MOCK=false`.
- **Email:** ✅ Resend domain verified. Sending operational from `notifications@updates.kiddoland.co`.
- **Next:** Homework Generator build (Track 1) → Phase A (types + CRUD + seed data) → Phase B (AI layer) → Phase C (template UI + KTFT page + KCBT UI) → Unified Session History → Course Page Architecture
- **Estimated sessions for A+B+C:** 8–10

**Repository:** https://github.com/jwaglang/lessonlink

**Admin Email:** jwag.lang@gmail.com

**Hexdate Naming Convention:** All project files use hexdate format: `[Year][Month][Day]` in base-36. Year: A=2010, B=2011... F=2015, Q=2026, R=2027. Month: 1-9=digits, A=10(Oct), B=11(Nov), C=12(Dec). Day: 1-9=digits, A=10, B=11... P=25, T=29, V=31. Examples: March 1, 2026 = Q31. March 29, 2026 = Q3T. Christmas 2015 = FCP. December 31, 2031 = VCV.

**Dev Environment:** VSCode + MiniMax M2.5 (via Kilo Code) for codebase searches and edits. Claude (Anthropic) for planning and architecture. Qwen 3.5 Plus for template execution tasks. WARNING: Kilo Code will edit files unprompted — only paste SEARCH ONLY prompts.

**Local Testing:** Stripe CLI installed at `C:\Users\joner\Desktop\stripe_1.37.1_windows_x86_64\stripe.exe` for local webhook testing. Use `stripe listen --forward-to localhost:9002/api/stripe/webhook` + update `.env.local` STRIPE_WEBHOOK_SECRET with CLI's temporary whsec_ value. Remember to restore production whsec_ value after local testing.

**External Work:**

- Course curriculum being built in separate "kiddoland tools" sessions
- Petland reward system is separate Firebase app (sends data to LL via webhook — Phase 17)
- Kiddoland Export Standard v1: WHITE and PHONICS templates updated. Song Worksheet and Sentence Switcher pending (prompts written).
- Content production workflow: clone-and-reskin from TEACHER_AtTheNorthPole.html reference. Qwen 3.5 Plus for execution, Claude for planning.
- Song Worksheet Generator Tool stacked (Option A standalone, Option B LL module)

**Known Issues:**

- ✅ ~~AI_USE_MOCK~~ — **AI_USE_MOCK=false**. DeepSeek live in production. Failover chain: DeepSeek → MiniMax → Claude.
- ✅ ~~Resend domain verification~~ — DNS fully verified (DKIM + SPF + MX). Sending operational.
- ✅ ~~Session feedback duplicate creation~~ — Fixed Feb 23. useEffect loads existing feedback on dialog open.
- ✅ ~~55 pre-existing TypeScript errors~~ — All resolved Feb 23. 0 errors.
- ✅ ~~Calendar availability delay~~ — Fixed Feb 23. writeBatch replaces sequential toggles. Column-fill drag replaces diagonal.
- ✅ ~~`.toFixed` bug~~ — Confirmed non-existent Feb 24. Removed.
- ✅ ~~L Settings save errors~~ — Fixed Feb 24. Conditional spread pattern + cleanContact() helper + Firestore rules update.
- ✅ ~~Stripe webhook 500 errors~~ — Fixed March 1. Root cause: Node.js auto-updated to v27 via Glary Utilities, breaking `buffer-equal-constant-time` package used by Firebase Admin SDK. Fix: downgraded to Node 24 LTS, pinned via `.node-version` file in project root. See ENVIRONMENT SAFETY RULES below.
- ✅ ~~Email attachment for homework assignment~~ — Implemented April 1. Resend attachment with 6MB file size guard. Email failure warning toast. Status flips to 'delivered'.
- ⚠️ **Booking flow requires courseId** — L calendar booking still requires courseId/unitId/sessionId in URL params. Top Up credit works but L must select a course to book. Correct behavior, but UX from Top Up → Book not seamless yet.
- ⚠️ **Calendar tab-switch refresh** — Availability doesn't re-fetch when switching tabs (Schedule ↔ Availability). Requires page reload.
- ⚠️ **T calendar optimistic UI** — Slots flip after Firestore confirms, not instantly. Minor delay.
- ⚠️ **MiniMax returns empty responses** — likely balance/credits issue. Not blocking (DeepSeek is primary).
- ⚠️ **No Anthropic API key** — Claude failover target inactive without `ANTHROPIC_API_KEY` in env.
- ⚠️ **Session reminder trigger** — Email template built but no cron/scheduled function to fire it.
- ⚠️ **T profile purchase flow** — Auth-aware but doesn't show L's current course context.
- ⚠️ **Firestore rules for scheduleTemplates** — currently `allow read, write: if true`. Tighten to `request.auth != null` when stable.
- ⚠️ **ParentContact.relationship type mismatch** — `types.ts` uses lowercase (`mother`, `father`), L Settings dialog uses title-case (`Mother`, `Father`). Non-blocking — saves fine, cosmetic only.
- ⚠️ **Old teacherProfile `A9YKGu2jOgRAEVtR8n0E`** — stacked, contains seed data for migration. Disabled in Firestore.
- ⚠️ **`isPublished` on teacherProfiles** must be boolean `true`, not string `"true"` — fixed March 3
- ⚠️ **Dead API routes** — `/api/homework/[id]/upload-results` and `/api/homework/[id]/grade` are unused (homework-tab does both client-side). Deletion pending.
- ⚠️ **Song Worksheet Generator Tool** needed for mass production. Stacked as Option A (standalone HTML) and Option B (LL module after AI layer).
- ⚠️ **KTFT needs "Copy Level Only" button** — currently requires track selection to export, but track data is irrelevant for song worksheets. Stacked.
- ⚠️ **YELLOW/ORANGE/GREEN workbook templates** need design — different activity types per level, not just harder content. Design project not started.
- ⚠️ **E2E homework upload/grade flow** needs testing (blocked on v1 template updates for Song/Sentence Switcher)
- ✅ **Petland Stage 1 complete** — integrated into LL repo as `src/modules/petland/`. Student page at `/s-portal/petland`. Petland tab (Tab 5) on T-portal Learner Profile. Activation flow, feedback buttons, vocab CRUD all working. Firestore rules updated. Stage 2 (platform shell restructure) stacked.
- ✅ **Petland SRS complete (Q46)** — Leitner 5-box system. Memory Match (exposure, stamps `lastReviewDate`) → Flashcard Review (assessment, drives `srsLevel`). HP decay on login. Death + recovery flow (500 XP egg + 100 XP hatch). `petWish` stored at hatch.
- ✅ **Petland body condition variants (Q47)** — Three AI-generated variant images via `gemini-2.5-flash-image`. Fat (user-triggered), thin (HP < 50), starving (HP < 20). All cached — generated once. Image priority: dead > fat > starving > thin > healthy.
- ✅ **Petland body condition redesign (Q48)** — Removed `isSick`. Replaced with `isFat` (boolean). Fat clears automatically on next login when HP decay fires. Thin/starving remain pure HP thresholds (no flags). Firestore vocabulary update rule fixed — learners can now write `lastReviewDate`/`srsLevel` (was teacher-only, causing permissions error on every game complete). Dev panel expanded: Fake Match + Simulate Decay buttons. ⚠️ Firestore rules need `firebase deploy --only firestore:rules` to take effect in production. Testing pass required.
- ✅ **Petland Playground SRS complete (Q46)** — Full Leitner 5-box system. Memory Match = exposure (stamps `lastReviewDate`, awards XP + HP daily). Flashcard Review = assessment (self-reported Knew it / Didn't know it, drives srsLevel). Daily HP guard. HP decay on login (client-side). Death state + recovery flow (500 XP egg + 100 XP hatch). Fat pet generation via Imagen when overfeeding detected. HungerAlerts with personality copy. `sessionInstanceId` stamped on vocab docs. XP constants in utils.ts. Needs testing pass before next build.
- ✅ **Petland Pet Shop complete (Q46)** — Teachers create Studio Ghibli-style accessories via AI image generation. Students browse Pet Shop, purchase with XP, wear accessories on pets via Gemini 2.5 Flash dual-image composition. Accessories stored in global `petShopItems` Firestore collection. Full CRUD + AI composition + image upload infrastructure. Dev panel test button for Max (simulate purchase without XP cost). Firestore + Storage rules updated. UI: responsive grid (2-5 columns), purchase flow, "Store your bling!" reversion button. All tested and production-ready.
- ⚠️ **YELLOW/ORANGE/GREEN workbook activity design** — needed before generator can produce higher-level workbooks. Design session planned.

---

## ENVIRONMENT SAFETY RULES

⛔ **NEVER update Node.js, npm, Python, or any system-level tool without checking compatibility first.**

On March 1, 2026, a routine Glary Utilities run auto-updated Node.js from v24 LTS to v27, silently breaking the Firebase Admin SDK (specifically `buffer-equal-constant-time` → `google-auth-library` → `jwtclient.js`). This caused the Stripe webhook to return 500 errors on every attempt, and took an entire day to diagnose because the error was a runtime crash invisible in Stripe's response body and Netlify's logs.

**Rules:**

1. **Node.js:** ONLY use LTS versions. Currently pinned to v24 LTS via `.node-version` in project root. Never accept "update available" prompts.
2. **Glary Utilities / system cleaners:** Exclude Node.js, npm, Python, and Git from auto-updates. These tools have strict version compatibility requirements.
3. **npm packages:** Only run `npm update` or `npm install [package]` when specifically needed and discussed with Claude first.
4. **Before any debugging session:** If a previously working feature suddenly breaks, FIRST ask "Did anything change in my environment?" Check `node --version` and recent system updates before chasing code bugs.
5. **Netlify Node version:** Controlled by `.node-version` file in project root. Currently set to `24`. Do not change without testing.
6. **After any system update:** Run `node --version` and `npm run dev` to verify the project still compiles and runs locally before pushing to production.

---

## DEBUGGING PROTOCOL (Added March 1, 2026)

When a previously working feature starts failing:

1. **FIRST:** Check environment — `node --version`, recent system updates, recent npm installs
2. **SECOND:** Test locally with `npm run dev` before burning Netlify deploys
3. **THIRD:** For webhook debugging, use Stripe CLI locally (`stripe listen --forward-to localhost:9002/api/stripe/webhook`)
4. **FOURTH:** Only deploy to Netlify after confirming the fix works locally
5. **NEVER** iterate debugging on production deploys — each deploy costs usage

---

**Last Updated:** April 6, 2026 (Q48)

**Version:** Q48 (6.4) — Petland body condition redesign complete. `isSick` removed, `isFat` introduced. Firestore vocabulary write rule fixed (root cause of persistent permissions error). Dev tools expanded. Testing pass + `firebase deploy --only firestore:rules` required before next build.
