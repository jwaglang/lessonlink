# Kiddoland Workbook Templates — YELLOW, ORANGE, GREEN
# Diff Specs for VS Code Claude

**Date:** April 6, 2026 (Q46)
**Source file:** `Kiddoland_Workbook_WHITE_Template.html` (in project files)
**Task:** Create three new template files by modifying the WHITE template
**Approach:** For each level, copy the WHITE template, then apply the listed changes

**CRITICAL:** Before making ANY change, read the actual field names and function names in the WHITE template. Do not assume — verify. The generator's `lessonData` injection depends on exact field name matches.

---

# TEMPLATE 1: YELLOW WORKBOOK

**Output file:** `Kiddoland_Workbook_YELLOW_Template.html`
**Level:** CEFR A1+ (GSE 22-29)
**What's different from WHITE:** More vocabulary (10 vs 8), sentence-level matching instead of word-level, new sentence ordering activity replacing riddles.

## Changes

### 1. Title
`<title>ESL Elementary Workbook - Template</title>` → `<title>ESL Elementary Workbook - YELLOW Template</title>`

### 2. CSS Color Changes
In `:root`, change these two values only:
```
--pastel-pink: #F8BBD0;    →    --pastel-pink: #FFF59D;
--vibrant-pink: #F06292;    →    --vibrant-pink: #F9A825;
```

### 3. Header Gradient
Find the `header` CSS rule. Change:
```
background: linear-gradient(135deg, var(--pastel-pink), var(--pastel-lilac));
```
→
```
background: linear-gradient(135deg, #FFF59D, #FFE082);
```

### 4. Flashcard Grid — 5 columns
Find `#flashcardContainer` CSS. Change `repeat(4, 1fr)` → `repeat(5, 1fr)` at the default (desktop) breakpoint. Also update any responsive breakpoints to make sense for 10 cards.

### 5. Memory Game Grid — 5 columns
Find `#memoryGameContainer` CSS. Change `repeat(4, 1fr)` → `repeat(5, 1fr)` at the default (desktop) breakpoint. Update responsive breakpoints for 20 cards.

### 6. Memory Match Counter
Find the HTML showing `/ 8` for the memory match count. Change to `/ 10`.

### 7. Matching Counter
Find the HTML showing `/ 8` for the matching game count. Change to `/ 10`.

### 8. lessonData — Expand to 10 vocabulary items
In the `lessonData` object:
- `flashcards`: expand from 8 to 10 placeholder entries
- `memoryPairs`: expand from 8 to 10 placeholder entries  
- `matchingPairs`: expand from 8 to 10 placeholder entries
- `fillInBlanks`: expand from 8 to 10 placeholder entries
- `wordBank`: expand from 8 to 10 placeholder entries

### 9. lessonData — Change level
`level: "CEFR A1"` → `level: "CEFR A1+"`

### 10. lessonData — Change matching format
Change `matchingPairs` placeholder guidance from word↔description to sentence↔emoji:
```javascript
matchingPairs: [
    { left: "[SVO sentence using word1, e.g. 'The cat sits on the mat.']", right: "[emoji1]" },
    // ... 10 entries
],
```

### 11. lessonData — Change reading text guidance
```javascript
readingText: "[Write a short story (10-15 sentences) using all 10 vocabulary words. Use SVO sentences and connectors: and, but, so.]",
```

### 12. lessonData — Replace listeningQuestions with sentenceOrdering
Delete the entire `listeningQuestions` array. Replace with:
```javascript
sentenceOrdering: [
    { jumbled: ["[word_a]", "[word_b]", "[word_c]", "[word_d]"], correct: "[Correct sentence]", hint: "[emoji hint]" },
    { jumbled: ["[word_e]", "[word_f]", "[word_g]", "[word_h]"], correct: "[Correct sentence]", hint: "[emoji hint]" },
    { jumbled: ["[word_i]", "[word_j]", "[word_k]", "[word_l]"], correct: "[Correct sentence]", hint: "[emoji hint]" },
    { jumbled: ["[word_m]", "[word_n]", "[word_o]", "[word_p]"], correct: "[Correct sentence]", hint: "[emoji hint]" }
],
```

