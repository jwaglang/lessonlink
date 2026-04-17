'use client';

import { useState } from 'react';
import type { Vocabulary, GameResult } from '@/modules/petland/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import GameEndScreen from './game-end-screen';

interface MatchUpGameProps {
  vocabulary: Vocabulary[];
  onComplete: (results: GameResult[]) => void;
}

export default function MatchUpGame({ vocabulary, onComplete }: MatchUpGameProps) {
  const [words] = useState(() => [...vocabulary].sort(() => Math.random() - 0.5));
  const [definitions] = useState(() => [...vocabulary].sort(() => Math.random() - 0.5));
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrongFlash, setWrongFlash] = useState<string | null>(null);

  const allDone = matched.size === vocabulary.length;
  const results: GameResult[] = vocabulary.map((v) => ({ vocabId: v.id, correct: true }));

  function handleWordClick(id: string) {
    if (matched.has(id)) return;
    setSelectedWord((prev) => (prev === id ? null : id));
  }

  function handleDefClick(id: string) {
    if (!selectedWord || matched.has(id)) return;
    if (selectedWord === id) {
      setMatched((prev) => new Set([...prev, id]));
      setSelectedWord(null);
    } else {
      setWrongFlash(id);
      setTimeout(() => setWrongFlash(null), 500);
      setSelectedWord(null);
    }
  }

  if (allDone) return <GameEndScreen results={results} onFinish={() => onComplete(results)} showScore={false} />;

  return (
    <Card className="w-full border-2 rounded-2xl overflow-hidden">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-sm font-semibold text-muted-foreground text-center">
          Tap a word, then tap its matching sentence
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 gap-3">
          {/* Words column */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-center text-muted-foreground mb-1">Words</p>
            {words.map((v) => {
              const isMatched = matched.has(v.id);
              const isSelected = selectedWord === v.id;
              return (
                <Button
                  key={v.id}
                  onClick={() => handleWordClick(v.id)}
                  disabled={isMatched}
                  className={cn(
                    'h-12 rounded-xl text-sm font-bold border-2 transition-all',
                    isMatched && 'bg-green-100 border-green-300 text-green-600 opacity-50 pointer-events-none',
                    isSelected && 'bg-indigo-500 border-indigo-500 text-white scale-105',
                    !isSelected && !isMatched && 'bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50',
                  )}
                >
                  {v.word}
                </Button>
              );
            })}
          </div>

          {/* Definitions column */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-center text-muted-foreground mb-1">Sentences</p>
            {definitions.map((v) => {
              const isMatched = matched.has(v.id);
              const isWrong = wrongFlash === v.id;
              const display = v.type === 'cloze' ? v.sentence.replace(v.word, '___') : v.sentence;
              return (
                <Button
                  key={v.id}
                  onClick={() => handleDefClick(v.id)}
                  disabled={isMatched || !selectedWord}
                  className={cn(
                    'h-12 rounded-xl text-xs border-2 transition-all text-left px-3 leading-tight whitespace-normal',
                    isMatched && 'bg-green-100 border-green-300 text-green-600 opacity-50 pointer-events-none',
                    isWrong && 'bg-red-100 border-red-400 text-red-700',
                    !isWrong && !isMatched && selectedWord && 'bg-white border-purple-300 text-purple-700 hover:bg-purple-50',
                    !isWrong && !isMatched && !selectedWord && 'bg-white border-gray-200 text-gray-400',
                  )}
                >
                  {display}
                </Button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
