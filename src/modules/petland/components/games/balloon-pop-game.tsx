'use client';

import { useState, useEffect } from 'react';
import type { Vocabulary, GameResult } from '@/modules/petland/types';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import GameEndScreen from './game-end-screen';

const BALLOON_COLORS = [
  'from-pink-400 to-rose-500',
  'from-sky-400 to-blue-500',
  'from-violet-400 to-purple-500',
  'from-amber-400 to-orange-500',
];

interface BalloonPopGameProps {
  vocabulary: Vocabulary[];
  onComplete: (results: GameResult[]) => void;
}

interface Question {
  vocab: Vocabulary;
  options: Vocabulary[];
  correctIndex: number;
}

function buildQuestions(vocab: Vocabulary[]): Question[] {
  return [...vocab].sort(() => Math.random() - 0.5).map((v) => {
    const distractors = vocab.filter((w) => w.id !== v.id).sort(() => Math.random() - 0.5).slice(0, 3);
    const options = [...distractors, v].sort(() => Math.random() - 0.5);
    return { vocab: v, options, correctIndex: options.findIndex((o) => o.id === v.id) };
  });
}

export default function BalloonPopGame({ vocabulary, onComplete }: BalloonPopGameProps) {
  const [questions] = useState(() => buildQuestions(vocabulary));
  const [current, setCurrent] = useState(0);
  const [popped, setPopped] = useState<number | null>(null);
  const [results, setResults] = useState<GameResult[]>([]);
  const [done, setDone] = useState(false);

  const q = questions[current];
  const isAnswered = popped !== null;

  function handlePop(idx: number) {
    if (isAnswered) return;
    setPopped(idx);
    setResults((prev) => [...prev, { vocabId: q.vocab.id, correct: idx === q.correctIndex }]);
  }

  useEffect(() => {
    if (popped === null) return;
    const t = setTimeout(() => {
      if (current + 1 >= questions.length) setDone(true);
      else { setCurrent((c) => c + 1); setPopped(null); }
    }, 1200);
    return () => clearTimeout(t);
  }, [popped, current, questions.length]);

  if (done) return <GameEndScreen results={results} onFinish={() => onComplete(results)} />;

  const prompt = q.vocab.type === 'cloze'
    ? q.vocab.sentence.replace(q.vocab.word, '___')
    : q.vocab.sentence;

  return (
    <Card className="w-full border-2 rounded-2xl overflow-hidden">
      <CardContent className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Progress value={(current / questions.length) * 100} className="h-2 flex-1" />
          <span className="text-xs text-muted-foreground tabular-nums">{current + 1} / {questions.length}</span>
        </div>

        {/* Prompt */}
        <div className="flex flex-col items-center gap-3">
          {q.vocab.imageUrl && (
            <img src={q.vocab.imageUrl} alt="" className="w-36 h-36 object-contain rounded-2xl border-2 border-primary/20" />
          )}
          <div className="w-full rounded-2xl border-2 border-primary/20 bg-primary/5 p-4 text-center">
            <p className="text-base font-semibold text-primary">{prompt}</p>
          </div>
          <p className="text-sm font-medium text-muted-foreground">🎈 Pop the right balloon!</p>
        </div>

        {/* Balloon grid */}
        <div className="grid grid-cols-2 gap-4">
          {q.options.map((opt, idx) => {
            const isCorrect = idx === q.correctIndex;
            const isPopped = idx === popped;
            const isWrong = isAnswered && isPopped && !isCorrect;
            const gradient = BALLOON_COLORS[idx % BALLOON_COLORS.length];

            return (
              <button
                key={opt.id}
                onClick={() => handlePop(idx)}
                disabled={isAnswered}
                className={cn(
                  'relative flex flex-col items-center gap-0 transition-all duration-200 cursor-pointer disabled:cursor-default',
                  !isAnswered && 'hover:scale-110 active:scale-95',
                  isPopped && isCorrect && 'scale-125 opacity-0',
                  isWrong && 'animate-bounce',
                  isAnswered && !isPopped && !isCorrect && 'opacity-40',
                  isAnswered && isCorrect && !isPopped && 'scale-105',
                )}
              >
                {/* Balloon body */}
                <div className={cn(
                  'w-24 h-28 rounded-full flex items-center justify-center text-white font-bold text-sm text-center px-3 shadow-lg bg-gradient-to-b',
                  gradient,
                  isAnswered && isCorrect && !isPopped && 'ring-4 ring-green-400 ring-offset-2',
                )}>
                  {opt.word}
                </div>
                {/* String */}
                <div className="w-0.5 h-6 bg-gray-400" />
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