### 13. lessonData — Update finalTask
```javascript
finalTask: "Draw your favorite [topic item] and record yourself saying 3 sentences about it. Try to use 'and' or 'but' to connect your ideas!"
```

### 14. lessonData — Update template instructions comment
Change the comment block to reference YELLOW, 10 words, sentence↔emoji matching, Word Builder, CEFR A1+.

### 15. Activity 6 (Matching) — Update rendering
The `renderMatchingGame()` function currently creates left buttons with single words and right buttons with descriptions. Change:
- Left buttons: increase min-width to 200px, set text-align left, font-size 0.9rem (these now show sentences)
- Right buttons: increase font-size to 2rem, reduce min-width to 60px (these now show emojis)

### 16. Activity 7 — Replace HTML
Replace the entire `activity7` div. Old:
```html
<div id="activity7" class="screen">
    <h2>7. Riddle Me This 🤷</h2>
    ...
</div>
```
New:
```html
<div id="activity7" class="screen">
    <h2>7. Word Builder 🔨</h2>
    <p>Put the words in the right order to make a sentence!</p>
    <div id="sentenceOrderContainer"></div>
    <p style="font-size: 1.5rem; font-weight: bold; margin-top: var(--space-lg);">
        Correct sentences: <span id="correctSentences">0</span> / <span id="totalSentences">0</span>
    </p>
    <button onclick="markComplete(7)">Mark as Done ✓</button>
</div>
```

### 17. Activity 7 — Replace JavaScript
Remove the entire `renderListeningExercise()` and `showListeningQuestion()` functions and all related listening exercise JS (including `currentListeningQ` variable).

Add the full sentence ordering JS:
- `renderSentenceOrdering()` — initializes the activity, sets totalSentences count
- `showSentenceQuestion(index)` — displays one jumbled sentence with word buttons
- `selectWord(btn, word)` — adds tapped word to sentence slot
- `removeWord(index)` — removes word from slot, re-enables button
- `clearSentence()` — resets current attempt
- `checkSentence()` — compares attempt to `correct`, plays sound, advances on success

Variables needed: `currentSentenceIndex`, `correctSentenceCount`, `selectedWords`

The sentence slots area should use `var(--candy-yellow)` for placed word backgrounds and `var(--pastel-yellow)` for the dashed border (matching the YELLOW theme).

### 18. Activity initialization
Where `renderListeningExercise()` is called in the startup/navigation code, replace with `renderSentenceOrdering()`.

### 19. Navigation bar
Find the activity 7 button in the bottom nav. Change the emoji from 🔊 (listening) to 🔨 (building).

### 20. Export — dragonLevel
In `exportSessionData()`, change `dragonLevel: "WHITE"` → `dragonLevel: "YELLOW"`.

### 21. Student version generation
Verify that `generateStudentVersion()` correctly handles the new sentence ordering activity. The student version should work with `sentenceOrdering` data instead of `listeningQuestions`.

### 22. Reset function
In the reset/clear function, add `correctSentenceCount = 0; currentSentenceIndex = 0;` and call `renderSentenceOrdering()` instead of `renderListeningExercise()`.

### 23. State restoration
If there's a `showScreen` or state restoration function that references listening questions or `currentListeningQ`, update it to reference sentence ordering state instead.

### 24. Do NOT change
- Background gradient (stays candy shop rainbow)
- Font (Comic Sans / Chalkboard)
- Audio recording functionality
- Drawing canvas
- Practice Time Tracker
- Export Standard v1 format (just dragonLevel)
- Teacher Mode toggle
- Generate Student Version button logic (just update what it handles)
- Sound effects
- `markComplete()` function
- Overall page structure

---

# TEMPLATE 2: ORANGE WORKBOOK

