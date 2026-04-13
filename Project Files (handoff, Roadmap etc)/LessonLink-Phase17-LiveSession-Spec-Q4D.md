# LessonLink Phase 17: Live Session Page — Build Spec

**Date:** April 13, 2026 (Q4D)  
**Author:** Browser Claude (Architect)  
**For:** VS Code Claude (Builder)  
**Status:** Ready for build  
**Priority:** CRITICAL — This is the visual centerpiece of the classroom experience.

---

## 1. What This Is

A full-screen display page that T shows via ManyCam during live sessions. T's webcam overlays the center of the screen. Around the edges, Ls see: rewards, vocabulary/grammar/phonics cards, session goals, XP progress, and animated themed backgrounds.

**There is no L-side route.** T opens this page, shares it via ManyCam, and controls everything. Ls see it as the video call background.

**Route:** `/t-portal/sessions/live/[sessionInstanceId]`

---

## 2. Reward System

| Reward | Emoji/Icon | XP Effect | Purpose | Animation |
|--------|-----------|-----------|---------|-----------|
| **Treasure Chest** | 🧰 (chest emoji) | T sets amount per chest (e.g. +5, +10, +15, +20) | XP currency — the primary earnings mechanic | Chest appears, shakes, opens with coin-fly-out animation, XP amount revealed with fanfare |
| **Wow** | ✨ | No XP | Behavioral recognition — "amazing moment!" | **Full-screen flash** — purple/gold burst fills entire screen for ~1.5s with sound effect. The big show-stopper. |
| **Oopsie** | 👀 | No XP, no penalty | Data only — marks a learning moment warmly | Gentle wobble animation, "Oopsie! No worries!" text appears briefly |
| **Behavior deductions** | Various | Negative XP | Reduces XP when needed | Brief red/pink flash, XP ticks down |

### Behavior Deduction Types

| Type | Label | XP | Emoji |
|------|-------|----|-------|
| Out-to-lunch | "Out to lunch!" | -3 | 😴 |
| Chatterbox | "Chatterbox!" | -2 | 🗣️ |
| Disruptive/Mean | "Not cool!" | -5 | 😬 |

### Treasure Chest Mechanic

The Treasure Chest is the exciting payoff moment. When T clicks the Treasure Chest button:

1. T sees a number input (or quick-select: 5, 10, 15, 20) to set XP amount
2. T confirms
3. On the display: a closed chest appears center-screen
4. Chest shakes/wobbles for ~1 second (building anticipation)
5. Chest opens — coins/sparkles fly outward
6. The XP amount is revealed: "+15 XP!" in big gold text
7. XP counter in top-right ticks up
8. Chest and animation fade after ~3 seconds
9. Chest count in left panel increments

T can award multiple Treasure Chests per session. Typical pattern: small chests during class for good work, bigger chest at session end as participation reward.

---

## 3. Layout (16:9 Full-Screen)

T's webcam sits center-screen via ManyCam. All UI lives around the edges.

```
┌─────────────────────────────────────────────────────────────┐
│ [theme]  [🚀 Session question / aim banner]      [⚡ 45 XP]│  ← TOP BAR
│                                                             │
│ ┌──────────┐                              ┌──────────────┐  │
│ │ TREASURE  │                              │  📚 New words │  │
│ │ 🧰🧰🧰   │                              │  ┌──────────┐│  │
│ │ 3 chests! │                              │  │  kind     ││  │
│ │ +35 XP    │      ┌──────────────┐        │  │  nice...  ││  │
│ ├──────────┤      │              │        │  ├──────────┤│  │
│ │   WOW     │      │   TEACHER    │        │  │  brave    ││  │
│ │   ✨✨     │      │   WEBCAM     │        │  │  not...   ││  │
│ │  2 Wows!  │      │   (clear)    │        │  ├──────────┤│  │
│ ├──────────┤      │              │        │  │  share    ││  │
│ │  OOPSIE   │      └──────────────┘        │  │  give...  ││  │
│ │   👀 1    │                              │  ├──────────┤│  │
│ │ no worries│                              │  │💡 grammar ││  │
│ ├──────────┤                              │  ├──────────┤│  │
│ │ BEHAVIOR  │                              │  │🎵 sound   ││  │
│ │ ⭐ Great! │                              │  └──────────┘│  │
│ └──────────┘                              └──────────────┘  │
│                                                             │
│ [🐉▓▓▓▓▓▓▓▓░░░░🏆 keep going! 45/60 XP]   [✨magic word✨]│  ← BOTTOM BAR
└─────────────────────────────────────────────────────────────┘
```

