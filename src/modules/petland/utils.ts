import type { Dorks, GameType, Vocabulary } from './types';

export function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const COPPER_PER_SILVER = 10;
const SILVER_PER_GOLD = 10;

export function dorksToCopper(dorks: Dorks): number {
  if (!dorks) return 0;
  return ((dorks.gold || 0) * SILVER_PER_GOLD + (dorks.silver || 0)) * COPPER_PER_SILVER + (dorks.copper || 0);
}

export function copperToDorks(totalCopper: number): Dorks {
  let remaining = Math.floor(totalCopper);
  const gold = Math.floor(remaining / (SILVER_PER_GOLD * COPPER_PER_SILVER));
  remaining %= SILVER_PER_GOLD * COPPER_PER_SILVER;
  const silver = Math.floor(remaining / COPPER_PER_SILVER);
  remaining %= COPPER_PER_SILVER;
  return { gold, silver, copper: remaining };
}

export function addDorks(current: Dorks, copperToAdd: number): Dorks {
  return copperToDorks(dorksToCopper(current) + copperToAdd);
}

export function subtractDorks(current: Dorks, copperToSubtract: number): Dorks {
  return copperToDorks(Math.max(0, dorksToCopper(current) - copperToSubtract));
}

export function convertXpToDorks(xp: number): number {
  return xp;
}

// XP awarded per vocab word
export const XP_PER_MATCH = 5;   // Memory Match — one matched pair
export const XP_PER_FLASHCARD = 2; // Flashcard review — one self-assessed word

// Leitner box review intervals in days (index = srsLevel 1–5)
export const LEITNER_INTERVALS: Record<number, number> = {
  1: 1,
  2: 2,
  3: 4,
  4: 7,
  5: 14,
};

// Returns true if the word is due for review today
export function isWordDue(word: Vocabulary, today: string): boolean {
  if (!word.lastReviewDate) return true; // never reviewed — always due
  const level = Math.min(Math.max(word.srsLevel || 1, 1), 5);
  const interval = LEITNER_INTERVALS[level];
  const due = new Date(word.lastReviewDate);
  due.setDate(due.getDate() + interval);
  return new Date(today) >= due;
}

// Minimum vocabulary words required to run each game type
export const GAME_MIN_WORDS: Record<GameType, number> = {
  'memory-match':   4,
  'quiz':           4,
  'whack-a-mole':   3,
  'match-up':       3,
  'true-false':     2,
  'balloon-pop':    3,
  'missing-letter': 1,
  'anagram':        1,
};

// Games where correct/incorrect is meaningful and updates srsLevel.
// match-up always resolves correctly (you keep trying until matched), so it's recognition-only.
// memory-match is also recognition-only.
export const RECALL_GAMES: GameType[] = ['quiz', 'true-false', 'whack-a-mole', 'missing-letter', 'anagram', 'balloon-pop'];

// Randomly selects an eligible game based on the available vocabulary pool size
export function selectGame(vocab: Vocabulary[]): GameType {
  const eligible = (Object.keys(GAME_MIN_WORDS) as GameType[]).filter(
    (g) => vocab.length >= GAME_MIN_WORDS[g]
  );
  return eligible[Math.floor(Math.random() * eligible.length)];
}

// Calculates HP lost since lastHpUpdate (10 HP per missed 24h interval)
export function calculateHpDecay(
  lastHpUpdate: string,
  currentHp: number
): { newHp: number; missedIntervals: number } {
  const lastUpdate = new Date(lastHpUpdate).getTime();
  const now = Date.now();
  const missedIntervals = Math.floor((now - lastUpdate) / (24 * 60 * 60 * 1000));
  const newHp = Math.max(0, currentHp - missedIntervals * 10);
  return { newHp, missedIntervals };
}
