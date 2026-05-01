# LessonLink T-Readable Markdown Views Spec — Q4R

**Hexdate:** Q4R (April 27, 2026)
**Author:** Number One (Claude)
**Status:** Draft v1 — for VSC build
**Purpose:** Render T-readable markdown views of Unit and Session content inside LL, generated from the structured data already stored on the Unit and Session records.

---

## 1. Background & Problem

Phase 19 import flow ships unit content to LL as `unit-package.json` — machine-readable, importer-friendly, but **not T-readable**. A T cannot open a Unit in LL and see a lesson plan they can read while teaching. They'd need a JSON viewer, which defeats the purpose.

Before the JSON flow, KUPT generated markdown unit-plans (e.g. `kiddoland_castles_unit.md`, ~600 lines of structured prose with italicized story text, vocabulary tables, session-by-session plans). T could read these directly during lesson prep.

This spec restores that T-readable artifact — but generates it **from LL's stored data**, not as a parallel file. LL is the single source of truth; markdown is a view.

---

## 2. Two Views to Build

### 2.1 Unit-level Markdown View

**Where:** On the existing Unit page (`/t-portal/courses/{courseId}/levels/{levelId}/units/{unitId}/sessions` or wherever the unit overview lives — VSC to confirm).

**Scope:** The whole unit. All sessions summarized, full master text, full asset manifest, full vocabulary, assessment loop. This is the **reference document** the T uses for unit-level prep.

**What renders (in this order):**

1. Unit title (h1) + course/level breadcrumb (small, secondary)
2. Big Question (h2) + answer-style intro line
3. **Unit DNA & Aims** section
   - Topic, Track, Robinson dimensions, GSE level, sessions count
   - Linguistic + cognitive aims (from `unit.assessmentLoop` and inferred from sessions)
4. **Core Constraints** section
   - Tense (from `meta.sourceKtft.complexity.timeReference` or unit.track-implied)
   - Word limit (from `meta.sourceKtft.unitSpecs.lexicalBoundary.maxWords`)
   - Forbidden jargon (from `unit.forbiddenJargon`)
5. **Master Text** — italicized prose, displayed as the T would read it aloud
6. **Target Vocabulary** — numbered list with brief definitions (definitions auto-generated where missing? Or prompted?)
7. **Teacher Asset Pack** — table of all assets across all sessions, deduplicated. Columns: Asset code, Type, Purpose, Session(s) used.
8. **Visual Motif** — one line, e.g. "barn-door reveals"
9. **Protagonist** — name, species, description
10. **Anchor Song** — title + clickable URL
11. **Assessment Loop** — Tiny Talk target + Evaluation Monologue target
12. **Sessions Summary** — table of all sessions: # / Title / LQ / Phase / TBLT task / Duration. Each row links to its session page (which has the play-by-play view).

### 2.2 Session-level Lesson Plan View

**Where:** On the existing Session page (drill-down from Unit).

**Scope:** This session only. **Play-by-play** structure showing activities per time slot. Designed to be open on a second screen during the actual lesson, or printed and put on the desk.

**What renders (in this order):**