### Spatial Rules

- **Center zone** (~40% width, ~50% height): Completely empty. No UI elements. This is where T's face appears via ManyCam.
- **Left panel** (~130-150px): Reward counters stacked vertically (Treasure Chests, Wows, Oopsies, Behavior).
- **Right panel** (~150-170px): Vocabulary cards, grammar tips, phonics — added in real-time by T during session.
- **Top bar**: Session question/aim (centered), theme badge (left), XP counter (right).
- **Bottom bar**: Progress trail with dragon walking toward trophy + Magic Word slot.

---

## 4. Animated Themed Backgrounds

T selects a theme at session start (or it defaults to last-used). The animated background runs on a continuous loop at **50% opacity** behind all UI elements, creating atmosphere without competing with content.

### Five Themes

| Theme | Background Color | Animated Elements |
|-------|-----------------|-------------------|
| **Space** 🌌 | Deep navy/purple gradient (`#0a0a2e` → `#1a1a4e` → `#2a1a4e`) | Twinkling stars (CSS pulse), comets streaking across (CSS translate), slow-rotating nebula glow, occasional meteor shower |
| **Ocean** 🌊 | Deep blue gradient (`#0a3d6b` → `#1a6ea8`) | Swimming fish of different sizes/colors moving left-to-right and right-to-left at different speeds, gentle bubble particles rising, seaweed swaying at bottom |
| **Farm** 🌾 | Green-to-sky gradient (`#4a7a2e` → `#87ceeb`) | Grazing cows/sheep moving slowly across bottom, clouds drifting across top, chickens pecking, occasional bird flying across |
| **Desert** 🏜️ | Sandy gradient (`#c4a35a` → `#f4d0a0` → `#87ceeb` sky) | Camels walking across bottom, tumbleweeds rolling, heat shimmer effect, clouds moving slowly, sun/moon |
| **City** 🏙️ | Dark blue city night (`#1a1a3a` → `#2a2a4a`) | Building silhouettes with windows lighting on/off randomly, taxi headlights moving along bottom, neon signs flickering, occasional airplane crossing sky |

### Implementation Notes

- All animations are **CSS-only** (keyframes + transforms). No JavaScript animation loops, no canvas, no WebGL. This keeps CPU light for ManyCam screen capture.
- Animated elements should be **simple SVG shapes or CSS shapes** — not imported images. Fish = colored ellipses with triangular tails. Camels = simplified silhouettes. Buildings = rectangles with lit/unlit window squares.
- Each theme needs a `<div class="theme-background">` container with `opacity: 0.5; pointer-events: none; position: absolute; inset: 0; z-index: 0;`
- UI elements sit at z-index 2-3 above the background.
- Animation should loop seamlessly (no visible restart).
- `prefers-reduced-motion` media query should pause animations.
- Theme selection persisted to `localStorage` (or Firestore on the session doc).

---

## 5. Session Goals Display

### Data Source

Goals are pulled from the session's lesson plan data in Firestore. The `sessionInstances` collection links to a `sessionId` (template) which links to `sessions` (lesson plan data). The lesson plan contains:

- **Little Question (LQ)** → displayed as the session question in the top banner
- **Session aims/objectives** → displayed as the subtitle under the banner
- **Vocabulary targets** → pre-populated in the right panel (T can add more during session)

If the session instance doesn't have a linked lesson plan, T can type the session question and aim manually at session start (editable text fields).

### Session XP Target

T sets an XP target for the session at start (default: 60 XP). This drives the progress bar. The target is stored on the `sessionProgress` doc.

---

## 6. T-Side Control Panel

The control panel is part of the same page, but rendered **below the fold** or in a **collapsible drawer** at the bottom. T scrolls down (or pulls up a drawer) to access controls while ManyCam captures only the top viewport (the display area).

