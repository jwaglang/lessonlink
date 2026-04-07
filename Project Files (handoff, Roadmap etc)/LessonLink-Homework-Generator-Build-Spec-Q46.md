# Homework Generator — Build Spec for VS Code Claude

**Date:** April 6, 2026 (Q46)
**Source spec:** `Kiddoland-Homework-Generator-Spec-Q42.md`
**Type:** New page in T-portal (not standalone HTML)
**Estimated effort:** Single session

---

## 1. What This Is

A homework content creation tool inside LessonLink. T uses it to turn a blank Kiddoland template into a finished, populated homework file — without opening Claude, without writing prompts, without debugging broken AI output.

T fills in a form (vocabulary, sentences, theme, etc.), imports a template HTML file from their computer, clicks Generate, and downloads a finished teacher-version HTML file ready to assign.

---

## 2. Where It Lives

**Route:** `/t-portal/students/[id]/create-homework`

**Entry point:** L profile page → Homework tab → "Create Homework" button

**Navigation:** This is NOT a sidebar menu item. It's accessed only from within the L profile Homework tab. The button sits alongside the existing "Assign Homework" button.

After generating and downloading the file, T returns to the Homework tab and can immediately assign it using the existing assign flow (which supports file attachment).

---

## 3. The Flow

1. T clicks "Create Homework" on the Homework tab
2. Page opens at `/t-portal/students/[id]/create-homework`
3. T selects content type: **Workbook (WHITE)** / **Song Worksheet** / **Phonics Workbook**
4. T imports a template HTML file from their computer (file picker, accepts `.html`)
5. The appropriate form appears for that content type
6. T fills in the form fields (see Section 5 for each type)
7. T optionally pastes KTFT JSON for level guidance (displayed as reference, doesn't restrict input)
8. T clicks **Generate**
9. Tool reads the imported template HTML, injects T's form data into the `lessonData` object, and produces a new HTML file
10. T previews the result (iframe or new tab)
11. T clicks **Download** to save the finished teacher-version file
12. T clicks "Back to Homework" to return to the L profile Homework tab

---

## 4. How Generation Works (Critical)

This is NOT about building HTML from scratch. The templates already exist as complete, working HTML files. The generator's only job is to find the `lessonData` JavaScript object inside the template and replace it with T's form data.

### The injection pattern:

Every Kiddoland template has a section like this:

```javascript
const lessonData = {
  title: "[TOPIC]",
  level: "CEFR A1",
  flashcards: [
    { word: "[word1]", image: "[emoji1]" },
    ...
  ],
  // ... more fields
};
```

The generator:
1. Reads the imported HTML file as a text string
2. Finds the `lessonData` object using a regex or string search (look for `const lessonData = {` through the matching closing `};`)
3. Builds a new `lessonData` object from the form fields
4. Replaces the old `lessonData` block with the new one
5. Also updates the `<title>` tag and any header text that shows the lesson title
6. Outputs the modified HTML as a downloadable file

That's it. No template literals. No HTML construction. Just find-and-replace on the data object.

### Theme injection:

For color themes, the generator also finds the CSS `:root` variables block and replaces the color values based on T's theme selection. The existing templates all use CSS custom properties, so this is a clean replacement.

### Song Worksheet animation injection:

For Song Worksheets, the generator injects the selected animation CSS snippet at the `<!-- CUSTOM ANIMATION INJECTION POINT -->` comment in the template.

---

## 5. Form Fields by Content Type

### 5a. Workbook (WHITE)

| Section | Field | Type | Required | Notes |
|---------|-------|------|----------|-------|
| **Basics** | Lesson Title | text | ✅ | e.g. "Farm Animals" |
| | Header Emojis | text × 2 | ✅ | Left and right of title |
| **Vocabulary (×8)** | Word | text | ✅ | e.g. "cow" |
| | Emoji | text | ✅ | e.g. "🐄" |
| | Description | text | ✅ | For matching. e.g. "It gives us milk" |
| **Reading** | Reading Text | textarea | ✅ | 8-12 sentences using all 8 vocab words |
| **Minimal Pairs (×4)** | Word A | text | ✅ | |
| | Word B | text | ✅ | |
| | Correct Word | radio (A/B) | ✅ | Which word is played in audio |
| **Fill-in-Blanks (×8)** | Sentence | text | ✅ | e.g. "A ___ gives us milk." |
| | Answer | dropdown | ✅ | Select from vocab words |
| **Riddles (×4)** | Clue | text | ✅ | e.g. "I say moo. I give milk. What am I?" |
| | Answer | dropdown | ✅ | Select from vocab words |
| **Final Task** | Prompt | textarea | ✅ | e.g. "Draw your favorite farm animal!" |
| **Theme** | Color Preset | dropdown | ✅ | Nature, Ocean, Space, Candy, Warm, Cool, Forest, Music, City, Rainbow |

### 5b. Song Worksheet

| Section | Field | Type | Required | Notes |
|---------|-------|------|----------|-------|
| **Basics** | Song Title | text | ✅ | |
| | YouTube URL | text | ✅ | |
| | Level | dropdown | ✅ | WHITE through BLACK |
| **Lyrics** | Full Lyrics | textarea | ✅ | Complete song text |
| **Vocabulary (×6-8)** | Word | text | ✅ | From the lyrics |
| | Emoji | text | ✅ | |
| | Definition | text | ✅ | |
| **Matching (×6-8)** | Sentence | text | ✅ | Gap-fill sentence |
| | Answer Emoji | text | ✅ | |
| | Answer Word | dropdown | ✅ | Select from vocab words |
| **Questions (×4-5)** | Question | text | ✅ | |
| | Type | dropdown | ✅ | Yes/No, Multiple Choice, Open |
| | Answer | text | ✅ | |
| | Options (if MC) | text × 3 | conditional | |
| **Tiny Talks (×2-3)** | Prompt | textarea | ✅ | Speaking prompt |
| **Theme** | Color Preset | dropdown | ✅ | |
| | Section Emojis | text × 6 | ✅ | One per nav section |
| **Animation** | Animation Type | dropdown | ✅ | Floating Particles, Horizontal Scroll, Pulsing Glow, Rising Bubbles, Spinning Orbit, Wave Motion, Twinkle, Bouncing |
| | Animation Element | text | ✅ | Emoji for the animation |

### 5c. Phonics Workbook

Same form as Workbook (WHITE) with these differences:
- Title convention: Sound pair name (e.g. "Short A /æ/ vs Short E /ɛ/")
- Vocabulary input: 2 groups of 4 rows, each labeled with the target sound
- Minimal Pairs: specifically contrasting the two target sounds
- Reading Text guidance: "Use all 8 words. Keep sentences to 3-6 words."

---

## 6. KTFT Integration (Optional)

A collapsible "KTFT Context" panel at the top of the form. T pastes JSON from KTFT export. The tool parses and displays:
- Level name
- Robinson dimensions
- Lexical boundary
- Expected linguistic emergence
- GSE range

This is **guidance only** — it doesn't auto-fill or restrict any fields. It's a reference panel T reads while filling in content.

If no JSON is pasted, the panel stays hidden. The tool works fine without it.

---

## 7. Theme Color Presets

```typescript
const THEME_PRESETS = {
  nature:  { primary: '#4CAF50', secondary: '#8BC34A', accent: '#FF9800' },
  ocean:   { primary: '#0288D1', secondary: '#4FC3F7', accent: '#FFB74D' },
  space:   { primary: '#1A237E', secondary: '#7C4DFF', accent: '#FF4081' },
  candy:   { primary: '#E91E63', secondary: '#FF80AB', accent: '#FFC107' },
  warm:    { primary: '#FF5722', secondary: '#FF8A65', accent: '#FDD835' },
  cool:    { primary: '#455A64', secondary: '#90A4AE', accent: '#80DEEA' },
  forest:  { primary: '#2E7D32', secondary: '#66BB6A', accent: '#A1887F' },
  music:   { primary: '#6A1B9A', secondary: '#CE93D8', accent: '#FFD54F' },
  city:    { primary: '#37474F', secondary: '#78909C', accent: '#FFAB40' },
  rainbow: { primary: '#F44336', secondary: '#2196F3', accent: '#FFEB3B' },
};
```

These map to the CSS custom properties in each template's `:root` block. The generator finds and replaces the color values.

---

## 8. Animation Snippets (Song Worksheets Only)

Each animation type is a self-contained CSS snippet (keyframes + positioned elements). Store these as string constants. The generator injects the selected snippet at the `<!-- CUSTOM ANIMATION INJECTION POINT -->` comment.

Eight types: Floating Particles, Horizontal Scroll, Pulsing Glow, Rising Bubbles, Spinning Orbit, Wave Motion, Twinkle, Bouncing.

Each takes an emoji element and optional color from the form. The CSS snippet uses these values.

The spec (`Kiddoland-Homework-Generator-Spec-Q42.md`, Section 7) has the full table of types with descriptions and configurable properties.

---

## 9. Draft Save/Load

Save form state so T can close the browser and come back:
- Auto-save form state on every field change (use a debounced write)
- Store in browser localStorage keyed by content type
- "Load Draft" button to restore
- "Clear Form" button to reset

Note: localStorage is fine here — this is a page in the user's browser, not a Claude artifact.

---

## 10. File Structure

```
src/app/t-portal/students/[id]/create-homework/
  page.tsx              — main page component
  components/
    content-type-selector.tsx   — the three card picker
    workbook-form.tsx           — WHITE workbook form
    song-worksheet-form.tsx     — Song Worksheet form
    phonics-workbook-form.tsx   — Phonics Workbook form
    ktft-panel.tsx              — KTFT JSON guidance display
    theme-picker.tsx            — color preset selector
    animation-picker.tsx        — animation type selector (Song only)
    preview-panel.tsx           — iframe preview of generated output
    template-importer.tsx       — file picker for template HTML
  lib/
    generator.ts                — injection logic (find lessonData, replace, inject theme/animation)
    theme-presets.ts            — color preset data
    animation-snippets.ts       — CSS snippet strings for each animation type
```

---

## 11. UI Design Notes

- Follow existing T-portal patterns (Tailwind + shadcn)
- Form sections should be collapsible accordion-style (vocabulary, reading, minimal pairs, etc.)
- Vocabulary rows should be a clean repeating group with add/remove buttons
- Fill-in-Blank and Riddle answer dropdowns auto-populate from the vocabulary words T has entered
- Show a "back" breadcrumb: L Name → Homework → Create Homework
- The page should feel like a content creation workspace, not a settings form

---

## 12. What This Does NOT Include

- AI-powered content suggestions (that's Phase B)
- YELLOW/ORANGE/GREEN workbook forms (templates don't exist yet — add forms when templates are ready)
- Sentence Switcher generation (moving to Petland)
- Direct assignment from the generator (T downloads the file, then assigns separately via existing flow)
- Student version generation (the downloaded teacher file already has that button built in)

---

## 13. Testing

After build, verify:
1. Import a WHITE Workbook template → fill form → generate → open downloaded file → all 8 activities populated correctly
2. Import a Phonics Workbook template → fill form → generate → verify sound grouping works
3. Import a Song Worksheet template → fill form with animation → generate → verify animation renders
4. Theme colors applied correctly in generated output
5. KTFT JSON paste shows guidance panel
6. Draft save/load works across browser sessions
7. "Back to Homework" returns to the correct L profile

---

**END OF SPEC**
