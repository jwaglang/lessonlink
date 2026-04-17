'use client';

import type { GameType, GameResult, Vocabulary } from '@/modules/petland/types';
import QuizGame from './quiz-game';
import TrueFalseGame from './true-false-game';
import WhackAMoleGame from './whack-a-mole-game';
import MatchUpGame from './match-up-game';
import MissingLetterGame from './missing-letter-game';
import AnagramGame from './anagram-game';
import BalloonPopGame from './balloon-pop-game';

interface GameRouterProps {
  gameType: GameType;
  vocabulary: Vocabulary[];
  onComplete: (results: GameResult[]) => void;
  // MemoryGame lives in the parent file — passed in to avoid a circular import
  MemoryGameComponent: React.ComponentType<{
    vocabulary: Vocabulary[];
    onGameComplete: (vocabIds: string[]) => void;
  }>;
}

export default function GameRouter({ gameType, vocabulary, onComplete, MemoryGameComponent }: GameRouterProps) {
  const handleMemoryComplete = (vocabIds: string[]) =>
    onComplete(vocabIds.map((id) => ({ vocabId: id, correct: true })));

  switch (gameType) {
    case 'memory-match':
      return <MemoryGameComponent vocabulary={vocabulary} onGameComplete={handleMemoryComplete} />;
    case 'quiz':
      return <QuizGame vocabulary={vocabulary} onComplete={onComplete} />;
    case 'true-false':
      return <TrueFalseGame vocabulary={vocabulary} onComplete={onComplete} />;
    case 'whack-a-mole':
      return <WhackAMoleGame vocabulary={vocabulary} onComplete={onComplete} />;
    case 'match-up':
      return <MatchUpGame vocabulary={vocabulary} onComplete={onComplete} />;
    case 'missing-letter':
      return <MissingLetterGame vocabulary={vocabulary} onComplete={onComplete} />;
    case 'anagram':
      return <AnagramGame vocabulary={vocabulary} onComplete={onComplete} />;
    case 'balloon-pop':
      return <BalloonPopGame vocabulary={vocabulary} onComplete={onComplete} />;
  }
}
