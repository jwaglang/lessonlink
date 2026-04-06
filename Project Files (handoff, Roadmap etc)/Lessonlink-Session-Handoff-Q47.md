# LessonLink Development Session Handoff

## Session Date
April 5–6, 2026 (Q47)

## Session Summary
Built the full pet body condition variant system (fat, thin, starving) using `gemini-2.5-flash-image` via Gemini API — same key and endpoint as existing pet generation. Replaced the auto-firing `FatPetTrigger` component with a user-initiated confirmation flow.

---

## What We Completed

### Major Achievements
- ✅ **`editPetImage` server action** — new function in `generate-pet-image-flow.ts`. Fetches original pet image URL, base64-encodes it, sends to Gemini with a text edit prompt, returns base64 data URI. Same `GEMINI_API_KEY` + `generativelanguage.googleapis.com` endpoint as `generatePetImage`.
- ✅ **Thin pet state (HP < 50)** — generated on login via HP decay `useEffect`. Cached in `thinPetImageUrl`. Shows in Passport when HP is below threshold and `isSick` is false.
- ✅ **Starving pet state (HP < 20)** — same pattern. Cached in `starvingPetImageUrl`. Overrides thin image.
- ✅ **Fat pet (user-triggered)** — removed auto-firing `FatPetTrigger`. Replaced with: nothing-due → "Play anyway" button → confirm dialog → `editPetImage` call → writes `fatPetImageUrl` + `isSick: true`. Fat image displays in Playground + Passport.
- ✅ **Image display priority** — dead (existing early return) > fat (`isSick` + url) > starving (hp < 20 + url) > thin (hp < 50 + url) > healthy. All implemented in `PetStatus`.
- ✅ **Caching rule enforced** — all variant images check for existing URL before calling API. Never regenerate.
- ✅ **Pet reset + buy egg cleanup** — both now clear all 4 image URLs (`petImageUrl`, `fatPetImageUrl`, `thinPetImageUrl`, `starvingPetImageUrl`) + `petWish`, and delete all 4 Storage files.
- ✅ **Dev HP setter** — yellow dev panel below Passport in `NODE_ENV=development` only. Type an HP value, hit Set HP. No T portal sign-in required for testing.

### Technical Changes Made

1. **`src/modules/petland/ai/generate-pet-image-flow.ts`**
   - Added `editPetImage(petImageUrl, editPrompt)` server action
   - Model: `gemini-2.5-flash-image` on `v1beta` (confirmed working — see model note below)

2. **`src/modules/petland/types.ts`**
   - `PetlandProfile`: added `thinPetImageUrl?: string`, `starvingPetImageUrl?: string`

3. **`src/modules/petland/components/student-dashboard.tsx`**
   - `FAT_PROMPT`, `THIN_PROMPT`, `STARVING_PROMPT` constants at module level
   - `FatPetTrigger` component removed
   - `showFatConfirm`, `isFatGenerating` states added
   - HP decay `useEffect` — now also triggers thin/starving generation after computing effective HP
   - `handleGenerateFatPet` — user-triggered, cache-checks first
   - Fat pet confirmation dialog added
   - Playground blocked state: fat showing → image + message; nothing due → "Play anyway" button
   - `PetStatus` image priority chain updated
   - `handleBuyEgg` — clears all 4 URLs + `petWish`, deletes all 4 Storage files
   - `DevHpSetter` component added (dev only)

4. **`src/modules/petland/components/learner-petland-tab.tsx`**
   - `handleResetPet` — clears all 4 URLs + `petWish`, deletes all 4 Storage files

---

## Files Modified

| File Path | Changes Made |
|-----------|-------------|
| `src/modules/petland/ai/generate-pet-image-flow.ts` | Added `editPetImage` |
| `src/modules/petland/types.ts` | Added `thinPetImageUrl`, `starvingPetImageUrl` |
| `src/modules/petland/components/student-dashboard.tsx` | Major — see above |
| `src/modules/petland/components/learner-petland-tab.tsx` | Reset cleanup |

---

## Current State

### ✅ What's Working
- Thin pet generates on login when HP < 50 (confirmed in testing)
- Starving pet generates on login when HP < 20 (confirmed in testing)
- Variant images cached — only generated once
- Image priority chain correct in `PetStatus`
- Dev HP setter working — set HP without T portal
- `gemini-2.5-flash-image` confirmed working on this API key + tier

