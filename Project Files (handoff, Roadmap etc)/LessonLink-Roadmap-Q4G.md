# LessonLink | Complete Roadmap (Q4G — April 16, 2026, Updated)

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

### ✅ Phase 16: Petland Pet Shop & Dork Economy

**Goal:** Build end-to-end pet shop system with Dork Economy (XP ↔ Dorks conversion) for Petland reward integration where teachers create Studio Ghibli-style accessories (via AI) that students purchase with XP and wear on their pets.

**Completed:** April 12–13, 2026. All features end-to-end tested and production-ready.

#### Part A: Pet Shop Core (April 12, 2026)

**Implementation Summary:**

- ✅ Pet Shop core feature (create → browse → purchase → wear)
- ✅ AI image generation via Gemini for accessory creation
- ✅ Firebase Storage integration with **signed URL authentication**
- ✅ Student shopping UI with responsive grid (2-5 columns)
- ✅ Accessory wearing system with "Store your bling!" revert button
- ✅ Delete functionality with confirmation dialog
- ✅ Collection-based organization (e.g., "Magic and Spells" with Kiddoland styling)
- ✅ Developer testing button ("Simulate Buy Accessory") for Max (ID: 1SLNgciKQlhKVzE9INPBROgBsEz2)
- ✅ Auto-signing of unsigned Firebase URLs (30-day token validity)
- ✅ API helper endpoints: `/api/petshop/sign-url`, `/api/petshop/list`, `/api/petshop/update-item-url`

**Key Technical Achievement:**
Discovered and resolved critical Firebase Storage authentication blocker: all public files require signed URLs with authentication tokens. Implemented auto-signing infrastructure so users provide simple HTTPS URLs and signing happens automatically on create-item submission.

**Files Modified:**
- `src/app/api/petshop/create-item/route.ts` — Auto-signing logic
- `src/app/api/petshop/generate-accessory/route.ts` — Signed URL generation
- `src/app/t-portal/petland/pet-shop/page.tsx` — Delete button, image fixes, Kiddoland styling
- 4 new API helper endpoints created

**Status:** Complete and production-ready. All three initial accessories working (2 AI-generated, 1 manual with auto-signing).

#### Part B: Collection Management System (April 12, 2026)

**New Features Added:**
- ✅ **14-Icon Theme System** — Expanded from 10 to 14 icon options (sparkles, wind, wand, rocket, flame, droplet, zap, star, heart, leaf, tree, bug, bird, default)
- ✅ **Three-View Pet Shop Display** — Students toggle between Items, Collections, and Price view modes
- ✅ **Collapsible Collections** — Collections expand/collapse on both T and L sides with chevron indicators (▶/▼)
- ✅ **Database-Driven Icons** — Icons stored in `petShopCollections` collection with user selection during item creation
- ✅ **Edit Collections** — Teachers can change collection name and icon theme via Edit dialog
- ✅ **Delete Collections Safely** — Delete confirmation dialog moves items to "Uncategorized" instead of orphaning them
- ✅ **Icon Picker Dropdown** — 14 options available in Create and Edit dialogs
- ✅ **Full CRUD Endpoints** — GET, POST, PATCH, DELETE for `/api/petshop/collections`
- ✅ **Database Cleanup** — Resolved leading space inconsistencies, consolidated duplicate entries, created missing collections
- ✅ **Icon Syncing** — Real-time icon metadata consistency between T and L sides with smart fallback for legacy collections

**Files Modified:**
- `src/lib/collection-icons.ts` (NEW) — Icon type definitions and 14 ICON_OPTIONS
- `src/app/api/petshop/collections/route.ts` — Full CRUD with iconType support
- `src/app/t-portal/petland/pet-shop/page.tsx` — Edit/delete dialogs, icon picker, collection management UI
- `src/modules/petland/components/student-dashboard.tsx` — Three-view toggle, collapsible sections, collection metadata fetching

**Schema Update:**
`petShopCollections` collection: `{name, iconType, createdDate}`

**Status:** Complete and production-ready. Collection management fully integrated and tested. Database cleaned and consolidated.

#### Part C: Dork Economy System (April 13, 2026)

**Goal:** Implement XP ↔ Dorks conversion system where students convert earned XP into collectable denominations (Copper, Silver, Gold) to purchase pet shop accessories and build wealth systems.

**Completed:** April 13, 2026. All math verified, critical bug fixed, user experience complete.

**Architecture:**

