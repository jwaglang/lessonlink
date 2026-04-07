// Q46 — Homework Generator injection logic
// Reads a template HTML file and replaces lessonData + theme + animation

import { THEME_PRESETS } from './theme-presets';
import { ANIMATION_SNIPPETS } from './animation-snippets';

// ── Types ──────────────────────────────────────────────────────────────────

export interface VocabEntry {
  word: string;
  emoji: string;
  description: string;
}

export interface MinimalPairEntry {
  wordA: string;
  wordB: string;
  correct: 'A' | 'B';
}

export interface FillBlankEntry {
  sentence: string;
  answer: string;
}

export interface RiddleEntry {
  clue: string;
  answer: string;
}

export interface WorkbookFormData {
  title: string;
  headerEmojiLeft: string;
  headerEmojiRight: string;
  vocabulary: VocabEntry[];
  readingText: string;
  minimalPairs: MinimalPairEntry[];
  fillBlanks: FillBlankEntry[];
  riddles: RiddleEntry[];
  finalTaskPrompt: string;
  theme: string;
}

export interface PhonicsFormData extends WorkbookFormData {
  soundGroup1Label: string;
  soundGroup2Label: string;
}

export interface SongVocabEntry {
  word: string;
  emoji: string;
  definition: string;
}

export interface SongMatchingEntry {
  sentence: string;
  answerEmoji: string;
  answerWord: string;
}

export type QuestionType = 'yes_no' | 'multiple_choice' | 'open';

export interface SongQuestion {
  question: string;
  type: QuestionType;
  answer: string;
  options?: string[];
}

export interface TinyTalk {
  prompt: string;
}

