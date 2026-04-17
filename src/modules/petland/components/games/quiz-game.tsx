'use client';

import { useState, useEffect } from 'react';
import type { Vocabulary, GameResult } from '@/modules/petland/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import GameEndScreen from './game-end-screen';

interface QuizGameProps {
  vocabulary: Vocabulary[];
  onComplete: (results: GameResult[]) => void;
}

interface Question {
  vocab: Vocabulary;
  options: string[];
  correctIndex: number;
}

function buildQuestions(vocab: Vocabulary[]): Question[] {
  return [...vocab].sort(() => Math.random() - 0.5).map((v) => {
    const distractors = vocab
      .filter((w) => w.id !== v.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map((w) => w.word);
    const options = [...distractors, v.word].sort(() => Math.random() - 0.5);
    return { vocab: v, options, correctIndex: options.indexOf(v.word) };
  });
}

export default function QuizGame({ vocabulary, onComplete }: QuizGameProps) {
  const [questions] = useState(() => buildQuestions(vocabulary));
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [results, setResults] = useState<GameResult[]>([]);
  const [done, setDone] = useState(false);

  const q = questions[current];
  const isAnswered = selected !== null;

  function handleSelect(idx: number) {
    if (isAnswered) return;
    setSelected(idx);
    setResults((prev) => [...prev, { vocabId: q.vocab.id, correct: idx === q.correctIndex }]);
  }

  useEffect(() => {
    if (selected === null) return;
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

        <div className="flex flex-col items-center gap-3">
          {q.vocab.imageUrl ? (
            <img src={q.vocab.imageUrl} alt="" className="w-48 h-48 object-contain rounded-2xl border-2 border-primary/20" />
          ) : (
            <div className="w-full rounded-2xl border-2 border-primary/20 bg-primary/5 p-6 text-center">
              <p className="text-xl font-bold text-primary">
                {q.vocab.type === 'cloze'
                  ? q.vocab.sentence.replace(q.vocab.word, '___')
                  : q.vocab.sentence}
              </p>
            </div>
          )}
          <p className="text-sm font-medium text-muted-foreground">
            {q.vocab.imageUrl ? 'What word matches this picture?' : 'Which word fits this sentence?'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {q.options.map((opt, idx) => {
            const isCorrect = idx === q.correctIndex;
            const isSelected = idx === selected;
            return (
              <Button
                key={idx}
                onClick={() => handleSelect(idx)}
                disabled={isAnswered}
                className={cn(
                  'h-14 rounded-2xl text-sm font-bold border-2 transition-all',
                  !isAnswered && 'bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-400',
                  isAnswered && isCorrect && 'bg-green-500 border-green-500 text-white',
                  isAnswered && isSelected && !isCorrect && 'bg-red-400 border-red-400 text-white',
                  isAnswered && !isSelected && !isCorrect && 'bg-white border-gray-200 text-gray-300',
                )}
              >
                {isAnswered && isCorrect && <CheckCircle className="mr-1.5 h-4 w-4 shrink-0" />}
                {isAnswered && isSelected && !isCorrect && <XCircle className="mr-1.5 h-4 w-4 shrink-0" />}
                {opt}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
