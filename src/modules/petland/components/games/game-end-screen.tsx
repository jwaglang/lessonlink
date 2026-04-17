'use client';

import type { GameResult } from '@/modules/petland/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface GameEndScreenProps {
  results: GameResult[];
  onFinish: () => void;
  // Recognition games always pass — skip the score display
  showScore?: boolean;
}

export default function GameEndScreen({ results, onFinish, showScore = true }: GameEndScreenProps) {
  const score = results.filter((r) => r.correct).length;
  const total = results.length;
  const pct = total > 0 ? Math.round((score / total) * 100) : 100;
  const emoji = !showScore || pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '💪';
  const message = !showScore || pct >= 80 ? 'Amazing work!' : pct >= 50 ? 'Good effort!' : 'Keep practising!';

  return (
    <Card className="w-full border-2 rounded-2xl overflow-hidden">
      <CardContent className="flex flex-col items-center gap-6 py-14 px-6 text-center bg-gradient-to-b from-green-50 to-white">
        <div className="text-7xl">{emoji}</div>
        <div className="space-y-1">
          {showScore && (
            <h2 className="text-3xl font-bold text-green-700">{score}/{total} correct</h2>
          )}
          <p className="text-muted-foreground text-sm">{message}</p>
        </div>
        <Button
          onClick={onFinish}
          className="px-8 h-12 rounded-2xl text-base font-bold bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-md"
        >
          Finish! ✓
        </Button>
      </CardContent>
    </Card>
  );
}
