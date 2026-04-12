'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import type { PetlandProfile, Vocabulary, PetShopItem, GeneratedComposite } from '../types';
import { PlaceHolderImages } from '../placeholder-images';
import { mockShopItems, mockBrochures } from '../data';
import { getTodayDateString, calculateHpDecay, isWordDue, XP_PER_MATCH, XP_PER_FLASHCARD } from '../utils';
import { FeedbackOverlay } from './feedback-overlay';
import { HungerAlerts } from './hunger-alerts';
import { generatePetImage, editPetImage, composeAccessoryOnPet } from '../ai/generate-pet-image-flow';

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
import { getPetShopItems, decrementPetShopItemStock } from '@/lib/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

          <div className="grid grid-cols-4 gap-3 max-w-2xl mx-auto">
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
        <div className="grid grid-cols-4 gap-2 max-w-2xl">
          {cards.map((card, index) => (
            <div
              key={card.id}
              className="aspect-square cursor-pointer"
              onClick={() => !isFlipped(index) && flipped.length < 2 && setFlipped((p) => [...p, index])}
            >
              <div
                className={cn(
                  'w-full h-full rounded-lg flex items-center justify-center p-2 transition-all border-2',
                  isFlipped(index) ? 'bg-white border-primary shadow-lg' : 'bg-primary border-transparent'
                )}
              >
                {isFlipped(index) ? (
                  card.imageUrl ? (
                    <img src={card.imageUrl} className="w-full h-full object-contain" alt="icon" />
                  ) : (
                    <span className="font-headline font-bold text-base text-center leading-tight text-slate-700">{card.content}</span>
                  )
                ) : (
                  <svg viewBox="0 0 100 110" className="w-4/5 h-4/5" xmlns="http://www.w3.org/2000/svg">
                    {/* Left leg */}
                    <ellipse cx="40" cy="88" rx="7" ry="5" fill="#e8334a" transform="rotate(-15 40 88)" />
                    {/* Left foot */}
                    <ellipse cx="35" cy="95" rx="8" ry="4" fill="#c9283e" />
                    {/* Right leg */}
                    <ellipse cx="60" cy="88" rx="7" ry="5" fill="#e8334a" transform="rotate(15 60 88)" />
                    {/* Right foot */}
                    <ellipse cx="65" cy="95" rx="8" ry="4" fill="#c9283e" />
                    {/* Body */}
                    <ellipse cx="50" cy="66" rx="22" ry="20" fill="#e8334a" />
                    {/* Yellow belly */}
                    <ellipse cx="50" cy="69" rx="13" ry="13" fill="#f5c842" />
                    {/* Left wing */}
                    <ellipse cx="27" cy="60" rx="10" ry="6" fill="#c9283e" transform="rotate(-30 27 60)" />
                    {/* Right wing */}
                    <ellipse cx="73" cy="60" rx="10" ry="6" fill="#c9283e" transform="rotate(30 73 60)" />
                    {/* Tail */}
                    <path d="M68 76 Q84 84 80 96 Q73 90 68 82 Z" fill="#e8334a" />
                    {/* Head */}
                    <ellipse cx="50" cy="40" rx="19" ry="17" fill="#e8334a" />
                    {/* Left eye white */}
                    <ellipse cx="43" cy="38" rx="6" ry="6" fill="white" />
                    {/* Right eye white */}
                    <ellipse cx="57" cy="38" rx="6" ry="6" fill="white" />
                    {/* Heavy lids - grumpy */}
                    <rect x="37" y="32" width="12" height="6" rx="2" fill="#e8334a" />
                    <rect x="51" y="32" width="12" height="6" rx="2" fill="#e8334a" />
                    {/* Pupils */}
                    <ellipse cx="44" cy="40" rx="3" ry="3" fill="#1a1a1a" />
                    <ellipse cx="57" cy="40" rx="3" ry="3" fill="#1a1a1a" />
                    {/* Snout */}
                    <ellipse cx="50" cy="48" rx="8" ry="5" fill="#d42a3e" />
                    {/* Nostrils */}
                    <ellipse cx="47" cy="48" rx="1.5" ry="1.5" fill="#b01e2e" />
                    <ellipse cx="53" cy="48" rx="1.5" ry="1.5" fill="#b01e2e" />
                    {/* Hat brim */}
                    <ellipse cx="50" cy="24" rx="18" ry="4" fill="#4a2878" />
                    {/* Hat body */}
                    <rect x="36" y="8" width="28" height="17" rx="3" fill="#3d1f6e" />
                    {/* Hat band */}
                    <rect x="36" y="21" width="28" height="4" rx="1" fill="#f5c842" />
                  </svg>
                )}
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
}: {
  profile: PetlandProfile;
  previewImageUrl: string | null;
  onAccept: () => void;
  onReject: () => void;
  onHatch: (wish: string) => void;
  onBuyEgg: () => void;
  isHatching: boolean;
  onStoreYourBling: () => void;
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
            <CardTitle className="text-3xl text-gray-400">Passport</CardTitle>
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
          <CardTitle className="text-3xl">Passport</CardTitle>
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
              <span>Vitals</span>
              <span className="font-mono">
                {profile.hp}/{profile.maxHp}
              </span>
            </Label>
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-destructive" />
              <Progress value={profile.hp} max={profile.maxHp} className="h-4 flex-1" />
            </div>
          </div>

          <div className="p-4 rounded-lg bg-muted/50 border space-y-2">
            <Label className="font-bold text-muted-foreground text-sm">XP & Coins (Dorks)</Label>
            <div className="flex items-center gap-2 font-semibold">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              <span>{profile.xp} XP</span>
            </div>
            <div className="flex items-center gap-4 font-semibold text-sm">
              <Coins className="h-5 w-5 text-yellow-600" />
              <div className="flex gap-3">
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-600" />
                  {profile.dorks?.gold || 0}
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-gray-400 border border-gray-600" />
                  {profile.dorks?.silver || 0}
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-amber-700 border border-amber-900" />
                  {profile.dorks?.copper || 0}
                </span>
              </div>
            </div>
            <div className="text-xs text-muted-foreground italic border-t pt-2 mt-2">Dork Dividend: 10%</div>
          </div>

          {profile.petState === 'egg' && !previewImageUrl && (
            <HatchPet onHatch={onHatch} isHatching={isHatching} />
          )}
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
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-6 w-6 p-0"
              >
                ✕
              </Button>
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
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-6 w-6 p-0"
              >
                ✕
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <div className="space-y-6">
              {(accessoriesByCollection[selectedCollection] || []).map(({ accessoryId, accessory }) => {
                const accessoryComposites = groupedByAccessory[accessoryId] || [];
                if (!accessory) return null;

                return (
                  <div key={accessoryId}>
                    <h3 className="font-semibold text-sm mb-3 text-purple-700">
                      {accessory.name}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {accessoryComposites.map((composite, idx) => (
                        <div key={idx} className="flex flex-col gap-2">
                          <div className="relative aspect-square rounded-lg border-2 border-purple-200 overflow-hidden bg-white">
                            <img
                              src={accessory.imageUrl}
                              alt={accessory.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              className="flex-1 text-xs bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold"
                              onClick={() => {
                                onSelectComposite(composite.imageUrl);
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
                              onClick={() => onDeleteComposite(composite.imageUrl)}
                            >
                              Delete
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground text-center">
                            {new Date(composite.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
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

// --- DEV HP SETTER (development only) ---

function DevHpSetter({ hp, isFat, onSet, onClearFat, onFakeMatch, onSimulateDecay, onResetFlashcards, onRestorePet, onSimulateAccessoryPurchase }: { hp: number; isFat: boolean; onSet: (hp: number) => void; onClearFat: () => void; onFakeMatch: () => void; onSimulateDecay: () => void; onResetFlashcards: () => void; onRestorePet: () => void; onSimulateAccessoryPurchase: () => void }) {
  const [value, setValue] = useState(String(hp));
  return (
    <div className="mt-4 p-3 border border-dashed border-yellow-400 rounded-lg bg-yellow-50 flex items-center gap-3 flex-wrap">
      <span className="text-xs font-bold text-yellow-700 uppercase tracking-wide">DEV</span>
      <Input
        type="number"
        className="w-24 h-7 text-sm"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        min={0}
        max={100}
      />
      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onSet(Math.max(0, Math.min(100, Number(value))))}>
        Set HP
      </Button>
      <Button size="sm" variant="outline" className="h-7 text-xs border-blue-400 text-blue-600 hover:bg-blue-50" onClick={onFakeMatch}>
        Fake Match
      </Button>
      <Button size="sm" variant="outline" className="h-7 text-xs border-orange-400 text-orange-600 hover:bg-orange-50" onClick={onSimulateDecay}>
        Simulate Decay (-10 HP, clears fat)
      </Button>
      <Button size="sm" variant="outline" className="h-7 text-xs border-purple-400 text-purple-600 hover:bg-purple-50" onClick={onResetFlashcards}>
        Reset Flashcards
      </Button>
      <Button size="sm" variant="outline" className="h-7 text-xs border-green-400 text-green-600 hover:bg-green-50" onClick={onRestorePet}>
        Restore Pet
      </Button>
      <Button size="sm" variant="outline" className="h-7 text-xs border-cyan-400 text-cyan-600 hover:bg-cyan-50" onClick={onSimulateAccessoryPurchase}>
        Simulate Buy Accessory
      </Button>
      {isFat && (
        <Button size="sm" variant="outline" className="h-7 text-xs border-red-400 text-red-600 hover:bg-red-50" onClick={onClearFat}>
          Clear Fat (isFat=false)
        </Button>
      )}
    </div>
  );
}

// --- MAIN DASHBOARD ---

interface StudentDashboardProps {
  learnerId: string;
  learnerName: string;
}

const DEFAULT_PROFILE: PetlandProfile = {
  xp: 0,
  hp: 100,
  maxHp: 100,
  dorks: { gold: 0, silver: 0, copper: 0 },
  lastHpUpdate: new Date().toISOString(),
  lastChallengeDate: '',
  isFat: false,
  petState: 'egg',
  petName: '',
  inventory: [],
  unlockedBrochures: [],
};

export default function StudentDashboard({ learnerId, learnerName }: StudentDashboardProps) {
  const { toast } = useToast();
  const [profile, setProfile] = useState<PetlandProfile | null>(null);
  const [vocabulary, setVocabulary] = useState<Vocabulary[]>([]);
  const [profileLoading, setProfileLoading] = useState(true);
  const [isHatching, setIsHatching] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [isNamingPet, setIsNamingPet] = useState(false);
  const [petNameInput, setPetNameInput] = useState('');
  const [matchCompleted, setMatchCompleted] = useState(false);
  const [isRecoveryHatch, setIsRecoveryHatch] = useState(false);
  const [pendingWish, setPendingWish] = useState('');
  const [showFatConfirm, setShowFatConfirm] = useState(false);
  const [isFatGenerating, setIsFatGenerating] = useState(false);
  const [shopItems, setShopItems] = useState<PetShopItem[]>([]);
  const [isLoadingShop, setIsLoadingShop] = useState(false);
  const [isBuyingAccessory, setIsBuyingAccessory] = useState(false);
  const [selectedAccessoryId, setSelectedAccessoryId] = useState<string | null>(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isSelectingAccessoryForPurchase, setIsSelectingAccessoryForPurchase] = useState(false);
  const [shopViewBy, setShopViewBy] = useState<'items' | 'collections' | 'price'>('items');
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set());
  const [collectionMetadata, setCollectionMetadata] = useState<Record<string, string>>({});

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
        const [items, collectionsRes] = await Promise.all([
          getPetShopItems(),
          fetch('/api/petshop/collections')
        ]);
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

      const knewCount = results.filter((r) => r.knew).length;
      toast({
        title: 'Review done!',
        description: `${knewCount}/${results.length} known · +${xp} XP`,
      });
    },
    [profile, vocabulary, learnerId]
  );

  const handleHatch = async (wish: string) => {
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
    const updates: Partial<PetlandProfile> = {
      petState: 'hatched',
      petName: petNameInput.trim(),
      petImageUrl: previewImageUrl,
      petWish: pendingWish,
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
    if (!profile || profile.xp < 500) return;
    await updateDoc(profileRef, {
      xp: profile.xp - 500,
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

    if (profile.xp < itemPrice) {
      toast({
        title: 'Not enough XP',
        description: `You need ${itemPrice} XP but only have ${profile.xp}`,
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
        xp: profile.xp - itemPrice,
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
  // Flashcard: words seen before that are Leitner-due today
  const flashcardVocab = vocabulary.filter((w) => w.lastReviewDate && isWordDue(w, today));

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

      <Tabs defaultValue="home" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="home">
            <BookUser className="mr-2 h-4 w-4" />
            Passport
          </TabsTrigger>
          <TabsTrigger value="play">
            <Gamepad2 className="mr-2 h-4 w-4" />
            Playground
          </TabsTrigger>
          <TabsTrigger value="shop">
            <ShoppingBag className="mr-2 h-4 w-4" />
            Pet Shop
          </TabsTrigger>
          <TabsTrigger value="brochures">
            <MapIcon className="mr-2 h-4 w-4" />
            Travel Agent
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
          />
          {(profile.generatedComposites || []).length > 0 && (
            <>
              <Button
                onClick={() => setIsGalleryOpen(true)}
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
          {process.env.NODE_ENV === 'development' && learnerId === '1SLNgciKQlhKVzE9INPBROgBsEz2' && (
            <DevHpSetter
              hp={profile.hp}
              isFat={!!profile.isFat}
              onSet={(hp) => {
                console.log('Setting HP to:', hp);
                updateDoc(profileRef, { hp, lastHpUpdate: new Date().toISOString() })
                  .then(() => {
                    console.log('HP updated successfully');
                    toast({ title: 'HP Set', description: `HP set to ${hp}` });
                  })
                  .catch((err) => {
                    console.error('HP update failed:', err);
                    toast({ title: 'Error', description: 'Failed to set HP: ' + err.message, variant: 'destructive' });
                  });
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
                console.log('Restoring pet from dead state');
                updateDoc(profileRef, { petState: 'hatched' })
                  .then(() => {
                    console.log('Pet restored successfully');
                    toast({ title: 'Pet Restored', description: 'Your pet has been brought back to life!' });
                  })
                  .catch((err) => {
                    console.error('Pet restore failed:', err);
                    toast({ title: 'Error', description: 'Failed to restore pet: ' + err.message, variant: 'destructive' });
                  });
              }}
              onSimulateAccessoryPurchase={handleSimulateAccessoryPurchase}
            />
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
            // Round 1 — new words exist (requires 4+ for game to work), show Memory Match
            <>
            <MemoryGame vocabulary={unreviewedVocab} onGameComplete={handleGameComplete} />
            </>
          ) : flashcardVocab.length > 0 ? (
            // Leitner-due words — show Flashcard Review
            <>
            <FlashcardReview vocabulary={flashcardVocab} onComplete={handleFlashcardComplete} />
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
              <CardTitle className="flex items-center gap-2">
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
                      variant={shopViewBy === 'items' ? 'default' : 'outline'}
                      onClick={() => setShopViewBy('items')}
                      size="sm"
                    >
                      Items
                    </Button>
                    <Button
                      variant={shopViewBy === 'collections' ? 'default' : 'outline'}
                      onClick={() => setShopViewBy('collections')}
                      size="sm"
                    >
                      Collections
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
                        const canBuy = profile.xp >= itemPrice && !isOutOfStock;

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
                                    {itemPrice} XP
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
                                    const canBuy = profile.xp >= itemPrice && !isOutOfStock;

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
                                                {itemPrice} XP
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
                          const canBuy = profile.xp >= itemPrice && !isOutOfStock;

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
                                      {itemPrice} XP
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
