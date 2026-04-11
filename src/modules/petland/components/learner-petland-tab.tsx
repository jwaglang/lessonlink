'use client';

import { useState, useEffect } from 'react';
import type { PetlandProfile, Vocabulary, FeedbackType, PetShopItem } from '../types';
import { db, storage } from '@/lib/firebase';
import {
  doc,
  collection,
  onSnapshot,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { generateVocabIcon, removeTextFromImage, generatePetImage } from '../ai/generate-pet-image-flow';
import { generateSentence } from '../ai/generate-sentence';
import { ref as storageRef, uploadString, getDownloadURL } from 'firebase/storage';
import { createPetShopItem } from '@/lib/firestore';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Heart,
  Sparkles,
  Coins,
  Wand2,
  Loader2,
  Edit,
  Trash2,
  PlusCircle,
  PawPrint,
  RotateCcw,
  ShoppingBag,
} from 'lucide-react';

// Custom SVG treasure chest icon
const TreasureChestIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M2 11h20v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8z" />
    <path d="M2 11V7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4" />
    <path d="M10 11v4" />
    <path d="M14 11v4" />
    <circle cx="12" cy="11" r="1" />
  </svg>
);

async function uploadBase64ToStorage(base64Data: string, path: string): Promise<string> {
  const sRef = storageRef(storage, path);
  const snapshot = await uploadString(sRef, base64Data, 'data_url');
  return getDownloadURL(snapshot.ref);
}

