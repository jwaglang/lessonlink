# Build Prompt for VSC — LL Course Importer (Q4R)

## What I need built

An "Import Unit Package" feature in the LL T-portal that takes a `unit-package.json` file and creates the full Course → Level → Unit → Sessions hierarchy in one atomic operation, replacing the current four-form click-through flow.

## Read these first

- `LessonLink-Unit-Package-Schema-Spec-Q4R.md` — the contract. Every field, every validation rule, every conflict-handling decision is in here. Build to this spec exactly.
- `farm-animals-unit-package-Q4R.json` — a real sample. Use it as the test fixture for the importer.

## Scope

1. **Add an "Import Unit Package" button** on the T-portal courses page (or wherever course-creation currently starts). Button opens a file picker that accepts `.json`.

2. **Parse + validate** the uploaded file per Section 4.1 of the spec. Atomic — if any required field is missing or malformed, reject before any writes. Show clear errors to the T listing exactly what failed.

3. **Conflict check (Section 4.3):**
   - `course.id` must match an existing course. Reject if not found.
   - If `level.id` is null, create the level under the course. If set, link.
   - If a Unit with the same title already exists under the Level: prompt T with overwrite/cancel/rename. Don't write until T responds.

4. **Atomic write (Section 4.2):** create or link Course → create or link Level → create Unit → create N Sessions → attach `deckSpec` to each Session → attach `homework` block to the Unit. If any write fails, roll back. No partial state.

5. **Success state:** redirect T to the newly-created Unit page so they can review/edit.

## Out of scope for this build

- Rendering `deckSpec` (LL just stores it as JSON on the session record for now)
- Rendering `homework` from the Unit (KHGT continues to consume it externally)
- Asset binary uploads (URLs in the JSON can be null; T uploads via existing flow after import)
- Editing existing units via re-import (treat re-import as overwrite per Section 4.3)

## Test against

- Load `farm-animals-unit-package-Q4R.json`. Should create:
  - Link to existing course `45Jkyfg94otjc4d22dZT` (Fast Fluency)
  - New Level "White Dragon" under that course
  - New Unit "Farm Animals" under that level
  - 4 Sessions under the unit, each with deckSpec attached
  - Homework block attached to the unit

## Notes / friction items already known

- Existing Unit form has a hardcoded default of 2.5 for Estimated Hours (friction log #7). Importer should not reuse that default — compute from the JSON.
- Existing data is inconsistent: `studentProgress` has both `name` and `studentName` fields on different docs (friction log #3). The importer doesn't touch student data, but be aware the codebase is messy in adjacent areas.

## When done

Confirm the Farm Animals test fixture imports cleanly end-to-end. Then we'll do real end-to-end test with Arina.
