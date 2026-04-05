# LessonLink Development Session Handoff

## Session Date
April 5, 2026 (Q45 — multiple sessions)

## Session Summary
Debugged and fixed Petland pet hatching end-to-end, fixed Passport avatar display, fixed Memory Match card layout, fixed Tailwind grid bug, and built Dork SVG for card backs.

---

## What We Completed

### Major Achievements
- ✅ **Pet hatching fully working** — Genkit removed entirely. Image generation now uses a direct REST call to the Imagen 4.0 Ultra `:predict` endpoint. Reads `GEMINI_API_KEY` at request time (not module load time), which was the root cause of all previous failures.
- ✅ **Firebase Storage CORS configured** — Captain applied rules via Google Cloud Shell. Allows `localhost:9002`, `kiddoland.co`, `www.kiddoland.co`.
- ✅ **Firebase Storage security rules fixed** — Captain applied rules in Firebase Console. Authenticated users can write to `pets/` and `vocabulary/icons/`.
- ✅ **Passport avatar layout fixed** — Was a tiny 192px circle. Now fills the full left column (`w-full aspect-square max-w-sm`, `rounded-2xl`).
- ✅ **petImageUrl recovery effect added** — If a L's profile has `petState: 'hatched'` but no `petImageUrl` (broken state from earlier failed hatch attempts), the dashboard automatically fetches the URL from Firebase Storage and patches Firestore. Runs for any L in that state, not just Max.
- ✅ **Memory Match card layout fixed** — Cards were rendering 1 per row (grid classes not applying due to Turbopack). Fixed using JS-chunked flex rows. Cards doubled to `w-48 h-48`. Grid uses `ceil(√n)` columns for best symmetry.
- ✅ **Memory Match now uses all vocabulary** — Removed the hardcoded `.slice(0, 6)` cap. Game loads all vocab words in the list.
- ✅ **Game Mechanics doc created** — `Petland-GAME_MECHANICS-Q45.md` is now the single source of truth for Petland design rules, HP/XP values, SRS intent, currency, and future phases.
- ✅ **Tailwind grid bug fixed** — Root cause: `src/modules/**` was missing from `content` array in `tailwind.config.ts`. Added. `grid-cols-4` now works correctly throughout the modules folder.
- ✅ **Memory Match layout rebuilt** — Now uses proper `grid grid-cols-4 gap-2 max-w-2xl` with `aspect-square` cells. Removed the JS chunking workaround.
- ✅ **Dork SVG built for card backs** — Custom inline SVG of Dork the Dragon (red body, yellow belly, purple top hat, grumpy eyes, wings, stubby legs and feet). Replaces the bone icon.
- ✅ **Card front font upgraded** — Uses `font-headline` (Poppins) bold at readable size instead of small default text.

### Technical Changes Made
1. **`src/modules/petland/ai/generate-pet-image-flow.ts`** — Complete rewrite. Removed all Genkit imports. Direct `fetch` to `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-ultra-generate-001:predict`. Returns base64 data URI. Reads `process.env.GEMINI_API_KEY` at call time.
2. **`src/modules/petland/ai/genkit.ts`** — Added `apiKey: process.env.GEMINI_API_KEY` explicitly (file still exists, not used by image flow).
3. **`src/modules/petland/components/student-dashboard.tsx`** — Avatar layout, petImageUrl recovery effect, Memory Match layout/sizing/all-vocab, console.error added to handleHatch catch block.

---

## Files Modified

| File Path | Changes Made |
|-----------|-------------|
| `src/modules/petland/ai/generate-pet-image-flow.ts` | Full rewrite — Genkit removed, direct Imagen REST call |
| `src/modules/petland/ai/genkit.ts` | Added explicit apiKey |
| `src/modules/petland/components/student-dashboard.tsx` | Avatar layout, petImageUrl recovery, Memory Match overhaul |

---

## Current State

### ✅ What's Working
- Full hatch flow: wish → Imagen 4.0 Ultra generates image → Firebase Storage upload → preview → accept/name → Firestore saved
- Passport: correct avatar displayed, full size, recovery effect patches missing URLs automatically
- Memory Match: correct card layout (4 per row, 48×48), all vocab words loaded, XP/HP award logic correct in code

