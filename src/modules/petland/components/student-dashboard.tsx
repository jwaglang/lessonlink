'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import type { PetlandProfile, Vocabulary, PetShopItem, GeneratedComposite, GrammarCard, PhonicsCard, GameType, GameResult } from '../types';
import { formatDorks, getDorkDenominations } from '../types';
import { PlaceHolderImages } from '../placeholder-images';
import { mockShopItems, mockBrochures } from '../data';
import { getTodayDateString, calculateHpDecay, isWordDue, XP_PER_MATCH, XP_PER_FLASHCARD, selectGame, RECALL_GAMES } from '../utils';
import { FeedbackOverlay } from './feedback-overlay';
import { HungerAlerts } from './hunger-alerts';
import { CashInStation } from './cash-in-station';
import { generatePetImage, editPetImage, composeAccessoryOnPet } from '../ai/generate-pet-image-flow';
import { generateTopicStamp } from '../ai/generate-topic-stamp';

const FAT_PROMPT =
  'Modify this creature to be extremely chubby and round, belly bulging out, gobbling junk food, looking embarrassed and sheepish at getting caught. Keep the exact same creature — same colors, features, species — just make it fat.';

// Collection name to icon mapping
function getCollectionIcon(iconType: string = 'default') {
  // Name-based fallbacks for collections without stored iconType
  const nameBasedDefaults: Record<string, string> = {
    'Oh my stars!': 'sparkles',
    'Letting off some steam!': 'wind',
    'Magic and Spells': 'wand',
  };

  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    'sparkles': Sparkles,
    'wind': Wind,
    'wand': Wand2,
    'rocket': Rocket,
    'flame': Flame,
    'droplet': Droplet,
    'zap': Zap,
    'star': Star,
    'heart': Heart,
    'leaf': Leaf,
    'tree': Trees,
    'bug': Bug,
    'bird': Bird,
    'default': Package,
  };

  const normalizedType = iconType.toLowerCase();
  return iconMap[normalizedType] || Package;
}
const THIN_PROMPT =
  'Modify this creature to be noticeably skinny and underfed, ribs showing, looking hungry and sad. Keep the exact same creature — same colors, features, species — just make it thin.';
const STARVING_PROMPT =
  'Modify this creature to be extremely emaciated, skeletal, desperate and pleading, near death. Keep the exact same creature — same colors, features, species — just make it starving.';
import { db, storage } from '@/lib/firebase';
import {
  doc,
  collection,
  onSnapshot,
  updateDoc,
  setDoc,
  writeBatch,
  getDocs,
  deleteField,
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { getPetShopItems, decrementPetShopItemStock, getGrammarCards, getPhonicsCards } from '@/lib/firestore';
import { UnifiedFlashcardReview, type ReviewCard, type ReviewResult } from './unified-flashcard-review';
import GameReveal from './games/game-reveal';
import GameRouter from './games/game-router';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Heart,
  Sparkles,
  Coins,
  Leaf,
  Trees,
  Bug,
  Bird,
  ShoppingBag,
  Map as MapIcon,
  Gamepad2,
  BookUser,
  Wand2,
  Loader2,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Rocket,
  Star,
  Flame,
  Wind,
  Droplet,
  Zap,
  Package,
  Circle,
  Settings2,
  RotateCcw,
  RefreshCw,
  Plus,
  Minus,
} from 'lucide-react';

// --- STORAGE HELPER ---

async function uploadBase64ToStorage(base64Data: string, path: string): Promise<string> {
  const storageRef = ref(storage, path);
  const snapshot = await uploadString(storageRef, base64Data, 'data_url');
  return getDownloadURL(snapshot.ref);
}

// --- MEMORY GAME ---