**Currency Model:**
- 1 XP = 1 Copper (atomic unit)
- 10 Copper = 1 Silver
- 100 Copper = 1 Gold
- All balances stored in Firestore as integers (Copper)
- Display via denomination breakdown: "1 Gold, 5 Silver, 0 Copper" → 🟡 1  ⚪ 5  🟤 0

**PetlandProfile Fields:**
- `xp: number` — lifetime earned XP (immutable downward, increases only)
- `xpSpent: number` — total XP converted to Dorks (NEW field, tracking only)
- `dorkBalance: number` — wallet balance in Copper units

**Helper Functions:**
- `formatDorks(copperTotal: number): string` — converts 150 → "1 Gold, 5 Silver" (text display)
- `getDorkDenominations(copperTotal: number): Dorks` — returns {gold, silver, copper} object (for icons)

**UI Components:**
- `DorkIconDisplay` — Icon-based dork rendering (🟡 ⚪ 🟤) with configurable sizes
- `CashInStation` — Full XP ↔ Dorks conversion interface with:
  - Quick buttons (10/50/100/500 XP)
  - Slider for custom amounts
  - Live preview with DorkIconDisplay
  - Conversion Rates table (10:1, 100:1)
  - XP Current stats card (Earned/Spent/Current)

**Critical Bug Fixed (April 13):**
- **Issue:** Math completely broken. Max had 150 Copper in wallet but xp still 383, xpSpent still 0
- **Root Cause:** `handleConvert` calculated `newCurrentXp` but didn't include `xp: newCurrentXp` in Firestore updateDoc()
- **Fix:** Added `xp: newCurrentXp` to updateDoc call so XP decreases properly on conversions
- **Verification:** Max's profile manually updated (xp=233, xpSpent=150, dorkBalance=150); conversion math verified working

**Files Modified:**
- `src/modules/petland/types.ts` — Added `getDorkDenominations()` function and `Dorks` interface
- `src/modules/petland/components/cash-in-station.tsx` — **CRITICAL FIX:** Added xp field to Firestore update, created DorkIconDisplay component, moved Conversion Rates table
- `src/modules/petland/components/student-dashboard.tsx` — Added DorkIconDisplay component, imported Circle icon, updated passport card wallet display to use icons
- `/t-portal/petland/pet-shop/page.tsx` (Teacher Portal) — Uses formatDorks() for all price displays

**Kiddoland Design Applied:**
- Colors: 🟡 Gold (yellow-500), ⚪ Silver (gray-400), 🟤 Copper (amber-700)
- Card gradient: from-purple-100 via-pink-50 to-orange-50
- Large Cash-In button on passport card
- Three XP stats replacing single display (Earned, Spent, Current)

**Status:** ✅ 100% complete and verified working. Math tested with Max profile. Both portals synchronized on identical logic.

**BLOCKER FOR PHASE 17:** 
🔴 **New Task Identified:** Backfill `xpSpent: 0` field to all existing learner profiles (most missing this new field). Required before Phase 17 can begin. Suggested approach: Cloud Function or batch REST API script.

---

### 🔧 Phase 17: Live Session Background (Classroom Immersion)

**Goal:** Full-screen display page T shows via ManyCam during live sessions. T's webcam overlays the center; rewards, vocabulary, grammar, phonics, session goals, and XP progress animate around the edges. Kids aged 5-12 see a fun, immersive game screen — not a dashboard.

**Status:** 🟡 Build in progress — Space background + all reward animations complete. Grammar/phonics diary inputs and session end flow remaining. Last updated Q4G (April 16, 2026).

**Spec Document:** `LessonLink-Phase17-LiveSession-Spec-Q4D.md`
**Visual Mockup:** `LessonLink-Phase17-LiveSession-Mockup-Q4D.html`

