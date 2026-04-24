# LessonLink | Complete Roadmap

---

## PRODUCT VISION

**LessonLink is a pedagogy-agnostic LMS for independent online teachers.**

It doesn't care whether you teach ELT, math, piano, or SAT prep. It doesn't care whether you use graded readers, coursebooks, Montessori, or drill-based practice. What it provides is the infrastructure every independent teacher rebuilds badly in spreadsheets and Google Drive: learner progress tracking, AI-assisted lesson planning, AI-assisted feedback and evaluation generation, homework creation and delivery, a gamification layer with spaced repetition and reward mechanics, and a booking and payment system that handles the financial lifecycle cleanly. The teacher plugs in their own curriculum. LessonLink runs the machinery around it.

### Core Problem Being Solved

Teachers create lesson plans, homeworks, and assessments, then recreate them manually for each student. Parents don't see the structure or value they're paying for. Teachers spend hours on repetitive admin work (feedback reports, progress tracking, homework delivery).

### The Solution

- **For Teachers:** Create content once → system handles delivery forever. AI generates personalized feedback in teacher's voice. Progress tracking automated.
- **For Students/Parents:** Professional course structure with curriculum, automated homework delivery, regular feedback reports, visual progress tracking ("Check-up" page), and assessment storage.
- **For LessonLink (Business):** Subscription revenue from teachers who want to professionalize their practice and scale without administrative burnout.

### Key Differentiators