const DEFAULT_PROFILE: Omit<PetlandProfile, 'petName'> & { petName: string } = {
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

interface LearnerPetlandTabProps {
  studentId: string;
  latestSessionInstanceId?: string;
}

export default function LearnerPetlandTab({ studentId, latestSessionInstanceId }: LearnerPetlandTabProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [profile, setProfile] = useState<PetlandProfile | null>(null);
  const [vocabulary, setVocabulary] = useState<Vocabulary[]>([]);
  const [profileLoading, setProfileLoading] = useState(true);

  // Vocab add form
  const [newWord, setNewWord] = useState('');
  const [newSentence, setNewSentence] = useState('');
  const [newLevel, setNewLevel] = useState(1);
  const [newCreatedDate, setNewCreatedDate] = useState<string>(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [previewIconUrl, setPreviewIconUrl] = useState<string | null>(null);
  const [isGeneratingIcon, setIsGeneratingIcon] = useState(false);
  const [isGeneratingSentence, setIsGeneratingSentence] = useState(false);
  const [isRemovingText, setIsRemovingText] = useState(false);

  // Pet Shop Accessory form
  const [accessoryDesc, setAccessoryDesc] = useState('');
  const [accessoryName, setAccessoryName] = useState('');
  const [accessoryStock, setAccessoryStock] = useState(10);
  const [accessoryPrice, setAccessoryPrice] = useState(50);
  const [previewAccessoryUrl, setPreviewAccessoryUrl] = useState<string | null>(null);
  const [isGeneratingAccessory, setIsGeneratingAccessory] = useState(false);
  const [isCreatingItem, setIsCreatingItem] = useState(false);

  // Edit vocab
  const [isEditVocabOpen, setIsEditVocabOpen] = useState(false);
  const [editingVocab, setEditingVocab] = useState<Partial<Vocabulary> | null>(null);

  // Edit stats
  const [isEditStatsOpen, setIsEditStatsOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<PetlandProfile>>({});

  const profileRef = doc(db, 'students', studentId, 'petland', 'profile');

  // Live subscribe to profile
  useEffect(() => {
    const unsub = onSnapshot(profileRef, (snap) => {
      setProfile(snap.exists() ? (snap.data() as PetlandProfile) : null);
      setProfileLoading(false);
    });
    return () => unsub();
  }, [studentId]);

  // Live subscribe to vocabulary
  useEffect(() => {
    const vocabCollection = collection(db, 'students', studentId, 'vocabulary');
    const unsub = onSnapshot(vocabCollection, (snap) => {
      setVocabulary(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Vocabulary)));
    });
    return () => unsub();
  }, [studentId]);

  const handleActivate = async () => {
    try {
      await setDoc(profileRef, DEFAULT_PROFILE);
      toast({ title: 'Petland activated!', description: 'A new pet egg is waiting for this learner.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Activation failed' });
    }
  };

  const handleResetPet = async () => {
    try {
      deleteObject(ref(storage, `pets/${studentId}/pet.png`)).catch(() => {});
      deleteObject(ref(storage, `pets/${studentId}/fat-pet.png`)).catch(() => {});
      deleteObject(ref(storage, `pets/${studentId}/thin-pet.png`)).catch(() => {});
      deleteObject(ref(storage, `pets/${studentId}/starving-pet.png`)).catch(() => {});
      await updateDoc(profileRef, {
        petState: 'egg',
        petName: '',
        petImageUrl: null,
        fatPetImageUrl: null,
        thinPetImageUrl: null,
        starvingPetImageUrl: null,
        petWish: null,
        isFat: false,
      });
      toast({ title: 'Pet reset', description: 'The learner can hatch a new pet.' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Reset failed' });
    }
  };

  const sendFeedback = async (type: FeedbackType) => {
    if (!profile) return;
    const finalXp =
      type === 'treasure' ? Math.floor(Math.random() * (50 - 10 + 1)) + 10 : type === 'wow' ? 5 : 0;
    try {
      await updateDoc(profileRef, {
        xp: profile.xp + finalXp,
        lastFeedback: { type, timestamp: new Date().toISOString() },
      });
      toast({ title: 'Feedback sent!', description: finalXp > 0 ? `Awarded ${finalXp} XP!` : undefined });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Failed to send feedback' });
    }
  };

  const handleGenerateIcon = async () => {
    const wordForPrompt = isEditVocabOpen ? editingVocab?.word : newWord;
    if (!wordForPrompt) return;
    setIsGeneratingIcon(true);
    try {
      const imageDataUri = await generateVocabIcon(wordForPrompt);
      const url = await uploadBase64ToStorage(imageDataUri, `vocabulary/icons/${crypto.randomUUID().slice(0, 8)}.png`);
      if (isEditVocabOpen && editingVocab) {
        setEditingVocab((v) => ({ ...v, imageUrl: url }));
      } else {
        setPreviewIconUrl(url);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const isTooManyRequests = errorMsg.includes('429');
      console.error('[handleGenerateIcon] Error:', err);
      toast({ 
        variant: 'destructive', 
        title: isTooManyRequests ? 'Rate limited' : 'AI busy',
        description: isTooManyRequests ? 'Please wait a moment and try again.' : 'Try again in a moment.' 
      });
    }
    setIsGeneratingIcon(false);
  };

  const handleGenerateSentence = async () => {
    const wordForPrompt = isEditVocabOpen ? editingVocab?.word : newWord;
    const levelForPrompt = isEditVocabOpen ? (editingVocab?.level ?? 1) : newLevel;
    if (!wordForPrompt) return;
    setIsGeneratingSentence(true);
    try {
      const sentence = await generateSentence(wordForPrompt, levelForPrompt);
      if (isEditVocabOpen && editingVocab) {
        setEditingVocab((v) => ({ ...v, sentence }));
      } else {
        setNewSentence(sentence);
      }
    } catch {
      toast({ variant: 'destructive', title: 'AI busy', description: 'Try again in a moment.' });
    }
    setIsGeneratingSentence(false);
  };

  const handleRemoveTextFromIcon = async () => {
    const imageUrl = isEditVocabOpen ? editingVocab?.imageUrl : previewIconUrl;
    if (!imageUrl) return;
    setIsRemovingText(true);
    try {
      // imageUrl might be a storage URL or data URL
      let imageDataUri = imageUrl;
      
      // If it's a storage URL, fetch and convert to data URL
      if (imageUrl.startsWith('http')) {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const reader = new FileReader();
        imageDataUri = await new Promise((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(blob);
        });
      }
      
      const cleanedImage = await removeTextFromImage(imageDataUri);
      const url = await uploadBase64ToStorage(cleanedImage, `vocabulary/icons/${crypto.randomUUID().slice(0, 8)}.png`);
      
      if (isEditVocabOpen && editingVocab) {
        setEditingVocab((v) => ({ ...v, imageUrl: url }));
      } else {
        setPreviewIconUrl(url);
      }
      
      toast({ variant: 'default', title: 'Text removed', description: 'Icon has been cleaned.' });
    } catch (err) {
      console.error('[handleRemoveTextFromIcon] Error:', err);
      toast({ 
        variant: 'destructive', 
        title: 'Failed to remove text',
        description: err instanceof Error ? err.message : 'Try again later.' 
      });
    }
    setIsRemovingText(false);
  };

  const handleAddWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord) return;
    try {
      await addDoc(collection(db, 'students', studentId, 'vocabulary'), {
        word: newWord,
        sentence: newSentence,
        level: Number(newLevel),
        imageUrl: previewIconUrl || '',
        type: Number(newLevel) > 3 ? 'cloze' : 'basic',
        srsLevel: 1,
        lastReviewDate: null,
        sessionInstanceId: latestSessionInstanceId ?? null,
        questionPrompt: '',
        createdDate: newCreatedDate,
        createdAt: new Date().toISOString(),
      });
      setNewWord('');
      setNewSentence('');
      setNewLevel(1);
      setPreviewIconUrl(null);
      // Reset date to today
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      setNewCreatedDate(`${year}-${month}-${day}`);
      toast({ title: 'Word saved!' });
    } catch {
      toast({ variant: 'destructive', title: 'Failed to save word' });
    }
  };

  const handleUpdateWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVocab?.id) return;
    try {
      const vocabRef = doc(db, 'students', studentId, 'vocabulary', editingVocab.id);
      await updateDoc(vocabRef, {
        word: editingVocab.word,
        sentence: editingVocab.sentence,
        level: Number(editingVocab.level),
        imageUrl: editingVocab.imageUrl || '',
        createdDate: editingVocab.createdDate,
      });
      toast({ title: 'Word updated!' });
      setIsEditVocabOpen(false);
      setEditingVocab(null);
    } catch {
      toast({ variant: 'destructive', title: 'Failed to update word' });
    }
  };

  const handleDeleteWord = async (vocabId: string) => {
    try {
      await deleteDoc(doc(db, 'students', studentId, 'vocabulary', vocabId));
      toast({ title: 'Word deleted' });
    } catch {
      toast({ variant: 'destructive', title: 'Failed to delete word' });
    }
  };

  const handleSaveStats = async () => {
    if (!editForm) return;
    try {
      await updateDoc(profileRef, {
        xp: Number(editForm.xp ?? profile?.xp ?? 0),
        hp: Number(editForm.hp ?? profile?.hp ?? 100),
        petName: editForm.petName ?? profile?.petName ?? '',
        petState: editForm.petState ?? profile?.petState ?? 'egg',
        dorks: {
          gold: Number(editForm.dorks?.gold ?? 0),
          silver: Number(editForm.dorks?.silver ?? 0),
          copper: Number(editForm.dorks?.copper ?? 0),
        },
      });
      toast({ title: 'Stats updated!' });
      setIsEditStatsOpen(false);
    } catch {
      toast({ variant: 'destructive', title: 'Failed to update stats' });
    }
  };

  const handleGenerateAccessory = async () => {
    if (!accessoryDesc) {
      toast({ variant: 'destructive', title: 'Description required' });
      return;
    }
    setIsGeneratingAccessory(true);
    try {
      // Use generatePetImage with a modified prompt for accessories
      const accessoryPrompt = `Studio Ghibli-style hand-drawn animation. A single accessory item that a cute pet would wear or use. Description: ${accessoryDesc}. The item should be detailed, recognizable, and whimsical. Centered composition, soft natural colors, clean lines. Item only—no background or pet visible.`;
      const base64Data = await generatePetImage(accessoryPrompt);
      const url = await uploadBase64ToStorage(base64Data, `vocabulary/shop/${crypto.randomUUID().slice(0, 8)}.png`);
      setPreviewAccessoryUrl(url);
      toast({ title: 'Accessory image generated!' });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      toast({ variant: 'destructive', title: 'Generation failed', description: errorMsg });
    }
    setIsGeneratingAccessory(false);
  };

  const handleCreateAccessoryItem = async () => {
    if (!user?.uid) {
      toast({ variant: 'destructive', title: 'Not authenticated' });
      return;
    }
    if (!accessoryName || !previewAccessoryUrl) {
      toast({ variant: 'destructive', title: 'Missing name or image' });
      return;
    }
    setIsCreatingItem(true);
    try {
      await createPetShopItem(
        {
          name: accessoryName,
          description: accessoryDesc,
          imageUrl: previewAccessoryUrl,
          price: accessoryPrice,
          stock: accessoryStock,
        },
        user.uid
      );
      toast({ title: 'Accessory created!', description: `"${accessoryName}" added to Pet Shop` });
      // Reset form
      setAccessoryDesc('');
      setAccessoryName('');
      setAccessoryStock(10);
      setAccessoryPrice(50);
      setPreviewAccessoryUrl(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      toast({ variant: 'destructive', title: 'Failed to create accessory', description: errorMsg });
    }
    setIsCreatingItem(false);
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-sm text-muted-foreground">Loading Petland data...</p>
      </div>
    );
  }

  // Not activated yet
  if (!profile) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <PawPrint className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">Petland is not activated for this learner yet.</p>
          <Button onClick={handleActivate}>Activate Petland</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Stats Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <PawPrint className="h-5 w-5" />
            Pet Status
          </CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditForm({
                  xp: profile.xp,
                  hp: profile.hp,
                  petName: profile.petName,
                  petState: profile.petState,
                  dorks: { ...profile.dorks },
                });
                setIsEditStatsOpen(true);
              }}
            >
              <Edit className="h-3 w-3 mr-1" /> Edit Stats
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                  <RotateCcw className="h-3 w-3 mr-1" /> Reset Pet
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset this learner's pet?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will delete the current pet image and return the learner to egg state. They can hatch a new pet. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetPet} className="bg-destructive hover:bg-destructive/90">
                    Yes, reset pet
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
          <div>
            <p className="text-xs text-muted-foreground">Pet Name</p>
            <p className="font-semibold">{profile.petName || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">State</p>
            <Badge variant="outline">{profile.petState}</Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">XP</p>
            <div className="flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-yellow-500" />
              <span className="font-semibold">{profile.xp}</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">HP</p>
            <div className="flex items-center gap-1">
              <Heart className="h-3.5 w-3.5 text-destructive" />
              <span className="font-semibold">
                {profile.hp}/{profile.maxHp}
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Dorks</p>
            <div className="flex gap-2 text-sm font-semibold">
              <span className="flex items-center gap-0.5">
                <Coins className="h-3 w-3 text-yellow-500" />
                {profile.dorks?.gold || 0}g
              </span>
              <span className="flex items-center gap-0.5">
                <Coins className="h-3 w-3 text-gray-400" />
                {profile.dorks?.silver || 0}s
              </span>
              <span className="flex items-center gap-0.5">
                <Coins className="h-3 w-3 text-amber-700" />
                {profile.dorks?.copper || 0}c
              </span>
            </div>
          </div>
          {profile.petImageUrl && (
            <div className="col-span-2 md:col-span-1">
              <p className="text-xs text-muted-foreground mb-1">Pet</p>
              <img
                src={profile.petImageUrl}
                alt="pet"
                className="w-16 h-16 rounded-full object-cover border-2 border-primary/30"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Real-Time Feedback */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Real-Time Feedback</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={() => sendFeedback('wow')} className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Wow! (+5 XP)
          </Button>
          <Button onClick={() => sendFeedback('brainfart')} variant="outline" className="flex items-center gap-2">
            💩 Brainfart
          </Button>
          <Button onClick={() => sendFeedback('treasure')} variant="outline" className="flex items-center gap-2">
            <TreasureChestIcon className="h-4 w-4" /> Treasure Chest (10–50 XP)
          </Button>
        </CardContent>
      </Card>

      {/* Vocabulary Management */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Add Word */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add Vocabulary Word</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddWord} className="space-y-4">
              <div>
                <Label>Word</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={newWord}
                    onChange={(e) => setNewWord(e.target.value)}
                    required
                    placeholder="Apple"
                  />
                  <Button
                    type="button"
                    onClick={handleGenerateIcon}
                    disabled={isGeneratingIcon || !newWord}
                    size="icon"
                    variant="outline"
                  >
                    {isGeneratingIcon ? <Loader2 className="animate-spin h-4 w-4" /> : <Wand2 className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              {previewIconUrl && (
                <div className="flex flex-col items-center gap-2">
                  <img
                    src={previewIconUrl}
                    className="w-24 h-24 rounded-lg border object-contain bg-white"
                    alt="AI icon"
                  />
                  <Button
                    type="button"
                    onClick={handleRemoveTextFromIcon}
                    disabled={isRemovingText}
                    size="sm"
                    variant="outline"
                    title="Remove text from icon (if visible)"
                  >
                    {isRemovingText ? <Loader2 className="animate-spin h-3 w-3 mr-1" /> : <Wand2 className="h-3 w-3 mr-1" />}
                    Remove Text
                  </Button>
                </div>
              )}
              <div>
                <Label>Sentence</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={newSentence}
                    onChange={(e) => setNewSentence(e.target.value)}
                    placeholder="The apple is red."
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={handleGenerateSentence}
                    disabled={isGeneratingSentence || !newWord}
                    size="icon"
                    variant="outline"
                    title="Generate sentence with AI"
                  >
                    {isGeneratingSentence ? <Loader2 className="animate-spin h-4 w-4" /> : <Wand2 className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div>
                <Label>Level</Label>
                <Input
                  type="number"
                  value={newLevel}
                  onChange={(e) => setNewLevel(Number(e.target.value))}
                  min={1}
                  className="mt-1 w-24"
                />
              </div>
              <div>
                <Label>Created Date</Label>
                <Input
                  type="date"
                  value={newCreatedDate}
                  onChange={(e) => setNewCreatedDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              {newWord && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Card Preview</Label>
                  <div className="w-32 h-32 rounded-lg flex items-center justify-center p-2 bg-white border-2 border-primary shadow-lg mx-auto">
                    {previewIconUrl ? (
                      <img src={previewIconUrl} className="w-full h-full object-contain" alt="card preview" />
                    ) : (
                      <span className="font-bold text-center leading-tight text-slate-700 text-sm">{newWord}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    {new Date(newCreatedDate + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              )}
              <Button type="submit" className="w-full">
                <PlusCircle className="mr-2 h-4 w-4" /> Save Word
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Word List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vocabulary List ({vocabulary.length} words)</CardTitle>
          </CardHeader>
          <CardContent>
            {vocabulary.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No words yet. Add some above.</p>
            ) : (
              <div className="divide-y max-h-96 overflow-y-auto">
                {vocabulary.map((v) => (
                  <div key={v.id} className="py-2 flex justify-between items-center gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {v.imageUrl && (
                        <img src={v.imageUrl} className="w-8 h-8 rounded object-contain bg-white border flex-shrink-0" alt="" />
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{v.word}</p>
                        <p className="text-xs text-muted-foreground truncate">{v.sentence}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => {
                          setEditingVocab(v);
                          setIsEditVocabOpen(true);
                        }}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete "{v.word}"?</AlertDialogTitle>
                            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteWord(v.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Vocab Dialog */}
      <Dialog open={isEditVocabOpen} onOpenChange={setIsEditVocabOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Word</DialogTitle>
            <DialogDescription>Make changes to "{editingVocab?.word}".</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateWord} className="space-y-4 py-2">
            <div>
              <Label>Word</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={editingVocab?.word ?? ''}
                  onChange={(e) => setEditingVocab((v) => ({ ...v, word: e.target.value }))}
                />
                <Button
                  type="button"
                  onClick={handleGenerateIcon}
                  disabled={isGeneratingIcon}
                  size="icon"
                  variant="outline"
                >
                  {isGeneratingIcon ? <Loader2 className="animate-spin h-4 w-4" /> : <Wand2 className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            {editingVocab?.imageUrl && (
              <div className="flex flex-col items-center gap-2">
                <img
                  src={editingVocab.imageUrl}
                  className="w-24 h-24 rounded-lg border object-contain bg-white"
                  alt="icon"
                />
                <Button
                  type="button"
                  onClick={handleRemoveTextFromIcon}
                  disabled={isRemovingText}
                  size="sm"
                  variant="outline"
                  title="Remove text from icon (if visible)"
                >
                  {isRemovingText ? <Loader2 className="animate-spin h-3 w-3 mr-1" /> : <Wand2 className="h-3 w-3 mr-1" />}
                  Remove Text
                </Button>
              </div>
            )}
            <div>
              <Label>Sentence</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={editingVocab?.sentence ?? ''}
                  onChange={(e) => setEditingVocab((v) => ({ ...v, sentence: e.target.value }))}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={handleGenerateSentence}
                  disabled={isGeneratingSentence || !editingVocab?.word}
                  size="icon"
                  variant="outline"
                  title="Generate sentence with AI"
                >
                  {isGeneratingSentence ? <Loader2 className="animate-spin h-4 w-4" /> : <Wand2 className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div>
              <Label>Level</Label>
              <Input
                type="number"
                value={editingVocab?.level ?? 1}
                onChange={(e) => setEditingVocab((v) => ({ ...v, level: Number(e.target.value) }))}
                className="mt-1 w-24"
              />
            </div>
            <div>
              <Label>Created Date</Label>
              <Input
                type="date"
                value={editingVocab?.createdDate ?? ''}
                onChange={(e) => setEditingVocab((v) => ({ ...v, createdDate: e.target.value }))}
                className="mt-1"
              />
            </div>
            {editingVocab?.word && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Card Preview</Label>
                <div className="w-32 h-32 rounded-lg flex items-center justify-center p-2 bg-white border-2 border-primary shadow-lg mx-auto">
                  {editingVocab.imageUrl ? (
                    <img src={editingVocab.imageUrl} className="w-full h-full object-contain" alt="card preview" />
                  ) : (
                    <span className="font-bold text-center leading-tight text-slate-700 text-sm">{editingVocab.word}</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  {editingVocab.createdDate
                    ? new Date(editingVocab.createdDate + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                    : 'No date'}
                </p>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditVocabOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Stats Dialog */}
      <Dialog open={isEditStatsOpen} onOpenChange={setIsEditStatsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Pet Stats</DialogTitle>
            <DialogDescription>Manually adjust this learner's Petland stats.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>XP</Label>
                <Input
                  type="number"
                  value={editForm.xp ?? 0}
                  onChange={(e) => setEditForm((f) => ({ ...f, xp: Number(e.target.value) }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>HP</Label>
                <Input
                  type="number"
                  value={editForm.hp ?? 100}
                  onChange={(e) => setEditForm((f) => ({ ...f, hp: Number(e.target.value) }))}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Dorks</Label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                <Input
                  type="number"
                  placeholder="Gold"
                  value={editForm.dorks?.gold ?? 0}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, dorks: { ...(f.dorks ?? { gold: 0, silver: 0, copper: 0 }), gold: Number(e.target.value) } }))
                  }
                />
                <Input
                  type="number"
                  placeholder="Silver"
                  value={editForm.dorks?.silver ?? 0}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, dorks: { ...(f.dorks ?? { gold: 0, silver: 0, copper: 0 }), silver: Number(e.target.value) } }))
                  }
                />
                <Input
                  type="number"
                  placeholder="Copper"
                  value={editForm.dorks?.copper ?? 0}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, dorks: { ...(f.dorks ?? { gold: 0, silver: 0, copper: 0 }), copper: Number(e.target.value) } }))
                  }
                />
              </div>
            </div>
            <div>
              <Label>Pet Name</Label>
              <Input
                value={editForm.petName ?? ''}
                onChange={(e) => setEditForm((f) => ({ ...f, petName: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Pet State</Label>
              <Select
                value={editForm.petState ?? 'egg'}
                onValueChange={(v) => setEditForm((f) => ({ ...f, petState: v as 'egg' | 'hatched' | 'dead' }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="egg">Egg</SelectItem>
                  <SelectItem value="hatched">Hatched</SelectItem>
                  <SelectItem value="dead">Dead</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditStatsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveStats}>Save Stats</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pet Shop Accessory Creation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Create Accessory for Pet Shop
          </CardTitle>
          <CardDescription className="text-xs">Design a new pet accessory for learners to purchase with Dorks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Accessory Description</Label>
            <div className="flex gap-2 mt-1">
              <Input
                placeholder="e.g., a wizard hat with stars, a sparkling necklace, colorful crown..."
                value={accessoryDesc}
                onChange={(e) => setAccessoryDesc(e.target.value)}
                disabled={isGeneratingAccessory}
              />
              <Button
                onClick={handleGenerateAccessory}
                disabled={isGeneratingAccessory || !accessoryDesc}
                size="icon"
              >
                {isGeneratingAccessory ? <Loader2 className="animate-spin h-4 w-4" /> : <Wand2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {previewAccessoryUrl && (
            <div className="flex flex-col items-center gap-2">
              <img
                src={previewAccessoryUrl}
                className="w-32 h-32 rounded-lg border object-contain bg-white"
                alt="accessory preview"
              />
              <p className="text-xs text-muted-foreground">Preview</p>
            </div>
          )}

          <div>
            <Label>Accessory Name</Label>
            <Input
              placeholder="e.g., Wizard Hat, Royal Crown, etc."
              value={accessoryName}
              onChange={(e) => setAccessoryName(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Price (in Dorks)</Label>
              <Input
                type="number"
                min="1"
                value={accessoryPrice}
                onChange={(e) => setAccessoryPrice(Number(e.target.value))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Stock Quantity</Label>
              <Input
                type="number"
                min="1"
                value={accessoryStock}
                onChange={(e) => setAccessoryStock(Number(e.target.value))}
                className="mt-1"
              />
            </div>
          </div>

          <Button
            onClick={handleCreateAccessoryItem}
            disabled={isCreatingItem || !previewAccessoryUrl || !accessoryName}
            className="w-full"
          >
            {isCreatingItem ? (
              <>
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
                Creating...
              </>
            ) : (
              <>
                <PlusCircle className="h-4 w-4 mr-2" />
                Create & Add to Shop
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
