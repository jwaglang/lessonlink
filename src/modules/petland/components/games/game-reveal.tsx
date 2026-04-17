'use client';

import type { GameType } from '@/modules/petland/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface GameMeta {
  label: string;
  description: string;
  emoji: string;
}

const GAME_META: Record<GameType, GameMeta> = {
  'memory-match':   { label: 'Memory Match',    emoji: '🃏', description: 'Flip cards and match each word to its picture!' },
  'quiz':           { label: 'Quick Quiz',       emoji: '🧠', description: 'Pick the right answer for each word!' },
  'whack-a-mole':   { label: 'Whack-a-Mole',    emoji: '🔨', description: 'Tap the right word before it disappears!' },
  'match-up':       { label: 'Match Up',         emoji: '🔗', description: 'Drag each word to its correct meaning!' },
  'missing-letter': { label: 'Missing Letter',   emoji: '🔤', description: 'Fill in the blank to complete each word!' },
  'anagram':        { label: 'Anagram',          emoji: '🔀', description: 'Unscramble the letters to spell the word!' },
  'true-false':     { label: 'True or False',    emoji: '✅', description: 'Is the definition correct? You decide!' },
  'balloon-pop':    { label: 'Balloon Pop',      emoji: '🎈', description: 'Pop the balloon with the right answer!' },
};

interface GameRevealProps {
  gameType: GameType;
  onStart: () => void;
}

export default function GameReveal({ gameType, onStart }: GameRevealProps) {
  const meta = GAME_META[gameType];

  return (
    <Card className="w-full border-2 rounded-2xl overflow-hidden">
      <CardContent className="flex flex-col items-center gap-6 py-14 px-6 text-center bg-gradient-to-b from-indigo-50 to-white">
        <p className="text-sm font-semibold text-indigo-400 uppercase tracking-widest">Today's challenge</p>
        <div className="text-7xl">{meta.emoji}</div>
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-indigo-700">{meta.label}</h2>
          <p className="text-muted-foreground text-sm max-w-xs">{meta.description}</p>
        </div>
        <Button
          onClick={onStart}
          className="mt-2 px-8 h-12 rounded-2xl text-base font-bold bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-md"
        >
          Let's go! 🚀
        </Button>
      </CardContent>
    </Card>
  );
}