1. **Reusable Curriculum:** Build units once, apply to any student with one click
2. **AI-Powered Feedback:** Transform brief notes into professional reports (in teacher's voice)
3. **Petland = Progress System:** Not just a reward layer. XP tracks quality of performance. The L isn't "doing English" any more — they're growing their Pet and engaging with the Kiddoland experience, which means actively communicating in English even when it's challenging.
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

- Teacher Dashboard with revenue metrics, active students, upcoming sessions, at-risk student alerts
- Firebase App Hosting with published version
- GitHub backup with version control
- Firebase Firestore integration with persistent database storage

---

### ✅ Phase 2: Core Business Logic

- Payment Tracking System (paid, unpaid, deducted from prepaid package)
- Prepaid Package Management (package values, automatic deductions, balance monitoring)
- Student Status Management (automated status updates)
- Revenue Reporting (session frequency, student attendance, revenue by time period)

---

### ✅ Phase 3: Student Portal & Booking

- Student authentication with secure login
- Student Portal (view sessions, package balance, payment history)
- Session Booking System (book available slots directly)
- Timezone handling for students and teachers

---

### ✅ Phase 4: Reschedule & Cancel System

- Reschedule and cancel functionality with time-based rules
- Late-notice approval system (reschedule within 12 hours, cancel within 24 hours → T approval)
- Approval request queue for teachers

---

### ✅ Phase 5: Public Profiles & Reviews

- Public teacher profiles at `/t/username`
- Review system (post-session ratings and comments)
- Admin panel for platform management
- Profile editor for teachers
- iTalki data seeding (imported reviews and profile info)

---

### ✅ Phase 6: Landing Page & Routing Updates

- Landing page at root (`/`) with dual portal login
- Teacher portal at `/t-portal/`
- Student portal at `/s-portal/`
- Admin button in sidebar (admin-only)
- Find a Tutor button on booking page with profile viewer modal
- All broken links fixed from route changes

---

### ✅ Phase 7: Credit System

- `studentCredit` collection created
- Credit management functions: `getStudentCredit`, `createStudentCredit`, `updateStudentCredit`, `reserveCredit`
- Teacher unit assignment UI with credit checking
- Credit reservation workflow (uncommitted → committed on assignment)

---

### ✅ Phase 8: Student Portal & Messaging

- `studentProgress` entries created when units assigned
- Student notifications sent when units assigned
- Student portal modernized (sidebar, Purchase Plan card, My Units page)
- Two-channel messaging system (Notifications + Communications)

---

### ✅ Phase 9: Communication (Chat System)

**Goal:** Internal messaging between students and teachers.

**Completed:** February 14, 2026

- Real-time messaging via Firebase (`onSnapshot` listeners)
- Chat in sidebar for both T and S
- Two-channel system: Notifications + Communications
- Unread count badges on both channels
- UID-based architecture (T UID ↔ S ID)
- Bi-directional message queries (dual sent + received listeners)
- Teacher split-view interface; student tabbed interface
- Security rules enforce proper read/write permissions
- Message structure: `type`, `from`, `to`, `fromType`, `toType`, `content`, `timestamp`

---

### ✅ Phase 10: Backend Stabilization

**Goal:** Lock down domain architecture and eliminate technical debt.

**Completed:** February 9, 2026

- Firestore Rules v5 published and stable
- Clean backend baseline (`src/lib/firestore.ts`) — Variant-1 compliant
- Domain invariants enforced (Approval ≠ Booking; `sessions` = templates only; `sessionInstances` = booked/actual only)
- `assignedTeacherId` auto-assignment (on T find-by-email and on unit assignment)

---

### ✅ Phase 11: Stale Cleanup & Session Completion

**Goal:** Remove stale v7 references and verify full session lifecycle.

**Completed:** February 14, 2026

- All stale `studentAuthUid` removed from page-level code
- `getOrCreateStudentByEmail` replaced with `getStudentById` in S calendar
- Chat verified E2E both directions
- S Booking flow and session completion flow verified
- Four-Domain Architecture designed (Who / What / When / How)
- Learner Management Spec + S Portal v2 design created

---

### ✅ Phase 12: Package Expiration & Learner Management

**Goal:** Package expiration/pause system, T-side learner management, S/T portal enrichments.

**Completed:** February 15, 2026

All 14 implementation steps completed: StudentPackage + Student status types, T roster with status filter, T learner profile with 4 tabs, S sidebar sub-items, S Dashboard enrichment (progress/package/rewards cards), S My Package page, `checkExpiredPackages` cloud function (daily midnight UTC), T/S expiration warnings, S My Tutor page.

**Spec Document:** `LessonLink-Learner-Management-Spec.md`

---

### ✅ Phase 13: Stripe Integration

**Goal:** S can purchase packages via Stripe Checkout. T can send payment links.

**Completed:** February 18, 2026. Webhook production fix March 1 (Node 27 broke Firebase Admin SDK; pinned to Node 24 LTS).

#### Key Decisions

- Dynamic `price_data` — pricing engine in code, no pre-created Stripe products
- One T profile page (`/t/[slug]`) — auth-aware, shows purchase UI for logged-in S
- Two payment paths: Stripe Checkout redirect (default) + email payment link (fallback for China/WeChat)
- 3% processing fee shown to S, baked into calculated total
- Purchase and booking stay separate (Variant-1 compliant)
- No Stripe Connect (single-teacher, not needed)
- Course-agnostic credit (Feb 24) — `StudentCredit` no longer keyed on courseId. One credit pool per L.

**Spec Document:** `LessonLink-Phase-13-Stripe-Spec-Q2G.md`

---

### ✅ Phase 14: Evaluations & Assessments

**Goal:** Record and analyze initial/final assessments using Strong TBLT criterion-referenced framework (Long/Norris). AI assists with analysis. Before/after comparison with cited L output.

**Completed:** February 20, 2026. Finalize button + Generate Parent Report wired. AI generation (DeepSeek primary) + translation + inline editing + Save & Send with Resend email delivery.

- Types: `AssessmentReport`, `OutputCitation`, `GseBand`, `AiAnalysis`, `ParentReport`, `AiProviderConfig`
- Firestore CRUD for `assessmentReports` + `finalizeAssessmentReport`
- T-portal UI: assessment creation form with scoring panel + citation builder
- Multi-provider AI abstraction with mock mode fallback
- T-portal before/after comparison view
- S-portal evaluation report view at `/s-portal/evaluations`
- GSE mapping helper (scores → GSE band)

**Deferred:** Recording expunge (needs Cloud Functions infrastructure).

**Spec Document:** `LessonLink-Phase-14-Assessment-Spec.md`

---

### ✅ Phase 15: Session Feedback & Email Delivery

**Goal:** Automated session feedback pipeline with AI generation and email delivery to parents.

**Completed:** February 20, 2026.

- SessionFeedback type and Firestore CRUD
- AI feedback generation API (DeepSeek primary)
- Parent-friendly prompts (no jargon)
- Inline feedback UI in T-portal calendar dialog: notes → generate → edit → translate → Save & Send
- Translation via DeepSeek (ZH/PT)
- Resend email integration (`notifications@updates.kiddoland.co`, reply-to: `kiddo@kiddoland.co`)
- HTML email templates with Kiddoland purple branding
- Templates built: `sessionFeedbackEmail`, `parentReportEmail`, `sessionReminderEmail`

---

### ✅ Phase 15-B: Homework System

**Goal:** T assigns homework linked to sessions, L/parent uploads JSON results from external Kiddoland workbooks, T grades, LL tracks accuracy in `studentProgress`.

**Completed:** March 24, 2026. Email attachment added April 1, 2026.

- T assigns homework; L/T uploads JSON; T grades
- Client-side Firestore pattern (no API routes for DB writes)
- `teacherInstructions` field added
- Email attachment (Resend) with 6MB file size guard
- Email failure warning toast; status flips to `delivered` on send success

**Architecture Decision:** Kiddoland workbook/worksheet HTML mini-apps stay independent. LL handles assign → notify → collect → grade → track only. DB writes go client-side (T is logged in). API routes only for server secrets (emails).

**Spec Document:** `LessonLink-Phase-15B-Homework-Spec-Q2N.md`

---

### ✅ Phase 15-C: Admin Import Tools

**Goal:** Import existing learner session history and unit plans from external sources.

**Completed:** February 20, 2026.

- Admin import page at `/admin/import` (admin-only)
- Two tabs: Learner History import + Unit Plan (UPT) import
- Claude prompt templates for converting Obsidian notes and UPT output to JSON
- Learner import writes to `sessionFeedback` + `importedPayments`
- Unit import writes to `units` + `sessions` with full lesson plan data
- Imports tagged with `source: 'obsidian_import'` or `source: 'upt_import'`

---

### ✅ Phase 15-D: iCal Calendar Export

**Goal:** Allow T and L to sync LL calendar with external calendars.

**Completed:** February 20, 2026.

- `/api/calendar/ical/tutor/route.ts` — T calendar iCal feed
- `/api/calendar/ical/learner/route.ts` — L calendar iCal feed
- "Copy Calendar Link" buttons on both T-portal and S-portal calendar pages
- Standard .ics format compatible with Google Calendar, Apple Calendar, Outlook

---

### ✅ Phase 15-E: Learner Settings Page

**Goal:** Provide Ls a path to complete their profile post-signup.

**Completed:** February 24, 2026.

- L Settings page at `/s-portal/settings`
- 6 cards: Account Info, Learner Details, Messaging Contacts, Primary Contact, Secondary Contact
- All signup fields editable post-signup
- Conditional required logic — parent contact required if under 18
- Messaging contacts use add/remove dialog pattern (structured data)
- Firestore undefined bug fixed (conditional spread pattern + `cleanContact()` helper)
- Firestore rules fixed — added `|| isOwner(studentId)` to students update rule
- T Settings design patterns mirrored

---

### ✅ Phase 15-F: Booking Gate & T-Selection Flow

**Goal:** Allow Ls to book sessions without T pre-assigning a unit. Enable Ls to browse and request Ts through the UI.

**Completed:** March 3, 2026

**Architecture Changes:**

- `bookLesson()` gate replaced: `studentProgress` query → `assignedTeacherId` + `studentCredit` check
- `reserveCredit()` called at booking time (was defined but never wired up)
- `unitId`, `sessionId`, `courseId` optional on `bookLesson()` input and `SessionInstance` type
- `teacherUid` on calendar page derived from `student.assignedTeacherId` (was hardcoded email)
- Firestore rules: Ls can update own `studentCredit` (restricted to uncommitted ↔ committed shifts)

**T-Selection Flow:**

- `tutor_assignment` type added to `ApprovalRequestType`
- Browse Tutors page: three-state card rendering (My Tutor / Request Pending / Request button)
- `resolveApprovalRequest()`: sets `assignedTeacherId` on approval, sends in-app notification
- T-portal approvals page handles new type

**Credit Lifecycle (fully wired):**

- Purchase → `uncommittedHours` (via Stripe webhook)
- Book → `uncommittedHours` decremented, `committedHours` incremented (via `reserveCredit()`)
- Complete → `committedHours` decremented, `completedHours` incremented (via `completeSession()`)

---

### ✅ Phase 16: Petland — Progress System + Dork Economy

**Goal:** Build Petland as the end-to-end student progress system with Pet Shop and XP↔Dork economy. Not a reward layer — this IS the progress system. XP tracks quality of performance; for the L, it gamifies learning so they stop thinking about "doing English" and start thinking about growing their Pet and engaging with Kiddoland.

**Completed:** April 12–13, 2026.

#### Part A: Pet Shop Core

- Create → browse → purchase → wear flow
- AI image generation via Gemini for accessory creation
- Firebase Storage with signed URL authentication (auto-signing, 30-day token validity)
- Student shopping UI with responsive grid (2–5 columns)
- Accessory wearing system with "Store your bling!" revert button
- Delete functionality with confirmation dialog
- Collection-based organization
- API helper endpoints: `/api/petshop/sign-url`, `/api/petshop/list`, `/api/petshop/update-item-url`

#### Part B: Collection Management System

- 14-icon theme system for collections
- Three-view Pet Shop display (Items / Collections / Price)
- Collapsible collections on both T and L sides
- DB-driven icons (`petShopCollections` collection)
- Edit/delete collections safely (delete moves items to "Uncategorized")
- Full CRUD endpoints for `/api/petshop/collections`
- Icon syncing with smart fallback for legacy collections

#### Part C: Dork Economy

**Currency Model:**

| XP | Copper | Silver | Gold |
|----|--------|--------|------|
| 1 | 1 | — | — |
| 10 | 10 | 1 | — |
| 100 | 100 | 10 | 1 |
| 1,000 | 1,000 | 100 | 10 |

- All balances stored in Firestore as integers (Copper)
- Gold/Silver/Copper is a display layer only
- `PetlandProfile` fields: `xp` (lifetime earned, never decreases), `xpSpent` (tracking), `dorkBalance` (wallet in Copper)
- Helper functions: `formatDorks(copperTotal)`, `getDorkDenominations(copperTotal)`
- `DorkIconDisplay` component (🟡 ⚪ 🟤) with configurable sizes
- `CashInStation` with quick buttons (10/50/100/500), slider, live preview, conversion rate table, XP stats card (Earned/Spent/Current)
- `xpSpent` backfilled for all four active learners (April 19)

**Critical bug fixed April 13:** `handleConvert` wasn't writing `xp: newCurrentXp` to Firestore. Fixed.

---

### ✅ Phase 17: Bits and Bobs

**Goal:** Infrastructure polish — sidebar collapse, auto-peek, iPad responsiveness, landing page. Grouped together because each is small and none carries standalone architectural weight.

**Completed:** April 19, 2026.

#### 17-A: Sidebar Collapse

Both portals collapse to a narrow icon rail. Hover to expand. Nav items cascade in with staggered animation.

- `SidebarProvider defaultOpen={false}` in both layouts
- `useSidebar().open` drives both width animation and nav cascade
- Hover handlers on `SidebarContent` and `SidebarFooter`
- OPEN_DELAY reduced 500ms → 200ms
- "LessonLink" title transitions smoothly (no snap) during collapse

#### 17-B: Sidebar Auto-Peek

Both portals start open on login to signal the sidebar exists, auto-collapse after 3 seconds.

- `useState(true)` for `sidebarOpen` + `useEffect` timeout
- Controlled `SidebarProvider` with `open={sidebarOpen} onOpenChange={setSidebarOpen}`
- `useEffect` placed above all conditional returns (Rules of Hooks)

#### 17-C: iPad Responsiveness

Viewport-width Tailwind breakpoints across calendar, Petland memory match, live session panels, S/T dashboards, settings, T package stats. Works correctly at any tablet-width resize.

#### 17-D: Kiddoland Landing Page

**Route:** `/` (was `/kiddoland`). Login moved to `/login`. `/kiddoland` redirects to `/`.

- Sticky nav with NavBrand + LLButton (theme toggle → LL logo → flag) + Login
- Hero with `HeroLogo` (physics-based marble bounce, 7s)
- Bounce replays on: page load, NavBrand click (custom event), navigate-back (`?bounce=1` URL param)
- `DragonDork` scroll-triggered bounce on "Enter the Dragon" section (IntersectionObserver threshold 0.5)
- About Jon (bio + stat cards + YouTube embed)
- Program (cyclical learning 4-step + 6 dragon levels)
- Courses (4 types), Media (4 logos), CTA + footer
- `QuoteCarousel` — 28 real iTalki parent reviews, auto-rotate 6s, ZH/PT translation toggle
- `ContactFAB` → Resend via `/api/email/send-contact`
- Reset Password in both L and T login dialogs (Firebase `sendPasswordResetEmail`)

**Pending:** Real photo of Jon (Captain); Namecheap email forwards once MX propagates.

---

### ✅ Phase 18: Live Session Background (Classroom Immersion)

**Goal:** Full-screen display page T shows via ManyCam during live sessions. T's webcam overlays the center; rewards, vocabulary, grammar, phonics, session goals, and XP progress animate around the edges. Kids 5–12 see a fun immersive game screen — not a dashboard.

**Status:** Functional. Needs testing and debugging.

**Route:** `/t-portal/sessions/live/[sessionInstanceId]` (T-only — ManyCam shares T's screen).

#### 18-A: Core Live Session

- Space background (twinkling stars, comets, 3 planets with Saturn ring, nebulas)
- Layout: top bar (session goal + XP counter), left panel (rewards), center (clear for webcam), right panel (vocab/grammar/phonics), bottom bar (progress dragon + magic word slot)
- Session goals pulled from lesson plan (LQ + aims), T-editable at session start
- Magic Word set at session end (L must remember for next session's opener)

#### 18-B: Reward Animations

All seven full-screen direct-fire animations built:

| Reward | Emoji | XP Effect | Animation |
|--------|-------|-----------|-----------|
| Treasure Chest | 🧰 | T sets amount | Gold glow + rays + coin spray + chest bounce |
| Wow | ✨ | No XP | Rainbow glow + rays + star spray |
| Boom | 💥 | No XP | Full-screen flash + "BOOM!" scale |
| Oopsie | 👀 | No XP, no penalty | Red glow + scattered 👀 + shaking text |
| Out-to-lunch | 😴 | -3 XP | Dim + ZZZs + -3 XP reveal |
| Chatterbox | 🗣️ | -2 XP | 💬 spray + "SHHH!" + -2 XP reveal |
| Disruptive | 😬 | -5 XP | Red flash × 3 + ⚠️ spray + -5 XP reveal |

#### 18-C: Content Wiring

- Vocabulary, grammar, phonics diary inputs → Firestore (`sessionProgress` collection)
- Review system pushes classroom vocab/grammar/phonics into Petland SRS flashcard review
- `updateSessionGoals`, `addSessionGrammar`, `addSessionPhonics` wired
- Session end flow with `endSession()`

#### 18-D: End-of-Session Scoreboard

- Celebratory scoreboard triggered on session close
- Total points + breakdown (Treasure Chest earnings, Wow count, Oopsie count, behavior deductions, vocab added, grammar points, phonics sounds)
- Comparison to previous sessions with personal-record badge
- **Needs testing.**

**Remaining polish:** Ocean / Farm / Desert / City themed backgrounds (one per future session). Sound slots.

**Spec Document:** `LessonLink-Phase17-LiveSession-Spec-Q4D.md`

---

### 🔧 Phase 19: Curriculum-Building Architecture + Session History

**Goal:** Transform LL from session-management into a curriculum-building platform. Reusable homework templates on units, provider-agnostic AI layer, three integrated modules (KTFT/KCBT/KUPT), unified session timeline, and standalone course pages.

**Status:** Specs complete. Build not started.

**Spec Documents:**

- `LessonLink-Curriculum-AI-Architecture-Spec-Q3N.md`
- `LessonLink-Module-Architecture-KTFT-KCBT-KUPT-Q3S.md`
- `LessonLink-Unified-Session-History-Spec-Q2N.md`
- `LessonLink-Course-Page-Architecture-Spec-Q2N.md`

**Three Modules (all inside LL):**

- **KTFT** (Kiddoland Task Framework Tool) — universal pedagogical reference. Seven dragon levels, Robinson dimensions, 4-track system, linguistic emergence. Developmental sequence cross-level view (WHITE→BLACK). Read-only page in T-portal.
- **KCBT** (Kiddoland Course Building Tool) — per-course planning. Course aims, unit slots, communicative targets, track assignments, build status. Backed by `courseBlueprint` Firestore collection.
- **KUPT** (Kiddoland Unit Plan Tool) — per-unit design. External HTML tool. Stacked for LL integration.

**Phase 19-A: Foundation**
- [ ] HomeworkTemplate, VocabularyMasteryRecord, AI types, templateId on HomeworkAssignment
- [ ] Firestore CRUD, rules, indexes for new collections
- [ ] CourseBlueprint, LevelBlueprint, UnitBlueprint types + CRUD + rules
- [ ] KTFT seed data file (static data from KTFT v6)

**Phase 19-B: AI Integration Layer**
- [ ] AI types + shared interface
- [ ] Provider adapters (Claude, DeepSeek, MiniMax, Qwen, OpenAI-compatible)
- [ ] Provider resolver (T override → admin default)
- [ ] AI service entry point + completion API route + usage logging

**Phase 19-C: UI**
- [ ] HW template management (list, add/edit, completeness badge, assign form update)
- [ ] KTFT reference page in T-portal with developmental sequence view
- [ ] KCBT blueprint UI (overview, level detail, unit slots, create-from-slot)
- [ ] Auto-create blueprint on course creation
- [ ] Grammar jargon warning on aims input

**Phase 19-D: Unified Session History**
- [ ] Reusable `<UnifiedTimeline>` component (sessions + feedback + homework + assessments)
- [ ] Embeds in T-portal L profile Tab 2 + S-portal Dashboard/Courses
- [ ] Filterable by type, unit, date range; groupable chronologically or by unit

**Phase 19-E: Course Page Architecture**
- [ ] Standalone `<CoursePage>` component with auth-aware rendering
- [ ] Routes: `/courses` (browse), `/courses/[courseId]` (public), `/t/[slug]/courses/[courseId]`
- [ ] Visitors see marketing; enrolled Ls see progress overlay; browsing Ls see purchase CTA
- [ ] S-portal sidebar: "My Courses" + "Browse Courses" replaces "Browse Units"
- [ ] Foundational for multi-T launch

**Stacked:**
- Vocabulary Tracker
- AI Advisor
- Admin AI Settings
- KUPT integration into LL

---

### ⬜ Phase 20: Enhanced Progress ("Check-up" Page)

**Goal:** Themed progress dashboard with visual analytics — the parent/student-facing showcase of the holistic progress system.

**Theme:** Kiddoland Doctor gives student a checkup. Medical chart aesthetic.

**Sections:**

- **Vital Signs:** Total hours toward level (sessions + XP practice hours) out of ~200
- **Health Report:** HP status (Petland), session attendance rate
- **Performance Review:** Homework accuracy, assessment scores, evaluation before/after
- **Prescription:** AI-generated recommendations

**Implementation:**

- [ ] `/s-portal/checkup` route with doctor theme
- [ ] Visual charts: progress over time, accuracy trends, hours breakdown (class vs. independent)
- [ ] Weighted accuracy calculations: `homeworkAccuracyAvg`, `assessmentScoreAvg`, `evaluationScoreAvg`
- [ ] AI recommendations across all three pillars
- [ ] Exportable progress report PDF for parents

---

### ⬜ Phase 21: Platform Hardening

**Goal:** Production-readiness — error handling, edge cases, admin tools, legal.

- [ ] Error boundaries on all major pages
- [ ] Payment failure handling (Stripe webhook retry, failed payment UI)
- [ ] Missed webhook recovery (manual reconciliation tool)
- [ ] Admin dashboard: user management, revenue overview, system health
- [ ] Firestore backup strategy (scheduled exports)
- [ ] Data export for T (student records, payment history)
- [ ] Terms of Service page
- [ ] Privacy Policy page
- [ ] Rate limiting on API routes

---

### ⬜ Phase 22: Advanced Features

- Multi-teacher platform support
- Teacher discovery and selection flow
- Multi-currency support
- Advanced analytics dashboard with BI
- SMS reminders
- Mobile app
- Google Calendar API integration (auto-sync sessions)
- In-class performance tracking (post-class surveys)
- AI-powered curriculum recommendations

---

## NEXT PROJECTS

Three big projects beyond LessonLink. Different **strands** of one overarching idea: decouple our time from earning money, but do it in a way we believe in. It has to make money, it has to be good, and it has to be authentic — as much as possible within constraints.

LessonLink itself is infrastructure for all three.

---

### Project 1 — The Money Strand (TMS)

**Fastest path to income. Can start now. No long build.**

Five possible income channels, to be evaluated in the procurement planning session:

1. **Learner Procurement** — fastest cash, soonest. No build. Only a marketing strategy to define.
2. **Selling LessonLink as SaaS** — arguably the highest-ceiling play. Huge potential, meaningful build (multi-tenancy, onboarding, support infrastructure, marketing site, billing-for-teachers), but most of the hard work is done. The remaining work is productization, not invention. Income is slow to start but compounds.
3. **Production Company (Project 2 revenue)** — content business and BARS bridge. Narrower and more niche than SaaS. Good product, smaller market.
4. **Kiddoland as a School** — hire teachers. Downstream of procurement working. You train them on your method and take a margin on their hours. Income no longer capped at your own hours.
5. **Curriculum-as-Product** — sell the curriculum itself. Not destination packs (applied output). Not LessonLink (delivery software). Not RPG games (one instance of the method). The curriculum system — the how-to-teach-this-way — is the artifact. Sold as: book, online course for teachers, certification program, teacher-facing subscription, consulting to schools, or some combination. TEFL teacher training is a real market. So is the "Sold A Story"–era market of teachers hungry for alternatives to the coursebook-and-grammar-drill default.

**Open:** Procurement plan (target number, budget, capacity) to be defined in next session.

---

### Project 2 — Production Company Strand (PCS)

**Pivot to an education media production company. Working name: Kiddoland Studios.**

Closest to real identity. Medium-term — we're already making these materials. May not be filmmaking (what NYU was for), but it's right up the alley: write graded readers, make animated videos, and produce games (especially interactive, immersive, imaginative RPGs as Travel Destination Packs in Petland). **This becomes the product.**

**Existing assets:**

- Kiddoland / Petland content universe
- RPG practice already running with real learners (Wizard of Oz, etc. — adapted from graded readers, four-to-five station format, party mechanics, HP, skill cards, decisions with consequences)
- Travel Agent inside Petland — nearly free to build (Pet Shop clone with label swaps: items → destinations, accessories → tickets, collections → regions)
- LessonLink as the delivery infrastructure (XP/Dork economy → ticket purchase → travel)

**Product line: Destination Packs.** Each pack wraps around a graded reader (Wizard of Oz, The Hobbit, Treasure Island, A Christmas Carol, Charlotte's Web). Contains brochure graphic, destination blurb, station-by-station scenario with encounters/decisions, HP/skill mechanics, teacher's guide.

**Distribution modes (can coexist):**

- **Mode A — inside LessonLink for your own learners.** Destination goes live in Travel Agent. Every session you run is a live playtest of a future product.
- **Mode B — standalone for other teachers.** PDF / printable / digital download. Teacher runs scenario in their own classroom with their own XP/currency system (or one you provide). No Petland or LessonLink dependency.

**Pedagogical frame:** Task-based language teaching meets extensive reading meets drama-in-education, with a game loop layered on top. Not "educational games" in the drill-wearing-a-costume sense. Language is the medium the game runs on, not the content of the game.

---

### Project 3 — Become A Real Strand (BARS)

**Become a serious author or figure based on your work. Long-term legitimization via publisher.**

Publishers don't sign tutors — they sign people with a distinctive body of work in a defined pedagogical niche. The RPG focus potentially solves the BARS bridge directly.

**Three possible outputs:**

- **Academic** — publish the theory (aesthetic philosophy + language acquisition + play-based learning)
- **Quasi-academic / trade** — publish the approach (how to do ELT the Kiddoland way — teacher-facing methodology book)
- **Commercial** — publish the curriculum (licensed by a publisher, co-branded, or signed author contract for an original Kiddoland reader series with adventures baked in)

**The graded-reader connection:** OUP and Cambridge publish graded readers. Graded readers compete on teaching value. A Destination Pack that wraps around one of their existing readers makes their reader more valuable. That's not a pitch to publish your book — it's a pitch for a partnership or supplementary line.

**The curriculum-as-artifact connection:** The method, the tools (KTFT/KCBT/KUPT), the documentation, the philosophy — it's itself a product. Not destination packs (applied output). Not LessonLink (delivery software). Not RPG games (one instance). The curriculum system is the artifact.

**Open question (unanswered):** How does a Big 4 ELT publisher (OUP, Cambridge, Pearson, Macmillan / National Geographic Learning) actually sign authors? Need a 30-minute conversation with someone who's published with a Big 4 house before committing serious hours. If the answer is "they were already academics" or "they came from inside publishing," Project 3 needs a different bridge than Project 2.

---

## TECHNICAL INFRASTRUCTURE

### Current Stack

| Layer              | Technology                    | Purpose                       |
| ------------------ | ----------------------------- | ----------------------------- |
| **Framework**      | Next.js 15.5.9 (App Router)   | Full-stack React framework    |
| **Language**       | TypeScript 5.x                | Type-safe development         |
| **Styling**        | Tailwind CSS 3.4.1 + shadcn/ui | UI components and styling    |
| **Database**       | Firebase Firestore            | NoSQL cloud database          |
| **Authentication** | Firebase Authentication       | Email/password auth           |
| **Payments**       | Stripe (Checkout + Webhooks)  | Package purchases, payment links |
| **AI**             | DeepSeek (primary), MiniMax (failover), Claude (ready) | Assessment analysis, reports, translation |
| **Email**          | Resend (`notifications@updates.kiddoland.co`) | Transactional email (feedback, homework, contact form, reset password) |
| **Hosting**        | Netlify (from GitHub)         | Production deployment         |
| **Version Control** | Git + GitHub                 | Code repository               |
| **Server-Side**    | Firebase Admin SDK            | Secure webhook writes         |
| **Node.js**        | v24 LTS (pinned via `.node-version`) | Runtime — ⛔ DO NOT UPDATE without testing |

### AI Provider System

| Provider | Status | Use Case | Config Key |
| -------- | ------ | -------- | ---------- |
| **DeepSeek** | ✅ Primary | Assessment analysis, parent reports, session feedback, translation (ZH/PT) | `DEEPSEEK_API_KEY` |
| **MiniMax M2.5** | ⚠️ Failover | Failover target (empty response issue, likely balance) | `MINIMAX_API_KEY` |
| **Claude (Anthropic)** | 🔧 Ready | Premium tasks (when API key added) | `ANTHROPIC_API_KEY` |
| **Kimi** | 🔧 Ready | Alternative provider | `KIMI_API_KEY` |

Task routing configured in `src/lib/ai/providers.ts` → `TASK_PROVIDERS` object.

---

## ROUTES STRUCTURE

| Route            | Purpose                          | Access                          |
| ---------------- | -------------------------------- | ------------------------------- |
| `/`              | Kiddoland public landing page    | Public                          |
| `/login`         | LessonLink login/signup          | Public                          |
| `/kiddoland`     | Redirect → `/`                   | Public                          |
| `/t-portal/`     | Teacher dashboard and management | Teacher only                    |
| `/s-portal/`     | Student portal and booking       | Students only                   |
| `/admin/`        | Platform administration          | Admin only (jwag.lang@gmail.com)|
| `/t/[slug]`      | Public teacher profiles (auth-aware) | Public + logged-in S        |

### Teacher Portal Routes

- `/t-portal/` — Dashboard
- `/t-portal/students` — Learner roster with status filter [Who]
- `/t-portal/students/[id]` — Learner profile page with tabs
- `/t-portal/students/[id]/assessments/new` — Create new assessment
- `/t-portal/students/[id]/assessments/compare` — Before/after comparison
- `/t-portal/calendar` — Calendar and availability [When]
- `/t-portal/courses` — Course templates
- `/t-portal/courses/[id]/levels/[levelId]/units` — Manage units
- `/t-portal/courses/[id]/levels/[levelId]/units/[unitId]/sessions` — Manage sessions
- `/t-portal/chat` — Teacher messaging
- `/t-portal/approvals` — Approval requests
- `/t-portal/settings` — Teacher settings
- `/t-portal/settings/profile` — Public profile editor
- `/t-portal/packages` — Package management [How]
- `/t-portal/reports` — Reports
- `/t-portal/sessions/live/[sessionInstanceId]` — Live Session (Phase 18, ManyCam display)
- `/t-portal/petland/pet-shop` — Pet Shop management

### Student Portal Routes

- `/s-portal/` — Dashboard
- `/s-portal/calendar` — Session booking [When]
- `/s-portal/chat` — Messaging [Cross-cutting]
- `/s-portal/courses` — My Units / Browse Units / Feedback / Evaluations / My Package
- `/s-portal/tutors` — My Tutor / Browse Tutors
- `/s-portal/settings` — Learner profile settings
- `/s-portal/top-up` — Package purchase
- `/s-portal/checkup` — Doctor's Checkup (Phase 20)
- `/s-portal/homework` — Homework list

### API Routes

- `/api/stripe/checkout` — POST: Create Stripe Checkout Session
- `/api/stripe/webhook` — POST: Handle `checkout.session.completed`
- `/api/stripe/send-link` — POST: Generate 24-hour payment link URL
- `/api/ai/analyze-assessment` — POST: AI assessment analysis (multi-provider)
- `/api/homework/assign` — POST: Send homework assignment email with optional attachment
- `/api/email/send-homework-graded` — POST: Send homework graded notification
- `/api/email/send-feedback` — POST: Send session feedback to parent
- `/api/email/send-parent-report` — POST: Send parent assessment report
- `/api/email/send-contact` — POST: Send contact form email (Kiddoland landing page)
- `/api/calendar/ical/tutor` — GET: T calendar iCal feed
- `/api/calendar/ical/learner` — GET: L calendar iCal feed
- `/api/petshop/sign-url` — POST: Sign Firebase Storage URL
- `/api/petshop/list` — GET: List Pet Shop items
- `/api/petshop/collections` — Full CRUD

---

## PACKAGE STRUCTURE

| Package Type             | Description                  | Content                     | Discount | Use Case                                        |
| ------------------------ | ---------------------------- | --------------------------- | -------- | ------------------------------------------------ |
| **Single Session**       | Trial or makeup              | 1 session                   | 0%       | New students, one-off makeup                     |
| **10-Pack**              | Short-term commitment        | 10 hours = 4 units          | 10%      | Most common package                              |
| **Full Course (60 hrs)** | Complete proficiency level   | 60 hours = 24 units         | 20%      | Serious learners completing A1, A2, B1, etc.     |

---

## XP BUDGET PER LEVEL

**Minimum 5,000 XP to complete one level.** 60% Engagement / 40% Mastery. Time (200 hours) is a gate, not an XP source. Progress = total XP ever earned. Spending Dorks never reduces progress.

**Three Pillars:**
- **Time:** 200 hrs/level (45 in-class + 155 out-of-class). Gate only — no XP from attendance.
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
- Engaged L with daily Petland: ~5,500–6,500 XP (surplus for Dork spending)
- Bare minimum L: ~3,000–3,500 XP (does not complete level)

**Homework XP Rule:** Auto-awarded instantly on submission. Formula: 20 × (completedActivities / totalActivities). T still grades for feedback, but grading does not adjust XP already earned.

---

## DORK ECONOMY

**XP** = progress. Total ever earned. Never decreases. Tracks toward level completion.

**Dorks** = spending money. Converted from XP by player choice at the Cash-In Station. Spent in Pet Shop, Blasters arcade, Travel Agent.

**Pet Shop:** All prices in Dorks (not XP). Purchases deduct from `dorkBalance`. Denomination communicates value visually — Copper = cheap impulse buy, Silver = nice treat, Gold = save-up goal.

**Pet Egg Recovery:** 500 Copper (5 Gold) for new egg + 100 Copper (1 Gold) to hatch.

**Treasure Chest visual tiers** tie to Dork denominations — Copper/Silver/Gold coins fly out matching the XP amount given.

---

## CURRENT STATUS (Q4O — April 24, 2026)

- ✅ **Phases 1–18:** Complete and production-ready.
- 🔧 **Phase 18 needs testing** — end-of-session scoreboard in particular. Functional but untested.
- ⬜ **Phase 19:** Curriculum-AI Architecture + Session History + Course Pages. Specs complete, build not started.
- ⬜ **Phases 20–22:** Stacked.
- 🔥 **Next Projects** — TMS (Project 1), PCS (Project 2), BARS (Project 3) defined. Procurement plan to be drafted first session back.

**Real learners (4 active):** Arina, Luke, Gordon, Mark. Max (test account).

**Captain action items:**

- Firebase Console: create/assign courses for Arina, Luke, Gordon, Mark
- Update Gordon's `studentProgress.unitId` (currently `'starter'`)
- Real photo of Jon for landing page About section

---

### Update Q4O — Infrastructure (April 24, 2026)

Email forwarding for `kiddoland.co` and `jonericvoice.com` configured via **ImprovMX** (free tier) + **Gmail "Send As"**. Resend outbound and ImprovMX inbound forwarding now coexist under Custom MX. Gmail "Send As" requires an **App Password** (Google Account → 2-Step Verification → App Passwords) — without this, sending from custom domain addresses in Gmail fails silently or throws authentication errors. No code changes to LL.

**Repository:** https://github.com/jwaglang/lessonlink

**Admin Email:** jwag.lang@gmail.com

**Hexdate:** `[Year][Month][Day]` base-36. Year: Q=2026, R=2027. Month: 1–9 digits, A=10, B=11, C=12. Day: 1–9 digits, A=10… T=29, V=31.

**Dev Environment:** VSCode + MiniMax M2.5 (via Kilo Code) for codebase searches and edits. Claude (Anthropic) for planning and architecture. WARNING: Kilo Code will edit files unprompted — only paste SEARCH ONLY prompts.

**Local Testing:** Stripe CLI at `C:\Users\joner\Desktop\stripe_1.37.1_windows_x86_64\stripe.exe`. Use `stripe listen --forward-to localhost:9002/api/stripe/webhook` + update `.env.local` `STRIPE_WEBHOOK_SECRET` with CLI's temporary `whsec_`. Restore production `whsec_` after local testing.

---

## KNOWN ISSUES & WORKAROUNDS

- ✅ All resolved through Q4J: AI_USE_MOCK, Resend domain, feedback duplicate, TS errors, calendar availability, `.toFixed`, L Settings saves, Stripe webhook 500s, homework attachment, xpSpent backfill, contact form mailto.
- ✅ **Email forwarding** — ImprovMX configured for `kiddoland.co` and `jonericvoice.com`. Gmail "Send As" set up with App Password. Resend outbound + ImprovMX inbound coexist under Custom MX.
- ⚠️ **Booking flow requires courseId** — L calendar booking still requires courseId/unitId/sessionId in URL params. Top Up credit works but L must select a course to book.
- ⚠️ **Calendar tab-switch refresh** — Availability doesn't re-fetch when switching tabs. Requires page reload.
- ⚠️ **T calendar optimistic UI** — Slots flip after Firestore confirms, not instantly. Minor delay.
- ⚠️ **MiniMax returns empty responses** — likely balance. Not blocking (DeepSeek primary).
- ⚠️ **No Anthropic API key** — Claude failover inactive without `ANTHROPIC_API_KEY`.
- ⚠️ **Session reminder trigger** — Email template built, no cron/scheduled function.
- ⚠️ **T profile purchase flow** — Auth-aware but doesn't show L's current course context.
- ⚠️ **Firestore rules for scheduleTemplates** — currently `allow read, write: if true`. Tighten to `request.auth != null` when stable.
- ⚠️ **ParentContact.relationship type mismatch** — `types.ts` lowercase, L Settings dialog title-case. Non-blocking cosmetic.
- ⚠️ **Old teacherProfile `A9YKGu2jOgRAEVtR8n0E`** — disabled in Firestore, stacked for deletion.
- ⚠️ **Dead API routes** — `/api/homework/[id]/upload-results` and `/api/homework/[id]/grade` unused. Deletion pending.
- ⚠️ **Phase 18 end-of-session scoreboard** — functional but untested.

---

## ENVIRONMENT SAFETY RULES

⛔ **NEVER update Node.js, npm, Python, or any system-level tool without checking compatibility first.**

On March 1, 2026, a routine Glary Utilities run auto-updated Node.js from v24 LTS to v27, silently breaking the Firebase Admin SDK. Stripe webhook returned 500 errors; took a full day to diagnose.

**Rules:**

1. **Node.js:** ONLY LTS versions. Currently v24 LTS pinned via `.node-version`.
2. **Glary Utilities / cleaners:** Exclude Node.js, npm, Python, Git from auto-updates.
3. **npm packages:** Only `npm update` or `npm install [package]` when specifically needed and discussed with Claude first.
4. **Before debugging:** If a working feature breaks, FIRST check environment — `node --version`, recent system updates.
5. **Netlify Node version:** `.node-version` file in project root. Currently `24`.
6. **After any system update:** Run `node --version` and `npm run dev` to verify project still compiles before pushing to production.

---

## DEBUGGING PROTOCOL

When a previously working feature starts failing:

1. **FIRST:** Check environment — `node --version`, recent system updates, recent npm installs
2. **SECOND:** Test locally with `npm run dev` before burning Netlify deploys
3. **THIRD:** For webhook debugging, use Stripe CLI locally
4. **FOURTH:** Only deploy to Netlify after confirming the fix works locally
5. **NEVER** iterate debugging on production deploys — each deploy costs usage

---

**Last Updated:** April 24, 2026 (Q4O)

**Version:** Q4O (6.1) — Infrastructure update: ImprovMX email forwarding + Gmail Send As. Admin email test tool added. Known issue resolved.
