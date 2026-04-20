# LessonLink Roadmap Supplement | Q4K (April 20, 2026)

**Purpose:** Additions to be merged into the main roadmap at a future update. Drafted but not yet integrated — main `LessonLink-Roadmap-Q4K.md` remains the authoritative document until this is folded in.

**Scope:** Module architecture logic, Kiddoland Tools tracking, SaaS tier argument, KHGT module definition, Homework Generator build recommendation.

---

## 1. Module Architecture — The Scope Chain

LessonLink's curriculum-design side is organized as a trinity of modules in the Q36 spec (`LessonLink-Module-Architecture-KTFT-KCBT-KUPT-Q3S.md`). Each module corresponds to a zoom level in curriculum design:

| Module | Scope | Question it answers |
|--------|-------|---------------------|
| **KTFT** | Universal | What is the pedagogical framework? |
| **KCBT** | Per-course | What is the shape of this course? |
| **KUPT** | Per-unit | What happens inside this unit? |

The logic is zoom levels: KTFT is the atlas, KCBT is the country map, KUPT is the street map. Together they cover the full design hierarchy from "what is Kiddoland pedagogy?" down to "what happens in Unit 3 Session 2?"

### Extension: KHGT (New)

Reviewing the Q42 Homework Generator spec against this architecture reveals a fourth zoom level — one below KUPT. It doesn't design lessons; it produces the homework artifacts that attach to sessions within a unit.

The complete scope chain:

**KTFT** (framework) → **KCBT** (course) → **KUPT** (unit) → **KHGT** (homework)

Each module answers a different question:

- **KTFT:** What's the pedagogical universe?
- **KCBT:** What's the shape of this course?
- **KUPT:** What happens inside this unit?
- **KHGT:** What homework artifacts does this unit need?

**KHGT is its own module, not a sub-feature of another.** It's the missing zoom level in the Q36 spec.

---

## 2. SaaS Tier Argument

The module architecture is the natural structure for tiered LessonLink SaaS pricing. When selling LL to independent tutors outside Kiddoland, modules stack into pricing tiers:

| Tier | Contains | Audience |
|------|----------|----------|
| **Core** | Vanilla LMS — bookings, credits, messaging, feedback pipeline, assessments | Any independent tutor who wants to replace their spreadsheet/Calendly/Notion stack |
| **Gamification** | Core + Petland (progress system, XP/Dork economy, Pet Shop, rewards, SRS) | Tutors teaching kids or anyone who wants engagement mechanics |
| **Curriculum** | Gamification + KTFT + KCBT + KUPT + KHGT (full curriculum design and content production stack) | Tutors who want to professionalize their practice and build reusable curriculum |
| **AI** | Curriculum + Phase 19-B AI layer (content generation, advisor, feedback AI) | Tutors who want AI-assisted content at scale |

Four modules, three or four tiers. The tier names are flexible — what matters is the architectural separation. Teachers who want a tutor LMS get the core. Teachers who want the whole Kiddoland method pay for the full stack.

**Why this matters:** Decoupling Kiddoland-specific pedagogy (KTFT's dragon levels, Robinson dimensions, 4-track system) from LessonLink infrastructure is what makes the SaaS pitch honest. The core LMS is pedagogy-agnostic and broadly useful. The curriculum modules encode *Jon's* pedagogy and are premium because they represent 25 years of method development.

---

## 3. Kiddoland Tools — External → Eventual LL Modules

Production tools that live as standalone HTML outside LessonLink today. They'll be ported inside LL as modules over time, in sync with Phase 19 (Curriculum-AI Architecture).

| Module | Current state | Target state | Build priority |
|--------|---------------|--------------|----------------|
| **KTFT** | Standalone HTML (v6) | Inside LL as read-only reference page, seed data in `src/lib/ktft-seed-data.ts` | Phase 19-A12 + 19-C6/C7 (spec'd) |
| **KCBT** | Does not exist | Inside LL as interactive planning page, `courseBlueprint` Firestore collection | Phase 19-A9–A11 + 19-C8–C12 (spec'd, not built) |
| **KUPT** | Standalone HTML (v9) | Eventually inside LL, AI-powered | Stacked — integration deferred until AI layer (19-B) stable |
| **KHGT** | Does not exist. Spec'd as standalone HTML (Q42) | Eventually inside LL, AI-powered (Option B migration path per spec Section 13) | **Build as standalone first** (1–2 sessions). Integrate later. |

The sequencing logic in the Q36 spec says KUPT stays external "until the AI layer is stable." The same logic applies to KHGT — Option A (standalone) now, Option B (inside LL) once Phase 19-B (AI layer) is done. The Q42 spec explicitly says "Option A is a prototype of Option B's output engine."

---

## 4. KHGT — Kiddoland Homework Generator Tool

**Spec:** `Kiddoland-Homework-Generator-Spec-Q42.md` (April 1, 2026)

**Scope:** Generates complete teacher-version HTML homework files from form input. Three content types: Workbooks (WHITE), Song Worksheets, Phonics Workbooks. No backend, no AI, no tokens.

**Problem solved:** T produces 8–10 homework files per week. Current workflow (prompt Claude, debug broken output, retry) costs 20–40 minutes per file, plus token cost, plus quality variance. KHGT replaces this with a form that produces identical reliable output every time.

**Status:** Not yet built. Spec ready.

**Architecture:** Same single-file HTML pattern as KTFT and KUPT. Opens in browser, no install, works offline.

**Future path (Option B):** When LL has the AI layer (Phase 19-B), KHGT migrates inside LL. AI populates form fields from unit data. HTML templates and generation logic transfer directly.

---

## 5. Recommendation: Build KHGT as Standalone HTML Now

Build KHGT as a standalone HTML tool at the next content-production session. Do not wait for Phase 19.

**Three reasons:**

1. **Operational pain is real and weekly.** 8–10 homework files per week × 20–40 minutes each = 3–6 hours of prompt wrangling weekly. The generator pays back within one week of use.

2. **Zero integration cost.** Pure HTML, no backend, no LL codebase changes, no token cost, works offline. Nothing blocks it. Nothing depends on it.

3. **Dual-purpose build.** Building KHGT now gives you the production infrastructure *and* the prototype of what the Option B module will look like inside LL later. The HTML templates and generation logic transfer directly into Phase 19-B when that phase arrives. Two wins from one build.

**Estimated build:** 1–2 sessions per Q42 spec.

**Delivery:** Single file — `Kiddoland_Homework_Generator.html`. T saves locally and opens whenever homework production is needed.

---

## 6. Integration Instructions for Future Roadmap Update

When folding this supplement into the main roadmap, add:

- **New section** between "Technical Infrastructure" and "Routes Structure": *"Module Architecture & Kiddoland Tools"* — incorporates Sections 1, 2, and 3 of this supplement.
- **Update Phase 19 header note** — add one sentence referencing the four-module scope chain and noting that KHGT is the fourth module, not yet spec'd in the original Q36 document.
- **Add KHGT to Open Items / Captain action items** — "Build KHGT standalone HTML (1–2 sessions)" as a stackable production task independent of LL phase work.
- **Optional SaaS section** — if SaaS productization becomes Project 1 Channel 2 (TMS), Section 2's tier table becomes the starting point for that spec.

---

**Status:** Draft supplement. Ready to merge on next roadmap revision.
**Session ID:** Q4K