**Route:** `/t-portal/sessions/live/[sessionInstanceId]` (T-only, no L-side route — ManyCam shares T's screen)

**Reward System (Updated Q4F — direct fire, full-screen animations):**

| Reward | Emoji | XP Effect | Animation |
|--------|-------|-----------|-----------|
| **Treasure Chest** | 🧰 | T sets amount (+5/+10/+15/+20/custom) | Gold glow + 8 rays + 10 coin spray + chest bounce + XP reveal |
| **Wow** | ✨ | No XP | Rainbow glow + 10 rays + 12 star spray + rainbow "WOW!" text |
| **Boom** | 💥 | No XP | Full-screen flash + "BOOM!" explosion scale |
| **Oopsie** | 👀 | No XP, no penalty | Red glow + 9 scattered 👀 popping + shaking "OOPSIE!" |
| **Out-to-lunch** | 😴 | -3 XP | Screen dim + ZZZs floating + "ZZZZZZ" + -3 XP reveal |
| **Chatterbox** | 🗣️ | -2 XP | 💬 bubble spray + "SHHH!" + -2 XP reveal |
| **Disruptive** | 😬 | -5 XP | Red flash × 3 + ⚠️ spray + shaking "NOT COOL!" + -5 XP reveal |

Stars are retired. Brainfarts renamed to Oopsies. Buttons fire directly (no select-then-boom pattern).

**Five Animated Themed Backgrounds** (T selects at session start):
- 🌌 Space — ✅ **COMPLETE** (twinkling stars, comets, 3 planets with Saturn ring illusion, nebulas)
- 🌊 Ocean — swimming fish, bubbles, swaying seaweed (not started)
- 🌾 Farm — grazing animals, drifting clouds, pecking chickens (not started)
- 🏜️ Desert — camels, tumbleweeds, heat shimmer (not started)
- 🏙️ City — building window lights, taxis, neon signs (not started)

**Layout:** Top bar (session goal + XP counter), left panel (rewards), center (clear for webcam), right panel (vocabulary/grammar/phonics cards), bottom bar (progress dragon + magic word slot).

**Session Goals:** Pulled from lesson plan data (LQ + aims), T-editable at session start.

**Magic Word:** T sets at session end. L must remember it for next session's opening question.

**End-of-Session Flow:** Summary overlay with total XP, reward breakdown, words learned, quick flashcard recap (T-controlled, no L interaction). Not yet built.

**Implementation (12 steps):**
1. ✅ Types in `src/lib/types.ts`
2. ✅ Route + page shell
3. ✅ Theme backgrounds — Space complete; others not started
4. ✅ Display layout (top/left/right/bottom/center)
5. ✅ Control panel (T's buttons, integrated into left panel)
6. ✅ Reward animations — all 7 complete (Q4F)
7. ✅ Content addition dialogs — vocab wired to Firestore; grammar/phonics still local state
8. ✅ Firestore integration (`sessionProgress` collection)
9. ✅ Session initialization (link to lesson plan data, practice mode)
10. ⬜ End-of-session summary
11. ✅ Magic Word input (wired to Firestore via `updateSessionGoals`)
12. ⬜ Polish (sound slots, responsive, ManyCam testing)

**Remaining for Phase 17 completion:**
- 🟡 Grammar/phonics diary inputs → Firestore (`addSessionGrammar`, `addSessionPhonics`)
- 🟡 Session End button + `endSession()` flow
- 🟡 xpSpent backfill (all learner profiles except Max missing this field)
- ⬜ End-of-session scoreboard/summary overlay
- ⬜ Ocean/Farm/Desert/City backgrounds

**Deploy note:** `firebase deploy --only firestore:rules` needed for `phonicsRepository` rules (added Q4G).

**Database:** New `sessionProgress` collection. See spec for full schema.

**Estimated sessions to completion:** 1-2 (core flow); additional sessions for other theme backgrounds

---

### 🔧 Phase 17B: Review System Integration → Petland

**Goal:** Automatically push classroom vocabulary/grammar/phonics into Petland's spaced repetition system after session ends.

**Status:** Not started. **NEW PRIORITY** as of April 12, 2026.

**Flow:**

1. Session ends (T closes it)
2. Items added during session (vocabulary/grammar/phonics) tagged with `sessionId` + `timestamp`
3. Auto-push to student's review queue in Petland
4. Items appear with `nextReviewDate` calculated by spaced repetition algorithm
5. Student sees review reminders on Petland dashboard

**Implementation:**

- [ ] Build webhook: `/api/rewards/session-complete` to receive session close event from Petland
- [ ] Extract items from `sessionProgress.vocabulary` / `grammar` / `phonics`
- [ ] Call Petland API to add to review queue (or sync via reverse webhook if already architected)
- [ ] Tag items with session metadata for learner history tracking
- [ ] Calculate initial `nextReviewDate` based on spaced repetition algorithm (1 day, 3 days, 7 days, etc.)

---

### 🔧 Phase 17C: End-of-Session Scoreboard

**Goal:** Display celebratory scoreboard when session ends showing total points, breakdown by category, comparison to previous sessions, and celebration animations for high performance.

**Status:** Not started. **NEW PRIORITY** as of April 12, 2026.

**Implementation:**

- [ ] Scoreboard page/modal triggered on session close
- [ ] Display total points + breakdown (Treasure Chest earnings, Wow count, Oopsie count, behavior deductions, vocabulary added, grammar points, phonics sounds)
- [ ] Celebrate high scores with animations
- [ ] Show comparison to last 3 sessions (optional badge if beating personal record)
- [ ] Link to continue/return dashboard
- [ ] Persist `sessionScoreboard` data for historical tracking and progress analytics
- [ ] Connect to Phase 18 (enhanced progress page) for trend visualization

**Priority Ranking:**
- Phase 17 (Live Background) — MUST have for classroom experience
- Phase 17B (Review Integration) — SHOULD have for spaced repetition loop
- Phase 17C (Scoreboard) — NICE to have for engagement/celebration, but can come after Phase 17 if needed

---

### ⬜ Phase 18: Enhanced Progress ("Check-up" Page)

**Goal:** Create engaging, themed progress dashboard with visual analytics — the parent/student-facing showcase of the holistic progress system. Builds on Phase 17 (Live Background + rewards data) and Phase 17B (Petland integration).

**Status:** Stacked until Phases 17/17B/17C complete. Build after live session system is proven.

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

## ROUTES STRUCTURE (Full Detail)

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
- `/t-portal/sessions/live/[sessionInstanceId]` — Live Session Page (Phase 17, ManyCam display)

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

## KNOWN ISSUES & WORKAROUNDS

- ✅ ~~AI_USE_MOCK~~ — **AI_USE_MOCK=false**. DeepSeek live in production. Failover chain: DeepSeek → MiniMax → Claude.
- ✅ ~~Resend domain verification~~ — DNS fully verified (DKIM + SPF + MX). Sending operational.
- ✅ ~~Session feedback duplicate creation~~ — Fixed Feb 23. useEffect loads existing feedback on dialog open.
- ✅ ~~55 pre-existing TypeScript errors~~ — All resolved Feb 23. 0 errors.
- ✅ ~~Calendar availability delay~~ — Fixed Feb 23. writeBatch replaces sequential toggles. Column-fill drag replaces diagonal.
- ✅ ~~`.toFixed` bug~~ — Confirmed non-existent Feb 24. Removed.
- ✅ ~~L Settings save errors~~ — Fixed Feb 24. Conditional spread pattern + cleanContact() helper + Firestore rules update.
- ✅ ~~Stripe webhook 500 errors~~ — Fixed March 1. Root cause: Node.js auto-updated to v27 via Glary Utilities, breaking `buffer-equal-constant-time` package used by Firebase Admin SDK. Fix: downgraded to Node 24 LTS, pinned via `.node-version` file in project root.
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

---

## PACKAGE STRUCTURE

| Package Type             | Description                  | Content                     | Discount | Use Case                                        |
| ------------------------ | ---------------------------- | --------------------------- | -------- | ------------------------------------------------ |
| **Single Session**       | Trial or makeup              | 1 session                   | 0%       | New students, one-off makeup                     |
| **10-Pack**              | Short-term commitment        | 10 hours = 4 units          | 10%      | Most common package                              |
| **Full Course (60 hrs)** | Complete proficiency level   | 60 hours = 24 units         | 20%      | Serious learners completing A1, A2, B1, etc.     |

---

## XP BUDGET PER LEVEL (Established Q4D)

**Minimum 5,000 XP to complete one level.** 60% Engagement / 40% Mastery. Time (200 hours) is a gate, not an XP source. Progress = total XP ever earned. Spending Dorks never reduces progress.

**Three Pillars of Progress:**
- **Time:** 200 hrs/level (45 hrs in-class + 155 hrs out-of-class). Gate only — no XP from attendance.
- **Engagement (60%):** In-session Treasure Chests + Petland SRS practice.
- **Mastery (40%):** Homework accuracy + evaluations.

**Per Academic Year (1 level):** 20 units, ~90 sessions.

**Assessment structure:** 20 TBLT evaluations (60% of mastery) + midterm (20%) + final (20%).

| Source | Pillar | Max XP | % of Total | Mechanism |
|--------|--------|--------|------------|-----------|
| Treasure Chests (in-session) | Engagement | ~1,800 | 30% | T-controlled, ~20 XP avg/session × 90 sessions |
| Petland SRS practice | Engagement | ~1,200+ | 20%+ | Memory Match: matched pairs × 5 XP. Uncapped. |
| Homework | Mastery | ~800 | 13% | 20 XP × completion rate, auto-awarded on submission |
| TBLT evaluations (×20) | Mastery | ~720 | 12% | 36 XP × score/100 per unit evaluation |
| Midterm evaluation | Mastery | ~240 | 4% | 240 × score/100 |
| Final evaluation | Mastery | ~240 | 4% | 240 × score/100 |

**Learner Profiles:**
- Perfect L: ~5,000 XP
- Engaged L with daily Petland: ~5,500-6,500 XP (surplus for Dork spending)
- Bare minimum L: ~3,000-3,500 XP (does not complete level)

**Homework XP Rule:** Auto-awarded instantly on submission. Formula: 20 × (completedActivities / totalActivities). T still grades for feedback and records, but grading does not adjust XP already earned.

**Treasure Chest Guideline:** ~20 XP per session average across 90 sessions. Soft reminder in Live Session UI suggested.

---

## DORK ECONOMY (Established Q4D)

**XP** = progress (report card). Total ever earned. Never decreases. Tracks toward level completion.

**Dorks** = spending money (pocket money). Converted from XP by player choice at the Cash-In Station. Spent in Pet Shop, Blasters arcade, Travel Agent.

**Conversion:**

| XP | Copper | Silver | Gold |
|----|--------|--------|------|
| 1 | 1 | — | — |
| 10 | 10 | 1 | — |
| 100 | 100 | 10 | 1 |
| 1,000 | 1,000 | 100 | 10 |

All balances stored in Firestore as integers (Copper). Gold/Silver/Copper is a display layer only.

**Pet Shop:** All prices in Dorks (not XP). Purchases deduct from `dorkBalance`. Price tag denomination communicates value visually — Copper = cheap impulse buy, Silver = nice treat, Gold = save-up goal.

**Pet Egg Recovery Cost:** 500 Copper (5 Gold) for new egg + 100 Copper (1 Gold) to hatch.

**Treasure Chest visual tiers** tie to Dork denominations — Copper/Silver/Gold coins fly out matching the XP amount given.

**Petland XP Conflict Resolved (Q4D):** Old Game Mechanics doc had Wow = +5 XP, Treasure Chest = +10-50 random. Current system: Wows = no XP (behavioral only), Treasure Chests = T-controlled amount. Stars retired. Brainfarts renamed to Oopsies (data only, no penalty). Petland codebase updated to match.

---

## CURRENT STATUS (April 16, 2026)

- ✅ **Phases 1–16:** Complete and production-ready
- ✅ **Dork Economy:** Complete — Cash-In Station, Pet Shop migrated to Dorks, denomination display
- ✅ **XP Budget:** Finalized — 5,000 XP/level, 60/40 Engagement/Mastery split
- ✅ **Reward System:** Updated — Treasure Chests (XP), Wows (behavioral), Oopsies (data), behavior deductions. Stars retired.
- ✅ **Phase 17 Spec + Mockup:** Complete — `LessonLink-Phase17-LiveSession-Spec-Q4D.md` + `LessonLink-Phase17-LiveSession-Mockup-Q4D.html`
- ✅ **PhonicsGame mechanic:** Complete — picture + audio sentence, Match/Mismatch game, gameData stored with card
- ✅ **Phonics Repository:** Complete — shared `phonicsRepository` collection, repo-check on phoneme select, backfill button, browse (scroll all)
- ✅ **Grammar/Phonics list cards:** Complete — two-column layout matching Vocabulary UI
- ✅ **GrammarFront/Back:** Updated to new field names (rule, errorWords, answer, correctSentence)
- 🔴 **Deploy needed:** `firebase deploy --only firestore:rules` for `phonicsRepository` rules
- 🟡 **In progress:** Phase 17 — grammar/phonics diary inputs, session end flow, xpSpent backfill
- ⬜ **Stacked:** Phases A/B/C (Curriculum AI), Phases 17B/17C, Phases 18–23, Vocab/Grammar repositories
- **Next:** `firebase deploy --only firestore:rules` → grammar/phonics diary inputs → session end flow → xpSpent backfill → Phase 17B/17C
- **Estimated sessions to Phase 17 completion:** 1–2 (core flow); additional for theme backgrounds