export interface SongWorksheetFormData {
  songTitle: string;
  youtubeUrl: string;
  level: string;
  fullLyrics: string;
  vocabulary: SongVocabEntry[];
  matching: SongMatchingEntry[];
  questions: SongQuestion[];
  tinyTalks: TinyTalk[];
  theme: string;
  sectionEmojis: string[];
  animationType: string;
  animationEmoji: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function buildLessonDataForWorkbook(data: WorkbookFormData): string {
  const vocabWords = data.vocabulary.map(v => v.word).filter(Boolean);

  const obj = {
    title: data.title,
    headerEmojiLeft: data.headerEmojiLeft,
    headerEmojiRight: data.headerEmojiRight,

    // Activity 1 — Flashcards
    flashcards: data.vocabulary.map(v => ({
      word: v.word,
      image: v.emoji,
      description: v.description,
    })),

    // Activity 2 — Reading
    readingText: data.readingText,

    // Activity 3 — Memory game: auto-generated from vocabulary (word ↔ emoji pairs)
    memoryPairs: data.vocabulary.map(v => ({
      word: v.word,
      match: v.emoji,
    })),
    // Card back symbol: shown on unflipped cards instead of '?'
    cardBackSymbol: data.headerEmojiLeft || '?',

    // Activity 4 — Minimal pairs
    // correct is 0 (word1) or 1 (word2) to match checkMinimalPair(selected, correct, index)
    minimalPairs: data.minimalPairs.map(mp => {
      const correctIndex = mp.correct === 'A' ? 0 : 1;
      const correctWord = correctIndex === 0 ? mp.wordA : mp.wordB;
      return {
        word1: mp.wordA,
        word2: mp.wordB,
        correct: correctIndex,
        audioText: correctWord,   // teacher records the correct word
      };
    }),

    // Activity 5 — Fill-in-blanks / spelling
    // template reads fillInBlanks[].text and .answer
    fillInBlanks: data.fillBlanks.map(fb => ({
      text: fb.sentence,
      answer: fb.answer,
    })),

    // Activity 6 — Matching: word on left, description on right
    matchingPairs: data.vocabulary.map(v => ({
      left: v.word,
      right: v.description,
    })),

    // Activity 7 — Listening questions: built from riddles
    // Each riddle becomes a 4-option MC question; answer placed at varied position
    listeningQuestions: data.riddles.map((r, riddleIdx) => {
      const correctPos = riddleIdx % 4;
      const distractors = vocabWords.filter(w => w !== r.answer).slice(0, 3);
      // Pad with empty string if fewer than 3 distractors (shouldn't happen with 8 vocab words)
      while (distractors.length < 3) distractors.push('...');
      const options: string[] = [...distractors];
      options.splice(correctPos, 0, r.answer); // insert answer at correctPos
      return {
        audioText: r.clue,
        question: r.clue,
        options,
        correct: correctPos,
      };
    }),

    // Activity 8 — Final task
    finalTask: data.finalTaskPrompt,
  };
  return `const lessonData = ${JSON.stringify(obj, null, 2)};`;
}

function buildLessonDataForPhonics(data: PhonicsFormData): string {
  const vocabWords = data.vocabulary.map(v => v.word).filter(Boolean);

  const obj = {
    title: data.title,
    headerEmojiLeft: data.headerEmojiLeft,
    headerEmojiRight: data.headerEmojiRight,
    soundGroup1Label: data.soundGroup1Label,
    soundGroup2Label: data.soundGroup2Label,
    flashcards: data.vocabulary.map(v => ({
      word: v.word,
      image: v.emoji,
      description: v.description,
    })),
    readingText: data.readingText,
    memoryPairs: data.vocabulary.map(v => ({
      word: v.word,
      match: v.emoji,
    })),
    cardBackSymbol: data.headerEmojiLeft || '?',
    minimalPairs: data.minimalPairs.map(mp => {
      const correctIndex = mp.correct === 'A' ? 0 : 1;
      const correctWord = correctIndex === 0 ? mp.wordA : mp.wordB;
      return {
        word1: mp.wordA,
        word2: mp.wordB,
        correct: correctIndex,
        audioText: correctWord,
      };
    }),
    fillInBlanks: data.fillBlanks.map(fb => ({
      text: fb.sentence,
      answer: fb.answer,
    })),
    matchingPairs: data.vocabulary.map(v => ({
      left: v.word,
      right: v.description,
    })),
    listeningQuestions: data.riddles.map((r, riddleIdx) => {
      const correctPos = riddleIdx % 4;
      const distractors = vocabWords.filter(w => w !== r.answer).slice(0, 3);
      while (distractors.length < 3) distractors.push('...');
      const options: string[] = [...distractors];
      options.splice(correctPos, 0, r.answer);
      return {
        audioText: r.clue,
        question: r.clue,
        options,
        correct: correctPos,
      };
    }),
    finalTask: data.finalTaskPrompt,
  };
  return `const lessonData = ${JSON.stringify(obj, null, 2)};`;
}

function buildLessonDataForSong(data: SongWorksheetFormData): string {
  const obj = {
    songTitle: data.songTitle,
    youtubeUrl: data.youtubeUrl,
    level: data.level,
    fullLyrics: data.fullLyrics,
    vocabulary: data.vocabulary.map(v => ({
      word: v.word,
      emoji: v.emoji,
      definition: v.definition,
    })),
    matching: data.matching.map(m => ({
      sentence: m.sentence,
      answerEmoji: m.answerEmoji,
      answerWord: m.answerWord,
    })),
    questions: data.questions.map(q => ({
      question: q.question,
      type: q.type,
      answer: q.answer,
      ...(q.options ? { options: q.options } : {}),
    })),
    tinyTalks: data.tinyTalks.map(t => ({ prompt: t.prompt })),
    sectionEmojis: data.sectionEmojis,
  };
  return `const lessonData = ${JSON.stringify(obj, null, 2)};`;
}

// Finds `const lessonData = {` ... `};` and replaces the entire block.
function replaceLessonData(html: string, newBlock: string): string {
  // Match from `const lessonData = {` to the closing `};` on its own line
  const pattern = /const lessonData\s*=\s*\{[\s\S]*?\n\};/;
  if (!pattern.test(html)) {
    throw new Error('Could not find lessonData object in the template. Make sure this is a valid Kiddoland template.');
  }
  return html.replace(pattern, newBlock);
}

// Replaces CSS :root color variables for the theme
function injectTheme(html: string, themeKey: string): string {
  const theme = THEME_PRESETS[themeKey];
  if (!theme) return html;

  // Replace individual CSS custom properties if they exist
  let result = html;

  // Match and replace --primary, --secondary, --accent in :root block
  const rootPattern = /(:root\s*\{[^}]*?)--primary\s*:\s*[^;]+;([^}]*?)--secondary\s*:\s*[^;]+;([^}]*?)--accent\s*:\s*[^;]+;/s;
  if (rootPattern.test(result)) {
    result = result.replace(rootPattern, (_, before, mid1, mid2) =>
      `${before}--primary: ${theme.primary};${mid1}--secondary: ${theme.secondary};${mid2}--accent: ${theme.accent};`
    );
    return result;
  }

  // Fallback: replace individual occurrences
  result = result.replace(/--primary\s*:\s*#[0-9a-fA-F]{3,6}/g, `--primary: ${theme.primary}`);
  result = result.replace(/--secondary\s*:\s*#[0-9a-fA-F]{3,6}/g, `--secondary: ${theme.secondary}`);
  result = result.replace(/--accent\s*:\s*#[0-9a-fA-F]{3,6}/g, `--accent: ${theme.accent}`);

  return result;
}

// Injects the animation snippet at the comment marker
function injectAnimation(html: string, animationType: string, emoji: string): string {
  const snippet = ANIMATION_SNIPPETS[animationType];
  if (!snippet) return html;

  const marker = '<!-- CUSTOM ANIMATION INJECTION POINT -->';
  if (!html.includes(marker)) {
    // If no marker, inject before </body>
    return html.replace('</body>', `${snippet.css(emoji)}\n</body>`);
  }
  return html.replace(marker, snippet.css(emoji));
}

// Patches the three hardcoded '?' literals in the memory game JS to use
// lessonData.cardBackSymbol so unflipped cards show the lesson's emoji instead.
function patchCardBackSymbol(html: string): string {
  // Initial render: cardDiv.textContent = '?';
  let result = html.replace(
    /cardDiv\.textContent\s*=\s*'[?]';/g,
    "cardDiv.textContent = lessonData.cardBackSymbol || '?';"
  );
  // Reset on mismatch: card1.textContent = '?'; card2.textContent = '?';
  result = result.replace(
    /card1\.textContent\s*=\s*'[?]';/g,
    "card1.textContent = lessonData.cardBackSymbol || '?';"
  );
  result = result.replace(
    /card2\.textContent\s*=\s*'[?]';/g,
    "card2.textContent = lessonData.cardBackSymbol || '?';"
  );
  return result;
}

// Updates <title>, [TOPIC] placeholders, and fixes the header emoji JS line.
// The template's initializeLesson() uses a literal `[EMOJI]` string instead of reading
// lessonData.headerEmojiLeft/Right. We patch that JS line so the emojis actually render.
function updateTitle(html: string, title: string): string {
  let result = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
  result = result.replace(/\[TOPIC\]/g, title);
  // Fix header emoji: template JS literally writes `[EMOJI] ${lessonData.title} [EMOJI]`
  // Replace with the correct lessonData field reads
  result = result.replace(
    /`\[EMOJI\] \$\{lessonData\.title\} \[EMOJI\]`/g,
    '`${lessonData.headerEmojiLeft} ${lessonData.title} ${lessonData.headerEmojiRight}`'
  );
  return result;
}

// ── Public API ─────────────────────────────────────────────────────────────

export function generateWorkbook(templateHtml: string, data: WorkbookFormData): string {
  const newLessonData = buildLessonDataForWorkbook(data);
  let result = replaceLessonData(templateHtml, newLessonData);
  result = injectTheme(result, data.theme);
  result = updateTitle(result, data.title);
  result = patchCardBackSymbol(result);
  return result;
}

export function generatePhonicsWorkbook(templateHtml: string, data: PhonicsFormData): string {
  const newLessonData = buildLessonDataForPhonics(data);
  let result = replaceLessonData(templateHtml, newLessonData);
  result = injectTheme(result, data.theme);
  result = updateTitle(result, data.title);
  result = patchCardBackSymbol(result);
  return result;
}

export function generateSongWorksheet(templateHtml: string, data: SongWorksheetFormData): string {
  const newLessonData = buildLessonDataForSong(data);
  let result = replaceLessonData(templateHtml, newLessonData);
  result = injectTheme(result, data.theme);
  result = injectAnimation(result, data.animationType, data.animationEmoji);
  result = updateTitle(result, data.songTitle);
  return result;
}

export function downloadHtml(html: string, filename: string): void {
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