function MemoryGame({
  vocabulary,
  onGameComplete,
}: {
  vocabulary: Vocabulary[];
  onGameComplete: (vocabIds: string[]) => void;
}) {
  const [cards, setCards] = useState<
    { id: string; content: string; type: 'word' | 'target'; pairId: string; imageUrl?: string }[]
  >([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [solved, setSolved] = useState<string[]>([]);
  const [gameWon, setGameWon] = useState(false);
  const [round, setRound] = useState(1); // Round 1 = learning, Round 2+ = gameplay
  const [timeLeft, setTimeLeft] = useState(60);
  const [timerActive, setTimerActive] = useState(false);
  const [learningCardFlipped, setLearningCardFlipped] = useState<number | null>(null);

  const resetGame = useCallback(() => {
    if (vocabulary.length < 4) {
      setCards([]);
      return;
    }
    const gameVocab = [...vocabulary];
    
    if (round === 1) {
      // Learning round: just image -> word pairs, not shuffled yet
      const learningCards = gameVocab.map((v) => ({
        id: v.id,
        content: v.word,
        imageUrl: v.imageUrl,
        type: 'learning' as const,
        pairId: v.id,
      }));
      setCards(learningCards);
      setFlipped([]);
      setLearningCardFlipped(null);
      setTimeLeft(60);
      setTimerActive(false);
    } else {
      // Gameplay round: image/word matching
      const gameCards = gameVocab.flatMap((v) => [
        { id: `${v.id}-w`, content: v.word, type: 'word' as const, pairId: v.id },
        {
          id: `${v.id}-t`,
          content: v.type === 'cloze' ? (v.sentence?.replace(v.word, '___') || '???') : v.sentence,
          imageUrl: v.imageUrl,
          type: 'target' as const,
          pairId: v.id,
        },
      ]);
      setCards(gameCards.sort(() => Math.random() - 0.5));
      setFlipped([]);
      setSolved([]);
    }
    setGameWon(false);
  }, [vocabulary, round]);

  useEffect(() => {
    resetGame();
  }, [resetGame]);

  // Timer for learning round
  useEffect(() => {
    if (round === 1 && timerActive && timeLeft > 0) {
      const interval = setInterval(() => {
        setTimeLeft((t) => t - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else if (round === 1 && timeLeft === 0 && timerActive) {
      setTimerActive(false);
      playBellSound();
    }
  }, [round, timerActive, timeLeft]);

  const playBellSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = audioContext.currentTime;
      
      // Create a bell/chime sound using oscillators
      const osc1 = audioContext.createOscillator();
      const osc2 = audioContext.createOscillator();
      const gain = audioContext.createGain();
      
      osc1.frequency.value = 800; // Higher frequency
      osc2.frequency.value = 600; // Lower frequency
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(audioContext.destination);
      
      // Envelope
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
      
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.5);
      osc2.stop(now + 1.5);
    } catch (e) {
      console.log('Bell sound not available');
    }
  };

  const playClickSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = audioContext.currentTime;
      
      // Create sine wave oscillator
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      
      osc.frequency.value = 200; // Base frequency for click
      
      // Create low-pass filter
      const filter = audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 500; // Lower frequency for bass
      
      // Connect nodes
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(audioContext.destination);
      
      // Short envelope for click
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      
      osc.start(now);
      osc.stop(now + 0.1);
    } catch (e) {
      console.log('Click sound not available');
    }
  };

  const playVictorySong = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = audioContext.currentTime;
      
      // Victory song: ascending C major notes
      const notes = [
        { freq: 523.25, time: 0.0 },    // C5
        { freq: 659.25, time: 0.15 },   // E5
        { freq: 783.99, time: 0.3 },    // G5
        { freq: 1046.5, time: 0.45 },   // C6
      ];
      
      const gain = audioContext.createGain();
      gain.connect(audioContext.destination);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
      
      notes.forEach((note) => {
        const osc = audioContext.createOscillator();
        osc.frequency.value = note.freq;
        osc.connect(gain);
        osc.start(now + note.time);
        osc.stop(now + note.time + 0.14);
      });
    } catch (e) {
      console.log('Victory sound not available');
    }
  };

  useEffect(() => {
    if (round === 2 && flipped.length === 2) {
      const [first, second] = flipped;
      if (cards[first]?.pairId === cards[second]?.pairId) {
        setSolved((prev) => [...prev, cards[first].pairId]);
        setFlipped([]);
      } else {
        setTimeout(() => setFlipped([]), 1000);
      }
    }
  }, [flipped, cards, round]);

  useEffect(() => {
    if (round === 2 && cards.length > 0 && solved.length === cards.length / 2 && !gameWon) {
      playVictorySong();
      onGameComplete(solved);
      setGameWon(true);
    }
  }, [solved, cards, onGameComplete, gameWon, round]);

  const isFlipped = (index: number) => {
    if (round === 1) {
      return learningCardFlipped === index;
    }
    return flipped.includes(index) || solved.includes(cards[index]?.pairId ?? '');
  };

  if (cards.length === 0)
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Ask your teacher to add some words to your list!
        </CardContent>
      </Card>
    );

  // ===== ROUND 1: LEARNING ROUND =====
  if (round === 1) {
    const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

    return (
      <Card>
        <CardHeader>
          <CardTitle>Round 1: Memory Challenge</CardTitle>
          <CardDescription>Learn all the cards before the timer runs out!</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Chess Clock Timer */}
          <div className="flex flex-col items-center gap-4">
            <div className="bg-gradient-to-b from-primary/20 to-accent/30 border-8 border-primary rounded-lg p-6 shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between gap-4">
                {/* Clock Display */}
                <div className="flex-1 bg-secondary/40 rounded-lg p-4 text-center border-2 border-primary/40">
                  <div className="text-5xl font-mono font-bold text-primary tracking-wider">
                    {formatTime(timeLeft)}
                  </div>
                  <p className="text-xs text-primary/70 mt-2 uppercase tracking-widest font-semibold">Learning Time</p>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex gap-2">
              {!timerActive ? (
                <Button onClick={() => setTimerActive(true)} size="sm" className="min-w-24 bg-primary hover:bg-primary/80">
                  ▶ Start
                </Button>
              ) : (
                <Button onClick={() => setTimerActive(false)} variant="outline" size="sm" className="min-w-24">
                  ⏸ Pause
                </Button>
              )}
              <Button
                onClick={() => {
                  setTimeLeft(60);
                  setTimerActive(false);
                  setLearningCardFlipped(null);
                }}
                variant="outline"
                size="sm"
                className="min-w-24"
              >
                ↻ Reset
              </Button>
            </div>
          </div>

          {/* Card Grid with Flip Animation */}
          <style>{`
            .flip-container {
              perspective: 1000px;
              width: 100%;
              height: 100%;
            }
            .flip-inner {
              position: relative;
              width: 100%;
              height: 100%;
              transition: transform 0.6s;
              transform-style: preserve-3d;
            }
            .flip-inner.flipped {
              transform: rotateY(180deg);
            }
            .flip-front, .flip-back {
              backface-visibility: hidden;
              position: absolute;
              width: 100%;
              height: 100%;
              top: 0;
              left: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 0.5rem;
              border: 2px solid #7B3FF2;
              padding: 0.5rem;
              transition: all 0.3s ease;
            }
            .flip-back {
              transform: rotateY(180deg);
            }
          `}</style>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3 max-w-2xl mx-auto">
            {cards.map((card, index) => (
              <div
                key={card.id}
                className="aspect-square cursor-pointer flip-container hover:scale-105 transition-transform"
                onClick={() => {
                  playClickSound();
                  setLearningCardFlipped(learningCardFlipped === index ? null : index);
                }}
              >
                <div className={`flip-inner ${isFlipped(index) ? 'flipped' : ''}`}>
                  {/* Front - Image */}
                  <div className="flip-front bg-secondary/30 border-primary/40 shadow-lg">
                    {card.imageUrl ? (
                      <img src={card.imageUrl} className="w-full h-full object-contain" alt="vocab icon" />
                    ) : (
                      <span className="text-4xl">🖼</span>
                    )}
                  </div>

                  {/* Back - Word */}
                  <div className="flip-back bg-secondary/20 border-primary/60 shadow-xl">
                    <span className="font-headline font-bold text-base text-center leading-tight text-slate-700 px-2">
                      {card.content}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Next Round Button */}
          <div className="text-center pt-2">
            {!timerActive && timeLeft === 0 ? (
              <Button onClick={() => { playVictorySong(); setRound(2); }} size="lg" className="px-8">
                Next Round →
              </Button>
            ) : timerActive ? (
              <p className="text-sm text-muted-foreground">⏱️ Timer running... Learn the cards!</p>
            ) : timeLeft < 60 ? (
              <p className="text-sm text-muted-foreground">Ready! Click "Start" to begin the timer.</p>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm text-muted-foreground">Click "Start" to begin learning!</p>
                <p className="text-xs text-amber-600 font-semibold">⚡ Learn all the cards before the timer runs out!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // ===== ROUND 2+: MEMORY MATCH GAMEPLAY =====
  return (
    <Card>
      <CardHeader>
        <CardTitle>Round 2: Memory Match!</CardTitle>
      </CardHeader>
      <CardContent>
        <style>{`
          .flip-container {
            perspective: 1000px;
            width: 100%;
            height: 100%;
          }
          .flip-inner {
            position: relative;
            width: 100%;
            height: 100%;
            transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
            transform-style: preserve-3d;
          }
          .flip-inner.flipped {
            transform: rotateY(180deg);
          }
          .flip-front, .flip-back {
            backface-visibility: hidden;
            -webkit-backface-visibility: hidden;
            position: absolute;
            width: 100%;
            height: 100%;
            top: 0;
            left: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 0.5rem;
            border: 2px solid #7B3FF2;
            padding: 0.5rem;
          }
          .flip-back {
            transform: rotateY(180deg);
            background: white;
          }
        `}</style>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-w-2xl">
          {cards.map((card, index) => (
            <div
              key={card.id}
              className="aspect-square cursor-pointer flip-container hover:scale-105 transition-transform"
              onClick={() => !isFlipped(index) && flipped.length < 2 && setFlipped((p) => [...p, index])}
            >
              <div className={`flip-inner ${isFlipped(index) ? 'flipped' : ''}`}>
                <div className="flip-front bg-primary">
                  <img src="/Dork1.png" className="w-4/5 h-4/5 object-contain" alt="dork" />
                </div>
                <div className="flip-back">
                  {card.imageUrl ? (
                    <img src={card.imageUrl} className="w-full h-full object-contain" alt="icon" />
                  ) : (
                    <span className="font-headline font-bold text-base text-center leading-tight text-slate-700">{card.content}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        {gameWon && (
          <div className="text-center mt-6">
            <Button onClick={resetGame}>Play Again</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


// --- FLASHCARD REVIEW ---

function FlashcardReview({
  vocabulary,
  onComplete,
}: {
  vocabulary: Vocabulary[];
  onComplete: (results: { vocabId: string; knew: boolean }[]) => void;
}) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [results, setResults] = useState<{ vocabId: string; knew: boolean }[]>([]);
  const [done, setDone] = useState(false);

  const current = vocabulary[index];

  const handleAnswer = (knew: boolean) => {
    const updated = [...results, { vocabId: current.id, knew }];
    if (index + 1 >= vocabulary.length) {
      setResults(updated);
      setDone(true);
      onComplete(updated);
    } else {
      setResults(updated);
      setIndex(index + 1);
      setRevealed(false);
      setHintsUsed(0);
    }
  };

  if (vocabulary.length === 0) return null;

  if (done) {
    const knewCount = results.filter((r) => r.knew).length;
    return (
      <Card>
        <CardContent className="py-10 text-center space-y-2">
          <p className="text-2xl font-bold">Review complete!</p>
          <p className="text-muted-foreground">
            {knewCount} / {results.length} words known
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-primary">Flashcard Review</CardTitle>
          <span className="text-sm text-muted-foreground font-medium">{index + 1} / {vocabulary.length}</span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-6 py-4">
        {/* Question — sentence with blank */}
        <div className="w-full max-w-sm rounded-2xl border-2 border-primary bg-primary/5 p-8 text-center">
          <p className="text-2xl font-headline font-bold text-primary">
            {current.type === 'cloze' ? (current.sentence?.replace(current.word, '___') || current.sentence) : current.sentence}
          </p>
        </div>

        {/* Hint display + Answer/Hint buttons */}
        {!revealed ? (
          <div className="flex flex-col items-center gap-3 w-full max-w-sm">
            {hintsUsed > 0 && (
              <p className="text-xl font-headline font-bold tracking-widest text-primary">
                {current.word.split('').map((char, i) => (i < hintsUsed ? char : '_')).join(' ')}
              </p>
            )}
            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1" onClick={() => setRevealed(true)}>
                Answer
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                disabled={hintsUsed >= current.word.length}
                onClick={() => setHintsUsed((h) => h + 1)}
              >
                Hint {hintsUsed > 0 ? `(${hintsUsed}/${current.word.length})` : ''}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="w-full max-w-sm rounded-2xl border bg-muted/40 p-6 text-center space-y-2">
              {current.imageUrl && (
                <img src={current.imageUrl} className="w-16 h-16 object-contain mx-auto mb-2" alt="" />
              )}
              <p className="text-2xl font-headline font-bold">{current.word}</p>
            </div>
            <div className="flex gap-4 w-full max-w-sm">
              <Button
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold"
                onClick={() => handleAnswer(true)}
              >
                ✓ Knew it
              </Button>
              <Button
                variant="destructive"
                className="flex-1 font-bold"
                onClick={() => handleAnswer(false)}
              >
                ✗ Didn&apos;t know
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// --- HATCH PET ---

function HatchPet({ onHatch, isHatching }: { onHatch: (wish: string) => void; isHatching: boolean }) {
  const [wish, setWish] = useState('');
  return (
    <Card className="bg-primary/10 border-primary border-dashed">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-destructive" />
          <CardTitle className="text-lg">Hatch Your Pet!</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Your egg is ready to hatch. Make a wish to decide what kind of pet will be your friend!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 p-4 pt-0">
        <Label htmlFor="wish" className="text-xs font-bold">
          Make a wish!
        </Label>
        <Textarea
          id="wish"
          placeholder="e.g., fluffy with big, curious eyes and small wings..."
          value={wish}
          onChange={(e) => setWish(e.target.value)}
          className="text-sm"
        />
        <Button onClick={() => onHatch(wish)} disabled={isHatching || !wish} className="w-full">
          {isHatching ? (
            <>
              <Loader2 className="animate-spin mr-2" />
              Hatching...
            </>
          ) : (
            'Hatch Pet'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

// --- DORK ICON DISPLAY ---

function DorkIconDisplay({ copperAmount, size = 'lg' }: { copperAmount: number; size?: 'lg' | 'xl' }) {
  const dorks = getDorkDenominations(copperAmount);
  const textSize = size === 'xl' ? 'text-2xl' : 'text-lg';
  const iconSize = size === 'xl' ? 'w-6 h-6' : 'w-5 h-5';

  return (
    <div className={`flex items-center gap-3 flex-wrap ${textSize} font-bold text-yellow-700`}>
      {dorks.gold > 0 && (
        <div className="flex items-center gap-1">
          <Circle className={`${iconSize} fill-yellow-500 text-yellow-500`} />
          <span>{dorks.gold}</span><span className="text-xs font-medium text-yellow-600">Gold</span>
        </div>
      )}
      {dorks.silver > 0 && (
        <div className="flex items-center gap-1">
          <Circle className={`${iconSize} fill-gray-400 text-gray-400`} />
          <span>{dorks.silver}</span><span className="text-xs font-medium text-gray-500">Silver</span>
        </div>
      )}
      {(dorks.copper > 0 || copperAmount === 0) && (
        <div className="flex items-center gap-1">
          <Circle className={`${iconSize} fill-amber-700 text-amber-700`} />
          <span>{dorks.copper}</span><span className="text-xs font-medium text-amber-700">Copper</span>
        </div>
      )}
    </div>
  );
}

// --- PET STATUS ---

function PetStatus({
  profile,
  previewImageUrl,
  onAccept,
  onReject,
  onHatch,
  isHatching,
  onBuyEgg,
  onStoreYourBling,
  onCashInClick,
}: {
  profile: PetlandProfile;
  previewImageUrl: string | null;
  onAccept: () => void;
  onReject: () => void;
  onHatch: (wish: string) => void;
  onBuyEgg: () => void;
  isHatching: boolean;
  onStoreYourBling: () => void;
  onCashInClick: () => void;
}) {
  const eggImage = PlaceHolderImages.find((img) => img.id === 'pet-egg');
  const defaultHatchedImage = PlaceHolderImages.find((img) => img.id === 'pet-hatched');
  const petLevel = Math.floor((profile.xp || 0) / 1000) + 1;

  if (profile.petState === 'dead') {
    return (
      <Card className="w-full border-2 border-gray-300">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2">
            <BookUser className="h-6 w-6 text-gray-400" />
            <CardTitle className="text-3xl font-headline font-bold text-gray-400">Passport</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 py-8">
          <div className="relative w-48 h-48">
            <img
              src={profile.petImageUrl || defaultHatchedImage?.imageUrl}
              className="w-full h-full rounded-2xl object-cover grayscale opacity-50"
              alt="pet"
            />
            <div className="absolute inset-0 flex items-center justify-center text-7xl">💀</div>
          </div>
          <h2 className="text-2xl font-bold text-gray-500">{profile.petName || 'Your Pet'} has passed away</h2>
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            Buy a new egg to start over. You&apos;ll need to hatch it too.
          </p>
          <div className="flex flex-col items-center gap-1 w-full max-w-xs">
            <Button
              className="w-full"
              disabled={profile.xp < 500}
              onClick={onBuyEgg}
            >
              Buy New Egg — 500 XP
            </Button>
            {profile.xp < 500 && (
              <p className="text-xs text-muted-foreground">
                You need {500 - profile.xp} more XP
              </p>
            )}
            <p className="text-xs text-muted-foreground">Hatching costs an additional 100 XP</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  console.log('[PetStatus] isFat:', profile.isFat, 'fatPetImageUrl:', !!profile.fatPetImageUrl);

  const imageUrl =
    profile.petState === 'hatched'
      ? profile.activePetImageUrl
        ? profile.activePetImageUrl
        : profile.isFat && profile.fatPetImageUrl
          ? profile.fatPetImageUrl
          : profile.hp < 20 && profile.starvingPetImageUrl
            ? profile.starvingPetImageUrl
            : profile.hp < 50 && profile.thinPetImageUrl
              ? profile.thinPetImageUrl
              : profile.petImageUrl || defaultHatchedImage?.imageUrl
      : eggImage?.imageUrl;

  return (
    <Card className="w-full border-2">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2">
          <BookUser className="h-6 w-6 text-primary" />
          <CardTitle className="text-3xl font-headline font-bold primary-gradient-text">Passport</CardTitle>
        </div>
        <CardDescription>Your personal stats and pet's status</CardDescription>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-6 items-start">
        <div className="flex flex-col items-center gap-2">
          <div className="relative w-full aspect-square max-w-sm">
            {previewImageUrl ? (
              <img
                src={previewImageUrl}
                className="w-full h-full border-4 border-dashed border-primary rounded-2xl object-cover"
                alt="preview"
              />
            ) : (
              <img
                src={imageUrl}
                className="w-full h-full border-4 border-primary/50 rounded-2xl object-cover"
                alt="pet"
              />
            )}
            {isHatching && (
              <div className="absolute inset-0 bg-slate-900/50 rounded-2xl flex items-center justify-center">
                <Loader2 className="h-12 w-12 text-white animate-spin" />
              </div>
            )}
          </div>
          {previewImageUrl ? (
            <div className="flex gap-2 mt-2">
              <Button onClick={onAccept} className="bg-green-500 hover:bg-green-600 text-white font-bold">
                <CheckCircle className="mr-2" /> I love it!
              </Button>
              <Button onClick={onReject} variant="destructive">
                <XCircle className="mr-2" /> Try again
              </Button>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold mt-2">{profile.petName || 'My Pet'}</h2>
              <p className="text-sm text-muted-foreground -mt-1">Level {petLevel}</p>
              {profile.activePetImageUrl && (
                <Button
                  onClick={onStoreYourBling}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  Store your bling!
                </Button>
              )}
            </>
          )}
        </div>
        <div className="space-y-4 text-left">
          <div>
            <Label className="font-bold text-muted-foreground flex items-center justify-between text-sm mb-1">
              <span>HP</span>
              <span className="font-mono">
                {profile.hp}/{profile.maxHp}
              </span>
            </Label>
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-destructive" />
              <Progress value={profile.hp} max={profile.maxHp} className="h-4 flex-1" />
            </div>
          </div>

          <div className="p-4 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 border-2 border-purple-300 space-y-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-purple-600" />
                <Label className="font-bold text-purple-900 text-sm">Dorks</Label>
              </div>
              <Button
                onClick={onCashInClick}
                className="text-xs h-7 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold border-0"
              >
                💰 Cash-In
              </Button>
            </div>
            
            {/* Three XP Stats - no boxes */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-xs font-bold text-purple-700 mb-1">XP Earned</p>
                <p className="text-base font-bold text-purple-900">{(profile.xp ?? 0) + (profile.xpSpent ?? 0)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-pink-700 mb-1">XP Spent</p>
                <p className="text-base font-bold text-pink-900">{profile.xpSpent ?? 0}</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-orange-700 mb-1">XP Current</p>
                <p className="text-base font-bold text-orange-900">{profile.xp ?? 0}</p>
              </div>
            </div>

            {/* Wallet */}
            <div className="flex items-center gap-2 font-semibold bg-white rounded px-2 py-1.5 border border-yellow-300">
              <Coins className="h-4 w-4 text-yellow-600" />
              <DorkIconDisplay copperAmount={profile.dorkBalance ?? 0} size="lg" />
            </div>
          </div>

          {profile.petState === 'egg' && !previewImageUrl && (
            <HatchPet onHatch={onHatch} isHatching={isHatching} />
          )}

          {/* Passport stamps — purely decorative */}
          <div className="flex items-end justify-around mt-6 pointer-events-none select-none">
            <img src="/passport-stamp-2.png" alt="" className="stamp-multiply w-32 opacity-50 rotate-[6deg]" />
            <img src="/passport-stamp-3.png" alt="" className="stamp-multiply w-36 opacity-50 rotate-[-4deg]" />
            <img src="/passport-stamp.png"   alt="" className="stamp-multiply w-44 opacity-50 rotate-[-8deg]" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// --- COMPOSITE GALLERY MODAL ---

function CompositeGalleryCard({
  isOpen,
  onClose,
  profile,
  learnerId,
  onSelectComposite,
  onDeleteComposite,
  shopItems = [],
}: {
  isOpen: boolean;
  onClose: () => void;
  profile: PetlandProfile;
  learnerId: string;
  onSelectComposite: (imageUrl: string) => void;
  onDeleteComposite: (imageUrl: string) => void;
  shopItems?: PetShopItem[];
}) {
  const composites = profile.generatedComposites || [];
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);

  if (!isOpen) return null;

  // Group composites by accessory ID
  const groupedByAccessory = composites.reduce(
    (acc, composite) => {
      // Handle both old (accessoryId) and new (accessories array) formats
      const accessories = (composite as any).accessories || (
        (composite as any).accessoryId
          ? [{ id: (composite as any).accessoryId }]
          : []
      );
      
      accessories.forEach((accessory: any) => {
        if (!acc[accessory.id]) {
          acc[accessory.id] = [];
        }
        acc[accessory.id].push(composite);
      });
      return acc;
    },
    {} as Record<string, typeof composites>
  );

  // Get accessory info for each owned accessory
  const ownedAccessoriesInfo = Object.entries(groupedByAccessory).map(([accessoryId]) => {
    const accessory = shopItems.find((item) => item.id === accessoryId);
    return { accessoryId, accessory };
  });

  // Group by collection - only include collections that have owned accessories
  const collectionNames = Array.from(
    new Set(ownedAccessoriesInfo.map(({ accessory }) => accessory?.collection).filter(Boolean))
  ) as string[];

  const accessoriesByCollection = collectionNames.reduce(
    (acc, collection) => {
      const accessories = ownedAccessoriesInfo.filter(
        ({ accessory }) => accessory?.collection === collection
      );
      if (accessories.length > 0) {
        acc[collection] = accessories;
      }
      return acc;
    },
    {} as Record<string, typeof ownedAccessoriesInfo>
  );

  return (
    <>
      {/* Collections Level */}
      {!selectedCollection && (
        <Card className="mt-4 border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                My Outfits
              </CardTitle>
            </div>
            <CardDescription>Pick a collection to browse your outfits.</CardDescription>
          </CardHeader>

          <CardContent>
            {collectionNames.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No outfits yet. Purchase accessories to create them!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {collectionNames.map((collection) => (
                  <Button
                    key={collection}
                    onClick={() => setSelectedCollection(collection)}
                    variant="outline"
                    className="w-full justify-start text-left h-auto py-3 px-4 border-purple-200 hover:bg-purple-100"
                  >
                    <span className="text-lg">🎀</span>
                    <span className="ml-2 font-semibold">{collection}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {accessoriesByCollection[collection]?.length || 0} outfit{(accessoriesByCollection[collection]?.length || 0) !== 1 ? 's' : ''}
                    </span>
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Accessories in Collection Level */}
      {selectedCollection && (
        <Card className="mt-4 border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCollection(null)}
                className="px-2"
              >
                ← Back
              </Button>
              <CardTitle className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex-1 text-center">
                My {selectedCollection}
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent>
            <div className="flex flex-wrap gap-4">
              {(accessoriesByCollection[selectedCollection] || []).map(({ accessoryId, accessory }) => {
                const accessoryComposites = groupedByAccessory[accessoryId] || [];
                if (!accessory || accessoryComposites.length === 0) return null;
                // Use the most recently generated composite for Put On / Delete
                const latestComposite = [...accessoryComposites].sort(
                  (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                )[0];

                const accessoryImageUrl =
                  latestComposite.accessories?.find((a) => a.id === accessoryId)?.imageUrl
                  ?? accessory.imageUrl;

                return (
                  <div key={accessoryId} className="flex flex-col gap-2 w-40 justify-between">
                    <div className="relative aspect-square rounded-lg border-2 border-purple-200 overflow-hidden bg-white">
                      <img
                        src={accessoryImageUrl}
                        alt={accessory.name}
                        className="w-full h-full object-contain p-2"
                      />
                    </div>
                    <p className="text-xs font-semibold text-purple-700 text-center">{accessory.name}</p>
                    <div className="flex gap-1 mt-auto">
                      <Button
                        size="sm"
                        className="flex-1 text-xs bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold"
                        onClick={() => {
                          onSelectComposite(latestComposite.imageUrl);
                          onClose();
                          setSelectedCollection(null);
                        }}
                      >
                        Put On
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1 text-xs"
                        onClick={() => onDeleteComposite(latestComposite.imageUrl)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

// --- PET RESET PANEL ---

function Tip({ children, label, useful }: { children: React.ReactNode; label: string; useful: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-60 text-xs space-y-1">
        <p>{label}</p>
        <p className="text-indigo-300 font-medium">Useful for: {useful}</p>
      </TooltipContent>
    </Tooltip>
  );
}

const panelBtn = 'h-9 rounded-xl text-xs font-semibold border-2 border-indigo-300 text-indigo-700 bg-white hover:bg-indigo-50 hover:border-indigo-400 transition-colors';

function PetResetPanel({ hp, xp, dorkBalance, isFat, onSet, onClearFat, onFakeMatch, onSimulateDecay, onResetFlashcards, onRestorePet, onSimulateAccessoryPurchase, onAdjustXp, onAdjustDorks }: {
  hp: number; xp: number; dorkBalance: number; isFat: boolean;
  onSet: (hp: number) => void; onClearFat: () => void; onFakeMatch: () => void;
  onSimulateDecay: () => void; onResetFlashcards: () => void; onRestorePet: () => void;
  onSimulateAccessoryPurchase: () => void; onAdjustXp: (delta: number) => void; onAdjustDorks: (delta: number) => void;
}) {
  const [hpValue, setHpValue] = useState(String(hp));
  const [xpAmount, setXpAmount] = useState('10');
  const [dorksAmount, setDorksAmount] = useState('10');

  return (
    <TooltipProvider delayDuration={300}>
      <Card className="mt-4 border-2 border-indigo-200 bg-indigo-50/40 rounded-2xl">
        <CardHeader className="pb-2 pt-3 px-4">
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">

          {/* HP row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground w-14">Set HP</span>
            <Input type="number" className="w-20 h-9 text-sm rounded-xl" value={hpValue} onChange={(e) => setHpValue(e.target.value)} min={0} max={100} />
            <Tip label="Set this learner's pet health to an exact value between 0 and 100." useful="correcting HP after an error, or testing hunger alert thresholds">
              <Button size="sm" className={panelBtn} onClick={() => onSet(Math.max(0, Math.min(100, Number(hpValue))))}>
                Apply
              </Button>
            </Tip>
          </div>

          {/* XP row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground w-14">XP <span className="text-indigo-400">({xp})</span></span>
            <Input type="number" className="w-20 h-9 text-sm rounded-xl" value={xpAmount} onChange={(e) => setXpAmount(e.target.value)} min={1} />
            <Tip label="Add XP to this learner's lifetime total." useful="rewarding effort outside the app, or correcting a missed session">
              <Button size="sm" variant="outline" className={panelBtn} onClick={() => onAdjustXp(Math.abs(Number(xpAmount)))}>
                <Plus className="h-3 w-3" />
              </Button>
            </Tip>
            <Tip label="Remove XP from this learner's lifetime total." useful="correcting an accidental over-award or test data cleanup">
              <Button size="sm" variant="outline" className={panelBtn} onClick={() => onAdjustXp(-Math.abs(Number(xpAmount)))}>
                <Minus className="h-3 w-3" />
              </Button>
            </Tip>
          </div>

          {/* Dorks row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground w-14">Dorks <span className="text-indigo-400">({dorkBalance})</span></span>
            <Input type="number" className="w-20 h-9 text-sm rounded-xl" value={dorksAmount} onChange={(e) => setDorksAmount(e.target.value)} min={1} />
            <Tip label="Add Dorks to this learner's wallet." useful="gifting bonus currency as a reward or making up for a system error">
              <Button size="sm" variant="outline" className={panelBtn} onClick={() => onAdjustDorks(Math.abs(Number(dorksAmount)))}>
                <Plus className="h-3 w-3" />
              </Button>
            </Tip>
            <Tip label="Remove Dorks from this learner's wallet." useful="correcting an accidental over-award or reversing a bad transaction">
              <Button size="sm" variant="outline" className={panelBtn} onClick={() => onAdjustDorks(-Math.abs(Number(dorksAmount)))}>
                <Minus className="h-3 w-3" />
              </Button>
            </Tip>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 pt-1">
            <Tip label="Revive a dead pet and restore it to full health." useful="when a learner accidentally let their pet die and wants a second chance">
              <Button size="sm" className={panelBtn} onClick={onRestorePet}>
                <RefreshCw className="mr-1.5 h-3 w-3" /> Restore Pet
              </Button>
            </Tip>
            <Tip label="Simulate a completed Memory Match round — grants XP and feeds the pet." useful="testing the XP and HP gain flow without the learner needing to play">
              <Button size="sm" variant="outline" className={panelBtn} onClick={onFakeMatch}>
                <Gamepad2 className="mr-1.5 h-3 w-3" /> Fake Match
              </Button>
            </Tip>
            <Tip label="Subtract 10 HP as if the learner missed a full day. Marks the pet as dead if HP hits 0." useful="testing hunger alerts and death behaviour without waiting 24 hours">
              <Button size="sm" variant="outline" className={panelBtn} onClick={onSimulateDecay}>
                <Zap className="mr-1.5 h-3 w-3" /> Simulate Decay
              </Button>
            </Tip>
            <Tip label="Clear all flashcard review history so every word appears as new to the learner." useful="resetting a learner's SRS progress at the start of a new term or after a data issue">
              <Button size="sm" variant="outline" className={panelBtn} onClick={onResetFlashcards}>
                <RotateCcw className="mr-1.5 h-3 w-3" /> Reset Flashcards
              </Button>
            </Tip>
            <Tip label="Test an accessory purchase without spending Dorks." useful="previewing how an accessory looks on the pet before recommending it to a learner">
              <Button size="sm" variant="outline" className={panelBtn} onClick={onSimulateAccessoryPurchase}>
                <ShoppingBag className="mr-1.5 h-3 w-3" /> Sim. Purchase
              </Button>
            </Tip>
            {isFat && (
              <Tip label="Remove the overfed status so the pet returns to its normal appearance." useful="fixing a display issue after too many same-day rounds were played">
                <Button size="sm" variant="outline" className={panelBtn} onClick={onClearFat}>
                  Clear Fat
                </Button>
              </Tip>
            )}
          </div>

        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

// --- MAIN DASHBOARD ---

interface StudentDashboardProps {
  learnerId: string;
  learnerName: string;
  viewerRole?: 'student' | 'tutor' | 'admin';
  initialTab?: string;
}

const DEFAULT_PROFILE: PetlandProfile = {
  xp: 0,
  xpSpent: 0,
  hp: 100,
  maxHp: 100,
  dorkBalance: 10,
  lastHpUpdate: new Date().toISOString(),
  lastChallengeDate: '',
  isFat: false,
  petState: 'egg',
  petName: '',
  inventory: [],
  unlockedBrochures: [],
};

export default function StudentDashboard({ learnerId, learnerName, viewerRole = 'student', initialTab = 'home' }: StudentDashboardProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  useEffect(() => { setActiveTab(initialTab); }, [initialTab]);
  const { toast } = useToast();
  const [profile, setProfile] = useState<PetlandProfile | null>(null);
  const [vocabulary, setVocabulary] = useState<Vocabulary[]>([]);
  const [grammarCards, setGrammarCards] = useState<GrammarCard[]>([]);
  const [phonicsCards, setPhonicsCards] = useState<PhonicsCard[]>([]);
  const [profileLoading, setProfileLoading] = useState(true);
  const [isHatching, setIsHatching] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [isNamingPet, setIsNamingPet] = useState(false);
  const [petNameInput, setPetNameInput] = useState('');
  const [matchCompleted, setMatchCompleted] = useState(false);
  const [selectedGame, setSelectedGame] = useState<GameType>('memory-match');
  const [showGameReveal, setShowGameReveal] = useState(true);
  const [isRecoveryHatch, setIsRecoveryHatch] = useState(false);
  const [pendingWish, setPendingWish] = useState('');
  const [showFatConfirm, setShowFatConfirm] = useState(false);
  const [isFatGenerating, setIsFatGenerating] = useState(false);
  const [shopItems, setShopItems] = useState<PetShopItem[]>([]);
  const [isLoadingShop, setIsLoadingShop] = useState(false);
  const [isBuyingAccessory, setIsBuyingAccessory] = useState(false);
  const [selectedAccessoryId, setSelectedAccessoryId] = useState<string | null>(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isStampsOpen, setIsStampsOpen] = useState(false);
  const [isSelectingAccessoryForPurchase, setIsSelectingAccessoryForPurchase] = useState(false);
  const [shopViewBy, setShopViewBy] = useState<'items' | 'collections' | 'price'>('items');
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set());
  const [collectionMetadata, setCollectionMetadata] = useState<Record<string, string>>({});
  const [showCashInStation, setShowCashInStation] = useState(false);

  const profileRef = doc(db, 'students', learnerId, 'petland', 'profile');
  const hasAppliedDecayRef = useRef(false);

  // Live subscribe to profile
  useEffect(() => {
    const unsub = onSnapshot(profileRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as PetlandProfile;
        console.log('[onSnapshot] isFat:', data.isFat, 'fatPetImageUrl:', !!data.fatPetImageUrl);
        setProfile(data);
      } else {
        setProfile(null);
      }
      setProfileLoading(false);
    });
    return () => unsub();
  }, [learnerId]);

  // If hatched but petImageUrl is missing, recover it from Storage
  useEffect(() => {
    if (profile?.petState !== 'hatched' || profile?.petImageUrl) return;
    getDownloadURL(ref(storage, `pets/${learnerId}/pet.png`))
      .then((url) => updateDoc(profileRef, { petImageUrl: url }))
      .catch(() => {}); // no image in storage yet — silently ignore
  }, [profile?.petState, profile?.petImageUrl, learnerId]);

  // HP decay — runs once when profile first loads
  useEffect(() => {
    if (!profile || hasAppliedDecayRef.current || profile.petState === 'dead') return;
    hasAppliedDecayRef.current = true;

    const { newHp, missedIntervals } = calculateHpDecay(profile.lastHpUpdate, profile.hp);

    if (missedIntervals > 0) {
      const updates: Partial<PetlandProfile> = { hp: newHp, lastHpUpdate: new Date().toISOString(), isFat: false };
      if (newHp === 0) updates.petState = 'dead';
      updateDoc(profileRef, updates).catch(console.error);
    }

    // Generate variant images based on effective HP (after decay)
    if (profile.petState === 'hatched' && profile.petImageUrl) {
      const effectiveHp = missedIntervals > 0 ? newHp : profile.hp;
      if (effectiveHp < 20 && !profile.starvingPetImageUrl) {
        editPetImage(profile.petImageUrl, STARVING_PROMPT)
          .then((b64) => uploadBase64ToStorage(b64, `pets/${learnerId}/starving-pet.png`))
          .then((url) => updateDoc(profileRef, { starvingPetImageUrl: url }))
          .catch(console.error);
      } else if (effectiveHp < 50 && !profile.thinPetImageUrl) {
        editPetImage(profile.petImageUrl, THIN_PROMPT)
          .then((b64) => uploadBase64ToStorage(b64, `pets/${learnerId}/thin-pet.png`))
          .then((url) => updateDoc(profileRef, { thinPetImageUrl: url }))
          .catch(console.error);
      }
    }
  }, [profile]);

  // Load Pet Shop items and collection metadata
  useEffect(() => {
    (async () => {
      try {
        setIsLoadingShop(true);
        const [rawItems, collectionsRes] = await Promise.all([
          getPetShopItems(),
          fetch('/api/petshop/collections')
        ]);

        // Refresh signed URLs so images aren't expired (same as teacher pet shop view)
        const items = await Promise.all(rawItems.map(async (item) => {
          const storagePath = (item as any).storagePath || (item as any).storePath;
          if (!storagePath) return item;
          try {
            const res = await fetch('/api/petshop/generate-item-url', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ storagePath }),
            });
            if (res.ok) {
              const data = await res.json();
              return { ...item, imageUrl: data.imageUrl };
            }
          } catch { /* fall through to original URL */ }
          return item;
        }));

        setShopItems(items);
        
        const nameBasedDefaults: Record<string, string> = {
          'Oh my stars!': 'sparkles',
          'Letting off some steam!': 'wind',
          'Magic and Spells': 'wand',
        };
        
        if (collectionsRes.ok) {
          const data = await collectionsRes.json();
          const metadata: Record<string, string> = {};
          for (const col of data.collections || []) {
            metadata[col.name] = col.iconType || nameBasedDefaults[col.name] || 'default';
          }
          setCollectionMetadata(metadata);
        }
      } catch (error) {
        console.error('Error loading pet shop items:', error);
        toast({
          title: 'Error',
          description: 'Failed to load pet shop items',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingShop(false);
      }
    })();
  }, []);



  // Live subscribe to vocabulary
  useEffect(() => {
    const vocabRef = collection(db, 'students', learnerId, 'vocabulary');
    const unsub = onSnapshot(vocabRef, (snap) => {
      const words = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Vocabulary));
      setVocabulary(words);
    });
    return () => unsub();
  }, [learnerId]);

  // Load grammar and phonics cards once on mount
  useEffect(() => {
    getGrammarCards(learnerId).then(setGrammarCards).catch(console.error);
    getPhonicsCards(learnerId).then(setPhonicsCards).catch(console.error);
  }, [learnerId]);

  // Pick a game once when Phase 2 becomes available; reset reveal when session resets
  useEffect(() => {
    if (!matchCompleted && vocabulary.filter((w) => !w.lastReviewDate).length >= 1) {
      const unreviewed = vocabulary.filter((w) => !w.lastReviewDate);
      setSelectedGame(selectGame(unreviewed));
      setShowGameReveal(true);
    }
  }, [matchCompleted, vocabulary.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGameComplete = useCallback(
    async (vocabIds: string[]) => {
      if (!profile) return;
      const today = getTodayDateString();
      const xp = vocabIds.length * XP_PER_MATCH;
      const isFirstRoundToday = profile.lastChallengeDate !== today;
      const hpGain = isFirstRoundToday ? 10 : 0;

      const profileUpdate: Partial<PetlandProfile> = {
        xp: profile.xp + xp,
        lastChallengeDate: today,
      };
      if (hpGain > 0) {
        profileUpdate.hp = Math.min(profile.maxHp, profile.hp + hpGain);
        profileUpdate.lastHpUpdate = new Date().toISOString();
      }

      // Stamp lastReviewDate on each word — exposure only, no srsLevel change
      const batch = writeBatch(db);
      for (const vocabId of vocabIds) {
        batch.update(doc(db, 'students', learnerId, 'vocabulary', vocabId), {
          lastReviewDate: today,
        });
      }
      await batch.commit().catch(console.error);
      await updateDoc(profileRef, profileUpdate).catch(console.error);

      setMatchCompleted(true);
      toast({
        title: 'Great job!',
        description: hpGain > 0
          ? `You earned ${xp} XP and ${hpGain} HP!`
          : `You earned ${xp} XP! (HP only awarded once per day)`,
      });
    },
    [profile, learnerId]
  );

  // Picks a different game type from the current one and resets the reveal (tutor preview use)
  const skipToNextGame = useCallback(() => {
    const unreviewed = vocabulary.filter((w) => !w.lastReviewDate);
    const eligible = (Object.keys(GAME_MIN_WORDS) as GameType[]).filter(
      (g) => unreviewed.length >= GAME_MIN_WORDS[g] && g !== selectedGame
    );
    const next = eligible.length > 0
      ? eligible[Math.floor(Math.random() * eligible.length)]
      : selectedGame;
    setSelectedGame(next);
    setShowGameReveal(true);
  }, [selectedGame, vocabulary]);

  // Routes game results to the right SRS path based on game type
  const handleGameCompleteRouted = useCallback(
    async (results: GameResult[]) => {
      if (RECALL_GAMES.includes(selectedGame)) {
        // Recall game: update srsLevel based on correctness
        await handleFlashcardComplete(results.map((r) => ({ vocabId: r.vocabId, knew: r.correct })));
      } else {
        // Recognition game: stamp lastReviewDate only, same as original Memory Match
        await handleGameComplete(results.map((r) => r.vocabId));
      }
    },
    [selectedGame] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const checkAndEarnStamps = useCallback(
    async (updatedVocab: typeof vocabulary, currentProfile: typeof profile) => {
      if (!currentProfile) return;
      const today = getTodayDateString();
      const alreadyEarned = new Set((currentProfile.earnedStamps ?? []).map((s) => s.topic));

      // Group words by topic — only words that have a topic set
      const byTopic: Record<string, typeof vocabulary> = {};
      for (const w of updatedVocab) {
        if (!w.topic) continue;
        if (!byTopic[w.topic]) byTopic[w.topic] = [];
        byTopic[w.topic].push(w);
      }

      const newStamps: NonNullable<typeof currentProfile.earnedStamps> = [];
      for (const [topic, words] of Object.entries(byTopic)) {
        if (alreadyEarned.has(topic)) continue;
        const allMastered = words.length >= 3 && words.every((w) => (w.srsLevel || 1) >= 3);
        if (!allMastered) continue;
        try {
          const imageUrl = await generateTopicStamp(topic);
          newStamps.push({ topic, imageUrl, earnedDate: today });
          toast({ title: `🎉 New stamp earned!`, description: `You mastered the "${topic}" topic!` });
        } catch (err) {
          console.error('Failed to generate stamp for topic:', topic, err);
        }
      }

      if (newStamps.length > 0) {
        const combined = [...(currentProfile.earnedStamps ?? []), ...newStamps];
        await updateDoc(profileRef, { earnedStamps: combined }).catch(console.error);
      }
    },
    [profile, profileRef, toast] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleFlashcardComplete = useCallback(
    async (results: { vocabId: string; knew: boolean }[]) => {
      if (!profile) return;
      const today = getTodayDateString();
      const xp = results.length * XP_PER_FLASHCARD;

      const batch = writeBatch(db);
      for (const result of results) {
        const word = vocabulary.find((v) => v.id === result.vocabId);
        if (!word) continue;
        const newSrsLevel = result.knew ? Math.min(5, (word.srsLevel || 1) + 1) : 1;
        batch.update(doc(db, 'students', learnerId, 'vocabulary', result.vocabId), {
          srsLevel: newSrsLevel,
          lastReviewDate: today,
        });
      }
      await batch.commit().catch(console.error);
      await updateDoc(profileRef, { xp: profile.xp + xp }).catch(console.error);

      // Check if any topics just became fully mastered (all words srsLevel >= 3)
      const updatedVocab = vocabulary.map((w) => {
        const r = results.find((res) => res.vocabId === w.id);
        if (!r) return w;
        return { ...w, srsLevel: r.knew ? Math.min(5, (w.srsLevel || 1) + 1) : 1 };
      });
      await checkAndEarnStamps(updatedVocab, profile);

      const knewCount = results.filter((r) => r.knew).length;
      toast({
        title: 'Review done!',
        description: `${knewCount}/${results.length} known · +${xp} XP`,
      });
    },
    [profile, vocabulary, learnerId] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleUnifiedComplete = useCallback(
    async (results: ReviewResult[]) => {
      if (!profile) return;
      const today = getTodayDateString();
      const xp = results.length * XP_PER_FLASHCARD;

      const batch = writeBatch(db);
      for (const result of results) {
        if (result.kind === 'vocab') {
          const word = vocabulary.find((v) => v.id === result.id);
          if (!word) continue;
          const newSrsLevel = result.knew ? Math.min(5, (word.srsLevel || 1) + 1) : 1;
          batch.update(doc(db, 'students', learnerId, 'vocabulary', result.id), {
            srsLevel: newSrsLevel,
            lastReviewDate: today,
          });
        } else if (result.kind === 'grammar') {
          const card = grammarCards.find((c) => c.id === result.id);
          if (!card) continue;
          const newSrsLevel = result.knew ? Math.min(5, (card.srsLevel || 1) + 1) : 1;
          batch.update(doc(db, 'students', learnerId, 'grammar', result.id), {
            srsLevel: newSrsLevel,
            lastReviewDate: today,
          });
        } else if (result.kind === 'phonics') {
          const card = phonicsCards.find((c) => c.id === result.id);
          if (!card) continue;
          const newSrsLevel = result.knew ? Math.min(5, (card.srsLevel || 1) + 1) : 1;
          batch.update(doc(db, 'students', learnerId, 'phonics', result.id), {
            srsLevel: newSrsLevel,
            lastReviewDate: today,
          });
        }
      }
      await batch.commit().catch(console.error);
      await updateDoc(profileRef, { xp: profile.xp + xp }).catch(console.error);

      const knewCount = results.filter((r) => r.knew).length;
      toast({
        title: 'Review done!',
        description: `${knewCount}/${results.length} known · +${xp} XP`,
      });
    },
    [profile, vocabulary, grammarCards, phonicsCards, learnerId]
  );

  const handleHatch = async (wish: string) => {
    const hatchCost = 100; // 1 Gold
    if (!profile || (profile.dorkBalance ?? 0) < hatchCost) {
      toast({
        title: 'Not enough Dorks',
        description: `You need ${formatDorks(hatchCost)} to hatch. Visit Cash-In to convert XP!`,
        variant: 'destructive',
      });
      return;
    }

    setIsHatching(true);
    setPendingWish(wish);
    try {
      const imageDataUri = await generatePetImage(wish);
      const url = await uploadBase64ToStorage(imageDataUri, `pets/${learnerId}/pet.png`);
      setPreviewImageUrl(url);
    } catch (e) {
      console.error('[Hatch] Error:', e);
      toast({ variant: 'destructive', title: 'Hatch failed', description: 'Something went wrong. Try again.' });
    } finally {
      setIsHatching(false);
    }
  };

  const handleRejectPet = async () => {
    if (previewImageUrl) {
      try {
        await deleteObject(ref(storage, `pets/${learnerId}/pet.png`));
      } catch (_) {}
    }
    setPreviewImageUrl(null);
  };

  const handleAcceptPet = () => {
    if (learnerName) setPetNameInput(`${learnerName}'s Pet`);
    setIsNamingPet(true);
  };

  const handleNamePet = () => {
    if (!previewImageUrl || !petNameInput || !profile) return;
    const hatchCost = 100; // 1 Gold
    const updates: Partial<PetlandProfile> = {
      petState: 'hatched',
      petName: petNameInput.trim(),
      petImageUrl: previewImageUrl,
      petWish: pendingWish,
      dorkBalance: (profile.dorkBalance ?? 0) - hatchCost,
    };
    if (isRecoveryHatch) {
      updates.xp = Math.max(0, profile.xp - 100);
    }
    updateDoc(profileRef, updates).catch(console.error);
    setPreviewImageUrl(null);
    setIsNamingPet(false);
    setPetNameInput('');
    setIsRecoveryHatch(false);
  };

  const handleGenerateFatPet = async () => {
    if (!profile?.petImageUrl) return;
    setShowFatConfirm(false);
    setIsFatGenerating(true);
    try {
      console.log('[FatPet] learnerId:', learnerId, 'fatPetImageUrl:', !!profile.fatPetImageUrl);
      if (!profile.fatPetImageUrl) {
        const b64 = await editPetImage(profile.petImageUrl, FAT_PROMPT);
        const url = await uploadBase64ToStorage(b64, `pets/${learnerId}/fat-pet.png`);
        await updateDoc(profileRef, { fatPetImageUrl: url, isFat: true });
      } else {
        console.log('[FatPet] writing isFat: true to', profileRef.path);
        await updateDoc(profileRef, { isFat: true });
        console.log('[FatPet] write succeeded');
      }
    } catch (e) {
      console.log('[FatPet] FAILED:', e);
    }
    setIsFatGenerating(false);
  };

  const handleBuyEgg = async () => {
    const eggCost = 500; // 5 Silver
    if (!profile || (profile.dorkBalance ?? 0) < eggCost) {
      toast({
        title: 'Not enough Dorks',
        description: `You need ${formatDorks(eggCost)} to buy a new pet. Visit Cash-In to convert XP!`,
        variant: 'destructive',
      });
      return;
    }
    await updateDoc(profileRef, {
      dorkBalance: (profile.dorkBalance ?? 0) - eggCost,
      petState: 'egg',
      petName: '',
      petImageUrl: null,
      fatPetImageUrl: null,
      thinPetImageUrl: null,
      starvingPetImageUrl: null,
      petWish: null,
      isFat: false,
      hp: 100,
      lastHpUpdate: new Date().toISOString(),
    }).catch(console.error);
    deleteObject(ref(storage, `pets/${learnerId}/pet.png`)).catch(() => {});
    deleteObject(ref(storage, `pets/${learnerId}/fat-pet.png`)).catch(() => {});
    deleteObject(ref(storage, `pets/${learnerId}/thin-pet.png`)).catch(() => {});
    deleteObject(ref(storage, `pets/${learnerId}/starving-pet.png`)).catch(() => {});
    setIsRecoveryHatch(true);
  };

  const toggleCollection = (collectionName: string) => {
    const newExpanded = new Set(expandedCollections);
    if (newExpanded.has(collectionName)) {
      newExpanded.delete(collectionName);
    } else {
      newExpanded.add(collectionName);
    }
    setExpandedCollections(newExpanded);
  };

  const handleBuyAccessory = async (accessoryId: string) => {
    // Helper function to safely get price as number
    const getPrice = (price: any): number => {
      if (typeof price === 'number') return price;
      if (price && typeof price === 'object' && 'gold' in price) {
        // Old format: convert Dorks to a numeric value (for backward compatibility)
        return (price.gold || 0) * 100 + (price.silver || 0) * 10 + (price.copper || 0);
      }
      return 0;
    };

    if (!profile || !profile.petImageUrl || !profile.petState || profile.petState !== 'hatched') {
      toast({
        title: 'Error',
        description: 'Please hatch your pet first!',
        variant: 'destructive',
      });
      return;
    }

    const item = shopItems.find((i) => i.id === accessoryId);
    if (!item) {
      toast({
        title: 'Error',
        description: 'Accessory not found',
        variant: 'destructive',
      });
      return;
    }

    const itemPrice = getPrice(item.price);

    if ((profile.dorkBalance ?? 0) < itemPrice) {
      toast({
        title: 'Not enough Dorks',
        description: `You need ${formatDorks(itemPrice)} but only have ${formatDorks(profile.dorkBalance ?? 0)}. Visit Cash-In to convert XP!`,
        variant: 'destructive',
      });
      return;
    }

    setIsBuyingAccessory(true);
    setSelectedAccessoryId(accessoryId);

    try {
      // Compose the accessory onto the pet
      const mergePrompt =
        'Carefully composite the accessory onto the pet image. Match the Studio Ghibli art style of the pet. ' +
        'Place the accessory naturally on the pet (e.g., on head, back, or held). ' +
        'Blend shadows and lighting to match the pet\'s lighting. ' +
        'Scale the accessory proportionally so it looks like it belongs. ' +
        'Preserve the pet\'s character and expression. ' +
        'The final image should look like the pet is wearing/holding this accessory.';
      const compositeImageB64 = await composeAccessoryOnPet(
        profile.petImageUrl,
        item.imageUrl,
        mergePrompt
      );

      // Upload composite to storage
      const compositeUrl = await uploadBase64ToStorage(
        compositeImageB64,
        `pets/${learnerId}/active-pet-${accessoryId}-${crypto.randomUUID().slice(0, 8)}.png`
      );

      // Update learner profile
      const newComposite = {
        accessories: [
          {
            id: accessoryId,
            imageUrl: item.imageUrl,
          },
        ],
        imageUrl: compositeUrl,
        createdAt: new Date().toISOString(),
      };
      const updatedProfile: Partial<PetlandProfile> = {
        dorkBalance: (profile.dorkBalance ?? 0) - itemPrice,
        activePetImageUrl: compositeUrl,
        ownedAccessories: [...(profile.ownedAccessories || []), accessoryId],
        generatedComposites: [...(profile.generatedComposites || []), newComposite],
      };

      await updateDoc(profileRef, updatedProfile);
      await decrementPetShopItemStock(accessoryId);

      // Refresh shop items
      const updatedItems = await getPetShopItems();
      setShopItems(updatedItems);

      toast({
        title: 'Success!',
        description: `You got ${item.name}!`,
      });
    } catch (error) {
      console.error('Error buying accessory:', error);
      toast({
        title: 'Purchase failed',
        description: 'Something went wrong. Dorks refunded.',
        variant: 'destructive',
      });
    } finally {
      setIsBuyingAccessory(false);
      setSelectedAccessoryId(null);
    }
  };

  const handleStoreYourBling = async () => {
    if (!profile) return;
    try {
      await updateDoc(profileRef, {
        activePetImageUrl: null,
      });
      toast({
        title: 'Bling stored away!',
        description: 'Your accessory has been removed (but you still own it)',
      });
    } catch (error) {
      console.error('Error storing bling:', error);
      toast({
        title: 'Error',
        description: 'Failed to store your accessory',
        variant: 'destructive',
      });
    }
  };

  const handleSelectComposite = async (imageUrl: string) => {
    if (!profile) return;
    try {
      await updateDoc(profileRef, {
        activePetImageUrl: imageUrl,
      });
      toast({
        title: 'Composite selected!',
        description: 'Your pet is now wearing this composite.',
      });
    } catch (error) {
      console.error('Error selecting composite:', error);
      toast({
        title: 'Error',
        description: 'Failed to select composite',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteComposite = async (imageUrl: string) => {
    if (!profile) return;
    try {
      // Remove from generatedComposites array
      const updatedComposites = (profile.generatedComposites || []).filter((c) => c.imageUrl !== imageUrl);
      await updateDoc(profileRef, {
        generatedComposites: updatedComposites,
        // If the deleted composite was active, clear active view
        ...(profile.activePetImageUrl === imageUrl && { activePetImageUrl: null }),
      });

      // Delete from Storage
      const storageRef = ref(storage, imageUrl.split('/o/')[1]?.split('?')[0] || '');
      await deleteObject(storageRef).catch(() => {});

      toast({
        title: 'Composite deleted!',
        description: 'The composite has been removed.',
      });
    } catch (error) {
      console.error('Error deleting composite:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete composite',
        variant: 'destructive',
      });
    }
  };

  const handleSimulateAccessoryPurchase = async () => {
    if (!profile || !profile.petImageUrl || !profile.petState || profile.petState !== 'hatched') {
      toast({
        title: 'Error',
        description: 'Pet must be hatched first!',
        variant: 'destructive',
      });
      return;
    }

    // Find all available accessories with stock > 0
    const availableItems = shopItems.filter((item) => item.stock > 0);
    if (availableItems.length === 0) {
      toast({
        title: 'Error',
        description: 'No accessories available in shop',
        variant: 'destructive',
      });
      return;
    }

    // If multiple accessories available, show selection dialog
    if (availableItems.length > 1) {
      setIsSelectingAccessoryForPurchase(true);
      return;
    }

    // If only one, proceed with purchase
    await executePurchaseAccessory(availableItems[0]);
  };

  const executePurchaseAccessory = async (availableItem: PetShopItem) => {
    if (!profile || !profile.petImageUrl) return;

    setIsBuyingAccessory(true);
    setSelectedAccessoryId(availableItem.id);
    setIsSelectingAccessoryForPurchase(false);

    try {
      // Compose the accessory onto the pet
      const mergePrompt =
        'Carefully composite the accessory onto the pet image. Match the Studio Ghibli art style of the pet. ' +
        'Place the accessory naturally on the pet (e.g., on head, back, or held). ' +
        'Blend shadows and lighting to match the pet\'s lighting. ' +
        'Scale the accessory proportionally so it looks like it belongs. ' +
        'Preserve the pet\'s character and expression. ' +
        'The final image should look like the pet is wearing/holding this accessory.';
      const compositeImageB64 = await composeAccessoryOnPet(
        profile.petImageUrl,
        availableItem.imageUrl,
        mergePrompt
      );

      // Upload composite to storage
      const compositeUrl = await uploadBase64ToStorage(
        compositeImageB64,
        `pets/${learnerId}/active-pet-${availableItem.id}-${crypto.randomUUID().slice(0, 8)}.png`
      );

      // Update learner profile (no XP deduction in test mode)
      const newComposite = {
        accessories: [
          {
            id: availableItem.id,
            imageUrl: availableItem.imageUrl,
          },
        ],
        imageUrl: compositeUrl,
        createdAt: new Date().toISOString(),
      };
      const updatedProfile: Partial<PetlandProfile> = {
        activePetImageUrl: compositeUrl,
        ownedAccessories: [...(profile.ownedAccessories || []), availableItem.id],
        generatedComposites: [...(profile.generatedComposites || []), newComposite],
      };

      try {
        await updateDoc(profileRef, updatedProfile);
        console.log('✅ Profile updated successfully');
      } catch (err) {
        console.error('❌ Profile update failed:', err);
        throw err;
      }

      // Skip stock decrement for test mode - this is a simulation, not a real transaction
      console.log('⏭️ Skipping stock decrement (test mode - simulated purchase only)');

      try {
        // Refresh shop items
        const updatedItems = await getPetShopItems();
        setShopItems(updatedItems);
        console.log('✅ Shop items refreshed');
      } catch (err) {
        console.error('❌ Shop refresh failed:', err);
        // Don't throw - this is just UI refresh
      }

      toast({
        title: 'Test Success! 🎉',
        description: `Simulated purchase of "${availableItem.name}" for ${profile.petName || 'your pet'}!`,
      });
    } catch (error) {
      console.error('Error in test accessory purchase:', error);
      toast({
        title: 'Test failed',
        description: 'Error: ' + (error instanceof Error ? error.message : 'Unknown error'),
        variant: 'destructive',
      });
    } finally {
      setIsBuyingAccessory(false);
      setSelectedAccessoryId(null);
    }
  };

  const today = getTodayDateString();
  // Memory Match: new words only (never reviewed, requires 4+ for game to work)
  const unreviewedVocab = vocabulary.filter((w) => !w.lastReviewDate);
  // Unified flashcard review: vocab SRS-due + all grammar/phonics (new or due)
  const flashcardVocab = vocabulary.filter((w) => w.lastReviewDate && isWordDue(w, today));
  const grammarDue = grammarCards.filter((c) => !c.lastReviewDate || isWordDue(c as unknown as Vocabulary, today));
  const phonicsDue = phonicsCards.filter((c) => !c.lastReviewDate || isWordDue(c as unknown as Vocabulary, today));
  const unifiedDueCards: ReviewCard[] = [
    ...flashcardVocab.map((c) => ({ kind: 'vocab' as const, id: c.id, card: c })),
    ...grammarDue.map((c) => ({ kind: 'grammar' as const, id: c.id, card: c })),
    ...phonicsDue.map((c) => ({ kind: 'phonics' as const, id: c.id, card: c })),
  ];

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center p-16">
        <p className="text-muted-foreground">Loading your pet...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center p-16">
        <p className="text-muted-foreground">Your teacher hasn't activated Petland for you yet.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <FeedbackOverlay profile={profile} />
      <HungerAlerts profile={profile} learnerId={learnerId} />

      <Dialog open={showFatConfirm} onOpenChange={setShowFatConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Play anyway?</DialogTitle>
            <DialogDescription>
              Your pet has already eaten today and nothing is due for review. Playing anyway will make your pet overfull and a little embarrassed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFatConfirm(false)}>Cancel</Button>
            <Button onClick={handleGenerateFatPet}>Play anyway</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSelectingAccessoryForPurchase} onOpenChange={setIsSelectingAccessoryForPurchase}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose an Accessory</DialogTitle>
            <DialogDescription>Pick which accessory to simulate buying for your pet.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {shopItems
              .filter((item) => item.stock > 0)
              .map((item) => (
                <Button
                  key={item.id}
                  onClick={() => executePurchaseAccessory(item)}
                  disabled={isBuyingAccessory}
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-3 px-4"
                >
                  <div className="flex items-center gap-3 w-full">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-16 h-16 rounded object-cover"
                    />
                    <div className="flex-1">
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.collection}</p>
                    </div>
                  </div>
                </Button>
              ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSelectingAccessoryForPurchase(false)}
              disabled={isBuyingAccessory}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isNamingPet} onOpenChange={setIsNamingPet}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Name your new friend!</DialogTitle>
            <DialogDescription>What will you call your new pet?</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Enter pet name..."
            value={petNameInput}
            onChange={(e) => setPetNameInput(e.target.value)}
            className="mt-2"
          />
          <DialogFooter>
            <Button onClick={handleNamePet} disabled={!petNameInput.trim()} className="w-full mt-4">
              Save Name
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="home">
            <BookUser className="mr-2 h-4 w-4" />
            <span className="font-headline font-bold">Passport</span>
          </TabsTrigger>
          <TabsTrigger value="play">
            <Gamepad2 className="mr-2 h-4 w-4" />
            <span className="font-headline font-bold">Playground</span>
          </TabsTrigger>
          <TabsTrigger value="shop">
            <ShoppingBag className="mr-2 h-4 w-4" />
            <span className="font-headline font-bold">Pet Shop</span>
          </TabsTrigger>
          <TabsTrigger value="brochures">
            <MapIcon className="mr-2 h-4 w-4" />
            <span className="font-headline font-bold">Travel Agent</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="home">
          <PetStatus
            profile={profile}
            onHatch={handleHatch}
            isHatching={isHatching}
            previewImageUrl={previewImageUrl}
            onAccept={handleAcceptPet}
            onReject={handleRejectPet}
            onBuyEgg={handleBuyEgg}
            onStoreYourBling={handleStoreYourBling}
            onCashInClick={() => setShowCashInStation(!showCashInStation)}
          />
          {showCashInStation && profile && (
            <CashInStation
              learnerId={learnerId}
              currentXp={profile.xp}
              xpSpent={profile.xpSpent ?? 0}
              currentDorkBalance={profile.dorkBalance ?? 0}
              onConversionComplete={() => setShowCashInStation(false)}
            />
          )}

          {(profile.generatedComposites || []).length > 0 && (
            <>
              <Button
                onClick={() => setIsGalleryOpen((o) => !o)}
                className="mt-4 w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                My Outfits
              </Button>
              <CompositeGalleryCard
                isOpen={isGalleryOpen}
                onClose={() => setIsGalleryOpen(false)}
                profile={profile}
                learnerId={learnerId}
                onSelectComposite={handleSelectComposite}
                onDeleteComposite={handleDeleteComposite}
                shopItems={shopItems}
              />
            </>
          )}

          {(profile.earnedStamps ?? []).length > 0 && (
            <>
              <Button
                onClick={() => setIsStampsOpen((o) => !o)}
                className="mt-4 w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                My Stamps ({(profile.earnedStamps ?? []).length})
              </Button>
              {isStampsOpen && (
                <Card className="mt-2 border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
                  <CardContent className="p-4">
                    <div className="flex flex-wrap gap-6 justify-center py-2">
                      {(profile.earnedStamps ?? []).map((stamp, i) => {
                        const rotClasses = [
                          'rotate-[-10deg]', 'rotate-[8deg]', 'rotate-[-5deg]', 'rotate-[12deg]',
                          'rotate-[-8deg]', 'rotate-[6deg]',  'rotate-[-12deg]', 'rotate-[9deg]',
                        ];
                        return (
                          <div key={stamp.topic} className="flex flex-col items-center gap-1">
                            <img
                              src={stamp.imageUrl}
                              alt={stamp.topic}
                              className={`stamp-multiply w-32 opacity-80 pointer-events-none select-none ${rotClasses[i % rotClasses.length]}`}
                            />
                            <p className="text-xs text-muted-foreground">{stamp.earnedDate}</p>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {viewerRole !== 'student' && (
            <>
              <Button
                onClick={() => setIsResetOpen((o) => !o)}
                className="mt-4 w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold"
              >
                <Settings2 className="mr-2 h-4 w-4" />
                Pet Reset
              </Button>
              {isResetOpen && (
                <PetResetPanel
                  hp={profile.hp}
                  xp={profile.xp}
                  dorkBalance={profile.dorkBalance ?? 0}
                  isFat={!!profile.isFat}
                  onSet={(hp) => {
                    updateDoc(profileRef, { hp, lastHpUpdate: new Date().toISOString() })
                      .then(() => toast({ title: 'HP Set', description: `HP set to ${hp}` }))
                      .catch((err) => toast({ title: 'Error', description: 'Failed to set HP: ' + err.message, variant: 'destructive' }));
                  }}
                  onClearFat={() => updateDoc(profileRef, { isFat: false }).catch(console.error)}
                  onFakeMatch={() => handleGameComplete(vocabulary.slice(0, 3).map((v) => v.id))}
                  onSimulateDecay={() => {
                    const newHp = Math.max(0, profile.hp - 10);
                    const updates: Partial<PetlandProfile> = { hp: newHp, lastHpUpdate: new Date().toISOString(), isFat: false };
                    if (newHp === 0) updates.petState = 'dead';
                    updateDoc(profileRef, updates).catch(console.error);
                  }}
                  onResetFlashcards={async () => {
                    const vocabRef = collection(db, 'students', learnerId, 'vocabulary');
                    const snap = await getDocs(vocabRef);
                    const batch = writeBatch(db);
                    snap.docs.forEach((doc) => {
                      batch.update(doc.ref, { lastReviewDate: deleteField(), srsLevel: 1 });
                    });
                    await batch.commit().catch(console.error);
                    alert('Flashcards reset! All words set to unreviewed.');
                  }}
                  onRestorePet={() => {
                    updateDoc(profileRef, {
                      petState: 'hatched',
                      hp: 100,
                      lastHpUpdate: new Date().toISOString(),
                      isFat: false,
                      lastHpAlertLevel: null,
                    })
                      .then(() => toast({ title: 'Pet Restored', description: 'Pet has been brought back to life at full health!' }))
                      .catch((err) => toast({ title: 'Error', description: 'Failed to restore pet: ' + err.message, variant: 'destructive' }));
                  }}
                  onSimulateAccessoryPurchase={handleSimulateAccessoryPurchase}
                  onAdjustXp={(delta) => {
                    const newXp = Math.max(0, profile.xp + delta);
                    updateDoc(profileRef, { xp: newXp })
                      .then(() => toast({ title: 'XP Updated', description: `XP ${delta >= 0 ? '+' : ''}${delta} → ${newXp}` }))
                      .catch((err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }));
                  }}
                  onAdjustDorks={(delta) => {
                    const newBalance = Math.max(0, (profile.dorkBalance ?? 0) + delta);
                    updateDoc(profileRef, { dorkBalance: newBalance })
                      .then(() => toast({ title: 'Dorks Updated', description: `Dorks ${delta >= 0 ? '+' : ''}${delta} → ${newBalance}` }))
                      .catch((err) => toast({ title: 'Error', description: err.message, variant: 'destructive' }));
                  }}
                />
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="play">
          {vocabulary.length === 0 ? (
            // No vocab at all
            <>
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Ask your teacher to add some words to your list!
              </CardContent>
            </Card>
            </>
          ) : unreviewedVocab.length >= 4 && !matchCompleted ? (
            // Phase 2 — new words exist, show reveal then selected game
            <>
            {showGameReveal
              ? <GameReveal gameType={selectedGame} onStart={() => setShowGameReveal(false)} />
              : <>
                  <GameRouter
                    gameType={selectedGame}
                    vocabulary={unreviewedVocab}
                    onComplete={handleGameCompleteRouted}
                    MemoryGameComponent={MemoryGame}
                  />
                  {viewerRole !== 'student' && (
                    <div className="mt-3 flex justify-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={skipToNextGame}
                        className="rounded-xl border-2 border-indigo-200 text-indigo-500 hover:bg-indigo-50 text-xs"
                      >
                        Skip to next game →
                      </Button>
                    </div>
                  )}
                </>
            }
            </>
          ) : unifiedDueCards.length > 0 ? (
            // Leitner-due vocab + any grammar/phonics cards — unified review
            <>
            <UnifiedFlashcardReview cards={unifiedDueCards} onComplete={handleUnifiedComplete} />
            </>
          ) : profile.isFat && profile.fatPetImageUrl ? (
            // Fat pet — overfed, come back later
            <>
            <Card>
              <CardContent className="py-10 flex flex-col items-center gap-4 text-center">
                <img
                  src={profile.fatPetImageUrl}
                  className="w-full max-w-sm aspect-square rounded-2xl object-cover border-4 border-primary/30"
                  alt="fat pet"
                />
                <p className="text-muted-foreground">Your pet is full! Come back when your words are due for review.</p>
              </CardContent>
            </Card>
            </>
          ) : (
            // Nothing due — show Play anyway button
            <>
            <Card>
              <CardContent className="py-10 flex flex-col items-center gap-4 text-center">
                <p className="text-muted-foreground">Nothing due right now. Your pet is happy!</p>
                <Button
                  onClick={() => setShowFatConfirm(true)}
                  disabled={isFatGenerating || !profile.petImageUrl}
                >
                  {isFatGenerating ? <><Loader2 className="animate-spin mr-2 h-4 w-4" /> Generating...</> : 'Play anyway'}
                </Button>
              </CardContent>
            </Card>
            </>
          )}
        </TabsContent> {/* end play */}

        <TabsContent value="shop">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-headline font-bold primary-gradient-text">
                <ShoppingBag className="w-5 h-5" />
                Pet Shop
              </CardTitle>
              <CardDescription>
                Browse and buy accessories for your pet using Dorks!
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {isLoadingShop ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : shopItems.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No accessories available yet. Check back soon!
                </div>
              ) : (
                <div className="space-y-6">
                  {/* View Toggle */}
                  <div className="flex gap-2">
                    <Button
                      variant={shopViewBy === 'collections' ? 'default' : 'outline'}
                      onClick={() => setShopViewBy('collections')}
                      size="sm"
                    >
                      Collections
                    </Button>
                    <Button
                      variant={shopViewBy === 'items' ? 'default' : 'outline'}
                      onClick={() => setShopViewBy('items')}
                      size="sm"
                    >
                      Items
                    </Button>
                    <Button
                      variant={shopViewBy === 'price' ? 'default' : 'outline'}
                      onClick={() => setShopViewBy('price')}
                      size="sm"
                    >
                      Price
                    </Button>
                  </div>

                  {/* Items View - Flat Grid */}
                  {shopViewBy === 'items' && (
                    <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                      {shopItems.map((item) => {
                        const itemPrice = typeof item.price === 'number' ? item.price : 0;
                        const isOwned = profile.ownedAccessories?.includes(item.id);
                        const isOutOfStock = item.stock <= 0;
                        const canBuy = (profile.dorkBalance ?? 0) >= itemPrice && !isOutOfStock;

                        return (
                          <Card key={item.id} className="flex flex-col overflow-hidden">
                            <CardContent className="p-4 flex-1 flex flex-col">
                              {/* Accessory Image */}
                              <div className="relative w-full aspect-square mb-3 bg-white rounded-lg overflow-hidden flex items-center justify-center border border-gray-100">
                                {item.imageUrl ? (
                                  <Image
                                    src={item.imageUrl}
                                    alt={item.name}
                                    fill
                                    className="object-contain p-2"
                                  />
                                ) : (
                                  <div className="text-muted-foreground">No image</div>
                                )}
                              </div>

                              {/* Name & Description */}
                              <h3 className="font-semibold">{item.name}</h3>
                              <p className="text-sm text-muted-foreground mb-3 flex-1">
                                {item.description}
                              </p>

                              {/* Price & Stock */}
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-1">
                                  <Coins className="w-4 h-4 text-yellow-500" />
                                  <span className="font-semibold text-yellow-600">
                                    {formatDorks(itemPrice)}
                                  </span>
                                </div>
                                <Badge
                                  variant={item.stock > 0 ? 'default' : 'destructive'}
                                >
                                  {item.stock > 0 ? `${item.stock} in stock` : 'Out of stock'}
                                </Badge>
                              </div>

                              {/* Status & Button */}
                              {isOwned && (
                                <Badge variant="outline" className="mb-2 w-full justify-center">
                                  ✓ Owned
                                </Badge>
                              )}

                              <Button
                                onClick={() => handleBuyAccessory(item.id)}
                                disabled={
                                  !canBuy ||
                                  isBuyingAccessory ||
                                  !profile.petImageUrl ||
                                  !profile.petState ||
                                  profile.petState !== 'hatched'
                                }
                                className="w-full"
                              >
                                {isBuyingAccessory && selectedAccessoryId === item.id ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    Buying...
                                  </>
                                ) : !profile.petImageUrl ||
                                !profile.petState ||
                                profile.petState !== 'hatched'
                                  ? 'Hatch a pet first'
                                  : isOutOfStock
                                  ? 'Out of stock'
                                  : !canBuy
                                  ? `Need ${itemPrice - profile.xp} more XP`
                                  : 'Buy'}
                              </Button>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}

                  {/* Collections View - Grouped */}
                  {shopViewBy === 'collections' && (
                    <div className="space-y-4">
                      {Array.from(
                        shopItems.reduce((map, item) => {
                          const collection = item.collection || 'Uncategorized';
                          if (!map.has(collection)) map.set(collection, []);
                          map.get(collection)!.push(item);
                          return map;
                        }, new Map<string, PetShopItem[]>())
                      )
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([collectionName, collectionItems]) => {
                          const isExpanded = expandedCollections.has(collectionName);
                          return (
                            <div key={collectionName} className="space-y-3">
                              <button
                                type="button"
                                onClick={() => toggleCollection(collectionName)}
                                className="w-full flex items-center gap-3 bg-gradient-to-r from-purple-400 via-pink-300 to-purple-500 text-white px-4 py-3 rounded-lg font-bold hover:shadow-lg transition-all text-left"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-5 w-5 flex-shrink-0" />
                                ) : (
                                  <ChevronRight className="h-5 w-5 flex-shrink-0" />
                                )}
                                {(() => {
                                  const iconType = collectionMetadata[collectionName] || 'default';
                                  const IconComponent = getCollectionIcon(iconType);
                                  return <IconComponent className="h-5 w-5 flex-shrink-0" />;
                                })()}
                                <span className="flex-1">{collectionName}</span>
                                <Badge className="bg-white text-purple-600 font-bold flex-shrink-0">
                                  {collectionItems.length}
                                </Badge>
                              </button>
                              {isExpanded && (
                                <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                                  {collectionItems.map((item) => {
                                    const itemPrice = typeof item.price === 'number' ? item.price : 0;
                                    const isOwned = profile.ownedAccessories?.includes(item.id);
                                    const isOutOfStock = item.stock <= 0;
                                    const canBuy = (profile.dorkBalance ?? 0) >= itemPrice && !isOutOfStock;

                                    return (
                                      <Card key={item.id} className="flex flex-col overflow-hidden">
                                        <CardContent className="p-4 flex-1 flex flex-col">
                                          {/* Accessory Image */}
                                          <div className="relative w-full aspect-square mb-3 bg-white rounded-lg overflow-hidden flex items-center justify-center border border-gray-100">
                                            {item.imageUrl ? (
                                              <Image
                                                src={item.imageUrl}
                                                alt={item.name}
                                                fill
                                                className="object-contain p-2"
                                              />
                                            ) : (
                                              <div className="text-muted-foreground">No image</div>
                                            )}
                                          </div>

                                          {/* Name & Description */}
                                          <h3 className="font-semibold">{item.name}</h3>
                                          <p className="text-sm text-muted-foreground mb-3 flex-1">
                                            {item.description}
                                          </p>

                                          {/* Price & Stock */}
                                          <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-1">
                                              <Coins className="w-4 h-4 text-yellow-500" />
                                              <span className="font-semibold text-yellow-600">
                                                {formatDorks(itemPrice)}
                                              </span>
                                            </div>
                                            <Badge
                                              variant={item.stock > 0 ? 'default' : 'destructive'}
                                            >
                                              {item.stock > 0 ? `${item.stock} in stock` : 'Out of stock'}
                                            </Badge>
                                          </div>

                                          {/* Status & Button */}
                                          {isOwned && (
                                            <Badge variant="outline" className="mb-2 w-full justify-center">
                                              ✓ Owned
                                            </Badge>
                                          )}

                                          <Button
                                            onClick={() => handleBuyAccessory(item.id)}
                                            disabled={
                                              !canBuy ||
                                              isBuyingAccessory ||
                                              !profile.petImageUrl ||
                                              !profile.petState ||
                                              profile.petState !== 'hatched'
                                            }
                                            className="w-full"
                                          >
                                            {isBuyingAccessory && selectedAccessoryId === item.id ? (
                                              <>
                                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                Buying...
                                              </>
                                            ) : !profile.petImageUrl ||
                                            !profile.petState ||
                                            profile.petState !== 'hatched'
                                              ? 'Hatch a pet first'
                                              : isOutOfStock
                                              ? 'Out of stock'
                                              : !canBuy
                                              ? `Need ${itemPrice - profile.xp} more XP`
                                              : 'Buy'}
                                          </Button>
                                        </CardContent>
                                      </Card>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}

                  {/* Price View - Sorted by Price */}
                  {shopViewBy === 'price' && (
                    <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                      {[...shopItems]
                        .sort((a, b) => {
                          const priceA = typeof a.price === 'number' ? a.price : 0;
                          const priceB = typeof b.price === 'number' ? b.price : 0;
                          return priceA - priceB;
                        })
                        .map((item) => {
                          const itemPrice = typeof item.price === 'number' ? item.price : 0;
                          const isOwned = profile.ownedAccessories?.includes(item.id);
                          const isOutOfStock = item.stock <= 0;
                          const canBuy = (profile.dorkBalance ?? 0) >= itemPrice && !isOutOfStock;

                          return (
                            <Card key={item.id} className="flex flex-col overflow-hidden">
                              <CardContent className="p-4 flex-1 flex flex-col">
                                {/* Accessory Image */}
                                <div className="relative w-full aspect-square mb-3 bg-white rounded-lg overflow-hidden flex items-center justify-center border border-gray-100">
                                  {item.imageUrl ? (
                                    <Image
                                      src={item.imageUrl}
                                      alt={item.name}
                                      fill
                                      className="object-contain p-2"
                                    />
                                  ) : (
                                    <div className="text-muted-foreground">No image</div>
                                  )}
                                </div>

                                {/* Name & Description */}
                                <h3 className="font-semibold">{item.name}</h3>
                                <p className="text-sm text-muted-foreground mb-3 flex-1">
                                  {item.description}
                                </p>

                                {/* Price & Stock */}
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-1">
                                    <Coins className="w-4 h-4 text-yellow-500" />
                                    <span className="font-semibold text-yellow-600">
                                      {formatDorks(itemPrice)}
                                    </span>
                                  </div>
                                  <Badge
                                    variant={item.stock > 0 ? 'default' : 'destructive'}
                                  >
                                    {item.stock > 0 ? `${item.stock} in stock` : 'Out of stock'}
                                  </Badge>
                                </div>

                                {/* Status & Button */}
                                {isOwned && (
                                  <Badge variant="outline" className="mb-2 w-full justify-center">
                                    ✓ Owned
                                  </Badge>
                                )}

                                <Button
                                  onClick={() => handleBuyAccessory(item.id)}
                                  disabled={
                                    !canBuy ||
                                    isBuyingAccessory ||
                                    !profile.petImageUrl ||
                                    !profile.petState ||
                                    profile.petState !== 'hatched'
                                  }
                                  className="w-full"
                                >
                                  {isBuyingAccessory && selectedAccessoryId === item.id ? (
                                    <>
                                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                      Buying...
                                    </>
                                  ) : !profile.petImageUrl ||
                                  !profile.petState ||
                                  profile.petState !== 'hatched'
                                    ? 'Hatch a pet first'
                                    : isOutOfStock
                                    ? 'Out of stock'
                                    : !canBuy
                                    ? `Need ${itemPrice - profile.xp} more XP`
                                    : 'Buy'}
                                </Button>
                              </CardContent>
                            </Card>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="brochures">
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Travel Agent coming soon!
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
