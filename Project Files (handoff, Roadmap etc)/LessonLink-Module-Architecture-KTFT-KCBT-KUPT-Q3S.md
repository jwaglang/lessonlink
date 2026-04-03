# LessonLink: KTFT / KCBT / KUPT Module Architecture

**Date:** March 28, 2026 (Q36)
**Supersedes:** DSM spec section from earlier this session
**Applies to:** Curriculum-AI Spec Sections 9, 13, 14

---

## 1. Context & Decisions Made This Session

The original Curriculum-AI spec was missing a T-facing curriculum design layer. We initially drafted this as a "Developmental Sequence Map" (DSM). On further discussion, we split it into two concerns:

1. **The developmental sequence trajectory** — a cross-level view showing how acquisition progresses from WHITE to BLACK. Universal (all courses). Belongs in the KTFT.
2. **The per-course planning tool** — unit slots, communicative targets, track assignments, build status. Course-specific. Becomes a new module: the KCBT.

All three Kiddoland tools (KTFT, KCBT, KUPT) live as modules inside LessonLink. They all need Firestore data.

---

## 2. The Three Modules

### KTFT — Kiddoland Task Framework Tool (Reference)
- **Scope:** Universal. The pedagogical framework for all Kiddoland courses.
- **Contains:** Seven dragon levels, Robinson dimensions, 4-track system, TBLT task cycles, linguistic emergence data per level, task examples, text types.
- **What's new:** A developmental sequence view — cross-level map showing full WHITE→BLACK acquisition trajectory.
- **Lives in LL as:** Read-only reference page inside T-portal. Data from KTFT seed file.
- **Build priority:** Phase C (current build).

### KCBT — Kiddoland Course Building Tool (Planning)
- **Scope:** Per-course. Planning tool for a specific course's curriculum design.
- **Contains:** Course aims, level-by-level unit slots, communicative targets, track assignments, build status.
- **Does NOT duplicate:** Emergence data, Robinson dimensions, GSE ranges — referenced from KTFT seed data.
- **Lives in LL as:** Interactive planning page in T-portal, backed by `courseBlueprint` Firestore collection.
- **Build priority:** Phase A (data model) + Phase C (UI) — current build.

### KUPT — Kiddoland Unit Plan Tool (Unit Design — Stacked)
- **Scope:** Per-unit. Designs individual unit session plans.
- **Currently:** External HTML tool generating AI prompts for copy-paste.
- **Future (inside LL):** Wired to AI layer, generates unit plans directly, links to KCBT slots.
- **Build priority:** Stacked for later.

### The Workflow
T consults KTFT (framework) → uses KCBT (course skeleton) → uses KUPT (unit design) → LL stores everything, AI layer reads from all three.

---

## 3. KTFT Update: Developmental Sequence View

### What Exists Today
The KTFT has linguistic emergence data per level under "Linguistic Complexity (Emergent)." But it's sliced per level with no cross-level progression view.

### What We're Adding
A "Developmental Sequences" tab showing the full acquisition trajectory:

| Stage | Level | Robinson Shift | What Typically Emerges |
|-------|-------|---------------|----------------------|
| 1 | WHITE | 1 elem, +Here-and-Now, -None | Formulaic chunks, single words, imperatives |
| 2 | YELLOW | 2 elem, +Here-and-Now, -None | Plural -s, progressive -ing, copula BE, SVO |
| 3 | ORANGE | 3 elem, -Past, +Simple | Past -ed, irregular past, because-clauses |
| 4 | GREEN | 4 elem, -Past/Future, +Extended | Superlative, first conditional, opinion+reason |
| 5 | BLUE | Complex, -Full, ++Extended | Present perfect, passive, second conditional |
| 6 | PURPLE | Variable, -Full, +++Critical | Modal perfects, nominalizations, third conditional |
| 7 | BLACK | Unlimited, full flexibility | Subjunctive, inversion, full pragmatic range |

**TBLT guardrail:** Always labeled: "Language targets are descriptive (what typically emerges), not prescriptive (what must be taught)."

### Sources
Pienemann (1998), Dulay & Burt (1974), Krashen (1977), Lightbown & Spada (2013), Long (2015), Robinson (2011).

### Implementation
Static reference page in T-portal. Data from `src/lib/ktft-seed-data.ts`.

---

## 4. KCBT: Kiddoland Course Building Tool

### What It Stores

**`courseBlueprint` Collection (NEW)**

| Field | Type | Purpose |
|-------|------|---------|
| `id` | string | Document ID |
| `courseId` | string | Links to course |
| `teacherId` | string | Owning T |
| `courseAims` | string[] | Communicative aims for whole course |
| `courseObjectives` | string[] | Measurable communicative outcomes |
| `targetGseRange` | { start, end } | e.g. { 10, 58 } |
| `levelBlueprints` | LevelBlueprint[] | Per-level planning |
| `status` | 'draft' \| 'in_progress' \| 'mature' | Blueprint completeness |
| `createdAt / updatedAt` | string (ISO) | Timestamps |

