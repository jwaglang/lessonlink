# LessonLink Development Session Handoff

## Session Date
April 4, 2026 (Q44)

## Session Summary
Designed and specced the Kiddoland Homework Generator (Option A standalone HTML tool). Established Track 1 / Track 2 production strategy. Examined Petland codebase and assessed integration path. Clarified four homework content types. Identified Petland as a module candidate for LL platform architecture.

---

## What We Completed

### Major Achievements
- ✅ **Kiddoland Homework Generator spec complete** — `Kiddoland-Homework-Generator-Spec-Q42.md`. Standalone HTML tool (like KUPT/KTFT) covering three content types: Workbooks (WHITE), Song Worksheets, Phonics Workbooks. No AI, no backend, no tokens. Full form → generate → download workflow.
- ✅ **Track 1 / Track 2 strategy established** — Track 1: Build Homework Generator (solves 8-10 pieces/week production bottleneck). Track 2: Integrate Petland into LL (gets spaced repetition loop running, makes Sentence Switchers valuable).
- ✅ **Petland codebase examined** — Unzipped and reviewed full codebase. Next.js + Tailwind + shadcn + Firebase (same stack as LL). Different Firebase project. ~800 lines of real logic. Passport + Playground working. Pet Shop + Travel Agent tabs exist but unbuilt.
- ✅ **Four homework content types clarified** — (1) Workbooks (WHITE/PHONICS/future YELLOW/ORANGE/GREEN), (2) Song Worksheets, (3) Sentence Switchers, (4) Phonics Workbooks. Sentence Switchers excluded from generator — their value comes from Petland's spaced repetition, not from production tooling.
- ✅ **Animation system designed** — Option 3 (modular animation snippets). 8 types: Floating Particles, Horizontal Scroll, Pulsing Glow, Rising Bubbles, Spinning Orbit, Wave Motion, Twinkle, Bouncing. Song Worksheets only. Custom animation protocol: generate → review → Claude prompt with injection point (10% of cases).
- ✅ **Platform architecture vision noted** — Captain's direction: Kiddoland.co as a platform with modules (LL, Petland, Blaster games, LedgerLink, etc.) under one URL. Customer-facing front end (currently WordPress) for parents. Shared auth. Stage 1: integrate Petland as S-portal page. Stage 2: platform shell restructure.
- ✅ **Higher-level workbook design deferred** — YELLOW/ORANGE/GREEN workbook activity types to be designed later this week in a separate session. Generator tool will accommodate them via Option A approach (add new template + form to same file).

### No Code Changes This Session
Planning and spec session only. No files modified in LL codebase.

---

## Files Created This Session

| File | Purpose | For |
|------|---------|-----|
| `Kiddoland-Homework-Generator-Spec-Q42.md` | Full spec for Option A standalone generator tool | Project files / next build session |

## Project Files to Update

| Action | File |
|--------|------|
| **ADD** | `Kiddoland-Homework-Generator-Spec-Q42.md` |

---

## Current State

### ✅ What's Working
- All existing LL functionality unchanged (sessions, credits, feedback, calendar, homework assign, email attachment, etc.)
- WHITE and PHONICS workbook templates export v1 JSON
- Song Worksheet and Sentence Switcher templates updated to Export Standard v1
- Clone-and-reskin workflow for song worksheets (Claude only — other AIs produce broken output)
- Netlify deployed with production config

### ⚠️ Known Issues / Warnings
- **Dead API routes still in codebase** — `/api/homework/[id]/upload-results` and `/api/homework/[id]/grade`. Deletion prompted, not confirmed.
- **Old T profile `A9YKGu2jOgRAEVtR8n0E`** still in Firestore — stacked, contains seed data to migrate later
- **Firestore rules for scheduleTemplates** — still `allow read, write: if true`. Needs tightening.
- **ParentContact.relationship type mismatch** — cosmetic, non-blocking
- **Session reminder trigger** — email template exists but no cron to fire it
- **Petland on separate Firebase project** (`studio-690762243-81f19`) — needs migration to LL's Firebase if integrated as module
- **Petland avatar AI rendering** — Imagen via Genkit produces inconsistent quality. Re-rendering with accessories doesn't work.
- **YELLOW/ORANGE/GREEN workbook templates** — activity types not yet designed. Design session planned for later this week.
- **KTFT "Copy Level Only" button** — stacked, would improve generator workflow but not blocking

### 🧪 Needs Testing
- [ ] T-portal homework tab: full Upload JSON + Grade flow
- [ ] Email delivery when T grades homework
- [ ] teacherInstructions field saves and displays correctly

---

## Next Sessions Should

### Parallel Session A: Homework Generator Build
1. **Session 1:** Core generator — tool UI shell, Workbook (WHITE) form + template + generation, Phonics Workbook form + template + generation, theme presets, KTFT JSON parser, draft save/load, download logic
2. **Session 2:** Song Worksheets — form + template + generation, animation snippet library (8 types), animation preview, custom animation injection point, Claude prompt template

### Parallel Session B: Petland Integration Assessment
1. Review Petland codebase (zip available — already examined in this session)
2. Decide: integrate as S-portal module vs keep separate with webhook
3. If integrating: plan Firebase migration, auth sharing, route structure
4. If separate: set up GitHub repo, Netlify deployment, webhook endpoint

