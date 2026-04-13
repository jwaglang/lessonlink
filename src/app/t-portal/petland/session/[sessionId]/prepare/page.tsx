'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  getSessionInstance, 
  getStudentById,
  getOrCreateSessionProgress,
  addSessionVocabulary,
  addSessionGrammar,
  addSessionPhonics,
  setMagicWord,
  updateSessionGoals,
} from '@/lib/firestore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import PageHeader from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Zap, Play, AlertCircle, X, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { SessionInstance, Student } from '@/lib/types';
import type { PetlandProfile } from '@/modules/petland/types';

interface PrepItem {
  id: string;
  word?: string;
  meaning?: string;
  point?: string;
  example?: string;
  sound?: string;
  examples?: string;
}

export default function SessionPrepPage() {
  const { sessionId } = useParams() as { sessionId: string };
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const [session, setSession] = useState<SessionInstance | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [petProfile, setPetProfile] = useState<PetlandProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);

  // Session setup
  const [magicWord, setMagicWord] = useState('');
  const [classGoals, setClassGoals] = useState('');
  const [xpTarget, setXpTarget] = useState(60);

  // Prep items (local state before launch)
  const [vocabulary, setVocabulary] = useState<PrepItem[]>([]);
  const [grammar, setGrammar] = useState<PrepItem[]>([]);
  const [phonics, setPhonics] = useState<PrepItem[]>([]);

  // Add item dialogs
  const [showAddVocab, setShowAddVocab] = useState(false);
  const [showAddGrammar, setShowAddGrammar] = useState(false);
  const [showAddPhonics, setShowAddPhonics] = useState(false);
  const [vocabInput, setVocabInput] = useState({ word: '', meaning: '' });
  const [grammarInput, setGrammarInput] = useState({ point: '', example: '' });
  const [phonicsInput, setPhonicsInput] = useState({ sound: '', examples: '' });

  useEffect(() => {
    const loadData = async () => {
      if (!user?.uid || !sessionId) return;

      try {
        // Load session
        const sessionData = await getSessionInstance(sessionId);
        if (!sessionData) {
          setError('Session not found');
          return;
        }

        if (sessionData.teacherUid !== user.uid) {
          setError('You do not have access to this session');
          return;
        }

        setSession(sessionData);

        // Load student
        const studentId = sessionData.studentId;
        let studentData: Student | null = null;
        try {
          studentData = await getStudentById(studentId);
        } catch (err) {
          const studentSnap = await getDoc(doc(db, 'students', studentId));
          if (studentSnap.exists()) {
            studentData = { id: studentSnap.id, ...studentSnap.data() } as Student;
          }
        }

        if (!studentData) {
          setError(`Student not found (ID: ${studentId})`);
          setStudent(null);
        } else {
          setStudent(studentData);
        }

        // Load pet profile
        try {
          const petSnap = await getDoc(doc(db, 'petlandProfiles', sessionData.studentId));
          if (petSnap.exists()) {
            setPetProfile(petSnap.data() as PetlandProfile);
          }
        } catch (err) {
          console.warn('Failed to load pet profile:', err);
        }
      } catch (err) {
        console.error('Error loading session:', err);
        setError(err instanceof Error ? err.message : 'Failed to load session');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.uid, sessionId]);

  const handleAddVocabulary = () => {
    if (!vocabInput.word.trim() || !vocabInput.meaning.trim()) {
      toast({ title: 'Please fill in word and meaning', variant: 'destructive' });
      return;
    }
    setVocabulary([
      ...vocabulary,
      { id: Date.now().toString(), word: vocabInput.word, meaning: vocabInput.meaning },
    ]);
    setVocabInput({ word: '', meaning: '' });
    setShowAddVocab(false);
    toast({ title: 'Vocabulary added' });
  };

  const handleAddGrammar = () => {
    if (!grammarInput.point.trim() || !grammarInput.example.trim()) {
      toast({ title: 'Please fill in point and example', variant: 'destructive' });
      return;
    }
    setGrammar([
      ...grammar,
      { id: Date.now().toString(), point: grammarInput.point, example: grammarInput.example },
    ]);
    setGrammarInput({ point: '', example: '' });
    setShowAddGrammar(false);
    toast({ title: 'Grammar added' });
  };

  const handleAddPhonics = () => {
    if (!phonicsInput.sound.trim() || !phonicsInput.examples.trim()) {
      toast({ title: 'Please fill in sound and examples', variant: 'destructive' });
      return;
    }
    setPhonics([
      ...phonics,
      { id: Date.now().toString(), sound: phonicsInput.sound, examples: phonicsInput.examples },
    ]);
    setPhonicsInput({ sound: '', examples: '' });
    setShowAddPhonics(false);
    toast({ title: 'Phonics added' });
  };

  const handleRemoveVocab = (id: string) => {
    setVocabulary(vocabulary.filter(v => v.id !== id));
  };

  const handleRemoveGrammar = (id: string) => {
    setGrammar(grammar.filter(g => g.id !== id));
  };

  const handleRemovePhonics = (id: string) => {
    setPhonics(phonics.filter(p => p.id !== id));
  };

  const handleLaunchSession = async () => {
    if (!sessionId || !session || !student || !user?.uid) return;

    setLaunching(true);
    try {
      console.log('=== LAUNCH SESSION DEBUG ===');
      console.log('User UID:', user.uid);
      console.log('Student ID:', student.id);
      console.log('Session ID:', sessionId);
      console.log('Creating session progress with:',{ sessionInstanceId: sessionId,
        studentId: student.id,
        teacherId: user.uid,
        sessionQuestion: classGoals,
        sessionAim: classGoals,
        xpTarget,
      });

      // Create session progress
      const progress = await getOrCreateSessionProgress(
        sessionId,
        student.id,
        user.uid,
        {
          sessionQuestion: classGoals,
          sessionAim: classGoals,
          xpTarget,
          theme: 'space',
        }
      );

      console.log('✓ Session progress created:', progress.id);

      // Add all prep vocabulary
      for (const vocab of vocabulary) {
        if (vocab.word && vocab.meaning) {
          await addSessionVocabulary(progress.id, vocab.word, vocab.meaning);
        }
      }
      console.log('✓ Vocabulary added');

      // Add all prep grammar
      for (const gram of grammar) {
        if (gram.point && gram.example) {
          await addSessionGrammar(progress.id, gram.point, gram.example);
        }
      }
      console.log('✓ Grammar added');

      // Add all prep phonics
      for (const phon of phonics) {
        if (phon.sound && phon.examples) {
          const exampleArray = phon.examples.split(',').map(e => e.trim());
          await addSessionPhonics(progress.id, phon.sound, exampleArray);
        }
      }
      console.log('✓ Phonics added');

      // Set magic word if provided
      if (magicWord.trim()) {
        await setMagicWord(progress.id, magicWord);
        console.log('✓ Magic word set');
      }

      console.log('✓ All prep data saved, navigating to live session');

      // Navigate to live session page
      router.push(`/t-portal/sessions/live/${sessionId}`);
    } catch (err) {
      console.error('=== LAUNCH SESSION ERROR ===');
      console.error('Error:', err);
      if (err instanceof Error) {
        console.error('Message:', err.message);
        console.error('Stack:', err.stack);
      }
      toast({
        title: 'Error launching session',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
      setLaunching(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 gap-2">
        <Loader2 className="animate-spin h-5 w-5" />
        <span>Loading session...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 pb-32">
      <PageHeader
        title="Prepare Live Session"
        description="Set up your session before going live"
        icon={Zap}
      />

      {error && (
        <Card className="border-destructive bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Setup Error
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Session Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Session Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Student</Label>
              <p className="text-lg font-semibold">
                {student?.name || student?.email || 'Unknown Student'}
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Date & Time</Label>
              <p className="text-lg font-semibold">
                {session?.lessonDate?.split('T')[0]} at {session?.startTime}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Session Setup */}
      <Card>
        <CardHeader>
          <CardTitle>Session Configuration</CardTitle>
          <CardDescription>Set up before launching</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="class-goals">Class Goals / Session Question</Label>
            <textarea
              id="class-goals"
              placeholder="What is the focus of today's lesson?"
              value={classGoals}
              onChange={(e) => setClassGoals(e.target.value)}
              className="w-full p-2 border rounded-lg text-sm resize-none h-16 mt-1"
            />
          </div>

          <div>
            <Label htmlFor="xp-target">XP Target for Session</Label>
            <Input
              id="xp-target"
              type="number"
              value={xpTarget}
              onChange={(e) => setXpTarget(Number(e.target.value))}
              className="mt-1"
              min="10"
              max="500"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Default target is 60 XP. Adjust as needed for session length.
            </p>
          </div>

          <div>
            <Label htmlFor="magic-word">Magic Word (Optional)</Label>
            <Input
              id="magic-word"
              placeholder="e.g., 'SuperPets', 'LessonLink'"
              value={magicWord}
              onChange={(e) => setMagicWord(e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Share with students for special unlocks or mystery rewards
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Session Elements Setup */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vocabulary */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">📚 Vocabulary</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddVocab(true)}
                className="h-8 w-8 p-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription className="text-xs">
              {vocabulary.length} word{vocabulary.length !== 1 ? 's' : ''} added
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {vocabulary.map((word) => (
              <div
                key={word.id}
                className="flex items-start justify-between bg-purple-50 dark:bg-purple-900/20 p-2 rounded-lg group"
              >
                <div className="flex-1">
                  <p className="font-semibold text-sm">{word.word}</p>
                  <p className="text-xs text-muted-foreground">{word.meaning}</p>
                </div>
                <button
                  onClick={() => handleRemoveVocab(word.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove vocabulary"
                  aria-label="Remove vocabulary"
                >
                  <X className="h-4 w-4 text-destructive" />
                </button>
              </div>
            ))}
            {vocabulary.length === 0 && (
              <p className="text-xs text-muted-foreground">No words added yet</p>
            )}
          </CardContent>
        </Card>

        {/* Grammar */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">✏️ Grammar</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddGrammar(true)}
                className="h-8 w-8 p-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription className="text-xs">
              {grammar.length} item{grammar.length !== 1 ? 's' : ''} added
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {grammar.map((gram) => (
              <div
                key={gram.id}
                className="flex items-start justify-between bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg group"
              >
                <div className="flex-1">
                  <p className="font-semibold text-sm">{gram.point}</p>
                  <p className="text-xs text-muted-foreground">{gram.example}</p>
                </div>
                <button
                  onClick={() => handleRemoveGrammar(gram.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove grammar"
                  aria-label="Remove grammar"
                >
                  <X className="h-4 w-4 text-destructive" />
                </button>
              </div>
            ))}
            {grammar.length === 0 && (
              <p className="text-xs text-muted-foreground">No items added yet</p>
            )}
          </CardContent>
        </Card>

        {/* Phonics */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">🎵 Phonics</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddPhonics(true)}
                className="h-8 w-8 p-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription className="text-xs">
              {phonics.length} item{phonics.length !== 1 ? 's' : ''} added
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {phonics.map((phon) => (
              <div
                key={phon.id}
                className="flex items-start justify-between bg-green-50 dark:bg-green-900/20 p-2 rounded-lg group"
              >
                <div className="flex-1">
                  <p className="font-semibold text-sm">{phon.sound}</p>
                  <p className="text-xs text-muted-foreground">{phon.examples}</p>
                </div>
                <button
                  onClick={() => handleRemovePhonics(phon.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove phonics"
                  aria-label="Remove phonics"
                >
                  <X className="h-4 w-4 text-destructive" />
                </button>
              </div>
            ))}
            {phonics.length === 0 && (
              <p className="text-xs text-muted-foreground">No items added yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Launch Button */}
      <div className="flex gap-3 justify-between sticky bottom-0 bg-background border-t p-4 -mx-4 -mb-8">
        <Button
          variant="outline"
          onClick={() => router.back()}
          disabled={launching}
        >
          Cancel
        </Button>
        <Button
          size="lg"
          className="gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
          onClick={handleLaunchSession}
          disabled={launching || !session || !student}
        >
          {launching ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Launching...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Launch Session
            </>
          )}
        </Button>
      </div>

      {/* Add Vocabulary Dialog */}
      {showAddVocab && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Add Vocabulary</CardTitle>
                <button onClick={() => setShowAddVocab(false)} title="Close" aria-label="Close dialog">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="vocab-word">Word</Label>
                <Input
                  id="vocab-word"
                  value={vocabInput.word}
                  onChange={(e) => setVocabInput({ ...vocabInput, word: e.target.value })}
                  className="mt-1"
                  placeholder="e.g., 'kind'"
                />
              </div>
              <div>
                <Label htmlFor="vocab-meaning">Meaning</Label>
                <Input
                  id="vocab-meaning"
                  value={vocabInput.meaning}
                  onChange={(e) => setVocabInput({ ...vocabInput, meaning: e.target.value })}
                  className="mt-1"
                  placeholder="e.g., 'being nice or generous'"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowAddVocab(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddVocabulary}>Add</Button>
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
                <button onClick={() => setShowAddGrammar(false)} title="Close" aria-label="Close dialog">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="grammar-point">Grammar Point</Label>
                <Input
                  id="grammar-point"
                  value={grammarInput.point}
                  onChange={(e) => setGrammarInput({ ...grammarInput, point: e.target.value })}
                  className="mt-1"
                  placeholder="e.g., 'Present Perfect'"
                />
              </div>
              <div>
                <Label htmlFor="grammar-example">Example</Label>
                <Input
                  id="grammar-example"
                  value={grammarInput.example}
                  onChange={(e) => setGrammarInput({ ...grammarInput, example: e.target.value })}
                  className="mt-1"
                  placeholder="e.g., 'I have learned English'"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowAddGrammar(false)}>
                  Cancel
                </Button>
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
                <button onClick={() => setShowAddPhonics(false)} title="Close" aria-label="Close dialog">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="phonics-sound">Sound</Label>
                <Input
                  id="phonics-sound"
                  value={phonicsInput.sound}
                  onChange={(e) => setPhonicsInput({ ...phonicsInput, sound: e.target.value })}
                  className="mt-1"
                  placeholder="e.g., '/æ/ as in cat'"
                />
              </div>
              <div>
                <Label htmlFor="phonics-examples">Example Words (comma separated)</Label>
                <Input
                  id="phonics-examples"
                  value={phonicsInput.examples}
                  onChange={(e) => setPhonicsInput({ ...phonicsInput, examples: e.target.value })}
                  className="mt-1"
                  placeholder="e.g., 'apple, ant, amazing'"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowAddPhonics(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddPhonics}>Add</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