### ⚠️ Known Issues / Gaps (not bugs — design gaps)
- **No daily HP cap on Memory Match** — `lastChallengeDate` exists in Firestore but playing multiple rounds in one day awards HP each time. Spec says only one round per day should give HP.
- **SRS logic not wired** — `srsLevel` field exists on vocab words but correct/incorrect matches don't update it. Card selection is not SRS-driven.
- **Session-based vocab loading not implemented** — Game loads all vocab. Spec says most recent session's words first, then older due words.
- **Overfeeding detection not implemented** — No check prevents grinding past SRS schedule.
- **HP decay not implemented** — No cron/scheduled function. Stacked.

### 🧪 Needs Testing (not yet completed this session)
- [ ] Memory Match: play through to win, confirm XP + HP update in Firestore
- [ ] Real-time feedback overlay: T sends Wow/Brainfart/Treasure, confirm overlay appears on L screen
- [ ] Reset Pet: T portal, confirm Storage image deletes + L can hatch fresh pet

---

## Next Sessions Should

### Immediate Priority — Finish Petland Testing
1. Complete the three untested items above before moving on
2. If Memory Match HP/XP write fails, debug `handleGameWin` → `updateDoc` call

### Track 1 — Petland Enhancements (when testing passes)
Priority order per game mechanics doc:
1. **Daily HP cap** — Check `lastChallengeDate` before awarding HP. One round per day gets +10 HP. Subsequent rounds same day: XP only, no HP.
2. **HP decay** — Scheduled function: -10 HP every 24 hours from `lastHpUpdate`. Needs Cloud Functions or a cron approach.
3. **SRS level updates** — On correct match: `srsLevel++`. On incorrect match: `srsLevel = 1`. Write to Firestore on game completion.
4. **Session-based vocab loading** — Load most recent session's vocab first.

### Track 2 — Homework Generator (stacked from Q44)
- Spec: `Kiddoland-Homework-Generator-Spec-Q42.md`
- Build: tool shell + Workbook (WHITE) form + Phonics Workbook form + theme presets + KTFT JSON parser + download

### Still Stacked
- Pet Shop implementation
- Travel Agent implementation
- Overfeeding detection
- Vet mechanic
- Avatar re-rendering with accessories
- Delete dead API routes
- Tighten scheduleTemplates Firestore rules

---

## Important Context

### Critical Information for Next Claude
- **Tailwind grid is now fixed.** Root cause was `src/modules/**` missing from the `content` array in `tailwind.config.ts`. Added and confirmed working. `grid-cols-4` etc. work normally in modules.
- **Genkit's `googleAI()` plugin crashes at module load time** if the API key isn't found at import time (Turbopack evaluates modules before env vars are available). Do not reintroduce Genkit for image generation. The current direct REST approach is the correct solution.
- **`GEMINI_API_KEY`** is the env var name in `.env.local` for the Google AI API key.
- **Firebase Storage bucket:** `studio-3824588486-46768.firebasestorage.app`
- **Game Mechanics source of truth:** `Petland-GAME_MECHANICS-Q45.md`

### Recent Decisions
- **Decision:** Removed Genkit entirely from image generation flow.
- **Rationale:** Genkit's plugin system checks for the API key at module initialization time, which crashes before Next.js can inject env vars. Direct REST is simpler, more reliable, and easier to debug.
- **Decision:** petImageUrl recovery effect rather than asking Captain to reset and re-hatch.
- **Rationale:** Max's image was already in Storage. The recovery effect is a one-time self-heal that works for all affected Ls.

---

## Development Rules Followed
- [X] No direct Firebase access by AI
- [X] No Wasted Tokens policy followed
- [X] Prompt for handoff at session closure
- [X] Hexdate system used on all files

---

**Status:** Petland partially tested — hatch and passport confirmed working
**Ready for:** Finish testing (Memory Match win, feedback overlay, reset pet) → Petland enhancements
**Git status:** Uncommitted changes in student-dashboard.tsx, generate-pet-image-flow.ts, genkit.ts
**Session ID:** Q45
