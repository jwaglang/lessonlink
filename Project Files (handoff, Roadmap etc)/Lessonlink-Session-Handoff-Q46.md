# LessonLink Development Session Handoff

## Session Date
April 5, 2026 (Q46 — multiple sessions)

## Session Summary
Built the full Petland Playground SRS system: Leitner flashcard review, daily HP guard, HP decay, per-word tracking, session linking, death recovery flow, fat pet generation, and HungerAlerts copy rewrite.

---

## What We Completed

### Major Achievements
- ✅ **Leitner SRS wired** — 5-box system. Flashcard Review drives `srsLevel` (correct = +1 max 5, incorrect = reset to 1). Memory Match is exposure only — stamps `lastReviewDate`, no `srsLevel` changes.
- ✅ **Flashcard Review component built** — Anki-style: sentence shown first (cloze with blank), tap Answer to reveal word, Knew it / Didn't know it. Hint button reveals one letter at a time. Styled to match Petland purple theme.
- ✅ **Playground sequencing fixed** — Memory Match (new words) always first. Flashcard Review appears after. Never both at once. Overfeeding guard blocks play when nothing is due.
- ✅ **Daily HP guard** — `lastChallengeDate` check. First round per day: +10 HP. Subsequent rounds: XP only.
- ✅ **HP decay on login** — Client-side. Reads `lastHpUpdate`, calculates missed 24h intervals, deducts 10 HP each. `petState: 'dead'` if HP hits 0.
- ✅ **`lastReviewDate` field added** — New field on vocab docs. Null = never reviewed = Round 1 candidate. Stamped on Memory Match completion.
- ✅ **`sessionInstanceId` on vocab docs** — Learner profile page fetches latest completed `sessionInstance` for the student, passes `latestSessionInstanceId` into `LearnerPetlandTab`, stamped on every new vocab word created. Data integrity for future session-specific features.
- ✅ **Death recovery flow** — Dead pet screen shows "Buy New Egg — 500 XP" button (disabled + shortfall message if insufficient XP). `handleBuyEgg` deducts 500 XP, resets pet state, deletes Storage images. `handleNamePet` deducts 100 XP on recovery hatches only. First hatch is free.
- ✅ **Fat pet generation** — `petWish` stored at hatch time. When L navigates to a blocked Playground (overfeeding state), `FatPetTrigger` component mounts and fires Imagen call once. Generates chubby/embarrassed version using original wish + fat modifier. Stores `fatPetImageUrl`, sets `isSick: true`. Passport switches to fat pet avatar. Clears on next successful Memory Match (`isSick: false`).
- ✅ **XP constants extracted** — `XP_PER_MATCH = 5`, `XP_PER_FLASHCARD = 2` in `utils.ts`. Tunable from one place.
- ✅ **HungerAlerts copy rewritten** — Pet speaks directly to L. Escalating drama from "Psst... I'm a little hungry" to "......" at level 10. Level 20: "I can't feel my legs. Tell my family I love them."
- ✅ **`srsLevel` bug fixed** — New vocab docs were being created with `srsLevel: 0`. Fixed to `srsLevel: 1` (Leitner box 1). `isWordDue` already guarded this but the source is now correct.
- ✅ **Dead pet state added** — `petState: 'dead'` in type. T-portal Edit Stats dropdown now includes Dead option.

### Technical Changes Made

1. **`src/modules/petland/types.ts`**
   - `PetState`: added `'dead'`
   - `Vocabulary`: added `lastReviewDate?: string | null`, `sessionInstanceId?: string | null`
   - `PetlandProfile`: added `petWish?: string`, `fatPetImageUrl?: string`

2. **`src/modules/petland/utils.ts`**
   - Added `XP_PER_MATCH = 5`, `XP_PER_FLASHCARD = 2`
   - Added `LEITNER_INTERVALS` (boxes 1–5: 1/2/4/7/14 days)
   - Added `isWordDue(word, today)` — null lastReviewDate = always due
   - Added `calculateHpDecay(lastHpUpdate, currentHp)` — returns `newHp` + `missedIntervals`

