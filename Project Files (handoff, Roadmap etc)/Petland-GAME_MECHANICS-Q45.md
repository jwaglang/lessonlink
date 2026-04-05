# Petland Game Mechanics Rulebook

**Updated:** April 5, 2026 (Q45)
**Status:** Petland is integrated into LessonLink as `src/modules/petland/`. No standalone app.
**Firestore path:** `students/{learnerId}/petland/profile`

---

## Design Intent

Petland is a virtual pet reward system for Young Learners of English. The core loop is borrowed from Memrise's "watering" metaphor: the student must return daily to review vocabulary, or their pet wilts. This turns spaced repetition into a habit driven by emotional attachment rather than obligation.

The motivation loop:

1. **Real-world action** — Learn English in class with a teacher
2. **Virtual reward** — Earn XP from teacher feedback during live sessions
3. **Daily maintenance** — Play Memory Match to review vocab and keep the pet alive (HP)
4. **Self-expression** — Spend earned currency on accessories, new pets, or travel adventures

---

## Health Points (HP)

HP represents the pet's wellbeing. It creates the daily return incentive.

- **Max HP:** 100 (all students)
- **Gaining HP:** +10 HP for completing the daily vocab review (one Memory Match round)
- **Losing HP (Decay):** -10 HP every 24 hours from last update ⚠️ *NOT YET IMPLEMENTED — no cron/scheduled function*
- **Sickness from neglect:** Pet becomes sick if HP drops to 20 or below
- **Sickness from overfeeding:** If a student plays beyond what the SRS schedule prescribes (grinding the same words past their review window), the pet gets sick. HP is capped at max. This mechanic enforces proper spaced repetition — you can't spam the game for infinite rewards
- **Vet mechanic:** How a sick pet recovers is *stacked for future design*
- **Alerts:** Toast notifications when HP drops below thresholds (80, 70, 60, etc.)

### The Daily Loop

- Log in → play Memory Match with last session's vocabulary → pet gets HP → pet stays alive
- Skip a day → no HP gained, decay still ticks → pet approaches sickness
- Overplay → pet gets sick from overfeeding → enforces SRS discipline

---

## Experience Points (XP)

XP is the long-term progress currency. It tracks overall engagement and determines the pet's level.

- **Memory Match:** `matched pairs × 5` XP per win. The number of pairs equals the number of vocabulary targets from the session (not a fixed count). Example: 8 vocab words = 8 pairs = 40 XP
- **Teacher feedback (during live lessons):**
  - **Wow!** → +5 XP (positive reinforcement for a great answer)
  - **Treasure Chest** → +10 to 50 XP (random bonus, special reward)
  - **Brainfart** → 0 XP, 0 HP (real-time classroom signal meaning "oops/brain freeze" — no stat penalty, purely a live feedback moment)
- **Pet level:** `Math.floor(XP / 1000) + 1`

### Teacher Feedback Context

The teacher has Petland open in a window alongside the video call during live lessons. Wow, Brainfart, and Treasure are real-time signals — the student sees an overlay on their screen immediately. These are classroom interaction tools, not homework review tools.

---

## Vocabulary Review (Memory Match)

The Memory Match card game is the core daily activity — it's how the student "waters the garden."

### Current State (Built)

- Memory Match loads vocabulary words and their translations as card pairs
- Student flips cards to find matching word-translation pairs
- Awards `pairs × 5` XP + 10 HP per completed round
- `srsLevel` field exists on each vocabulary word in Firestore

### Design Intent (Not Yet Built)

- **Session-first loading:** When the student logs in, they review vocabulary from their most recent lesson session first
- **Cascade to older vocab:** After completing current session vocab, the system loads previous vocabulary items that are due for review based on their SRS level
- **Leitner system:**
  - Correct match → word's `srsLevel` increases → appears less frequently in future reviews
  - Incorrect match → word drops back to `srsLevel` 1 → appears again soon
