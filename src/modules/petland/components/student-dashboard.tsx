'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import type { PetlandProfile, Vocabulary } from '../types';
import { PlaceHolderImages } from '../placeholder-images';
import { mockShopItems, mockBrochures } from '../data';
import { getTodayDateString } from '../utils';
import { FeedbackOverlay } from './feedback-overlay';
import { HungerAlerts } from './hunger-alerts';
import { generatePetImage } from '../ai/generate-pet-image-flow';
import { db, storage } from '@/lib/firebase';
import {
  doc,
  collection,
  onSnapshot,
  updateDoc,
  setDoc,
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
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

  ShoppingBag,
  Map,
  Gamepad2,
  BookUser,
  Wand2,
  Loader2,
  CheckCircle,
  XCircle,
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
  onGameWin,
}: {
  vocabulary: Vocabulary[];
  onGameWin: (xpGained: number, hpGained: number) => void;
}) {
  const [cards, setCards] = useState<
    { id: string; content: string; type: 'word' | 'target'; pairId: string; imageUrl?: string }[]
  >([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [solved, setSolved] = useState<string[]>([]);
  const [gameWon, setGameWon] = useState(false);

  const resetGame = useCallback(() => {
    if (vocabulary.length < 4) {
      setCards([]);
      return;
    }
    const gameVocab = [...vocabulary];
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
    setGameWon(false);
  }, [vocabulary]);

  useEffect(() => {
    resetGame();
  }, [resetGame]);

  useEffect(() => {
    if (flipped.length === 2) {
      const [first, second] = flipped;
      if (cards[first].pairId === cards[second].pairId) {
        setSolved((prev) => [...prev, cards[first].pairId]);
        setFlipped([]);
      } else {
        setTimeout(() => setFlipped([]), 1000);
      }
    }
  }, [flipped, cards]);

  useEffect(() => {
    if (cards.length > 0 && solved.length === cards.length / 2 && !gameWon) {
      onGameWin(solved.length * 5, 10);
      setGameWon(true);
    }
  }, [solved, cards, onGameWin, gameWon]);

  const isFlipped = (index: number) =>
    flipped.includes(index) || solved.includes(cards[index]?.pairId ?? '');

  if (cards.length === 0)
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Ask your teacher to add some words to your list!
        </CardContent>
      </Card>
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Playground: Memory Match!</CardTitle>
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
}: {
  profile: PetlandProfile;
  previewImageUrl: string | null;
  onAccept: () => void;
  onReject: () => void;
  onHatch: (wish: string) => void;
  isHatching: boolean;
}) {
  const eggImage = PlaceHolderImages.find((img) => img.id === 'pet-egg');
  const defaultHatchedImage = PlaceHolderImages.find((img) => img.id === 'pet-hatched');
  const petLevel = Math.floor((profile.xp || 0) / 1000) + 1;

  const imageUrl =
    profile.petState === 'hatched'
      ? profile.petImageUrl || defaultHatchedImage?.imageUrl
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
  isSick: false,
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

  const profileRef = doc(db, 'students', learnerId, 'petland', 'profile');

  // Live subscribe to profile
  useEffect(() => {
    const unsub = onSnapshot(profileRef, (snap) => {
      if (snap.exists()) {
        setProfile(snap.data() as PetlandProfile);
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

  // Live subscribe to vocabulary
  useEffect(() => {
    const vocabRef = collection(db, 'students', learnerId, 'vocabulary');
    const unsub = onSnapshot(vocabRef, (snap) => {
      const words = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Vocabulary));
      setVocabulary(words);
    });
    return () => unsub();
  }, [learnerId]);

  const handleGameWin = useCallback(
    (xp: number, hp: number) => {
      if (!profile) return;
      const today = getTodayDateString();
      updateDoc(profileRef, {
        xp: profile.xp + xp,
        hp: Math.min(profile.maxHp, profile.hp + hp),
        lastChallengeDate: today,
      }).catch(console.error);
      toast({ title: 'Great job!', description: `You earned ${xp} XP and ${hp} HP!` });
    },
    [profile, learnerId]
  );

  const handleHatch = async (wish: string) => {
    setIsHatching(true);
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
    if (!previewImageUrl || !petNameInput) return;
    updateDoc(profileRef, {
      petState: 'hatched',
      petName: petNameInput.trim(),
      petImageUrl: previewImageUrl,
    }).catch(console.error);
    setPreviewImageUrl(null);
    setIsNamingPet(false);
    setPetNameInput('');
  };

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

      <h1 className="text-4xl font-bold mb-6">Hi, {learnerName || 'Learner'}!</h1>

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
            <Map className="mr-2 h-4 w-4" />
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
          />
        </TabsContent>

        <TabsContent value="play">
          <MemoryGame vocabulary={vocabulary} onGameWin={handleGameWin} />
        </TabsContent>

        <TabsContent value="shop">
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Pet Shop coming soon!
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