1. Session title (h1) + Unit/Course breadcrumb
2. Little Question (h2) — prominent, framed as the "puzzle" of the session
3. **Session Aims** — linguistic + cognitive, two short lines
4. **Time-blocked play-by-play** — this is the heart of the view. Existing data on the session record:
   - `taskBrief` (T's natural-language task explanation)
   - `operationalMechanics` (what actually happens during activation)
   - `livePerformanceNotes` (T-authored, optional — the T's own write-up of live mechanics like magic wand bits, ManyCam stacking, voice work, props. The deck doesn't capture these; this field does. Renders prominently when present, omitted when absent.)
   - `materials` (with type, name, purpose, url)
   - `recasts` (likely errors + recasts)
   - `tbltTask` (the canonical TBLT task name)
   - `phase` (A / B / B/C / C)
   - `deckSpec.slides` (the actual slide-by-slide breakdown — this is critical for play-by-play)
5. **Slide Walkthrough** — for each slide in `deckSpec`, render: slide number, type, layout description, content summary, T prompt, expected L response. This becomes the *literal* play-by-play.
6. **Recasts Cheat Sheet** — table of likely errors + the specific recast for each
7. **Materials List** — what to have ready before the session starts
8. **Assessment** — what to track during this session (binary correct/incorrect, frame production count, etc.)

### 2.3 Both Views — Common Behavior

- **Read-only display** by default. Markdown rendered to HTML using the project's existing markdown library (or shadcn/Tailwind prose styling).
- **"Download as Markdown" button** at the top of each view. Generates a `.md` file the T can save locally.
  - Unit view download filename: `{unit-slug}-unit-plan-{hexdate}.md`
  - Session view download filename: `{unit-slug}-session-{N}-{session-slug}-{hexdate}.md`
- Both views auto-update from LL data — if the T edits anything in the existing Unit/Session forms, the markdown view reflects current state on next render. No stale artifacts.

---

## 3. Generation Logic

### 3.1 Source of Truth

All content for both views comes **only** from existing fields on the Unit and Session Firestore records (populated by the importer in Phase 19, or manually by the T). No external file storage. No regeneration via AI.

### 3.2 Renderer Location

Recommended: a pure utility module, e.g. `src/lib/unit-package-renderer.ts`, with two exports:

- `renderUnitMarkdown(unit, sessions): string`
- `renderSessionMarkdown(session, unit): string`

These return markdown strings. The page components consume them and either display (via markdown-to-HTML) or trigger download (as `.md`).

### 3.3 Field Mapping

A reference table of Firestore field → markdown section appears in Section 4 below. VSC implements both renderers against this mapping.

### 3.4 Missing Field Handling

Some fields may be empty or null on units that were **not** imported via Phase 19 (e.g. older units like Castles, or hand-edited units). Renderer behavior for missing fields:

- **Required-ish content (title, BQ, master text, sessions):** if missing, render placeholder text like *"(not yet specified)"* — do not crash.
- **Optional content (visualMotif, protagonist, deckSpec):** if missing, omit the entire section. Don't show empty headers.
- **Vocabulary list without definitions:** render the words alone, no definitions section.

Validator-style strictness should NOT apply here — this is a view, not an importer.

---

## 4. Field Mapping

### 4.1 Unit View

| Markdown section | Source field(s) |
|---|---|
| Unit title | `unit.title` |
| Big Question | `unit.bigQuestion` |
| Topic | `unit.title` (same — or break out separately if needed) |
| Track | `unit.track` |
| Robinson | `meta.sourceKtft.robinson` |
| GSE | `level.gse` (or `meta.sourceKtft.gse`) |
| Sessions count | `sessions.length` |
| Linguistic aims | derived from each `session.sessionAims.linguistic` rolled up |
| Cognitive aims | derived from each `session.sessionAims.cognitive` rolled up |
| Tense | `meta.sourceKtft.complexity.timeReference` (or implied from track) |
| Word limit | `meta.sourceKtft.unitSpecs.lexicalBoundary.maxWords` |
| Forbidden jargon | `unit.forbiddenJargon` |
| Master text | `unit.masterText` (render italicized) |
| Target vocabulary | `unit.vocabulary` |
| Visual motif | `unit.visualMotif` |
| Protagonist | `unit.protagonist.{name, species, description}` |
| Anchor song | first slide of type `song` from `sessions[0].deckSpec.slides`, fallback to scanning all sessions |
| Assessment loop | `unit.assessmentLoop.{tinyTalk, evaluationMonologue}` |
| Teacher Asset Pack | flatten `sessions[*].materials` where `type === "asset"`, group by `assetCode`, list session numbers where each appears |
| Sessions summary table | `sessions[*]` — Title, LQ, Phase, TBLT task, Duration |

### 4.2 Session View

| Markdown section | Source field(s) |
|---|---|
| Session title | `session.title` |
| Little Question | `session.littleQuestion` |
| Linguistic aim | `session.sessionAims.linguistic` |
| Cognitive aim | `session.sessionAims.cognitive` |
| Phase | `session.phase` |
| TBLT task | `session.tbltTask` |
| Duration | `session.duration` |
| Task brief | `session.taskBrief` |
| Operational mechanics | `session.operationalMechanics` |
| Live performance notes | `session.livePerformanceNotes` (optional) — render prominently if present, omit section if absent |
| Slide walkthrough | `session.deckSpec.slides[*]` — order, type, layout, content, tPrompt, expectedLResponse |
| Recasts | `session.recasts[*]` |
| Materials | `session.materials[*]` |
| Assessment notes | inferred from `session.tbltTask` and `unit.assessmentLoop` |

---

## 5. UI / Display Notes

- **Use prose styling** (Tailwind `prose` class or equivalent). Not the bare-form-fields aesthetic of the existing edit pages.
- **Master text should look like a story.** Italicized, indented, larger line-height. The T should be able to read it aloud directly off the screen.
- **Slide walkthroughs should be visually scannable.** Numbered, indented, with the T's prompt and expected L response in distinct typographic treatment (T prompt in a styled callout box; expected response in a quieter italic).
- **Tables for asset pack and sessions summary** — small, dense, sortable if easy.
- **Print-friendly:** the page should print cleanly via browser print. Consider a `print:` Tailwind variant pass to hide nav, breadcrumbs, edit buttons.

---

## 6. Out of Scope for v1

- AI re-generation of fields (e.g. auto-generating vocabulary definitions). Use what's stored, render as-is.
- Inline editing inside the view. Editing happens via the existing Unit/Session forms; this view is read-only.
- Sharing / export beyond `.md` download. No PDF, no email, no public links.
- Versioning / history (showing what changed). Single current view only.
- Multiple language renderings.
- Diff view between unit-package as-imported vs. unit as-currently-edited in LL.

---

## 7. Test Cases

1. **Farm Animals (Phase 19 import).** Should render fully — all fields populated.
2. **Castles (legacy unit, partial data).** Should render gracefully — missing protagonist, missing deckSpec, etc. should produce a sparse but readable doc, not a crash.
3. **A unit edited in LL after import.** Edit master text via existing form, reload markdown view — should show edited text.
4. **Download.** Click download on Farm Animals unit view — should produce a `.md` file with all the content, openable in any markdown viewer.
5. **Print.** Print the session view — should produce a clean printable page with no nav chrome.

---

## 8. Notes for VSC

- The renderer module should have **zero side effects** — pure functions, easy to unit-test.
- Use a markdown-to-HTML library that handles tables, italic, code spans, and headings well. If LL already has one wired up, use that. If not, `remark` or `marked` are both fine.
- The download button should generate the `.md` content client-side from the same renderer output that's displayed — single source of truth between view and download.
- If a session has no `deckSpec`, the slide walkthrough section is omitted entirely. Do not render an empty "Slide Walkthrough" header.
- Filenames for download: lowercase, hyphenated, `.md` extension. Slug from title.

---

*End of spec.*