**Output file:** `Kiddoland_Workbook_ORANGE_Template.html`
**Level:** CEFR A2 (GSE 30-35)
**Base:** Copy from the YELLOW template (not WHITE — ORANGE inherits YELLOW's 10 vocab and sentence ordering)
**What's different from YELLOW:** Past tense focus, story sequencing activity, cause-and-effect matching, inference questions replacing riddles.

## Changes from YELLOW

### 1. Title
`YELLOW Template` → `ORANGE Template`

### 2. CSS Color Changes
In `:root`:
```
--pastel-pink: #FFF59D;    →    --pastel-pink: #FFCC80;
--vibrant-pink: #F9A825;    →    --vibrant-pink: #EF6C00;
```

### 3. Header Gradient
```
background: linear-gradient(135deg, #FFF59D, #FFE082);
```
→
```
background: linear-gradient(135deg, #FFCC80, #FFB74D);
```

### 4. Vocabulary — stays at 10
No change to vocabulary count.

### 5. lessonData — Change level
`level: "CEFR A1+"` → `level: "CEFR A2"`

### 6. lessonData — Change reading text guidance
```javascript
readingText: "[Write a short narrative (10-15 sentences) in past tense using all 10 vocabulary words. Use past simple: 'The boy went to the park. He saw a big dog.' Use 'and', 'but', 'so', 'then'.]",
```

### 7. lessonData — Change fillInBlanks guidance
Update placeholder sentences to show past tense patterns:
```javascript
fillInBlanks: [
    { text: "Yesterday she ___ to the park.", answer: "[word1]" },
    // ... 10 entries, all past tense context sentences
],
```

### 8. lessonData — Change matching to cause↔effect
Replace matchingPairs guidance:
```javascript
matchingPairs: [
    { left: "[Cause sentence, e.g. 'The boy fell down.']", right: "[Effect sentence, e.g. 'He cried.']" },
    // ... 10 entries
],
```

### 9. Activity 6 — Update heading and instructions
```html
<h2>6. Cause and Effect 🔗</h2>
<p>Match what happened to why it happened!</p>
```

### 10. Activity 6 — Update rendering
Both left and right columns now show sentences (not sentence↔emoji). Set both to: min-width 180px, text-align left, font-size 0.9rem.

### 11. lessonData — Change sentenceOrdering guidance
Update to past tense jumbled sentences:
```javascript
sentenceOrdering: [
    { jumbled: ["went", "the", "to", "boy", "park"], correct: "The boy went to the park", hint: "🏃" },
    // ... 4 entries, all past tense
],
```

### 12. lessonData — Update finalTask
```javascript
finalTask: "Draw a picture of something that happened in the story. Record yourself telling the story in 3-4 sentences. What happened first? Then what? Use 'and', 'but', 'then'."
```

### 13. lessonData — Update template instructions comment
Reference ORANGE, CEFR A2, past tense, cause-and-effect matching, past tense sentence ordering.

### 14. Export — dragonLevel
`dragonLevel: "YELLOW"` → `dragonLevel: "ORANGE"`

### 15. Navigation bar emoji for Activity 6
Change from 🍐 to 🔗 (cause-effect).

---

# TEMPLATE 3: GREEN WORKBOOK

**Output file:** `Kiddoland_Workbook_GREEN_Template.html`
**Level:** CEFR A2+ (GSE 36-42)
**Base:** Copy from the ORANGE template (inherits 10 vocab, sentence ordering, past tense patterns)
**What's different from ORANGE:** Opinion/reasoning focus, informational reading, ranking activity, conditional matching.

## Changes from ORANGE

### 1. Title
`ORANGE Template` → `GREEN Template`

### 2. CSS Color Changes
In `:root`:
```
--pastel-pink: #FFCC80;    →    --pastel-pink: #A5D6A7;
--vibrant-pink: #EF6C00;    →    --vibrant-pink: #2E7D32;
```

### 3. Header Gradient
```
background: linear-gradient(135deg, #FFCC80, #FFB74D);
```
→
```
background: linear-gradient(135deg, #A5D6A7, #81C784);
```

### 4. Vocabulary — expand to 12
Expand all vocabulary arrays from 10 to 12:
- `flashcards`: 12 entries
- `memoryPairs`: 12 entries
- `matchingPairs`: 12 entries (now conditional halves — see below)
- `fillInBlanks`: 12 entries
- `wordBank`: 12 words

Update flashcard grid to `repeat(4, 1fr)` for 12 cards (3 rows of 4).
Update memory game grid to `repeat(6, 1fr)` for 24 cards.
Update match/memory counters from `/ 10` to `/ 12`.

### 5. lessonData — Change level
`level: "CEFR A2"` → `level: "CEFR A2+"`

### 6. lessonData — Change reading text guidance
```javascript
readingText: "[Write an informational text (15-20 sentences) about the topic using all 12 vocabulary words. Include facts, comparisons, and one opinion. Use 'I think', 'because', 'but', 'if...will', 'the best/worst'.]",
```

### 7. lessonData — Change fillInBlanks guidance
Update to include comparative/superlative and conditional patterns:
```javascript
fillInBlanks: [
    { text: "I think ___ is the best.", answer: "[word1]" },
    { text: "If it rains, we will ___ inside.", answer: "[word2]" },
    // ... 12 entries mixing opinion, conditional, comparative patterns
],
```

### 8. lessonData — Change matching to conditional halves
Replace matchingPairs guidance:
```javascript
matchingPairs: [
    { left: "If it rains...", right: "...we will stay inside." },
    { left: "If you study hard...", right: "...you will learn a lot." },
    // ... 12 conditional sentence pairs
],
```

### 9. Activity 6 — Update heading and instructions
```html
<h2>6. If... Then... 🔮</h2>
<p>Match the beginning of each sentence with its ending!</p>
```

### 10. Activity 6 — Update rendering
Both columns show sentence halves. Left buttons: min-width 180px. Right buttons: min-width 180px. Both text-align left, font-size 0.9rem.

### 11. lessonData — Change sentenceOrdering guidance
Update to opinion/conditional jumbled sentences:
```javascript
sentenceOrdering: [
    { jumbled: ["think", "I", "is", "best", "the", "pizza"], correct: "I think pizza is the best", hint: "🍕" },
    { jumbled: ["it", "If", "will", "rains", "stay", "we", "inside"], correct: "If it rains we will stay inside", hint: "🌧️" },
    // ... 4 entries mixing opinion + conditional patterns
],
```

### 12. Activity 7 (Word Builder) — Longer sentences
No structural change to the activity, but the jumbled arrays will have 5-7 words instead of 3-4. Verify the UI handles longer word lists gracefully (flex-wrap should handle it).

### 13. lessonData — Update finalTask
```javascript
finalTask: "Choose two [topic items] and compare them. Which do you think is better? Record yourself explaining in 4-5 sentences. Use 'I think... because...' and 'If... then...' to share your opinion!"
```

### 14. lessonData — Update template instructions comment
Reference GREEN, CEFR A2+, opinion/reasoning, conditional matching, comparative/superlative fill-in-blanks, informational reading text.

### 15. Export — dragonLevel
`dragonLevel: "ORANGE"` → `dragonLevel: "GREEN"`

### 16. Navigation bar emoji for Activity 6
Change from 🔗 to 🔮 (conditional/prediction).

---

# BUILD ORDER

1. Build YELLOW from WHITE
2. Build ORANGE from YELLOW
3. Build GREEN from ORANGE

Test each one before building the next — open in browser, click through all 8 activities, verify navigation works, verify export JSON has the correct dragonLevel.

---

# VERIFICATION CHECKLIST (all three)

For each template:
- [ ] Header gradient matches the level color
- [ ] Buttons match the level color
- [ ] Correct number of flashcards display
- [ ] Memory game has correct number of card pairs
- [ ] Activity 6 heading and format matches the level
- [ ] Activity 7 is Word Builder (sentence ordering), not riddles
- [ ] Activity 7 tap-to-build, remove, clear, and check all work
- [ ] Export JSON has correct `dragonLevel`
- [ ] Teacher Mode toggle works
- [ ] Generate Student Version downloads a file
- [ ] All navigation between activities works
- [ ] Completion screen shows after marking all activities done
- [ ] Reset clears all state including sentence ordering

**END OF SPEC**
