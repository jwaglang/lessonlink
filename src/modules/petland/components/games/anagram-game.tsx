'use client';

import { useState, useEffect } from 'react';
import type { Vocabulary, GameResult } from '@/modules/petland/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import GameEndScreen from './game-end-screen';

interface AnagramGameProps {
  vocabulary: Vocabulary[];
  onComplete: (results: GameResult[]) => void;
}

interface Tile {
  id: string;       // unique per tile (letter + index)
  letter: string;
  placed: boolean;
}

function scramble(word: string): Tile[] {
  const letters = word.toLowerCase().split('');
  // Keep shuffling until the order differs from the original
  let shuffled = [...letters];
  let attempts = 0;
  while (shuffled.join('') === letters.join('') && attempts < 20) {
    shuffled = shuffled.sort(() => Math.random() - 0.5);
    attempts++;
  }
  return shuffled.map((l, i) => ({ id: `${l}-${i}`, letter: l, placed: false }));
}

export default function AnagramGame({ vocabulary, onComplete }: AnagramGameProps) {
  const [words] = useState(() => [...vocabulary].sort(() => Math.random() - 0.5));
  const [current, setCurrent] = useState(0);
  const [tiles, setTiles] = useState<Tile[]>(() => scramble(words[0].word));
  const [answer, setAnswer] = useState<string[]>([]);
  const [status, setStatus] = useState<'playing' | 'correct' | 'wrong'>('playing');
  const [results, setResults] = useState<GameResult[]>([]);
  const [done, setDone] = useState(false);

  const vocab = words[current];
  const target = vocab.word.toLowerCase();
  const remaining = tiles.filter((t) => !t.placed);

  // Auto-check when all letters are placed
  useEffect(() => {
    if (answer.length !== target.length || status !== 'playing') return;
    const correct = answer.join('') === target;
    setStatus(correct ? 'correct' : 'wrong');
    setResults((prev) => [...prev, { vocabId: vocab.id, correct }]);
  }, [answer, target, status, vocab.id]);

  // Auto-advance after result
  useEffect(() => {
    if (status === 'playing') return;
    const t = setTimeout(() => {
      const next = current + 1;
      if (next >= words.length) {
        setDone(true);
      } else {
        setCurrent(next);
        setTiles(scramble(words[next].word));
        setAnswer([]);
        setStatus('playing');
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [status, current, words]);

  function placeTile(tile: Tile) {
    if (status !== 'playing' || tile.placed) return;
    setTiles((prev) => prev.map((t) => (t.id === tile.id ? { ...t, placed: true } : t)));
    setAnswer((prev) => [...prev, tile.letter]);
  }

  function removeLast() {
    if (status !== 'playing' || answer.length === 0) return;
    const lastPlaced = [...tiles].reverse().find((t) => t.placed);
    if (!lastPlaced) return;
    setTiles((prev) => {
      const idx = [...prev].reverse().findIndex((t) => t.id === lastPlaced.id);
      const realIdx = prev.length - 1 - idx;
      return prev.map((t, i) => (i === realIdx ? { ...t, placed: false } : t));
    });
    setAnswer((prev) => prev.slice(0, -1));
  }

  function reset() {
    setTiles(scramble(vocab.word));
    setAnswer([]);
    setStatus('playing');
  }

  if (done) return <GameEndScreen results={results} onFinish={() => onComplete(results)} />;

  return (
    <Card className="w-full border-2 rounded-2xl overflow-hidden">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-center gap-3">
          <Progress value={(current / words.length) * 100} className="h-2 flex-1" />
          <span className="text-xs text-muted-foreground tabular-nums">{current + 1} / {words.length}</span>
        </div>

        {vocab.imageUrl && (
          <div className="flex justify-center">
            <img src={vocab.imageUrl} alt="" className="w-40 h-40 object-contain rounded-2xl border-2 border-primary/20" />
          </div>
        )}

        <p className="text-center text-sm font-medium text-muted-foreground">Unscramble the letters to spell the word</p>

        {/* Answer slots */}
        <div className="flex items-end justify-center gap-1.5 min-h-[56px]">
          {Array.from({ length: target.length }).map((_, i) => {
            const letter = answer[i];
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className={cn(
                  'text-2xl font-bold w-10 h-10 flex items-center justify-center rounded-lg transition-all',
                  letter && status === 'playing' && 'bg-indigo-100 text-indigo-700',
                  status === 'correct' && letter && 'bg-green-100 text-green-700',
                  status === 'wrong' && letter && 'bg-red-100 text-red-600',
                  !letter && 'text-transparent',
                )}>
                  {letter ?? '-'}
                </span>
                <div className={cn('h-1 w-9 rounded-full', letter ? 'bg-indigo-400' : 'bg-gray-300')} />
              </div>
            );
          })}
        </div>

        {status === 'wrong' && (
          <p className="text-center text-sm text-red-500 font-medium">
            Not quite — the word is <strong>{target}</strong>
          </p>
        )}

        {/* Scrambled tile bank */}
        <div className="flex flex-wrap justify-center gap-2 min-h-[52px]">
          {remaining.map((tile) => (
            <Button
              key={tile.id}
              onClick={() => placeTile(tile)}
              disabled={status !== 'playing'}
              className="w-12 h-12 rounded-xl text-xl font-bold border-2 bg-white border-indigo-300 text-indigo-700 hover:bg-indigo-50 hover:scale-110 transition-all uppercase"
            >
              {tile.letter}
            </Button>
          ))}
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={removeLast}
            disabled={answer.length === 0 || status !== 'playing'}
            className="rounded-xl border-2 border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            ← Undo
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={reset}
            disabled={status !== 'playing'}
            className="rounded-xl border-2 border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
