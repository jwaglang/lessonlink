'use client';

import { useState, useEffect } from 'react';
import type { Vocabulary, GameResult } from '@/modules/petland/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import GameEndScreen from './game-end-screen';

const ALPHABET = 'abcdefghijklmnoprstuvwy'.split('');

interface MissingLetterGameProps {
  vocabulary: Vocabulary[];
  onComplete: (results: GameResult[]) => void;
}

interface Question {
  vocab: Vocabulary;
  hiddenIndex: number;
  correctLetter: string;
  options: string[];
}

function buildQuestions(vocab: Vocabulary[]): Question[] {
  return [...vocab].sort(() => Math.random() - 0.5).map((v) => {
    const word = v.word.toLowerCase();
    // Hide a letter from the middle of the word (not first or last)
    const start = Math.max(1, 1);
    const end = Math.max(start, word.length - 2);
    const idx = start + Math.floor(Math.random() * (end - start + 1));
    const correct = word[idx] ?? word[0];
    const distractors = ALPHABET.filter((l) => l !== correct).sort(() => Math.random() - 0.5).slice(0, 3);
    const options = [...distractors, correct].sort(() => Math.random() - 0.5);
    return { vocab: v, hiddenIndex: idx, correctLetter: correct, options };
  });
}

export default function MissingLetterGame({ vocabulary, onComplete }: MissingLetterGameProps) {
  const [questions] = useState(() => buildQuestions(vocabulary));
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [results, setResults] = useState<GameResult[]>([]);
  const [done, setDone] = useState(false);

  const q = questions[current];
  const isAnswered = selected !== null;
  const word = q.vocab.word.toLowerCase();

  function handleSelect(letter: string) {
    if (isAnswered) return;
    setSelected(letter);
    setResults((prev) => [...prev, { vocabId: q.vocab.id, correct: letter === q.correctLetter }]);
  }

  useEffect(() => {
    if (!selected) return;
    const t = setTimeout(() => {
      if (current + 1 >= questions.length) setDone(true);
      else { setCurrent((c) => c + 1); setSelected(null); }
    }, 1200);
    return () => clearTimeout(t);
  }, [selected, current, questions.length]);

  if (done) return <GameEndScreen results={results} onFinish={() => onComplete(results)} />;

  return (
    <Card className="w-full border-2 rounded-2xl overflow-hidden">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-center gap-3">
          <Progress value={(current / questions.length) * 100} className="h-2 flex-1" />
          <span className="text-xs text-muted-foreground tabular-nums">{current + 1} / {questions.length}</span>
        </div>

        {/* Image */}
        {q.vocab.imageUrl && (
          <div className="flex justify-center">
            <img src={q.vocab.imageUrl} alt="" className="w-40 h-40 object-contain rounded-2xl border-2 border-primary/20" />
          </div>
        )}

        <p className="text-center text-sm font-medium text-muted-foreground">Fill in the missing letter</p>

        {/* Word display */}
        <div className="flex items-end justify-center gap-1.5 py-2">
          {word.split('').map((letter, i) => {
            const isHidden = i === q.hiddenIndex;
            const reveal = isAnswered && isHidden;
            const isCorrect = selected === q.correctLetter;
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className={cn(
                  'text-3xl font-bold w-10 h-10 flex items-center justify-center',
                  isHidden && !reveal && 'text-transparent',
                  reveal && isCorrect && 'text-green-600',
                  reveal && !isCorrect && 'text-red-500',
                  !isHidden && 'text-slate-700',
                )}>
                  {isHidden ? (reveal ? (selected ?? letter) : letter) : letter}
                </span>
                <div className={cn(
                  'h-1 w-9 rounded-full',
                  isHidden ? 'bg-indigo-400' : 'bg-gray-300',
                )} />
              </div>
            );
          })}
        </div>

        {/* Letter options */}
        <div className="grid grid-cols-4 gap-2">
          {q.options.map((letter) => {
            const isSelected = letter === selected;
            const isCorrect = letter === q.correctLetter;
            return (
              <Button
                key={letter}
                onClick={() => handleSelect(letter)}
                disabled={isAnswered}
                className={cn(
                  'h-14 rounded-2xl text-2xl font-bold border-2 transition-all uppercase',
                  !isAnswered && 'bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-400',
                  isAnswered && isCorrect && 'bg-green-500 border-green-500 text-white',
                  isAnswered && isSelected && !isCorrect && 'bg-red-400 border-red-400 text-white',
                  isAnswered && !isSelected && !isCorrect && 'bg-white border-gray-200 text-gray-300',
                )}
              >
                {letter}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