### ⚠️ Known Issues / Gaps
- **Fat pet permissions error** — "Missing or insufficient permissions" on fat pet generation. Thin/starving work fine (same pattern). Root cause not identified before session ended. Likely Firebase Storage rules or a path issue. **Debug this first next session.**
- **Max has no `petWish`** — his pet was hatched before Q46. Fat pet generation requires `petWish`. Add manually via Firebase Console if testing fat pet on Max's account: `students/{id}/petland/profile` → add field `petWish` (string).
- **Dev HP setter doesn't re-trigger decay `useEffect`** — the `useEffect` has `hasAppliedDecayRef` guard and only fires once on mount. Setting HP via the dev button then hard-refreshing is the correct test workflow.

### 🧪 Needs Testing
- [ ] **Fat pet** — debug permissions error, then test full flow: Play anyway → confirm → fat image in Playground + Passport
- [ ] **Fat recovery** — complete Memory Match → `isSick` flips false → Passport returns to healthy/thin/starving
- [ ] **Reset pet** — all 4 Storage files deleted, all 4 URL fields null in Firestore
- [ ] **Death flow** — set HP to 0, confirm dead UI, buy egg (500 XP), hatch (100 XP)

---

## Next Session Should

### Immediate Priority — Debug Fat Pet Permissions
1. Open browser devtools → Network tab
2. Set HP to 100 (no thin/starving), ensure `petWish` exists on profile
3. Play through Memory Match to clear unreviewed words
4. Click "Play anyway" → confirm
5. Watch console for `[FatPet]` log to identify which step fails (editPetImage, uploadBase64ToStorage, or updateDoc)
6. Most likely cause: Firebase Storage rules don't allow student to write to `pets/{uid}/fat-pet.png` — check Storage rules in Firebase Console

### Track 1 — Petland (after fat pet confirmed working)
1. Vet mechanic — sick pet recovery alternative
2. Multiple game types
3. Pet Shop stub

### Track 2 — Homework Generator (stacked from Q44)
- Spec: `LessonLink-Phase-15B-Homework-Spec-Q2N.md`

---

## Important Context

### Critical Information for Next Claude
- **Image editing model:** `gemini-2.5-flash-image` on `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`. Tested and working. `gemini-2.0-flash-preview-image-generation` and `gemini-2.0-flash-exp` both returned 404.
- **`editPetImage` follows existing pattern** — returns base64 data URI, caller does the Storage upload. Same as `generatePetImage`. Do NOT change this to a self-contained server action.
- **Memory Match = exposure only.** Do NOT add srsLevel writes to `handleGameComplete`. Final design decision from Q46.
- **Fat pet trigger is now user-initiated.** `FatPetTrigger` component is gone. Do not bring it back.
- **Thin/starving generate once on login** — guarded by `hasAppliedDecayRef` (fires once per mount). To re-test, hard refresh.
- **`petWish` required for all variant generation.** Max's pet has none — add manually via Firebase Console.
- **First hatch free, recovery hatch costs 100 XP.** `isRecoveryHatch` state in `StudentDashboard`.
- **XP constants** in `utils.ts` — `XP_PER_MATCH`, `XP_PER_FLASHCARD`. Never hardcode XP values.
- **Dev HP setter** is gated on `NODE_ENV === 'development'`. Strip before going to production (or leave — it won't show).

### Recent Decisions
- **Decision:** Fat pet is user-triggered (confirm dialog), not auto-fired on component mount.
- **Rationale:** Auto-firing `FatPetTrigger` was fragile — fired on legitimate round completion in same render cycle. Explicit user action is cleaner and less surprising.
- **Decision:** Thin/starving generate during HP decay `useEffect`, not on demand.
- **Rationale:** These are passive state changes (HP decayed while L was away), so generating on login is the natural moment. No user action required.

---

## Development Rules Followed
- [X] No direct Firebase access by AI
- [X] TypeScript clean (`tsc --noEmit` passes)
- [X] Changes committed and pushed (commit `9240d9d`)
- [X] Session ID used on all files

---

**Status:** Body condition variants built — fat pet permissions bug open  
**Ready for:** Debug fat pet Storage permissions, then testing pass  
**Git status:** All changes committed and pushed to main  
**Session ID:** Q47