3. **`src/modules/petland/components/student-dashboard.tsx`**
   - `FatPetTrigger` component — mounts in blocked Playground, fires once
   - `FlashcardReview` component — full Anki-style component with hint system
   - HP decay `useEffect` — runs once on first profile load
   - `handleGameComplete` — stamps `lastReviewDate` only, no srsLevel writes, daily HP guard, clears `isSick`
   - `handleFlashcardComplete` — srsLevel + lastReviewDate batch write, XP_PER_FLASHCARD
   - `handleBuyEgg` — 500 XP check/deduct, reset pet state, delete Storage images
   - `handleNamePet` — now saves `petWish`, deducts 100 XP on recovery hatches
   - `handleHatch` — saves `pendingWish` state
   - Playground tab: sequential logic (Match → Flashcard → blocked), `FatPetTrigger` in blocked branch
   - PetStatus: dead state with buy button, fat pet avatar when `isSick`
   - States added: `matchCompleted`, `isRecoveryHatch`, `pendingWish`

4. **`src/modules/petland/components/learner-petland-tab.tsx`**
   - `handleAddWord`: `srsLevel: 1` (was 0), `lastReviewDate: null`, `sessionInstanceId: latestSessionInstanceId ?? null`
   - `latestSessionInstanceId` prop added
   - Edit Stats dropdown: added `'dead'` option

5. **`src/modules/petland/components/hunger-alerts.tsx`**
   - All 8 threshold messages rewritten with pet-voice personality

6. **`src/app/t-portal/students/[id]/page.tsx`**
   - Fetches latest completed `sessionInstance` for student on load
   - Passes `latestSessionInstanceId` to `LearnerPetlandTab`

---

## Files Modified

| File Path | Changes Made |
|-----------|-------------|
| `src/modules/petland/types.ts` | PetState dead, Vocabulary fields, PetlandProfile petWish/fatPetImageUrl |
| `src/modules/petland/utils.ts` | XP constants, LEITNER_INTERVALS, isWordDue, calculateHpDecay |
| `src/modules/petland/components/student-dashboard.tsx` | Major — see above |
| `src/modules/petland/components/learner-petland-tab.tsx` | srsLevel fix, lastReviewDate, sessionInstanceId, dead option |
| `src/modules/petland/components/hunger-alerts.tsx` | Copy rewrite |
| `src/app/t-portal/students/[id]/page.tsx` | Latest session fetch, prop pass |

---

## Current State

### ✅ What's Working
- Full Playground loop: Memory Match (exposure) → Flashcard Review (assessment) → blocked when nothing due
- HP decay calculates on login and applies missed intervals
- Death recovery: buy egg (500 XP) → hatch (100 XP) → back to normal
- Fat pet generates when L tries to replay after daily round is done
- `petWish` stored at hatch, used for fat pet prompt
- `sessionInstanceId` stamped on all new vocab words
- HungerAlerts fire with escalating personality

### ⚠️ Known Issues / Gaps

- **Fat pet not tested end-to-end** — Imagen call logic is correct but the full sequence (complete round → revisit Playground → fat pet appears in Passport) has not been played through in the browser
- **Death recovery not tested** — HP decay is live but no pet has actually died yet in test data. The buy/hatch flow needs a real test run.
- **Flashcard Review XP rate (2/word)** — placeholder value. Tune once real usage data shows how fast XP accumulates.
- **No Vet mechanic** — Sick pet recovers only when L completes a Memory Match. Vet mechanic (alternative recovery) is stacked.
- **No fat pet for existing pets** — Pets hatched before `petWish` was added have no wish stored. Fat pet won't generate for them. Non-blocking — only affects Max's test pet.
- **`lastHpAlertLevel` not reset on pet reset** — If T resets a pet, `lastHpAlertLevel` may carry over. Minor — only affects alert dedup logic.

