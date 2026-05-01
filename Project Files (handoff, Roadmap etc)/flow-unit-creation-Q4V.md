# Flow: Unit Creation — Q4R

**Hexdate:** Q4R (April 27, 2026)
**What this is:** Step-by-step procedure for creating a new unit in LessonLink, end to end. Use this every time a new unit needs building (e.g. when onboarding a new L who needs a unit at a level/track combination that hasn't been built yet).

---

## Prerequisites

- Course already exists in LL (Fun Phonics / Fast Fluency / Really Reading). If not, create the course first via the T-portal — that's a manual one-off, not part of this flow.
- Tools open: KTFT, KUPT v11, Claude (browser), LL T-portal.
- A clear idea of: target level (e.g. White Dragon), track (Narrative / Informational / Inquiry / Functional), unit topic, big question, and the unit's "creative vision" pitch.

---

## Step 1 — KTFT (Framework JSON)

1. Open KTFT (`Kiddoland-Task-Framework-Tool-v6.html` or current version).
2. Pick the **level** (White Dragon, Yellow Dragon, etc.) from the dropdown.
3. Pick the **track** (Narrative is the most common for younger learners).
4. The tool generates a JSON object containing the framework parameters: GSE level, sessions count, Robinson dimensions, lexical boundary, track logic, TBLT tasks, linguistic targets.
5. **Copy the JSON output.**

What you have at the end of this step: a JSON blob describing the pedagogical constraints for this level × track combination.

---

## Step 2 — KUPT v11 (Master Prompt Generation)

1. Open KUPT v11 (`Kiddoland-Unit-Plan-Tool-v11-Q4R.html`).
2. **Section 1 — SLA Logic:** paste the KTFT JSON.
3. **Section 2 — Course & Hierarchy:** pick the existing course from the dropdown.
4. **Section 3 — Inquiry & Context:**
   - **Unit Topic** (e.g. "Farm Animals")
   - **Big Question** (e.g. "What animals live on the farm?")
   - **Unit Pitch** — ~200 words describing the narrative arc, key activities, final task. Avoid invented mechanics that can't be implemented in Canva (no magic wands, no animated reveals, no ManyCam tricks).
5. **Section 4 — Production Pattern:**
   - **Visual Motif** — the unit's signature visual treatment (e.g. "barn-door reveals", "playing-card vocab cards", "scene-titled story panels"). Pick something distinctive and Canva-implementable.
   - **Protagonist Name** (e.g. "Barky")
   - **Protagonist Species/Type** (e.g. "Farm Dog")
   - **Protagonist Description** — one line (e.g. "A friendly black dog who lives in the big red barn.")
   - **Anchor Song Title** (e.g. "What Do You Hear?")
   - **Anchor Song YouTube URL** — the actual link, copied directly from YouTube.
6. Click **Generate Master Prompt**.
7. Click **Copy Prompt**.

What you have at the end of this step: a long Claude prompt that includes KTFT data + House Style + your unit context, instructing Claude to output a `unit-package.json` matching the LL schema.

---

## Step 3 — Claude (JSON Generation)

1. Open Claude in a browser (claude.ai, ideally the LL project so context is loaded).
2. **Paste the prompt** as a new message.
3. Claude returns a single JSON object — no markdown fences, no preamble.
4. **Save the JSON to a file** named `{unit-slug}-unit-package-{hexdate}.json` (e.g. `farm-animals-unit-package-Q4R.json`).
5. **Spot-check the JSON** before importing:
   - Does the **course title** in `course.title` match exactly what's in LL (including emojis like 🌟 Fast Fluency 🌟)? If not, edit the JSON manually before upload — the importer's title-match validator is strict.
   - Is the **master text** under the lexical boundary (50 words for White, etc.)?
   - Does the **vocabulary** list have 10–15 items?
   - Are there exactly the right number of **sessions** (4 for White/Yellow, 5 for Orange+)?

What you have at the end of this step: a `.json` file ready to upload to LL.

---

## Step 4 — LL Import

1. Open the LL T-portal → `/t-portal/courses`.
2. Click **Import Unit Package**.
3. Upload the `.json` file.
4. The importer walks through dialog states:
   - **Errors** — if validation fails, fix the JSON and re-upload.
   - **Ready** — preview shows what will be created (Course/Level/Unit/Sessions, each tagged "new" or "existing"). Click Import.
   - **Conflict** — if a Unit with the same title already exists under the Level, you choose: **Overwrite** (replaces existing), **Cancel** (no writes), or **Import as New** (with a rename input).
   - **Importing** — spinner while the atomic batch commits.
5. On success, you're redirected to the new Unit's sessions page.

What you have at the end of this step: a fully-populated Unit + Sessions in LL, with `deckSpec` attached to each Session and `homework` attached to the Unit.

---

## Step 5 — Review and Edit in LL

1. **Eyeball the Unit page.** Verify title, BQ, description, master text, vocabulary, protagonist, visualMotif all look right.
2. **Click into each Session.** Verify title, LQ, description, materials, recasts, taskBrief, operationalMechanics.
3. **Tweak anything that's off.** The existing Unit/Session edit forms work as before.
4. **(Future)** Open the **T-readable markdown view** of the Unit to read the whole thing as a lesson plan, or the **Session lesson plan view** for play-by-play during teaching. *Note: this view is specced (`LessonLink-Markdown-Views-Spec-Q4R.md`) but not yet built. Once built, this step becomes the standard reference.*

What you have at the end of this step: a Unit a T can actually teach.

---

## Step 6 — Assign to a Learner (when ready)

This step is **separate from unit creation** — covered in the (future) flow `flow-learner-unit-assignment-Q4S.md` or similar. Briefly:

- Update the L's `studentProgress.unitId` to the new Unit's ID (currently a Firebase Console manual edit; eventually a UI action in LL).
- Verify the L's `studentProgress.courseId` matches the Unit's parent course.

---

## Known Friction (as of Q4R)

- **KUPT v11 emoji bug fixed Q4R.** Course titles now include emojis like 🌟 Fast Fluency 🌟 in the JSON output. Verified with manual edit in Q4R; not yet re-tested through the full v11 flow.
- **No T-readable markdown view in LL yet.** Step 5's "lesson plan" sub-step depends on a build that's specced but not yet shipped.
- **Production pattern only documented for White × Narrative.** Other (Dragon × Track) combinations may produce weaker output until each pattern is captured in KUPT's House Style block.
- **No course-creation flow documented yet.** If the course you need doesn't exist (rare), you create it manually in the T-portal — same way as today. That's a one-off, not part of this flow.

---

## Files referenced by this flow

- `Kiddoland-Task-Framework-Tool-v6.html` — KTFT
- `Kiddoland-Unit-Plan-Tool-v11-Q4R.html` — KUPT v11
- `LessonLink-Unit-Package-Schema-Spec-Q4R.md` — schema the JSON must match
- `LessonLink-Markdown-Views-Spec-Q4R.md` — T-readable views (pending build)

---

*End of flow.*
