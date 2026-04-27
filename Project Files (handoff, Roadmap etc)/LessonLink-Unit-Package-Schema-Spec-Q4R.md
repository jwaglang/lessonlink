# LessonLink Unit-Package Import Schema Spec — Q4R

**Hexdate:** Q4R (April 27, 2026)
**Author:** Number One (Claude)
**Status:** Draft v1 — awaiting Captain review
**Purpose:** Define the JSON contract between KUPT v11 (producer) and LL Course Importer (consumer) so a single file upload creates a full Course → Level → Unit → Sessions hierarchy without manual form entry.

---

## 1. Background & Problem

The current LL course-creation flow requires the T to manually click through four nested forms: Course → Level → Unit → Sessions. The data needed for these forms exists upstream — in KTFT (level framework), KUPT (unit plan inputs), and the Claude-generated UP. But the T currently acts as a clipboard: reading the UP, mentally extracting fields, re-typing them into LL.

This spec defines a JSON file (`unit-package.json`) that bundles everything LL needs to create the hierarchy in one atomic operation.

**Out of scope for v1:**
- Multi-unit imports (one package = one unit + its parents)
- Editing existing records (importer is create-only; updates use the existing UI)
- Asset binary uploads (images, audio) — those still go through existing LL upload flows; the package references URLs only

---

## 2. Top-Level Structure

```
unit-package.json
├── meta             — package metadata
├── course           — course shell (creates if missing, links if exists)
├── level            — level shell (creates if missing, links if exists)
├── unit             — the unit being created
├── sessions[]       — one entry per session
├── deckSpec         — per-session slide-by-slide layout (LL stores, doesn't render yet)
└── homework         — KHGT-compatible homework data block
```

Every top-level key is **required** in v1. Atomic validation: if any required field is missing or malformed, the entire import fails before any writes happen.

---

## 3. Field Definitions

### 3.1 `meta`

| Field | Type | Required | Notes |
|---|---|---|---|
| `schemaVersion` | string | yes | e.g. `"1.0"` — importer rejects mismatched majors |
| `hexdate` | string | yes | Generation date in hexdate format (e.g. `"Q4R"`) |
| `kuptVersion` | string | yes | KUPT version that produced this (e.g. `"v11"`) |
| `sourceKtft` | object | yes | The KTFT parameters used (level, track, gse, robinson, etc.) — for traceability |
| `generatedBy` | string | yes | Always `"claude"` for now; future: `"manual"`, `"vsclaude"` |

### 3.2 `course`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | Must reference an existing course. Import will not create new courses; T creates courses manually via T-portal. |
| `title` | string | yes | For traceability and display in import preview. Must match existing course's title. |

### 3.3 `level`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string \| null | conditional | Same logic as course |
| `title` | string | yes | e.g. `"White Dragon"` |
| `description` | string | yes | Parent-readable level summary |
| `order` | integer | yes | Position in level sequence (White=1, Orange=2, etc.) |
| `targetHours` | number | yes | In-class hours for the level (e.g. 45) |
| `gse` | string | yes | e.g. `"10-21"` — for traceability |

### 3.4 `unit`

| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | string | yes | e.g. `"Farm Animals"` |
| `bigQuestion` | string | yes | The unit's BQ |
| `description` | string | yes | Kiddoland-voice copy (per Q4S sticky) |
| `estimatedHours` | number | yes | Computed: `sessions.length × course.duration / 60` |
| `thumbnailUrl` | string | no | Optional |
| `track` | string | yes | `"narrative"` \| `"informational"` \| `"inquiry"` \| `"functional"` |
| `visualMotif` | string | yes | Free text, e.g. `"playing-card vocab cards"`, `"scene-titled story panels"` |
| `protagonist` | object | yes | `{ name, species, description }` — required per White×Narrative house style |
| `masterText` | string | yes | Under 50 words for White Dragon |
| `vocabulary` | array of strings | yes | 10-15 target words |
| `forbiddenJargon` | array of strings | yes | Per KTFT lexical boundary |
| `assessmentLoop` | object | yes | `{ tinyTalk: {...}, evaluationMonologue: {...} }` |

### 3.5 `sessions[]`

Array, length must equal `level.sessions` from the KTFT (4 for White Dragon).

Each entry:

| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | string | yes | e.g. `"The Magic Farm Appears"` |
| `littleQuestion` | string | yes | The session's LQ |
| `description` | string | yes | Kiddoland-voice copy (per Q4S sticky) |
| `order` | integer | yes | 1-indexed |
| `duration` | number | yes | Inherits course.duration unless overridden |
| `phase` | string | yes | `"A"` \| `"B"` \| `"B/C"` \| `"C"` (from House Style) |
| `tbltTask` | string | yes | `"thematic-scene"` \| `"listen-and-do"` \| `"listen-and-select"` \| `"show-and-tell"` |
| `sessionAims` | object | yes | `{ linguistic, cognitive }` |
| `materials` | array | yes | Structured materials list (see 3.5.1) |
| `recasts` | array | yes | Cheat-sheet of likely errors + recasts |
| `taskBrief` | string | yes | T's natural-language task explanation |
| `operationalMechanics` | string | yes | What actually happens during the activation |

#### 3.5.1 `materials[]`

Each entry:

| Field | Type | Required | Notes |
|---|---|---|---|
| `type` | string | yes | `"asset"` \| `"video"` \| `"worksheet"` \| `"link"` |
| `name` | string | yes | Display name |
| `purpose` | string | yes | Why it's used |
| `url` | string | conditional | Required for `video` and `link` |
| `assetCode` | string | conditional | Required for `asset`, e.g. `"A"`, `"B"`, `"C"` |

### 3.6 `deckSpec`

Per-session slide-by-slide deck layout. LL stores this on the session record; rendering deferred to a future phase. The deck spec is what makes the production-pattern gap (Q4S sticky) closable — it tells the deck-builder what to build, not just the lesson content.

Structure: `deckSpec.sessions[]` array, one entry per session, in same order as `sessions[]`.

Each entry:

```
{
  "sessionOrder": 1,
  "slides": [
    { "type": "title", "layout": "...", "content": {...} },
    { "type": "song", "layout": "...", "content": {...} },
    { "type": "phonics-caps", ... },
    { "type": "phonics-caps-lower", ... },
    { "type": "phonics-caps-recall", ... },
    { "type": "framing", ... },
    { "type": "vocab-card", ... },
    ...
    { "type": "final-task", ... }
  ]
}
```

| Slide field | Type | Required | Notes |
|---|---|---|---|
| `type` | enum | yes | See list below |
| `order` | integer | yes | Within session |
| `layout` | string | yes | Free text describing layout intent |
| `content` | object | yes | Type-specific payload (text, image refs, prompts) |
| `tPrompt` | string | no | What T says to L on this slide |
| `expectedLResponse` | string | no | What L is expected to say/do |

**Slide types (v1):**
`title`, `song`, `phonics-caps`, `phonics-caps-lower`, `phonics-caps-recall`, `framing`, `vocab-card`, `story-panel`, `cumulative-reveal`, `final-task`, `evaluation`, `transition`

(More can be added in v1.x. Importer rejects unknown types.)

### 3.7 `homework`

KHGT-compatible homework data block. Stored on the unit record. Future Phase 15B: LL renders homework directly from this. For now: KHGT consumes it externally.

Structure matches the existing KHGT JSON contract (already documented in `Kiddoland-Homework-Generator-Spec-Q42.md`):

```
{
  "title": "Farm Animals",
  "level": "CEFR 10-21",
  "flashcards": [...],
  "readingText": "...",
  "memoryPairs": [...],
  "minimalPairs": [...],
  "fillInBlanks": [...],
  "wordBank": [...],
  "matchingPairs": [...],
  "listeningQuestions": [...],
  "finalTask": "..."
}
```

All sub-fields required per KHGT spec.

---

## 4. Importer Behavior

### 4.1 Validation (atomic)
1. Parse JSON. Reject malformed.
2. Validate `schemaVersion` major matches importer's expected major.
3. Validate every required field per Section 3.
4. Validate referential integrity:
   - `course.id` must reference an existing course
   - If `level.id` is set, level must exist AND belong to that course
   - If `level.id` is null, a new level will be created under the course
5. Validate `sessions.length` matches the KTFT-defined session count for the level (White=4, Yellow=4, Orange+=5). Reject if mismatch.
6. Validate each `deckSpec.sessions[].sessionOrder` matches a session in `sessions[]`
7. If any validation fails, return errors and abort. **No writes.**

### 4.2 Write order (atomic transaction)
1. Create or link Course
2. Create or link Level under Course
3. Create Unit under Level
4. Create Sessions ×N under Unit
5. Attach `deckSpec` to each Session
6. Attach `homework` block to Unit
7. Commit transaction

If any write fails mid-flight, roll back all writes from this import. Partial state is forbidden.

### 4.3 Conflict handling
- If Unit with same title already exists under the Level: importer prompts T with overwrite confirmation. T chooses: overwrite (replaces existing unit + sessions + homework + deckSpec), cancel (no writes), or rename (T provides new title before commit).
- Course/Level link-by-id is the existing-record path; create-from-fields is the new-record path. Cannot mix (e.g. `course.id` set but also `course.title` provided that doesn't match) — reject as ambiguous.


*End of spec.*