Alternative: A **floating toolbar** at the very bottom of the viewport that ManyCam crops out. Test which approach works best with ManyCam's screen capture region.

### Control Panel Layout

```
┌─────────────────────────────────────────────────────────────┐
│                    T CONTROL PANEL                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  REWARDS:                                                   │
│  [🧰 Treasure +5] [🧰 +10] [🧰 +15] [🧰 +20] [🧰 Custom]│
│  [✨ WOW!]  [👀 Oopsie]                                    │
│                                                             │
│  BEHAVIOR:                                                  │
│  [😴 Out-to-lunch -3] [🗣️ Chatterbox -2] [😬 Disruptive -5]│
│                                                             │
│  ADD CONTENT:                                               │
│  [+ Vocabulary]  [+ Grammar]  [+ Phonics]                   │
│                                                             │
│  SESSION:                                                   │
│  [Edit Goals]  [Set XP Target]  [Change Theme]              │
│  [🔮 Set Magic Word]  [🏁 End Session]                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Button Behaviors

**Treasure Chest buttons:** Quick-select amounts (+5, +10, +15, +20) fire immediately. "Custom" opens a small number input. All trigger the chest opening animation on the display.

**Wow button:** Single click triggers the full-screen Wow flash with sound. No additional input needed.

**Oopsie button:** Single click. Triggers gentle animation.

**Behavior buttons:** Single click fires immediately. Brief flash + XP reduction shown on display.

**Add Vocabulary:** Opens a quick dialog: word + meaning (2 text inputs). Submit adds the card to the right panel in real-time.

**Add Grammar:** Opens a quick dialog: grammar point + example sentence. Submit adds to right panel.

**Add Phonics:** Opens a quick dialog: sound + example words. Submit adds to right panel.

**Set Magic Word:** Opens a text input. T types the magic word. When set, the "???" in the bottom bar reveals the word with a sparkle animation.

**End Session:** Triggers the end-of-session flow (see Section 10).

---

## 7. Database Schema

### `sessionProgress` Collection (NEW)

One document per session instance.

```typescript
interface SessionProgress {
  id: string;                              // auto-generated
  sessionInstanceId: string;               // links to sessionInstances
  studentId: string;                       // learner UID
  teacherId: string;                       // teacher UID
  
  // Session metadata
  sessionQuestion: string;                 // LQ or custom question
  sessionAim: string;                      // aim text
  xpTarget: number;                        // T-set target (default 60)
  theme: 'space' | 'ocean' | 'farm' | 'desert' | 'city';
  
  // Rewards (append-only arrays)
  treasureChests: {
    amount: number;                        // XP value of this chest
    timestamp: string;                     // ISO
  }[];
  wows: {
    timestamp: string;                     // ISO
  }[];
  oopsies: {
    timestamp: string;                     // ISO
  }[];
  behaviorDeductions: {
    type: 'out-to-lunch' | 'chatterbox' | 'disruptive';
    amount: number;                        // negative value (-2, -3, -5)
    timestamp: string;                     // ISO
  }[];
  
  // Content added during session (pushes to Petland SRS in Phase 17B)
  vocabulary: {
    word: string;
    meaning: string;
    timestamp: string;                     // ISO
  }[];
  grammar: {
    point: string;                         // e.g. "because + reason"
    example: string;                       // e.g. "She is kind because she helps."
    timestamp: string;                     // ISO
  }[];
  phonics: {
    sound: string;                         // e.g. "/sh/"
    examples: string[];                    // e.g. ["share", "she", "fish"]
    timestamp: string;                     // ISO
  }[];
  
  // Computed
  totalXpEarned: number;                   // sum of treasure chests - deductions
  
  // Magic word
  magicWord?: string;                      // set at session end
  
  // Lifecycle
  status: 'active' | 'completed';
  createdAt: string;                       // ISO
  completedAt?: string;                    // ISO, set when T ends session
}
```

### Firestore Rules

```
match /sessionProgress/{docId} {
  allow read: if request.auth != null;
  allow create, update: if request.auth != null 
    && request.auth.uid == resource.data.teacherId;
}
```

T creates and updates. No one else writes. Read access for authenticated users (needed if we later add L-side display).

---

## 8. Types to Add

In `src/lib/types.ts`, add:

```typescript
// === Phase 17: Live Session ===

