'use client';

/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable @next/next/no-inline-styles */

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  getSessionInstance,
  getStudentById,
  getOrCreateSessionProgress,
  onSessionProgressUpdate,
  addTreasureChest,
  addWow,
  addOopsie,
  addBehaviorDeduction,
  addSessionVocabulary,
  addSessionGrammar,
  addSessionPhonics,
  updateSessionGoals,
  updateSessionTarget,
  updateSessionTheme,
  endSession,
} from '@/lib/firestore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, X, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { SessionInstance, Student, SessionProgress as Phase17SessionProgress } from '@/lib/types';
import type { PetlandProfile } from '@/modules/petland/types';

export default function LiveSessionPage() {
  const { sessionInstanceId } = useParams() as { sessionInstanceId: string };
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const [session, setSession] = useState<SessionInstance | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [petProfile, setPetProfile] = useState<PetlandProfile | null>(null);
  const [progress, setProgress] = useState<Phase17SessionProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wowActive, setWowActive] = useState(false);
  const [treasureActive, setTreasureActive] = useState(false);
  const [showAddVocab, setShowAddVocab] = useState(false);
  const [showAddGrammar, setShowAddGrammar] = useState(false);
  const [showAddPhonics, setShowAddPhonics] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Form states
  const [vocabWord, setVocabWord] = useState('');
  const [vocabMeaning, setVocabMeaning] = useState('');
  const [grammarPoint, setGrammarPoint] = useState('');
  const [grammarExample, setGrammarExample] = useState('');
  const [phonicsSound, setPhonicsSound] = useState('');
  const [phonicsExamples, setPhonicsExamples] = useState('');
  const [magicWordInput, setMagicWordInput] = useState('');
  const [targetXp, setTargetXp] = useState(60);
  const [sessionQuestion, setSessionQuestion] = useState('');
  const [treasureAmount, setTreasureAmount] = useState(5);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      if (!user?.uid || !sessionInstanceId) return;

      try {
        // Load session
        const sessionData = await getSessionInstance(sessionInstanceId);
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
          const petSnap = await getDoc(doc(db, 'petlandProfiles', studentId));
          if (petSnap.exists()) {
            setPetProfile(petSnap.data() as PetlandProfile);
          }
        } catch (err) {
          console.warn('Failed to load pet profile:', err);
        }

        // Create or get session progress
        const progressData = await getOrCreateSessionProgress(
          sessionInstanceId,
          studentId,
          user.uid
        );

        setProgress(progressData);
        setSessionQuestion(progressData.sessionQuestion || '');
        setTargetXp(progressData.xpTarget || 60);
        setMagicWordInput(progressData.magicWord || '');

        // Subscribe to real-time updates
        const unsubscribe = onSessionProgressUpdate(progressData.id, (updatedProgress) => {
          setProgress(updatedProgress);
        });

        unsubscribeRef.current = unsubscribe;
      } catch (err) {
        console.error('Error loading session:', err);
        setError(err instanceof Error ? err.message : 'Failed to load session');
      } finally {
        setLoading(false);
      }
    };

    loadData();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [user?.uid, sessionInstanceId]);

  // Handlers for add buttons
  const handleAddVocab = async () => {
    if (!progress || !vocabWord.trim() || !vocabMeaning.trim()) return;
    try {
      await addSessionVocabulary(progress.id, vocabWord, vocabMeaning);
      setVocabWord('');
      setVocabMeaning('');
      setShowAddVocab(false);
      toast({ title: 'Vocabulary added' });
    } catch (err) {
      toast({ title: 'Error adding vocabulary', variant: 'destructive' });
    }
  };

  const handleAddGrammar = async () => {
    if (!progress || !grammarPoint.trim() || !grammarExample.trim()) return;
    try {
      await addSessionGrammar(progress.id, grammarPoint, grammarExample);
      setGrammarPoint('');
      setGrammarExample('');
      setShowAddGrammar(false);
      toast({ title: 'Grammar added' });
    } catch (err) {
      toast({ title: 'Error adding grammar', variant: 'destructive' });
    }
  };

  const handleAddPhonics = async () => {
    if (!progress || !phonicsSound.trim() || !phonicsExamples.trim()) return;
    try {
      const examples = phonicsExamples.split(',').map(e => e.trim());
      await addSessionPhonics(progress.id, phonicsSound, examples);
      setPhonicsSound('');
      setPhonicsExamples('');
      setShowAddPhonics(false);
      toast({ title: 'Phonics added' });
    } catch (err) {
      toast({ title: 'Error adding phonics', variant: 'destructive' });
    }
  };

  const handleTreasureChest = async (amount: number) => {
    if (!progress) return;
    setTreasureActive(true);
    try {
      await addTreasureChest(progress.id, amount);
    } catch (err) {
      toast({ title: 'Error awarding treasure', variant: 'destructive' });
    }
    setTimeout(() => setTreasureActive(false), 3000);
  };

  const handleWow = async () => {
    if (!progress) return;
    setWowActive(true);
    try {
      await addWow(progress.id);
    } catch (err) {
      toast({ title: 'Error awarding wow', variant: 'destructive' });
    }
    setTimeout(() => setWowActive(false), 2000);
  };

  const handleOopsie = async () => {
    if (!progress) return;
    try {
      await addOopsie(progress.id);
    } catch (err) {
      toast({ title: 'Error recording oopsie', variant: 'destructive' });
    }
  };

  const handleBehavior = async (type: 'out-to-lunch' | 'chatterbox' | 'disruptive') => {
    if (!progress) return;
    try {
      await addBehaviorDeduction(progress.id, type);
    } catch (err) {
      toast({ title: 'Error recording behavior', variant: 'destructive' });
    }
  };

  const handleSaveSettings = async () => {
    if (!progress) return;
    try {
      await updateSessionGoals(progress.id, sessionQuestion, sessionQuestion);
      await updateSessionTarget(progress.id, targetXp);
      setShowSettings(false);
      toast({ title: 'Settings saved' });
    } catch (err) {
      toast({ title: 'Error saving settings', variant: 'destructive' });
    }
  };

  const handleEndSession = async () => {
    if (!progress) return;
    try {
      await endSession(progress.id);
      toast({ title: 'Session ended' });
      router.push('/t-portal/petland');
    } catch (err) {
      toast({ title: 'Error ending session', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen gap-2">
        <Loader2 className="animate-spin h-5 w-5" />
        <span>Loading session...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  if (!session || !student || !progress) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Session data not available</p>
      </div>
    );
  }

  const totalXpEarned = progress.totalXpEarned || 0;
  const xpPercentage = Math.min((totalXpEarned / progress.xpTarget) * 100, 100);

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden">
      {/* ANIMATED THEME BACKGROUND */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
        {/* Space theme stars and animations */}
        <div className="absolute inset-0 opacity-50">
          {/* Twinkling stars */}
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={`star-${i}`}
              className="absolute rounded-full bg-white animate-pulse"
              // eslint-disable-next-line
              style={{
                width: Math.random() > 0.7 ? '3px' : '1px',
                height: Math.random() > 0.7 ? '3px' : '1px',
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDuration: `${1 + Math.random() * 3}s`,
                transitionProperty: 'none',
              }}
            />
          ))}
          
          {/* Comets */}
          {/* eslint-disable-next-line */}
          <div className="absolute top-20 left-10 w-1 h-1 bg-white rounded-full shadow-lg opacity-0 animate-[float_3s_ease-in-out_infinite]"
            style={{
              boxShadow: '0 0 20px rgba(255,255,255,0.8)',
            }}
          />
          
          {/* Nebula gradient */}
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-gradient-radial from-purple-500/20 to-transparent rounded-full blur-3xl"></div>
        </div>
      </div>

      {/* DISPLAY AREA - 16:9 RATIO */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TOP BAR */}
        <div className="bg-black/40 border-b border-white/10 px-6 py-3 flex items-center justify-between text-white">
          <div className="flex-1">
            <p className="text-sm font-medium opacity-75">🚀 Session</p>
            <p className="text-lg font-bold">{progress.sessionQuestion || 'Live Session'}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium opacity-75">⚡ XP</p>
            <p className="text-2xl font-bold">{totalXpEarned}</p>
          </div>
        </div>

        {/* MAIN DISPLAY AREA */}
        <div className="flex-1 grid grid-cols-12 gap-4 p-4 overflow-hidden">
          {/* LEFT PANEL - REWARDS */}
          <div className="col-span-2 space-y-3 overflow-y-auto">
            {/* Treasure Chests */}
            <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-3 backdrop-blur-sm">
              <p className="text-xs font-bold text-yellow-200 mb-2">🧰 TREASURES</p>
              <p className="text-2xl font-bold text-yellow-300">{progress.treasureChests?.length || 0}</p>
            </div>

            {/* Wows */}
            <div className="bg-purple-900/30 border border-purple-500/50 rounded-lg p-3 backdrop-blur-sm">
              <p className="text-xs font-bold text-purple-200 mb-2">✨ WOWS</p>
              <p className="text-2xl font-bold text-purple-300">{progress.wows?.length || 0}</p>
            </div>

            {/* Oopsies */}
            <div className="bg-orange-900/30 border border-orange-500/50 rounded-lg p-3 backdrop-blur-sm">
              <p className="text-xs font-bold text-orange-200 mb-2">👀 OOPSIES</p>
              <p className="text-2xl font-bold text-orange-300">{progress.oopsies?.length || 0}</p>
            </div>

            {/* Behavior Deductions */}
            <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3 backdrop-blur-sm">
              <p className="text-xs font-bold text-red-200 mb-2">⚠️ DEDUCTIONS</p>
              <p className="text-2xl font-bold text-red-300">{progress.behaviorDeductions?.length || 0}</p>
            </div>
          </div>

          {/* CENTER - WEBCAM ZONE (EMPTY FOR ManyCam) */}
          <div className="col-span-8 bg-gradient-to-b from-slate-700/50 to-slate-800/50 border-2 border-dashed border-white/20 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl opacity-30 mb-2">📹</div>
              <p className="text-white/40 text-sm">ManyCam Capture Zone</p>
              <p className="text-white/30 text-xs mt-1">Teacher's video appears here</p>
            </div>
          </div>

          {/* RIGHT PANEL - CONTENT CARDS */}
          <div className="col-span-2 space-y-2 overflow-y-auto">
            {/* Vocabulary Cards */}
            {progress.vocabulary?.map((vocab, i) => (
              <div key={`vocab-${i}`} className="bg-gradient-to-r from-indigo-600/30 to-indigo-700/30 border border-indigo-400/50 rounded-lg p-2 backdrop-blur-sm">
                <p className="text-xs font-bold text-indigo-200 truncate">{vocab.word}</p>
                <p className="text-xs text-indigo-100/70 truncate">{vocab.meaning}</p>
              </div>
            ))}

            {/* Grammar Cards */}
            {progress.grammar?.map((gram, i) => (
              <div key={`grammar-${i}`} className="bg-gradient-to-r from-cyan-600/30 to-cyan-700/30 border border-cyan-400/50 rounded-lg p-2 backdrop-blur-sm">
                <p className="text-xs font-bold text-cyan-200 truncate">{gram.point}</p>
                <p className="text-xs text-cyan-100/70 truncate">{gram.example}</p>
              </div>
            ))}

            {/* Phonics Cards */}
            {progress.phonics?.map((phonics, i) => (
              <div key={`phonics-${i}`} className="bg-gradient-to-r from-green-600/30 to-green-700/30 border border-green-400/50 rounded-lg p-2 backdrop-blur-sm">
                <p className="text-xs font-bold text-green-200 truncate">{phonics.sound}</p>
                <p className="text-xs text-green-100/70 truncate">{phonics.examples?.[0]}</p>
              </div>
            ))}
          </div>
        </div>

        {/* BOTTOM BAR - PROGRESS & MAGIC WORD */}
        <div className="bg-black/40 border-t border-white/10 px-6 py-3 flex items-center justify-between text-white">
          <div className="flex-1">
            <p className="text-xs opacity-75">🐉 Progress</p>
            <div className="bg-slate-700 rounded-full h-6 mt-1 overflow-hidden">
              {/* eslint-disable-next-line */}
              <div
                className="bg-gradient-to-r from-green-400 to-emerald-500 h-full flex items-center justify-center text-xs font-bold text-white transition-all"
                style={{ width: `${xpPercentage}%` }}
              >
                {xpPercentage > 20 && <span>{Math.round(xpPercentage)}%</span>}
              </div>
            </div>
            <p className="text-xs mt-1 opacity-75">{totalXpEarned} / {progress.xpTarget} XP</p>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-75">✨ Magic Word</p>
            <p className="text-lg font-bold">{progress.magicWord ? '***' : '???'}</p>
          </div>
        </div>
      </div>

      {/* TEACHER CONTROL PANEL - Below fold, scrollable */}
      <div className="bg-slate-900 border-t border-white/10 p-4 max-h-48 overflow-y-auto">
        <div className="space-y-3">
          {/* Reward Buttons */}
          <div className="grid grid-cols-5 gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleTreasureChest(5)}
              className="text-xs"
            >
              🧰 +5
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleTreasureChest(10)}
              className="text-xs"
            >
              🧰 +10
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleTreasureChest(15)}
              className="text-xs"
            >
              🧰 +15
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleTreasureChest(20)}
              className="text-xs"
            >
              🧰 +20
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddVocab(true)}
              className="text-xs"
            >
              🧰 Amt
            </Button>
          </div>

          {/* More Reward Buttons */}
          <div className="grid grid-cols-5 gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleWow}
              className="text-xs bg-purple-600/20 hover:bg-purple-600/30 border-purple-500"
            >
              ✨ WOW!
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleOopsie}
              className="text-xs bg-orange-600/20 hover:bg-orange-600/30 border-orange-500"
            >
              👀 Oops
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBehavior('out-to-lunch')}
              className="text-xs"
            >
              😴 -3
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBehavior('chatterbox')}
              className="text-xs"
            >
              🗣️ -2
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBehavior('disruptive')}
              className="text-xs"
            >
              😬 -5
            </Button>
          </div>

          {/* Content Buttons */}
          <div className="grid grid-cols-5 gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddVocab(true)}
              className="text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Vocab
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddGrammar(true)}
              className="text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Gram
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddPhonics(true)}
              className="text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Phon
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowSettings(true)}
              className="text-xs"
            >
              ⚙️ Set
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleEndSession}
              className="text-xs"
            >
              🏁 End
            </Button>
          </div>
        </div>
      </div>

      {/* DIALOGS */}
      {/* Add Vocabulary Dialog */}
      {showAddVocab && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-white/20 rounded-lg p-4 w-96">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-white">Add Vocabulary</h3>
              <button
                onClick={() => setShowAddVocab(false)}
                aria-label="Close dialog"
                title="Close dialog"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <Label htmlFor="vocab-word" className="text-sm text-white">
                  Word
                </Label>
                <Input
                  id="vocab-word"
                  value={vocabWord}
                  onChange={(e) => setVocabWord(e.target.value)}
                  className="mt-1 bg-slate-700 border-white/20"
                />
              </div>
              <div>
                <Label htmlFor="vocab-meaning" className="text-sm text-white">
                  Meaning
                </Label>
                <Input
                  id="vocab-meaning"
                  value={vocabMeaning}
                  onChange={(e) => setVocabMeaning(e.target.value)}
                  className="mt-1 bg-slate-700 border-white/20"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddVocab(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddVocab}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Grammar Dialog */}
      {showAddGrammar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-white/20 rounded-lg p-4 w-96">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-white">Add Grammar</h3>
              <button
                onClick={() => setShowAddGrammar(false)}
                aria-label="Close dialog"
                title="Close dialog"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <Label htmlFor="grammar-point" className="text-sm text-white">
                  Point
                </Label>
                <Input
                  id="grammar-point"
                  value={grammarPoint}
                  onChange={(e) => setGrammarPoint(e.target.value)}
                  className="mt-1 bg-slate-700 border-white/20"
                />
              </div>
              <div>
                <Label htmlFor="grammar-example" className="text-sm text-white">
                  Example
                </Label>
                <Input
                  id="grammar-example"
                  value={grammarExample}
                  onChange={(e) => setGrammarExample(e.target.value)}
                  className="mt-1 bg-slate-700 border-white/20"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddGrammar(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddGrammar}
                  className="bg-cyan-600 hover:bg-cyan-700"
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Phonics Dialog */}
      {showAddPhonics && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-white/20 rounded-lg p-4 w-96">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-white">Add Phonics</h3>
              <button
                onClick={() => setShowAddPhonics(false)}
                aria-label="Close dialog"
                title="Close dialog"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <Label htmlFor="phonics-sound" className="text-sm text-white">
                  Sound
                </Label>
                <Input
                  id="phonics-sound"
                  value={phonicsSound}
                  onChange={(e) => setPhonicsSound(e.target.value)}
                  className="mt-1 bg-slate-700 border-white/20"
                />
              </div>
              <div>
                <Label htmlFor="phonics-examples" className="text-sm text-white">
                  Examples (comma separated)
                </Label>
                <Input
                  id="phonics-examples"
                  value={phonicsExamples}
                  onChange={(e) => setPhonicsExamples(e.target.value)}
                  className="mt-1 bg-slate-700 border-white/20"
                  placeholder="apple, ant, awesome"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddPhonics(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddPhonics}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Session Settings Dialog */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-white/20 rounded-lg p-4 w-96">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-white">Session Settings</h3>
              <button
                onClick={() => setShowSettings(false)}
                aria-label="Close dialog"
                title="Close dialog"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <Label htmlFor="session-question" className="text-sm text-white">
                  Session Question
                </Label>
                <Input
                  id="session-question"
                  value={sessionQuestion}
                  onChange={(e) => setSessionQuestion(e.target.value)}
                  className="mt-1 bg-slate-700 border-white/20"
                />
              </div>
              <div>
                <Label htmlFor="target-xp" className="text-sm text-white">
                  Target XP
                </Label>
                <Input
                  id="target-xp"
                  type="number"
                  value={targetXp}
                  onChange={(e) => setTargetXp(Number(e.target.value))}
                  className="mt-1 bg-slate-700 border-white/20"
                />
              </div>
              <div>
                <Label htmlFor="magic-word-input" className="text-sm text-white">
                  Magic Word
                </Label>
                <Input
                  id="magic-word-input"
                  value={magicWordInput}
                  onChange={(e) => setMagicWordInput(e.target.value)}
                  className="mt-1 bg-slate-700 border-white/20"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowSettings(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveSettings}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WOW ANIMATION */}
      {wowActive && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="text-center animate-ping">
            <div className="text-9xl font-bold bg-gradient-to-r from-purple-400 to-yellow-300 text-transparent bg-clip-text">
              WOW!
            </div>
          </div>
        </div>
      )}

      {/* TREASURE ANIMATION */}
      {treasureActive && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="text-center animate-bounce">
            <div className="text-8xl mb-4">📦</div>
            <div className="text-4xl">✨ +{treasureAmount} XP!</div>
          </div>
        </div>
      )}
    </div>
  );
}
