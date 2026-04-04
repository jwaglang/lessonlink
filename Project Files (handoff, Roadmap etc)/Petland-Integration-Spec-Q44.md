# Petland → LessonLink Integration Spec

**Date:** April 4, 2026 (Q44)  
**Author:** Browser Claude (Architect)  
**Audience:** VS Code Claude (Builder)  
**Status:** Ready to execute

---

## Goal

Move the Petland codebase into the LessonLink repo as a module. Petland is currently a standalone Next.js app built in Firebase Studio. It needs to become part of LL's codebase, using LL's Firebase project, and running on LL's dev server.

No data migration needed — all Petland Firestore data is test data. Start fresh in LL's Firebase project.

---

## What Petland Is

A gamified vocabulary reward system for young English learners. Students have a virtual pet that gains XP and loses HP over time (spaced repetition pressure). Teachers manage vocabulary lists and send real-time feedback. Students play Memory Match to earn XP/HP and keep their pet healthy.

**Working features:** Passport (pet display + stats), Playground (Memory Match vocab game), Teacher side (vocabulary CRUD, real-time feedback), pet hatching via AI image generation, HP decay.

**Not working / not built:** Pet Shop tab (empty), Travel Agent tab (empty), avatar re-rendering with accessories.

---

## Architecture Decisions (Already Made)

1. **Petland lives inside the LL repo** — not a separate repo or deployment.
2. **Student-facing Petland** goes in the S-portal as a new route/page.
3. **Teacher-facing Petland** goes into the existing Learner Profile page (`/t-portal/students/[id]`) — NOT as a separate teacher dashboard. The standalone `teacher-dashboard.tsx` is dismantled; its features become part of the learner profile.
4. **Petland student registration is not needed** — learners already exist in LL. They just need Petland data initialized when the T activates Petland for them.
5. **Data model uses subcollections** (Option A):
   - `students/{learnerId}/petland/profile` — single document with all Petland stats
   - `students/{learnerId}/vocabulary/{wordId}` — vocabulary words for Memory Match
6. **Petland uses LL's Firebase project** (`studio-3824588486-46768`), NOT the old Petland Firebase project (`studio-690762243-81f19`).
7. **Petland uses LL's existing Firebase setup** — do NOT bring over Petland's `src/firebase/` folder. Rewire all Firestore access to use LL's existing Firebase hooks and patterns.
8. **AI image generation (Genkit + Imagen)** stays as-is for now — it's a separate concern from LL's DeepSeek failover chain. It needs its own API key (Google AI) in `.env.local`.

---

## Data Model

### `students/{learnerId}/petland/profile` (single document)

```typescript
interface PetlandProfile {
  xp: number;
  hp: number;
  maxHp: number;
  dorks: {
    gold: number;
    silver: number;
    copper: number;
  };
  lastHpUpdate: string;        // ISO 8601 timestamp
  lastChallengeDate: string;   // YYYY-MM-DD
  isSick: boolean;
  petState: 'egg' | 'hatched';
  petName: string;
  petImageUrl?: string;
  inventory: string[];         // item IDs
  unlockedBrochures: string[]; // brochure IDs
  lastFeedback?: {
    type: 'wow' | 'brainfart' | 'treasure';
    timestamp: string;
  };
  lastHpAlertLevel?: number;
}
```

**Default values when T activates Petland for a learner:**

```typescript
{
  xp: 0,
  hp: 100,
  maxHp: 100,
  dorks: { gold: 0, silver: 0, copper: 0 },
  lastHpUpdate: new Date().toISOString(),
  lastChallengeDate: '',
  isSick: false,
  petState: 'egg',
  petName: '',
  inventory: [],
  unlockedBrochures: [],
}
```

### `students/{learnerId}/vocabulary/{wordId}`

```typescript
interface Vocabulary {
  id: string;
  word: string;
  sentence: string;
  questionPrompt: string;
  level: number;
  imageUrl: string;
  type: 'basic' | 'cloze';
  srsLevel: number;
}
```

No changes from the original Petland schema — just lives under the LL learner ID now.

---

## File Structure in LL

Create a `src/modules/petland/` directory for all Petland-specific code:

```
src/modules/petland/
  types.ts                     # PetlandProfile, Vocabulary, ShopItem, Brochure types
  utils.ts                     # Petland-specific utils (dorksToCopper, convertXpToDorks, getTodayDateString, HP decay calc, etc.)
  data.ts                      # Mock shop items and brochures (static data, not Firestore)
  placeholder-images.ts        # Placeholder image data
  components/
    student-dashboard.tsx       # Main student Petland UI (Passport, Playground, Pet Shop, Travel Agent tabs)
    memory-game.tsx             # Memory Match game component (extract from student-dashboard)
    pet-status.tsx              # Passport tab content (extract from student-dashboard)
    hatch-pet.tsx               # Egg hatching UI (extract from student-dashboard)
    feedback-overlay.tsx        # Real-time feedback popup
    hunger-alerts.tsx           # HP decay warning alerts
    learner-petland-tab.tsx     # T-portal: Petland tab content for Learner Profile page
  ai/
    generate-pet-image-flow.ts  # Genkit + Imagen flow (unchanged logic)
    genkit.ts                   # Genkit initialization
```

### What NOT to bring over from Petland:

