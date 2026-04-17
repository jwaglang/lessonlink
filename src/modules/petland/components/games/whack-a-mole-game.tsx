'use client';

import { useState, useEffect } from 'react';
import type { Vocabulary, GameResult } from '@/modules/petland/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import GameEndScreen from './game-end-screen';

const TIME_PER_QUESTION = 4;

interface WhackAMoleGameProps {
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

export default function WhackAMoleGame({ vocabulary, onComplete }: WhackAMoleGameProps) {
  const [questions] = useState(() => buildQuestions(vocabulary));
  const [current, setCurrent] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION);
  const [selected, setSelected] = useState<number | null>(null);
  const [results, setResults] = useState<GameResult[]>([]);
  const [done, setDone] = useState(false);

  const q = questions[current];
  // -1 means timed out without answer
  const isAnswered = selected !== null;

  useEffect(() => {
    if (isAnswered) return;
    if (timeLeft <= 0) {
      setSelected(-1);
      setResults((prev) => [...prev, { vocabId: q.vocab.id, correct: false }]);
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, isAnswered, q.vocab.id]);

  useEffect(() => {
    if (selected === null) return;
    const t = setTimeout(() => {
      if (current + 1 >= questions.length) setDone(true);
      else { setCurrent((c) => c + 1); setSelected(null); setTimeLeft(TIME_PER_QUESTION); }
    }, 1000);
    return () => clearTimeout(t);
  }, [selected, current, questions.length]);

  function handleSelect(idx: number) {
    if (isAnswered) return;
    setSelected(idx);
    setResults((prev) => [...prev, { vocabId: q.vocab.id, correct: idx === q.correctIndex }]);
  }

  if (done) return <GameEndScreen results={results} onFinish={() => onComplete(results)} />;

  return (
    <Card className="w-full border-2 rounded-2xl overflow-hidden">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Progress value={(current / questions.length) * 100} className="h-2 flex-1" />
          <span className="text-xs text-muted-foreground tabular-nums">{current + 1} / {questions.length}</span>
        </div>

        {/* Countdown bar */}
        <div className="flex items-center gap-2">
          <Progress
            value={(timeLeft / TIME_PER_QUESTION) * 100}
            className={cn('h-3 flex-1 transition-all', timeLeft <= 1 ? '[&>div]:bg-red-500' : '[&>div]:bg-orange-400')}
          />
          <span className={cn('text-sm font-bold tabular-nums w-6 text-right', timeLeft <= 1 ? 'text-red-500' : 'text-orange-500')}>
            {timeLeft}s
          </span>
        </div>

        {/* Prompt */}
        <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/60 p-4 text-center">
          {q.vocab.imageUrl
            ? <img src={q.vocab.imageUrl} alt="" className="w-28 h-28 object-contain mx-auto rounded-xl" />
            : <p className="text-lg font-bold text-amber-800">
                {q.vocab.type === 'cloze'
                  ? q.vocab.sentence.replace(q.vocab.word, '___')
                  : q.vocab.sentence}
              </p>
          }
          <p className="text-xs text-amber-600 mt-2 font-semibold">🔨 Whack the right word!</p>
        </div>

        {/* Mole grid */}
        <div className="grid grid-cols-2 gap-3">
          {q.options.map((opt, idx) => {
            const isCorrect = idx === q.correctIndex;
            const isSelected = idx === selected;
            const timedOut = selected === -1;
            return (
              <Button
                key={opt.id}
                onClick={() => handleSelect(idx)}
                disabled={isAnswered}
                className={cn(
                  'h-16 rounded-2xl text-sm font-bold border-2 transition-all',
                  !isAnswered && 'bg-white border-amber-300 text-amber-700 hover:bg-amber-50 hover:scale-105',
                  isAnswered && isCorrect && 'bg-green-500 border-green-500 text-white',
                  isAnswered && isSelected && !isCorrect && 'bg-red-400 border-red-400 text-white',
                  isAnswered && !isSelected && !isCorrect && !timedOut && 'bg-white border-gray-200 text-gray-300',
                  timedOut && isCorrect && 'bg-green-200 border-green-400 text-green-700',
                  timedOut && !isCorrect && 'bg-white border-gray-200 text-gray-300',
                )}
              >
                {opt.word}
              </Button>
            );
          })}
        </div>

        {selected === -1 && (
          <p className="text-center text-sm text-red-500 font-medium">
            ⏰ Time&apos;s up! The answer was: <strong>{q.vocab.word}</strong>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
