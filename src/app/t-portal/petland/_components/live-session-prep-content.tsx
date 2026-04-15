'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import {
  getSessionInstancesByTeacherUid,
  getStudentById,
  getOrCreateSessionProgress,
  addSessionVocabulary,
  addSessionGrammar,
  addSessionPhonics,
  setMagicWord,
} from '@/lib/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Play, X, Plus, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { SessionInstance, Student } from '@/lib/types';
// Student used in studentsMap

interface PrepItem {
  id: string;
  word?: string;
  meaning?: string;
  point?: string;
  example?: string;
  sound?: string;
  examples?: string;
}

export default function LiveSessionPrepContent() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [sessionInstances, setSessionInstances] = useState<SessionInstance[]>([]);
  const [studentsMap, setStudentsMap] = useState<Record<string, Student>>({});
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('practice');
  const [launching, setLaunching] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  // Session config
  const [classGoals, setClassGoals] = useState('');
  const [xpTarget, setXpTarget] = useState(60);
  const [magicWordValue, setMagicWordValue] = useState('');

  // Prep items
  const [vocabulary, setVocabulary] = useState<PrepItem[]>([]);
  const [grammar, setGrammar] = useState<PrepItem[]>([]);
  const [phonics, setPhonics] = useState<PrepItem[]>([]);

  // Add-item dialogs
  const [showAddVocab, setShowAddVocab] = useState(false);
  const [showAddGrammar, setShowAddGrammar] = useState(false);
  const [showAddPhonics, setShowAddPhonics] = useState(false);
  const [vocabInput, setVocabInput] = useState({ word: '', meaning: '' });
  const [grammarInput, setGrammarInput] = useState({ point: '', example: '' });
  const [phonicsInput, setPhonicsInput] = useState({ sound: '', examples: '' });

  useEffect(() => {
    const load = async () => {
      if (!user?.uid) return;
      try {
        const instances = await getSessionInstancesByTeacherUid(user.uid);
        const upcoming = instances
          .filter(i => {
            if (i.status !== 'scheduled' || !i.lessonDate) return false;
            const d = new Date(i.lessonDate.includes('T') ? i.lessonDate : i.lessonDate + 'T00:00:00');
            if (isNaN(d.getTime())) return false;
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const day = new Date(d); day.setHours(0, 0, 0, 0);
            return day >= today;
          })
          .sort((a, b) => new Date(a.lessonDate).getTime() - new Date(b.lessonDate).getTime());

        setSessionInstances(upcoming);

        const map: Record<string, Student> = {};
        for (const inst of upcoming) {
          if (!map[inst.studentId]) {
            const s = await getStudentById(inst.studentId);
            if (s) map[inst.studentId] = s;
          }
        }
        setStudentsMap(map);
      } catch (err) {
        console.error('Error loading sessions:', err);
      } finally {
        setLoadingSessions(false);
      }
    };
    load();
  }, [user?.uid]);

  const handleAddVocabulary = () => {
    if (!vocabInput.word.trim() || !vocabInput.meaning.trim()) {
      toast({ title: 'Please fill in word and meaning', variant: 'destructive' });
      return;
    }
    setVocabulary(prev => [...prev, { id: Date.now().toString(), ...vocabInput }]);
    setVocabInput({ word: '', meaning: '' });
    setShowAddVocab(false);
  };

  const handleAddGrammar = () => {
    if (!grammarInput.point.trim() || !grammarInput.example.trim()) {
      toast({ title: 'Please fill in point and example', variant: 'destructive' });
      return;
    }
    setGrammar(prev => [...prev, { id: Date.now().toString(), ...grammarInput }]);
    setGrammarInput({ point: '', example: '' });
    setShowAddGrammar(false);
  };

  const handleAddPhonics = () => {
    if (!phonicsInput.sound.trim() || !phonicsInput.examples.trim()) {
      toast({ title: 'Please fill in sound and examples', variant: 'destructive' });
      return;
    }
    setPhonics(prev => [...prev, { id: Date.now().toString(), ...phonicsInput }]);
    setPhonicsInput({ sound: '', examples: '' });
    setShowAddPhonics(false);
  };

  const handleSaveConfig = async () => {
    if (!user?.uid) return;
    setSavingConfig(true);
    try {
      const isPractice = selectedSessionId === 'practice';
      const effectiveSessionId = isPractice
        ? `practice-${user.uid}-${Date.now()}`
        : selectedSessionId;
      const selectedInstance = sessionInstances.find(i => i.id === selectedSessionId);
      const effectiveStudentId = selectedInstance?.studentId ?? 'practice';

      const progress = await getOrCreateSessionProgress(
        effectiveSessionId,
        effectiveStudentId,
        user.uid,
        { sessionQuestion: classGoals, sessionAim: classGoals, xpTarget, theme: 'space' }
      );

      if (magicWordValue.trim()) {
        await setMagicWord(progress.id, magicWordValue);
      }

      toast({ title: 'Config saved!' });
    } catch (err) {
      toast({
        title: 'Error saving config',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleLaunch = async () => {
    if (!user?.uid) return;
    setLaunching(true);
    try {
      const isPractice = selectedSessionId === 'practice';
      const effectiveSessionId = isPractice
        ? `practice-${user.uid}-${Date.now()}`
        : selectedSessionId;
      const selectedInstance = sessionInstances.find(i => i.id === selectedSessionId);
      const effectiveStudentId = selectedInstance?.studentId ?? 'practice';

      const progress = await getOrCreateSessionProgress(
        effectiveSessionId,
        effectiveStudentId,
        user.uid,
        { sessionQuestion: classGoals, sessionAim: classGoals, xpTarget, theme: 'space' }
      );

      for (const v of vocabulary) {
        if (v.word && v.meaning) await addSessionVocabulary(progress.id, v.word, v.meaning);
      }
      for (const g of grammar) {
        if (g.point && g.example) await addSessionGrammar(progress.id, g.point, g.example);
      }
      for (const p of phonics) {
        if (p.sound && p.examples) {
          await addSessionPhonics(progress.id, p.sound, p.examples.split(',').map(e => e.trim()));
        }
      }
      if (magicWordValue.trim()) {
        await setMagicWord(progress.id, magicWordValue);
      }

      window.open(`/t-portal/sessions/live/${effectiveSessionId}`, '_blank');
    } catch (err) {
      toast({
        title: 'Error launching session',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div className="space-y-6 mt-6">
      {/* Session Picker */}
      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
          <CardDescription>
            Link to an upcoming session, or run as a standalone practice.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingSessions ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading sessions...
            </div>
          ) : (
            <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
              <SelectTrigger className="w-full max-w-sm">
                <SelectValue placeholder="Choose session" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="practice">Practice / No session</SelectItem>
                {sessionInstances.map(inst => {
                  const student = studentsMap[inst.studentId];
                  const label = student?.name || student?.email || inst.studentId;
                  const date = inst.lessonDate?.split('T')[0];
                  return (
                    <SelectItem key={inst.id} value={inst.id}>
                      {label} — {date} {inst.startTime}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {/* Session Config */}
      <Card>
        <CardHeader>
          <CardTitle>Session Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="class-goals">Class Goals / Session Question</Label>
            <textarea
              id="class-goals"
              placeholder="What is the focus of today's lesson?"
              value={classGoals}
              onChange={e => setClassGoals(e.target.value)}
              className="w-full p-2 border rounded-lg text-sm resize-none h-16 mt-1"
            />
          </div>
          <div>
            <Label htmlFor="xp-target">XP Target</Label>
            <Input
              id="xp-target"
              type="number"
              value={xpTarget}
              onChange={e => setXpTarget(Number(e.target.value))}
              className="mt-1 max-w-[120px]"
              min="10"
              max="500"
            />
            <p className="text-xs text-muted-foreground mt-1">Default: 60 XP</p>
          </div>
          <div>
            <Label htmlFor="magic-word">Magic Word (optional)</Label>
            <Input
              id="magic-word"
              placeholder="e.g., SuperPets"
              value={magicWordValue}
              onChange={e => setMagicWordValue(e.target.value)}
              className="mt-1 max-w-[240px]"
            />
          </div>
          <div className="flex justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="gap-2"
            >
              {savingConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Config
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Content Prep */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vocabulary */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">📚 Vocabulary</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setShowAddVocab(true)} className="h-8 w-8 p-0">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription className="text-xs">{vocabulary.length} word{vocabulary.length !== 1 ? 's' : ''}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {vocabulary.map(v => (
              <div key={v.id} className="flex items-start justify-between bg-purple-50 dark:bg-purple-900/20 p-2 rounded-lg group">
                <div className="flex-1">
                  <p className="font-semibold text-sm">{v.word}</p>
                  <p className="text-xs text-muted-foreground">{v.meaning}</p>
                </div>
                <button type="button" onClick={() => setVocabulary(prev => prev.filter(x => x.id !== v.id))} className="opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Remove">
                  <X className="h-4 w-4 text-destructive" />
                </button>
              </div>
            ))}
            {vocabulary.length === 0 && <p className="text-xs text-muted-foreground">No words added yet</p>}
          </CardContent>
        </Card>

        {/* Grammar */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">✏️ Grammar</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setShowAddGrammar(true)} className="h-8 w-8 p-0">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription className="text-xs">{grammar.length} item{grammar.length !== 1 ? 's' : ''}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {grammar.map(g => (
              <div key={g.id} className="flex items-start justify-between bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg group">
                <div className="flex-1">
                  <p className="font-semibold text-sm">{g.point}</p>
                  <p className="text-xs text-muted-foreground">{g.example}</p>
                </div>
                <button onClick={() => setGrammar(prev => prev.filter(x => x.id !== g.id))} className="opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Remove">
                  <X className="h-4 w-4 text-destructive" />
                </button>
              </div>
            ))}
            {grammar.length === 0 && <p className="text-xs text-muted-foreground">No items added yet</p>}
          </CardContent>
        </Card>

        {/* Phonics */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">🎵 Phonics</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setShowAddPhonics(true)} className="h-8 w-8 p-0">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription className="text-xs">{phonics.length} item{phonics.length !== 1 ? 's' : ''}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {phonics.map(p => (
              <div key={p.id} className="flex items-start justify-between bg-green-50 dark:bg-green-900/20 p-2 rounded-lg group">
                <div className="flex-1">
                  <p className="font-semibold text-sm">{p.sound}</p>
                  <p className="text-xs text-muted-foreground">{p.examples}</p>
                </div>
                <button onClick={() => setPhonics(prev => prev.filter(x => x.id !== p.id))} className="opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Remove">
                  <X className="h-4 w-4 text-destructive" />
                </button>
              </div>
            ))}
            {phonics.length === 0 && <p className="text-xs text-muted-foreground">No items added yet</p>}
          </CardContent>
        </Card>
      </div>

      {/* Launch */}
      <div className="flex justify-end">
        <Button
          size="lg"
          className="gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
          onClick={handleLaunch}
          disabled={launching}
        >
          {launching ? <><Loader2 className="h-4 w-4 animate-spin" />Launching...</> : <><Play className="h-4 w-4" />Launch Live Session</>}
        </Button>
      </div>



      {/* Add Vocabulary Dialog */}
      {showAddVocab && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Add Vocabulary</CardTitle>
                <button type="button" onClick={() => setShowAddVocab(false)} aria-label="Close"><X className="h-4 w-4" /></button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="vocab-word">Word</Label>
                <Input id="vocab-word" value={vocabInput.word} onChange={e => setVocabInput(v => ({ ...v, word: e.target.value }))} className="mt-1" placeholder="e.g., kind" />
              </div>
              <div>
                <Label htmlFor="vocab-meaning">Meaning</Label>
                <Input id="vocab-meaning" value={vocabInput.meaning} onChange={e => setVocabInput(v => ({ ...v, meaning: e.target.value }))} className="mt-1" placeholder="e.g., being nice or generous" />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowAddVocab(false)}>Cancel</Button>
                <Button type="button" onClick={handleAddVocabulary}>Add</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Grammar Dialog */}
      {showAddGrammar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Add Grammar</CardTitle>
                <button onClick={() => setShowAddGrammar(false)} aria-label="Close"><X className="h-4 w-4" /></button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="grammar-point">Grammar Point</Label>
                <Input id="grammar-point" value={grammarInput.point} onChange={e => setGrammarInput(v => ({ ...v, point: e.target.value }))} className="mt-1" placeholder="e.g., Present Perfect" />
              </div>
              <div>
                <Label htmlFor="grammar-example">Example</Label>
                <Input id="grammar-example" value={grammarInput.example} onChange={e => setGrammarInput(v => ({ ...v, example: e.target.value }))} className="mt-1" placeholder="e.g., I have learned English" />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowAddGrammar(false)}>Cancel</Button>
                <Button onClick={handleAddGrammar}>Add</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Phonics Dialog */}
      {showAddPhonics && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Add Phonics</CardTitle>
                <button onClick={() => setShowAddPhonics(false)} aria-label="Close"><X className="h-4 w-4" /></button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="phonics-sound">Sound</Label>
                <Input id="phonics-sound" value={phonicsInput.sound} onChange={e => setPhonicsInput(v => ({ ...v, sound: e.target.value }))} className="mt-1" placeholder="e.g., /æ/ as in cat" />
              </div>
              <div>
                <Label htmlFor="phonics-examples">Example Words (comma separated)</Label>
                <Input id="phonics-examples" value={phonicsInput.examples} onChange={e => setPhonicsInput(v => ({ ...v, examples: e.target.value }))} className="mt-1" placeholder="e.g., apple, ant, amazing" />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowAddPhonics(false)}>Cancel</Button>
                <Button onClick={handleAddPhonics}>Add</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