export type SessionTheme = 'space' | 'ocean' | 'farm' | 'desert' | 'city';

export type BehaviorDeductionType = 'out-to-lunch' | 'chatterbox' | 'disruptive';

export interface TreasureChestReward {
  amount: number;
  timestamp: string;
}

export interface WowReward {
  timestamp: string;
}

export interface OopsieEvent {
  timestamp: string;
}

export interface BehaviorDeduction {
  type: BehaviorDeductionType;
  amount: number;  // negative value
  timestamp: string;
}

export interface SessionVocabulary {
  word: string;
  meaning: string;
  timestamp: string;
}

export interface SessionGrammar {
  point: string;
  example: string;
  timestamp: string;
}

export interface SessionPhonics {
  sound: string;
  examples: string[];
  timestamp: string;
}

export interface SessionProgress {
  id: string;
  sessionInstanceId: string;
  studentId: string;
  teacherId: string;
  
  sessionQuestion: string;
  sessionAim: string;
  xpTarget: number;
  theme: SessionTheme;
  
  treasureChests: TreasureChestReward[];
  wows: WowReward[];
  oopsies: OopsieEvent[];
  behaviorDeductions: BehaviorDeduction[];
  
  vocabulary: SessionVocabulary[];
  grammar: SessionGrammar[];
  phonics: SessionPhonics[];
  
  totalXpEarned: number;
  
  magicWord?: string;
  
  status: 'active' | 'completed';
  createdAt: string;
  completedAt?: string;
}

