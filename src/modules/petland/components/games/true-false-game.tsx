'use client';

import { useState, useEffect } from 'react';
import type { Vocabulary, GameResult } from '@/modules/petland/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import GameEndScreen from './game-end-screen';

interface TrueFalseGameProps {
  vocabulary: Vocabulary[];
  onComplete: (results: GameResult[]) => void;
}

interface TFQuestion {
  vocab: Vocabulary;
  displaySentence: string;
  isTrue: boolean;
}

function buildQuestions(vocab: Vocabulary[]): TFQuestion[] {
  return [...vocab].sort(() => Math.random() - 0.5).map((v) => {
    const useTrue = vocab.length < 2 || Math.random() > 0.5;
    if (useTrue) return { vocab: v, displaySentence: v.sentence, isTrue: true };
    const other = vocab.filter((w) => w.id !== v.id)[Math.floor(Math.random() * (vocab.length - 1))];
    return { vocab: v, displaySentence: other.sentence, isTrue: false };
  });
}

export default function TrueFalseGame({ vocabulary, onComplete }: TrueFalseGameProps) {
  const [questions] = useState(() => buildQuestions(vocabulary));
  const [current, setCurrent] = useState(0);
  const [answer, setAnswer] = useState<boolean | null>(null);
  const [results, setResults] = useState<GameResult[]>([]);
  const [done, setDone] = useState(false);

  const q = questions[current];
  const isAnswered = answer !== null;

  function handleAnswer(val: boolean) {
    if (isAnswered) return;
    setAnswer(val);
    setResults((prev) => [...prev, { vocabId: q.vocab.id, correct: val === q.isTrue }]);
  }

  useEffect(() => {
    if (answer === null) return;
    const t = setTimeout(() => {
      if (current + 1 >= questions.length) setDone(true);
      else { setCurrent((c) => c + 1); setAnswer(null); }
    }, 1300);
    return () => clearTimeout(t);
  }, [answer, current, questions.length]);

  if (done) return <GameEndScreen results={results} onFinish={() => onComplete(results)} />;

  const wasCorrect = isAnswered && answer === q.isTrue;

  return (
    <Card className="w-full border-2 rounded-2xl overflow-hidden">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-center gap-3">
          <Progress value={(current / questions.length) * 100} className="h-2 flex-1" />
          <span className="text-xs text-muted-foreground tabular-nums">{current + 1} / {questions.length}</span>
        </div>

        <div className="flex flex-col items-center gap-4">
          {q.vocab.imageUrl && (
            <img src={q.vocab.imageUrl} alt="" className="w-32 h-32 object-contain rounded-2xl border-2 border-primary/20" />
          )}
          <div className="w-full rounded-2xl border-2 border-indigo-200 bg-indigo-50/40 p-5 text-center space-y-2">
            <p className="text-xl font-bold text-indigo-700">{q.vocab.word}</p>
            <p className="text-sm text-muted-foreground italic">"{q.displaySentence}"</p>
          </div>
          <p className="text-sm font-medium text-muted-foreground">Is this sentence correct for this word?</p>
        </div>

        {isAnswered && (
          <div className={cn(
            'rounded-2xl p-3 text-center text-sm font-semibold',
            wasCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          )}>
            {wasCorrect
              ? '✓ Correct!'
              : `✗ The sentence ${q.isTrue ? 'was' : 'was not'} correct for "${q.vocab.word}"`}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {([true, false] as const).map((val) => {
            const isSelected = answer === val;
            const isRight = val === q.isTrue;
            return (
              <Button
                key={String(val)}
                onClick={() => handleAnswer(val)}
                disabled={isAnswered}
                className={cn(
                  'h-14 rounded-2xl text-base font-bold border-2 transition-all',
                  !isAnswered && val && 'bg-white border-green-300 text-green-700 hover:bg-green-50',
                  !isAnswered && !val && 'bg-white border-red-300 text-red-600 hover:bg-red-50',
                  isAnswered && isSelected && isRight && 'bg-green-500 border-green-500 text-white',
                  isAnswered && isSelected && !isRight && 'bg-red-400 border-red-400 text-white',
                  isAnswered && !isSelected && 'bg-white border-gray-200 text-gray-300',
                )}
              >
                {val ? '✓ True' : '✗ False'}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