### After Generator + Petland Sessions
- Design YELLOW/ORANGE/GREEN workbook activity types
- Delete dead API routes
- Tighten scheduleTemplates Firestore rules
- Phase A (types + CRUD + seed data for KTFT/KCBT)

### Stacked
- KTFT "Copy Level Only" export button
- Kiddoland Song Worksheet Generator as LL module (Option B, requires AI layer)
- Old T profile seed data migration
- Platform shell restructure (Stage 2 — Kiddoland.co unification)
- Pet Shop + Travel Agent tabs in Petland
- Avatar re-rendering with accessories

---

## Important Context

### Critical Information for Next Claude

#### For Generator Session
- **Spec is complete:** `Kiddoland-Homework-Generator-Spec-Q42.md` — read it before building
- **Three content types:** Workbooks (WHITE), Song Worksheets, Phonics Workbooks. NOT Sentence Switchers.
- **Animation system:** 8 modular snippet types. Song Worksheets only. Custom animation protocol for the 10% that need more (Claude prompt template with injection point in generated file).
- **Theme presets:** 10 color presets (Nature, Ocean, Space, Candy, Warm, Cool, Forest, Music, City, Rainbow). All content types.
- **Estimated size:** ~9,000-10,000 lines single HTML file. Three full HTML template engines embedded as JS template literals.
- **Session 1 covers Workbooks + Phonics (highest volume — 6-8 of 8-10 weekly files). Session 2 adds Song Worksheets + animations.**
- **KTFT integration:** Paste JSON, see guidance panel. Guidance only, doesn't restrict form. Works without KTFT too.
- **Only Claude can handle song worksheet generation.** Gemini = terrible, DeepSeek = incomplete, Qwen = buggy. This is why the generator exists.

#### For Petland Session
- **Petland is a Next.js app** on a separate Firebase project (`studio-690762243-81f19`). Same stack as LL (Next.js, Tailwind, shadcn, Firebase client-side).
- **What works:** Passport (pet display, stats, AI hatching), Playground (Memory Match vocab game, earns XP/HP), Teacher dashboard (student mgmt, vocab CRUD, feedback, registration). HP decay (10/24hr = spaced repetition pressure).
- **What doesn't:** Pet Shop (tab exists, no implementation), Travel Agent (tab exists, no implementation), avatar re-rendering with accessories, AI image quality inconsistent.
- **Captain's vision:** Kiddoland.co as a platform. LL, Petland, Blaster games, LedgerLink as modules. Shared auth, one URL. Stage 1: Petland as S-portal page. Stage 2: full platform restructure.
- **Key question to resolve:** Integrate into LL's Firebase (one codebase, shared Firestore, no webhook needed) vs keep separate (own GitHub repo, own Netlify, webhook sync). Captain leans toward integration as module.
- **Petland uses Google Genkit + Imagen** for pet avatar AI. LL uses DeepSeek with failover chain. These are separate AI concerns.
- **Vocab is stored per student** as a Firestore subcollection (`students/{id}/vocabulary`). Each word has: word, sentence, questionPrompt, level, imageUrl, type (basic/cloze), srsLevel.

#### Carried Forward
- **Clone-and-reskin is the workflow** for song worksheets (until generator is built). Claude only.
- **Qwen 3.5 Plus is the execution AI** for template modifications and file edits.
- **MiniMax edits files unprompted** — use SEARCH ONLY bookends.
- **API route pattern:** Database writes go client-side. API routes only for server secrets.
- **Credit is course-agnostic** — `getStudentCredit` queries by `studentId` only.
- **Netlify is locked** — no auto-publish, deploy manually.
- **Node.js pinned to v24 LTS** — DO NOT UPDATE.

### Recent Decisions
- **Decision:** Build Homework Generator now (Track 1), integrate Petland next (Track 2)
- **Rationale:** Generator solves immediate production bottleneck (8-10 files/week). Petland integration enables spaced repetition loop that makes Sentence Switchers valuable.

- **Decision:** Generator covers 3 types, not 4. Sentence Switchers excluded.
- **Rationale:** Sentence Switchers are class-correction-based (can't be pre-generated from a form). Their value comes from spaced repetition (Petland), not production tooling.

- **Decision:** Modular animation snippets (Option 3) for Song Worksheet theming
- **Rationale:** Reusable CSS animation types (floating particles, horizontal scroll, etc.) with configurable emoji/color. Covers 90% of cases. Custom animation protocol for the remaining 10%.

- **Decision:** Petland should integrate into LL as a module (Captain's direction)
- **Rationale:** Same tech stack, shared auth eliminates webhook complexity, one codebase to maintain. Platform vision: Kiddoland.co with modules.

- **Decision:** YELLOW/ORANGE/GREEN workbook activity design deferred to separate session
- **Rationale:** Requires pedagogical design work (what activities are developmentally appropriate per level). Captain will design these later this week. Generator tool accommodates new levels via Option A (add template + form).

---

## Development Rules Followed
- [X] No direct Firebase access by AI
- [X] No code written without approval
- [X] Maximize Efficiency Plan adhered to
- [X] No Wasted Tokens policy followed (spec delivered as file)
- [X] Prompt for handoff at session closure
- [X] Hexdate system used on all files

---

**Status:** Generator spec complete, Petland codebase examined, Track 1/Track 2 strategy set
**Ready for:** Two parallel sessions — Generator build (Track 1) + Petland integration (Track 2)
**Git status:** No changes this session
**Session ID:** Q44
