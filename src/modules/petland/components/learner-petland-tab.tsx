'use client';

import { useState, useEffect } from 'react';
import type { PetlandProfile, Vocabulary, FeedbackType } from '../types';
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
import { generatePetImage } from '../ai/generate-pet-image-flow';
import { ref as storageRef, uploadString, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  isSick: false,
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
  const [profile, setProfile] = useState<PetlandProfile | null>(null);
  const [vocabulary, setVocabulary] = useState<Vocabulary[]>([]);
  const [profileLoading, setProfileLoading] = useState(true);

  // Vocab add form
  const [newWord, setNewWord] = useState('');
  const [newSentence, setNewSentence] = useState('');
  const [newLevel, setNewLevel] = useState(1);
  const [previewIconUrl, setPreviewIconUrl] = useState<string | null>(null);
  const [isGeneratingIcon, setIsGeneratingIcon] = useState(false);

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
      // Delete pet image from Storage if one exists
      if (profile?.petImageUrl) {
        await deleteObject(ref(storage, `pets/${studentId}/pet.png`)).catch(() => {});
      }
      await updateDoc(profileRef, {
        petState: 'egg',
        petName: '',
        petImageUrl: null,
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
      const aiPrompt = `A simple icon of ${wordForPrompt} on white background.`;
      const imageDataUri = await generatePetImage(aiPrompt);
      const url = await uploadBase64ToStorage(imageDataUri, `vocabulary/icons/${crypto.randomUUID().slice(0, 8)}.png`);
      if (isEditVocabOpen && editingVocab) {
        setEditingVocab((v) => ({ ...v, imageUrl: url }));
      } else {
        setPreviewIconUrl(url);
      }
    } catch {
      toast({ variant: 'destructive', title: 'AI busy', description: 'Try again in a moment.' });
    }
    setIsGeneratingIcon(false);
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
        createdAt: new Date().toISOString(),
      });
      setNewWord('');
      setNewSentence('');
      setNewLevel(1);
      setPreviewIconUrl(null);
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
                <img
                  src={previewIconUrl}
                  className="w-24 h-24 rounded-lg mx-auto border object-contain bg-white"
                  alt="AI icon"
                />
              )}
              <div>
                <Label>Sentence</Label>
                <Input
                  value={newSentence}
                  onChange={(e) => setNewSentence(e.target.value)}
                  placeholder="The apple is red."
                  className="mt-1"
                />
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
              <img
                src={editingVocab.imageUrl}
                className="w-24 h-24 rounded-lg mx-auto border object-contain bg-white"
                alt="icon"
              />
            )}
            <div>
              <Label>Sentence</Label>
              <Input
                value={editingVocab?.sentence ?? ''}
                onChange={(e) => setEditingVocab((v) => ({ ...v, sentence: e.target.value }))}
                className="mt-1"
              />
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
    </div>
  );
}