- `src/firebase/` — entire folder. Use LL's existing Firebase setup.
- `src/app/` — all route files. New routes will be created in LL's existing route structure.
- `src/components/teacher/teacher-dashboard.tsx` — dismantled into `learner-petland-tab.tsx`.
- `src/components/header.tsx` — LL has its own.
- `src/components/ui/` — LL already has shadcn components.
- `src/hooks/` — LL has its own toast and utility hooks.
- `src/lib/seed.ts` — not needed, fresh start.
- `src/lib/mock-data.ts` — not needed.

---

## Routes

### S-Portal (Student-facing)

Create a new page at: `src/app/s-portal/petland/page.tsx`

This page loads the student's Petland profile from `students/{learnerId}/petland/profile` and their vocabulary from `students/{learnerId}/vocabulary/`, then renders the `StudentDashboard` component.

The student must be logged in via LL's auth. The `learnerId` comes from LL's auth context (the logged-in student), not from a secret ID login. **Petland's own login page (`student/page.tsx`) is not needed** — LL's auth handles identity.

Add "Petland" to the S-portal sidebar under an appropriate section.

### T-Portal (Teacher-facing)

Add a new tab to the existing Learner Profile page at `/t-portal/students/[id]`.

The current tabs are:
- Tab 1: Profile & Progress
- Tab 2: Sessions
- Tab 3: Packages & Credits
- Tab 4: Payments

Add:
- **Tab 5: Petland**

This tab contains the `LearnerPetlandTab` component, which provides:
1. **Petland activation** — if no Petland profile exists for this learner, show an "Activate Petland" button that creates the default profile document.
2. **Petland stats overview** — XP, HP, dorks, pet state, pet name, pet image (read-only view of what the student sees).
3. **Real-time feedback buttons** — Wow (+5 XP), Brainfart, Treasure Chest (10-50 XP). These update the learner's Petland profile document and trigger the FeedbackOverlay on the student's screen.
4. **Vocabulary management** — full CRUD. Add word (with AI icon generation), edit word, delete word. Same functionality as the original teacher dashboard's vocabulary tab.
5. **Student edit** — ability to edit Petland-specific fields (pet state, XP, HP, dorks) for admin/correction purposes.

---

## Rewiring Checklist

When moving code from the Petland source into `src/modules/petland/`:

1. **Replace all Petland Firebase imports** — anything from `@/firebase` or `@/firebase/config` should use LL's Firebase setup instead. Study how LL's existing components access Firestore and follow the same pattern.

2. **Replace student ID sources** — Petland uses a manually-entered secret ID. LL uses Firebase Auth. The student's `learnerId` comes from LL's auth context.

3. **Replace Firestore paths** — change `students/{id}` reads/writes to `students/{learnerId}/petland/profile`. Change `students/{id}/vocabulary` to `students/{learnerId}/vocabulary`.

4. **Replace toast hooks** — use LL's existing toast implementation, not Petland's.

5. **Replace utility imports** — `cn()` and other utils should come from LL's existing `lib/utils`, not Petland's.

6. **Keep Genkit/Imagen AI flow** — this is a separate AI concern. It needs a `GOOGLE_API_KEY` (or whatever env var Genkit expects) in `.env.local`. Check the original Petland's Genkit config for the required env vars. The `'use server'` directive on the flow file is correct — this runs server-side.

7. **Keep the styling approach** — Petland uses hardcoded colors (e.g., `#404376`, `#fe598b`, `#686ea8`) rather than LL's CSS variable-based theming. For now, keep these as-is. Aligning Petland's visual design with LL's style guide is a future task, not part of this migration.

---

## What Success Looks Like

After this integration:

1. `npm run dev` starts LL with Petland available — no separate dev server needed.
2. A logged-in student can navigate to Petland from the S-portal sidebar, see their pet (or egg), play Memory Match, earn XP/HP.
3. A teacher can open any learner's profile, go to the Petland tab, activate Petland for that learner, manage their vocabulary, and send real-time feedback.
4. All data lives in LL's Firebase project under `students/{learnerId}/petland/` and `students/{learnerId}/vocabulary/`.
5. Pet hatching works (requires Google AI API key in env).
6. No references to the old Petland Firebase project remain in the codebase.

---

## What This Does NOT Cover (Stacked for Later)

- Visual design alignment with LL's style guide
- Pet Shop implementation
- Travel Agent implementation
- Avatar re-rendering with accessories
- Mapping Petland XP/HP to LL's holistic progress system (Phase 17)
- Petland data in AI-generated parent reports
- HP decay as a scheduled function / cron job

---

## Reference

The original Petland codebase is in the project folder where Captain dropped it. Read the source files there for implementation details. The key files with real logic are:

- `components/student/student-dashboard.tsx` (339 lines) — student UI, Memory Match game, Passport, pet hatching
- `components/teacher/teacher-dashboard.tsx` (535 lines) — teacher UI, vocabulary CRUD, feedback, registration, student editing
- `components/student/FeedbackOverlay.tsx` (102 lines) — real-time feedback popup
- `components/student/HungerAlerts.tsx` (77 lines) — HP decay alerts
- `ai/flows/generate-pet-image-flow.ts` (48 lines) — Genkit + Imagen pet image AI
- `lib/types.ts` (60 lines) — type definitions
- `lib/utils.ts` (72 lines) — dork conversion, date utils, HP decay helpers
- `firebase/storage.ts` (29 lines) — base64 image upload to Firebase Storage