// Behavior deduction config
export const BEHAVIOR_DEDUCTIONS: Record<BehaviorDeductionType, { label: string; emoji: string; amount: number }> = {
  'out-to-lunch': { label: 'Out to lunch!', emoji: '😴', amount: -3 },
  'chatterbox': { label: 'Chatterbox!', emoji: '🗣️', amount: -2 },
  'disruptive': { label: 'Not cool!', emoji: '😬', amount: -5 },
};
```

---

## 9. Aesthetic Requirements

### This page is for kids aged 5-12. Design accordingly.

**Fonts:**
- Display font: `'Contrail One', cursive` — all headings, reward labels, word cards, XP counter, magic word. This is the Kiddoland display font.
- Body font: `'Poppins', sans-serif` — subtitles, descriptions, aim text.
- Load via Google Fonts.

**Kiddoland Color Palette:**

```css
--k-navy: #404376;
--k-slate: #686ea8;
--k-orange: #f2811d;
--k-pink: #fe598b;
--k-peach: #f8dab9;
--k-ice-blue: #dcebf4;
--k-shell-pink: #f4d8da;
--k-rose: #efb8bf;
--k-lavender: #e2d6f4;
```

**Design Principles:**
- **Big and bold.** Minimum font size on the display: 14px. Reward labels: 16-20px. XP counter: 22-24px. Word cards: 18-20px. A five-year-old should be able to read the key info from their tablet screen during a video call.
- **Round everything.** Border radius 16-24px on cards, 20px+ on containers. No sharp corners.
- **Chunky borders.** 2-2.5px solid borders on cards, not thin hairlines.
- **High contrast on dark backgrounds.** All text on the themed backgrounds must be white or light pastels. Use semi-transparent dark panels (rgba(0,0,0,0.3-0.4)) behind text groups for readability.
- **Warm and encouraging.** Oopsie says "no worries!" Behavior section says "Great behavior!" by default. Deductions are brief, not shaming.
- **Celebrate everything.** Stars, sparkles, gold, trophies. The progress dragon. The treasure chest opening. Kids should feel like they're winning.
- **No data-dashboard aesthetics.** No thin fonts, no subtle grays, no corporate chart styling. This is a game screen, not an analytics panel.

### Animation Requirements

**Wow animation (the showstopper):**
- Full-screen radial burst from center (purple → gold gradient)
- "WOW!" text in huge Contrail One font (~80-100px), white with gold text-shadow
- Sparkle particles radiating outward
- Sound effect trigger (play an audio element — provide a `wow-sound.mp3` slot)
- Duration: ~2 seconds, then fades back to normal view
- z-index above everything

**Treasure Chest animation:**
- Chest emoji/icon appears center-screen (large, ~120px)
- Wobbles/shakes for ~1 second
- "Opens" (could be a CSS scale + opacity transition to a different state)
- Gold coin particles fly outward (CSS keyframe animation)
- XP amount revealed below chest in gold text
- Duration: ~3 seconds total
- z-index above content but could be below Wow

**Oopsie animation:**
- 👀 emoji scales up from center, gentle wobble (CSS rotate ±5deg)
- "Oopsie! No worries!" text fades in below
- Duration: ~1.5 seconds
- Subtle — not scary, not loud

**Behavior deduction animation:**
- Brief pink/red border flash on the entire viewport
- Deduction label appears briefly center-bottom (e.g. "Chatterbox! -2 XP")
- XP counter ticks down visibly
- Duration: ~1 second
- Not celebratory, not shaming. Just factual.

**New word card animation:**
- Card slides in from right with a gentle bounce (translateX + scale overshoot)
- Brief sparkle on arrival
- Duration: ~0.5 seconds

**Progress bar dragon:**
- Dragon emoji slides right as XP increases (CSS transition on width percentage)
- When reaching 100%, trophy at the end pulses/glows

**Magic Word reveal:**
- "???" morphs to the actual word with a sparkle burst
- Word pulses gently after reveal

---

## 10. End-of-Session Flow

When T clicks "End Session":

1. Display fades to a summary screen (same page, overlay or transition)
2. **Summary shows:**
   - Total XP earned this session
   - Treasure Chest breakdown (count × amounts)
   - Wow count
   - Oopsie count
   - Words learned (vocabulary list)
   - Grammar points covered
   - Phonics sounds practiced
   - Magic Word (if set)
3. Quick flashcard scroll: T clicks through each vocabulary word one at a time (big card, word → meaning). This is a T-controlled recap, not L interaction.
4. T clicks "Done" — session marked as completed in Firestore.

**Phase 17B (not this build):** On session complete, vocabulary/grammar/phonics items automatically push to the L's Petland SRS review queue.

**Phase 17C (not this build):** End-of-session scoreboard with historical comparison and celebration animations.

---

## 11. Session Initialization

When T navigates to `/t-portal/sessions/live/[sessionInstanceId]`:

1. Look up the `sessionInstance` from Firestore
2. If a `sessionProgress` doc already exists for this instance, resume it
3. If not, create a new `sessionProgress` doc with:
   - `sessionQuestion` and `sessionAim` pulled from linked lesson plan (or empty for T to fill)
   - `xpTarget` default: 60
   - `theme` default: 'space' (or last-used from T preferences)
   - All reward arrays empty
   - `totalXpEarned`: 0
   - `status`: 'active'
4. T sees the display with controls. Adjusts goals/theme if needed.
5. Session is live.

---

## 12. Technical Notes

- **All Firestore writes are client-side** (T is logged in, has auth context). No API routes needed for session progress writes.
- **Array updates use `arrayUnion`** for append-only fields (treasureChests, wows, etc.) to avoid race conditions.
- **`totalXpEarned` is recomputed** on each write: `sum(treasureChests.amount) + sum(behaviorDeductions.amount)`. Store it for quick display but recalculate for accuracy.
- **Sound effects:** Use HTML5 `<audio>` elements with preloaded MP3s. Provide slots for: `wow-sound.mp3`, `treasure-open.mp3`, `oopsie.mp3`. Captain will supply audio files or we use free sound effects. For now, include the `<audio>` elements with placeholder paths.
- **ManyCam compatibility:** The display area should be the full viewport (100vw × 100vh). ManyCam captures a browser window or screen region. T can set ManyCam to capture just the browser window. The control panel should either be in a separate scrollable area below the viewport, or in a drawer that slides up from bottom.
- **No localStorage for state** — use Firestore. The session progress doc IS the state.
- **Responsive:** The display should work at common screen resolutions (1920×1080, 1280×720, etc.). Content panels use percentage-based positioning. Fonts scale with viewport.

---

## 13. Build Order

1. **Types** — Add all types from Section 8 to `src/lib/types.ts`
2. **Route + page shell** — Create `/t-portal/sessions/live/[sessionInstanceId]/page.tsx` with full-screen layout
3. **Theme backgrounds** — Implement all 5 animated backgrounds as separate components (start with Space, then build the rest)
4. **Display layout** — Top bar, left panel, right panel, bottom bar, center clear zone
5. **Control panel** — Drawer or below-fold section with all buttons
6. **Reward animations** — Wow flash, Treasure Chest opening, Oopsie wobble, behavior flash
7. **Content addition dialogs** — Vocabulary, Grammar, Phonics quick-add forms
8. **Firestore integration** — Create/update `sessionProgress` doc, write rewards and content
9. **Session initialization** — Link to lesson plan data, pre-populate goals
10. **End-of-session summary** — Summary overlay with flashcard recap
11. **Magic Word** — Input + reveal animation
12. **Polish** — Sound effect slots, responsive testing, ManyCam testing

---

## 14. Files to Create

| File | Purpose |
|------|---------|
| `src/app/t-portal/sessions/live/[sessionInstanceId]/page.tsx` | Main Live Session page |
| `src/components/live-session/display-area.tsx` | The full-screen display (what ManyCam captures) |
| `src/components/live-session/control-panel.tsx` | T's button panel |
| `src/components/live-session/reward-animations.tsx` | Wow, Treasure, Oopsie, Behavior animations |
| `src/components/live-session/theme-backgrounds/space.tsx` | Space animated background |
| `src/components/live-session/theme-backgrounds/ocean.tsx` | Ocean animated background |
| `src/components/live-session/theme-backgrounds/farm.tsx` | Farm animated background |
| `src/components/live-session/theme-backgrounds/desert.tsx` | Desert animated background |
| `src/components/live-session/theme-backgrounds/city.tsx` | City animated background |
| `src/components/live-session/word-card.tsx` | Vocabulary card component |
| `src/components/live-session/grammar-card.tsx` | Grammar tip component |
| `src/components/live-session/phonics-card.tsx` | Phonics sound component |
| `src/components/live-session/progress-bar.tsx` | Dragon progress trail |
| `src/components/live-session/magic-word.tsx` | Magic word slot + reveal |
| `src/components/live-session/session-summary.tsx` | End-of-session recap overlay |
| `src/components/live-session/add-content-dialogs.tsx` | Quick-add forms for vocab/grammar/phonics |

---

## 15. What This Build Does NOT Include (Stacked)

- L-side route or display (not needed — ManyCam shares T's screen)
- Real-time Firestore listeners / `onSnapshot` (no L client to sync to)
- Phase 17B: Pushing session content to Petland SRS
- Phase 17C: End-of-session scoreboard with historical comparison
- Group session support (multi-learner tracking)
- Sound effect audio files (placeholder `<audio>` elements only)
- XP integration with the holistic progress system (XP budget not finalized)

---

## 16. Visual Reference

See the mockup delivered alongside this spec. Key features shown:

- Space theme background with comets, meteors, nebula at 50% opacity
- Top banner: session question in orange-to-pink gradient pill, XP counter top-right
- Left panel: Treasure Chests (collection with cumulative XP), Wows (count), Oopsie (warm), Behavior
- Right panel: Vocabulary word cards (each different color), grammar "sentence tip" with highlighted keyword, phonics "/sh/" sound card
- Bottom bar: Progress trail with dragon walking toward trophy, Magic Word "???" slot
- Reward animation previews: Wow full-screen flash, Treasure Chest opening, Oopsie wobble, behavior deduction flash
- Theme selector: Space (active), Ocean, Farm, Desert, City

All using Kiddoland palette: navy, slate, orange, pink, peach, lavender, ice-blue.
All display text in Contrail One. Body text in Poppins.
Rounded corners, chunky borders, big bold type. Kid-friendly, not corporate.

---

**Ready for build.**  
**Estimated sessions:** 3-5  
**Dependencies:** None (new feature, no existing code to modify except types.ts)  
**Blocked by:** Nothing