- **SRS scheduling:** The system determines which words are "due" based on their level. This controls what cards appear and prevents overplay (grinding words that aren't due yet triggers the overfeeding sickness mechanic)

### Status

- ⚠️ SRS scheduling logic: NOT IMPLEMENTED. `srsLevel` field exists but does not drive card selection
- ⚠️ Session-based vocab loading: NOT IMPLEMENTED. Game loads all available vocab
- ⚠️ Overfeeding detection: NOT IMPLEMENTED. No check against SRS schedule

---

## Dorks (Currency)

Dorks are the spending currency. Students deliberately convert XP into Dorks — it's a player choice, not automatic.

- **Denominations:** 1 Gold = 10 Silver, 1 Silver = 10 Copper
- **Starting Dorks:** 10 Copper for new students
- **Earning:** Convert XP to Dorks at the "Cash-In" station. Rate: 1 XP = 1 Copper
- **Spending:** Used in the Pet Shop

### Spending Hierarchy (Design Intent)

Three tiers, cheapest to most expensive, incentivizing daily play as the baseline:

1. **Feed pet** (maintenance) — the daily Memory Match review. Necessity.
2. **Buy accessories** (self-expression) — dress up the pet with skins, apparel, accessories. Treat.
3. **Buy a new pet or travel ticket** (aspirational) — long-term goal requiring sustained engagement

---

## Pet Lifecycle

- **Egg:** All new students start with an egg
- **Hatching:** Student makes a "wish" (text prompt describing their desired pet). AI generates a unique pet image using Imagen 4.0 Ultra (`imagen-4.0-ultra-generate-001` via direct REST `:predict` endpoint). Student can accept and name their pet, or reject and wish again
- **Prompt design:** Explicitly enforces attribute adherence — color, texture, objects, and actions must render exactly as described. Positive anatomical framing ("proper number of limbs" not "no extra limbs")
- **Daily life:** Keep pet alive through daily vocab review (HP system)
- **Reset:** Teacher can reset a student's pet from T-portal (deletes image from Firebase Storage, reverts to egg state, clears name)

### Not Yet Implemented

- Evolution and swapping
- Multiple pets
- Animated idle states (design intent: subtle Genshin-style idle animations — licking paws, flapping wings)
- Custom image replacement (teacher uploads own art instead of AI-generated)

---

## Petland Tabs (Student Portal)

| Tab | Status | Description |
|-----|--------|-------------|
| **Passport** | ✅ Built | Pet display, name, stats |
| **Playground** | ✅ Partial | Memory Match game works. SRS logic not wired. |
| **Pet Shop** | ⬜ Placeholder | Buy accessories, cash in XP for Dorks |
| **Travel Agent** | ⬜ Placeholder | Buy travel tickets, view brochure collection |

---

## Future Phases (Stacked)

### Phase 2 — Vocabulary Battles
Jeopardy-style PvP battles where two students pit their pets against each other using vocabulary knowledge. Not designed yet.

### Phase 3 — RPG Travel Adventures
When a student buys a travel ticket, they do a 4–6 station narrative RPG at that location. Players choose 3 companion characters (from the story) plus their pet. Each station presents a challenge (puzzle, riddle, or battle). Resolution: roll dice (1–2 fail, 3–4 pass with cost, 5–6 clean win) or spend a companion's skill for guaranteed pass (but that companion is used up for the rest of the game). Companions are collected as the story progresses.

### Other Stacked Items
- HP decay cron/scheduled function
- SRS scheduling logic
- Overfeeding detection
- Vet mechanic (sick pet recovery)
- Pet Shop implementation
- Travel Agent implementation
- Avatar re-rendering with accessories
- Animated pet idle states

---

## Retired Documents

The following files described the standalone Petland app and are now obsolete:

- `backend.json` — Firestore schema for standalone app. Petland data now lives at `students/{learnerId}/petland/profile` inside LL's Firestore
- `blueprint.md` — App description, style guide, and feature list for standalone app. Petland UI is now Tailwind/shadcn inside LL's portal

This document (GAME_MECHANICS.md) is the single source of truth for Petland's design rules.