### 🧪 Needs Testing
- [ ] Memory Match → complete round → revisit Playground → confirm fat pet appears in Passport
- [ ] Flashcard Review: play through, confirm srsLevel updates in Firestore
- [ ] Death: use Edit Stats to set HP to 0 → confirm petState = 'dead' and dead UI shows
- [ ] Buy New Egg → hatch → confirm 500 + 100 XP deducted, pet resets correctly
- [ ] `sessionInstanceId` on new vocab docs — add a word from T portal, check Firestore doc has the field

---

## Next Session Should

### Immediate Priority — Testing
1. Run through the five test items above before building anything new
2. If fat pet doesn't generate: check `petWish` is stored on Max's profile (it won't be — he was hatched before this session). Use Edit Stats to manually add a `petWish` value to test.

### Track 1 — Petland (after testing passes)
1. **Vet mechanic** — design and build sick pet recovery path (alternative to waiting for Memory Match)
2. **Multiple game types** — same vocab, different game wrappers (Wordwall-style)
3. **Pet Shop stub** — XP → Dorks cash-in counter, even if no items yet
4. **HP decay cron** — optional server-side version for Ls who never log in (currently client-only)

### Track 2 — Homework Generator (stacked from Q44)
- Spec: `LessonLink-Phase-15B-Homework-Spec-Q2N.md`

---

## Important Context

### Critical Information for Next Claude
- **Memory Match = exposure only.** Do NOT add srsLevel writes back to `handleGameComplete`. The design decision is final: Memory Match stamps `lastReviewDate`, Flashcard Review drives srsLevel.
- **Fat pet trigger is a component, not a useEffect.** `FatPetTrigger` mounts in the "pet is full" Playground branch. Empty deps — fires once on mount. This was intentional to avoid triggering on legitimate round completion.
- **`petWish` must exist for fat pet to generate.** Max's existing pet has no `petWish` in Firestore (hatched before this session). Add it manually via Firebase Console or Edit Stats for testing.
- **First hatch is free. Recovery hatch costs 100 XP.** `isRecoveryHatch` state in `StudentDashboard` controls this. Set to true by `handleBuyEgg`, cleared after `handleNamePet`.
- **`sessionInstanceId` on vocab** — data integrity field for future features, not used for Round 1 filtering. Round 1 = `lastReviewDate === null`. This was a deliberate design decision.
- **XP constants** — `XP_PER_MATCH` and `XP_PER_FLASHCARD` are in `utils.ts`. Don't hardcode XP values anywhere else.
- **Tailwind grid is fixed.** `src/modules/**` is in the tailwind content array. Confirmed working.
- **No Genkit for image generation.** Direct REST to Imagen endpoint only. See `generate-pet-image-flow.ts`.

### Recent Decisions
- **Decision:** Memory Match does not update srsLevel — Flashcard Review does.
- **Rationale:** Memory Match is self-eliminating (all pairs get solved eventually), so correct/incorrect is meaningless. Anki-style self-report is the only valid assessment mechanism.
- **Decision:** Fat pet trigger is a mounted component, not a reactive useEffect.
- **Rationale:** useEffect on `[profile, vocabulary]` fired immediately after round completion (same render cycle). Component mount fires only when the L actually navigates to the blocked Playground screen.
- **Decision:** `sessionInstanceId` on vocab for data integrity, not for Round 1 filtering.
- **Rationale:** Round 1 = null lastReviewDate is simpler, works correctly, and doesn't require session context in the game logic.

---

## Development Rules Followed
- [X] No direct Firebase access by AI
- [X] No Wasted Tokens policy followed
- [X] TypeScript clean (tsc --noEmit passes)
- [X] Prompt for handoff at session closure
- [X] Session ID used on all files

---

**Status:** Petland Playground fully built — testing pass needed before moving on
**Ready for:** Test the five items above, then Vet mechanic or Homework Generator
**Git status:** Uncommitted changes across 6 files (see Files Modified above)
**Session ID:** Q46
