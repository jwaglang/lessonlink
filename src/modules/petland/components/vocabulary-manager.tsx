'use client';

import { useState, useEffect } from 'react';
import type { Vocabulary } from '../types';
import { db, storage } from '@/lib/firebase';
import {
  doc,
  collection,
  onSnapshot,
  updateDoc,
  addDoc,
  deleteDoc,
} from 'firebase/firestore';
import { ref as storageRef, uploadString, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { generateVocabIcon } from '../ai/generate-pet-image-flow';
import { generateSentence } from '../ai/generate-sentence';
import { getSessionVocabularyByInstanceId } from '@/lib/firestore';
import type { SessionVocabulary } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Wand2, Loader2, Edit, Trash2, PlusCircle, Download } from 'lucide-react';

async function uploadBase64ToStorage(base64Data: string, path: string): Promise<string> {
  const sRef = storageRef(storage, path);
  const snapshot = await uploadString(sRef, base64Data, 'data_url');
  return getDownloadURL(snapshot.ref);
}

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface VocabularyManagerProps {
  studentId: string;
  latestSessionInstanceId?: string;
  prefill?: { word: string; meaning: string } | null;
  onPrefillConsumed?: () => void;
}

export default function VocabularyManager({ studentId, latestSessionInstanceId, prefill, onPrefillConsumed }: VocabularyManagerProps) {
  const { toast } = useToast();
  const [vocabulary, setVocabulary] = useState<Vocabulary[]>([]);
  const [sessionWords, setSessionWords] = useState<SessionVocabulary[]>([]);
  const [dismissedSessionWords, setDismissedSessionWords] = useState<Set<string>>(new Set());

  // Add form
  const [newWord, setNewWord] = useState('');
  const [newSentence, setNewSentence] = useState('');
  const [newLevel, setNewLevel] = useState(1);
  const [newCreatedDate, setNewCreatedDate] = useState(todayString);
  const [newTopic, setNewTopic] = useState('');
  const [previewIconUrl, setPreviewIconUrl] = useState<string | null>(null);
  const [isGeneratingIcon, setIsGeneratingIcon] = useState(false);
  const [isGeneratingSentence, setIsGeneratingSentence] = useState(false);

  // Edit dialog
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingVocab, setEditingVocab] = useState<Partial<Vocabulary> | null>(null);
  const [isEditGeneratingIcon, setIsEditGeneratingIcon] = useState(false);
  const [isEditGeneratingSentence, setIsEditGeneratingSentence] = useState(false);

  useEffect(() => {
    const vocabCollection = collection(db, 'students', studentId, 'vocabulary');
    const unsub = onSnapshot(vocabCollection, (snap) => {
      setVocabulary(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Vocabulary)));
    });
    return () => unsub();
  }, [studentId]);

  // Accept prefill from session cards
  useEffect(() => {
    if (!prefill) return;
    setNewWord(prefill.word);
    setNewSentence(prefill.meaning);
    onPrefillConsumed?.();
  }, [prefill]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!latestSessionInstanceId) return;
    getSessionVocabularyByInstanceId(latestSessionInstanceId)
      .then(setSessionWords)
      .catch(() => {/* silently ignore */});
  }, [latestSessionInstanceId]);

  const handleImportSessionWord = (sw: SessionVocabulary) => {
    setNewWord(sw.word);
    setNewSentence(sw.meaning);
    setDismissedSessionWords(prev => new Set([...prev, sw.word]));
  };

  const handleGenerateIcon = async (forEdit = false) => {
    const word = forEdit ? editingVocab?.word : newWord;
    if (!word) return;
    forEdit ? setIsEditGeneratingIcon(true) : setIsGeneratingIcon(true);
    try {
      const dataUri = await generateVocabIcon(word);
      const url = await uploadBase64ToStorage(dataUri, `vocabulary/icons/${crypto.randomUUID().slice(0, 8)}.png`);
      if (forEdit) {
        setEditingVocab(v => ({ ...v, imageUrl: url }));
      } else {
        setPreviewIconUrl(url);
      }
    } catch (err) {
      const is429 = err instanceof Error && err.message.includes('429');
      toast({ variant: 'destructive', title: is429 ? 'Rate limited' : 'AI busy', description: 'Try again in a moment.' });
    } finally {
      forEdit ? setIsEditGeneratingIcon(false) : setIsGeneratingIcon(false);
    }
  };

  const handleGenerateSentence = async (forEdit = false) => {
    const word = forEdit ? editingVocab?.word : newWord;
    const level = forEdit ? (editingVocab?.level ?? 1) : newLevel;
    if (!word) return;
    forEdit ? setIsEditGeneratingSentence(true) : setIsGeneratingSentence(true);
    try {
      const sentence = await generateSentence(word, level);
      if (forEdit) {
        setEditingVocab(v => ({ ...v, sentence }));
      } else {
        setNewSentence(sentence);
      }
    } catch {
      toast({ variant: 'destructive', title: 'AI busy', description: 'Try again in a moment.' });
    } finally {
      forEdit ? setIsEditGeneratingSentence(false) : setIsGeneratingSentence(false);
    }
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
        topic: newTopic.trim() || null,
      });
      setNewWord('');
      setNewSentence('');
      setNewLevel(1);
      setPreviewIconUrl(null);
      setNewCreatedDate(todayString());
      setNewTopic('');
      toast({ title: 'Word saved!' });
    } catch {
      toast({ variant: 'destructive', title: 'Failed to save word' });
    }
  };

  const handleUpdateWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVocab?.id) return;
    try {
      await updateDoc(doc(db, 'students', studentId, 'vocabulary', editingVocab.id), {
        word: editingVocab.word,
        sentence: editingVocab.sentence,
        level: Number(editingVocab.level),
        imageUrl: editingVocab.imageUrl || '',
        createdDate: editingVocab.createdDate,
        topic: (editingVocab as any).topic?.trim() || null,
      });
      toast({ title: 'Word updated!' });
      setIsEditOpen(false);
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

  const pendingSessionWords = sessionWords.filter(sw => !dismissedSessionWords.has(sw.word));

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Import from session */}
      {pendingSessionWords.length > 0 && (
        <div className="lg:col-span-2">
          <Card className="border-dashed border-2 border-orange-300 bg-orange-50 dark:bg-orange-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Download className="h-4 w-4 text-orange-500" />
                Words from last session — click to import
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {pendingSessionWords.map(sw => (
                  <button
                    key={sw.word}
                    type="button"
                    onClick={() => handleImportSessionWord(sw)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-orange-900/40 border border-orange-300 text-sm hover:bg-orange-100 dark:hover:bg-orange-900/60 transition-colors group"
                  >
                    <span className="font-semibold">{sw.word}</span>
                    <span className="text-muted-foreground text-xs">— {sw.meaning}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Word */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Vocabulary</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddWord} className="space-y-4">
            <div>
              <Label>Word</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={newWord}
                  onChange={e => setNewWord(e.target.value)}
                  required
                  placeholder="Apple"
                />
                <Button
                  type="button"
                  onClick={() => handleGenerateIcon(false)}
                  disabled={isGeneratingIcon || !newWord}
                  size="icon"
                  variant="outline"
                  title="Generate image with AI"
                >
                  {isGeneratingIcon ? <Loader2 className="animate-spin h-4 w-4" /> : <Wand2 className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {previewIconUrl && (
              <img src={previewIconUrl} className="w-24 h-24 rounded-lg mx-auto border object-contain bg-white" alt="AI icon" />
            )}

            <div>
              <Label>Sentence</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={newSentence}
                  onChange={e => setNewSentence(e.target.value)}
                  placeholder="The apple is red."
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={() => handleGenerateSentence(false)}
                  disabled={isGeneratingSentence || !newWord}
                  size="icon"
                  variant="outline"
                  title="Generate sentence with AI"
                >
                  {isGeneratingSentence ? <Loader2 className="animate-spin h-4 w-4" /> : <Wand2 className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="flex gap-4">
              <div>
                <Label>Level</Label>
                <Input
                  type="number"
                  value={newLevel}
                  onChange={e => setNewLevel(Number(e.target.value))}
                  min={1}
                  className="mt-1 w-24"
                />
              </div>
              <div className="flex-1">
                <Label>Created Date</Label>
                <Input
                  type="date"
                  value={newCreatedDate}
                  onChange={e => setNewCreatedDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Topic <span className="text-xs text-muted-foreground font-normal">(optional — e.g. Animals, Food, Colors)</span></Label>
              <Input
                value={newTopic}
                onChange={e => setNewTopic(e.target.value)}
                placeholder="e.g. Animals"
                className="mt-1"
              />
            </div>

            {newWord && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Card Preview</Label>
                <div className="w-32 h-32 rounded-lg flex items-center justify-center p-2 bg-white border-2 border-primary shadow-lg mx-auto">
                  {previewIconUrl
                    ? <img src={previewIconUrl} className="w-full h-full object-contain" alt="preview" />
                    : <span className="font-bold text-center leading-tight text-slate-700 text-sm">{newWord}</span>
                  }
                </div>
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
            <p className="text-sm text-muted-foreground py-4 text-center">No words yet. Add some on the left.</p>
          ) : (
            <div className="divide-y max-h-96 overflow-y-auto">
              {vocabulary.map(v => (
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
                      onClick={() => { setEditingVocab(v); setIsEditOpen(true); }}
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

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
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
                  onChange={e => setEditingVocab(v => ({ ...v, word: e.target.value }))}
                />
                <Button
                  type="button"
                  onClick={() => handleGenerateIcon(true)}
                  disabled={isEditGeneratingIcon}
                  size="icon"
                  variant="outline"
                >
                  {isEditGeneratingIcon ? <Loader2 className="animate-spin h-4 w-4" /> : <Wand2 className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            {editingVocab?.imageUrl && (
              <img src={editingVocab.imageUrl} className="w-24 h-24 rounded-lg mx-auto border object-contain bg-white" alt="icon" />
            )}
            <div>
              <Label>Sentence</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={editingVocab?.sentence ?? ''}
                  onChange={e => setEditingVocab(v => ({ ...v, sentence: e.target.value }))}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={() => handleGenerateSentence(true)}
                  disabled={isEditGeneratingSentence || !editingVocab?.word}
                  size="icon"
                  variant="outline"
                >
                  {isEditGeneratingSentence ? <Loader2 className="animate-spin h-4 w-4" /> : <Wand2 className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="flex gap-4">
              <div>
                <Label>Level</Label>
                <Input
                  type="number"
                  value={editingVocab?.level ?? 1}
                  onChange={e => setEditingVocab(v => ({ ...v, level: Number(e.target.value) }))}
                  className="mt-1 w-24"
                />
              </div>
              <div className="flex-1">
                <Label>Created Date</Label>
                <Input
                  type="date"
                  value={editingVocab?.createdDate ?? ''}
                  onChange={e => setEditingVocab(v => ({ ...v, createdDate: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Topic <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                value={(editingVocab as any)?.topic ?? ''}
                onChange={e => setEditingVocab(v => ({ ...v, topic: e.target.value } as any))}
                placeholder="e.g. Animals"
                className="mt-1"
              />
            </div>
            {editingVocab?.word && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Card Preview</Label>
                <div className="w-32 h-32 rounded-lg flex items-center justify-center p-2 bg-white border-2 border-primary shadow-lg mx-auto">
                  {editingVocab.imageUrl
                    ? <img src={editingVocab.imageUrl} className="w-full h-full object-contain" alt="preview" />
                    : <span className="font-bold text-center leading-tight text-slate-700 text-sm">{editingVocab.word}</span>
                  }
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