**`LevelBlueprint` (embedded)**

| Field | Type | Purpose |
|-------|------|---------|
| `levelId` | string | Links to Firestore level AND KTFT seed data |
| `levelName` | string | e.g. "WHITE DRAGON" |
| `levelAims` | string[] | Communicative aims for this level |
| `unitBlueprints` | UnitBlueprint[] | Unit-level planning slots |
| `unitsPlanned` | number | How many slots exist |
| `unitsBuilt` | number | How many actual units linked |

No `robinsonDimensions`, `gseRange`, or `expectedEmergence` fields. Read from KTFT seed data at render time.

**`UnitBlueprint` (embedded)**

| Field | Type | Purpose |
|-------|------|---------|
| `unitId` | string \| null | Links to actual unit. Null = planned only. |
| `sortOrder` | number | Position in level |
| `plannedTitle` | string | Working title |
| `communicativeTarget` | string | What L should be able to DO |
| `track` | 'narrative' \| 'informational' \| 'inquiry' \| 'functional' | Track assignment |
| `taskComplexityNotes` | string (optional) | T notes on complexity |
| `emergenceNotes` | string (optional) | What T expects to create conditions for |
| `expectedTemplateCount` | number (optional) | Target HW template count |
| `status` | 'planned' \| 'in_progress' \| 'complete' | Build status |

### Lifecycle
1. Auto-created when T creates a course
2. T adds unit slots with communicative targets and track assignments
3. T builds units → system links to blueprint slots
4. T refines after teaching
5. Mature = complete, tested, reusable

### Grammar Jargon Guardrail
Warns if aims contain grammar terminology. Aims must be communicative: "L can ___".

---

## 5. How Modules Feed the AI Layer

| AI Feature | From KTFT (seed data) | From KCBT (Firestore) |
|-----------|----------------------|----------------------|
| HW template description | Level emergence, Robinson | Unit communicative target, course aims |
| Unit description | Level emergence, task types | Unit communicative target, level aims |
| AI Advisor | Full trajectory, current level | Full blueprint — position, gaps |
| Assessment analysis | Expected emergence for level | Course aims, level aims |
| Session feedback | Level emergence (recast suggestions) | Unit communicative target |

AdvisorContext gains two new fields:
- `courseBlueprint` (from KCBT): courseAims, currentLevelAims, currentUnitCommunicativeTarget
- `developmentalContext` (from KTFT): currentLevelEmergence, robinsonDimensions, nextLevelPreview

---

## 6. Revised Phase Plan

### Phase A: Foundation
A1–A8: Unchanged (HW templates, vocab mastery, AI types, CRUD, rules, indexes)
- **A9:** Add CourseBlueprint, LevelBlueprint, UnitBlueprint types → `types.ts`
- **A10:** Blueprint Firestore CRUD → `firestore.ts`
- **A11:** Firestore rules for courseBlueprints → `firestore.rules`
- **A12:** KTFT seed data file → `src/lib/ktft-seed-data.ts`

### Phase B: AI Integration Layer
B1–B10: Unchanged. AI layer reads KTFT seed data and KCBT Firestore data.

### Phase C: UI
C1–C5: Unchanged (template list, forms, completeness, assign form)
- **C6:** KTFT reference page in T-portal → `src/app/t-portal/framework/page.tsx`
- **C7:** Developmental sequence cross-level view (tab on KTFT page)
- **C8:** KCBT: Course Blueprint overview page → `src/app/t-portal/courses/[id]/blueprint/page.tsx`
- **C9:** KCBT: Level detail/edit view
- **C10:** KCBT: Unit slot CRUD
- **C11:** KCBT: "Create Unit from Slot" flow
- **C12:** KCBT: Auto-create blueprint on course creation
- **C13:** Grammar jargon warning (reusable validation)

### Stacked
- KUPT integration (bring inside LL, wire to AI)
- Phase D — Vocabulary Tracker
- Phase E — AI Advisor
- Phase F — Admin & Settings

### Revised Estimates

| Phase | Original | Revised | Change |
|-------|----------|---------|--------|
| A | 1–2 sessions | 2 sessions | +1 |
| B | 2–3 sessions | 2–3 sessions | — |
| C | 2–3 sessions | 4–5 sessions | +2 |
| **Total A+B+C** | **5–8 sessions** | **8–10 sessions** | **+3** |

---

## 7. What This Supersedes

The DSM spec section (`LessonLink-Curriculum-AI-Spec-Section-DevSequenceMap`) is fully superseded:
- Developmental sequence trajectory → KTFT module (Section 3)
- Course blueprint data model → KCBT module (Section 4), slimmed to remove emergence duplication
- Implementation steps → Revised phase plan (Section 6)

The main Curriculum-AI spec remains valid for Sections 1–8 and 10–16. This document adds Section 9 content and revises Section 13.

---

**Status:** Spec update ready
**Ready for:** Phase A build (types + CRUD + seed data)
**Session ID:** Q36
