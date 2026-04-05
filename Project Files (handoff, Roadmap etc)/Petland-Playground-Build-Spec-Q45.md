# Petland Playground Build Spec — Leitner SRS + Daily Guard + HP Decay

**Date:** April 5, 2026 (Q45)
**Context:** Petland is integrated into LessonLink at `src/modules/petland/`. Firestore path: `students/{learnerId}/petland/profile`. Vocabulary lives in the vocabulary collection under the same learner path.

---

## Build Items

### 1. Add `lastReviewDate` field to each vocab document

- New field on each vocabulary document in Firestore
- Type: string (YYYY-MM-DD)
- Set to today's date whenever that word is reviewed in a game
- Words with no `lastReviewDate` are treated as "never reviewed" (fresh from latest session)

### 2. `lastChallengeDate` guard

- Before awarding HP, check the student's `lastChallengeDate` field against today's date
- **First round today:** award `matchedPairs × 5` XP + 10 HP, update `lastChallengeDate` to today, update `lastHpUpdate` to now
- **Already played today:** award `matchedPairs × 5` XP only, no HP

### 3. Leitner box system

Five boxes, each with a review interval:

| Box | `srsLevel` | Review interval |
|-----|-----------|-----------------|
| 1   | 1         | Every day       |
| 2   | 2         | Every 2 days    |
| 3   | 3         | Every 4 days    |
| 4   | 4         | Every 7 days    |
| 5   | 5         | Every 14 days   |

Rules:
- New words start at `srsLevel` 1
- Correct match → `srsLevel` increases by 1 (max 5)
- Incorrect match → `srsLevel` drops to 1
- A word is "due" when `today >= lastReviewDate + box interval`

### 4. Session-first vocab loading

- Each vocab word needs a `sessionId` or `sessionDate` field so the system knows which session it came from. Check if this already exists; if not, add it.
- **Round 1:** Load all vocab where `lastReviewDate` is null (never reviewed = fresh from latest session). This is the mandatory daily round.
- **Subsequent rounds:** Load vocab where the word is due per its Leitner box interval.
- **Nothing due:** No game available. Show a message telling the student to come back later. Do not allow play — playing words that aren't due triggers overfeeding (fat pet mechanic, not in this build but the guard must exist now).

### 5. Per-word match tracking

- Each individual word's correct/incorrect result must update its own `srsLevel` and `lastReviewDate` independently
- Do NOT do a blanket pass/fail for the whole round
- After the game completes, batch-write all updated vocab docs to Firestore

### 6. HP decay (calculate on login)

- Do NOT use a cron job or scheduled function. Calculate decay client-side on login.
- On login or when Petland loads: read `lastHpUpdate` timestamp from student's petland profile
- Calculate: `missedIntervals = Math.floor((now - lastHpUpdate) / 24 hours)`
- Subtract: `newHp = hp - (missedIntervals × 10)`, minimum 0
- Update `hp` and `lastHpUpdate` in Firestore
- **Pet death:** If HP reaches 0, pet is dead. Death is permanent. Set `petState` to `'dead'` (or equivalent). Student must spend 500 XP to buy a new egg and 100 XP to hatch it.
- **Warning messages:** Show funny, escalating toast notifications at HP thresholds (80, 70, 60, 50, 40, 30, 20, 10). Make them progressively more dramatic/desperate. The tone is playful, not punishing — the pet is begging for attention, not guilt-tripping.

### 7. Overfeeding guard (logic only, no fat pet image yet)

- If a student tries to play a round but no words are due per the Leitner schedule AND they've already completed their daily round (Round 1), block the game.
- Show a message: the pet is full, come back when words are due.
- Do NOT allow play. This prevents grinding words that aren't scheduled for review.
- The fat pet visual transformation (second AI-generated image) is stacked for a future build.

---

## Firestore Field Summary

### On student petland profile (`students/{learnerId}/petland/profile`)

| Field | Type | Change |
|-------|------|--------|
| `lastChallengeDate` | string (YYYY-MM-DD) | Already exists. Now checked before awarding HP. |
| `lastHpUpdate` | string (ISO 8601) | Already exists. Now used for decay calculation on login. |
| `hp` | number | Already exists. Now decremented by decay and incremented by daily round only. |
| `petState` | string | Already exists. Add `'dead'` as a possible value. |

### On each vocabulary document

| Field | Type | Change |
|-------|------|--------|
| `srsLevel` | number | Already exists. Now actively updated per match result (1-5). |
| `lastReviewDate` | string (YYYY-MM-DD) | **NEW.** Set after each review. Null = never reviewed. |
| `sessionId` or `sessionDate` | string | **CHECK IF EXISTS.** Needed to identify which session a word came from for Round 1 loading. Add if missing. |

---

## What This Build Does NOT Include (Stacked)

- Multiple game types (Wordwall-style — same vocab, different game wrappers)
- Fat pet image generation (AI prompt to make original pet chubby/embarrassed)
- Pet Shop implementation
- Travel Agent implementation
- Vocabulary Battles (Phase 2 — Jeopardy-style PvP)
- RPG Travel Adventures (Phase 3 — station-based narrative game)
- Animated pet idle states (Genshin-style subtle animations)
- Custom image replacement (T uploads own art instead of AI-generated)
- Multiple pets
- Pet evolution/swapping
- Live session screen sharing UX (T feedback overlay via ManyCam or alternative)
- End-of-session review screen (new vocab, grammar corrections, game score summary)
- XP relationship to student progress metrics (Phase 17 design — XP is NOT just a game score)
