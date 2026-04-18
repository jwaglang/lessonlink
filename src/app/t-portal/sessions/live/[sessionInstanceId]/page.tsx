'use client';

/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable @next/next/no-inline-styles */

import { useEffect, useState, useRef, useMemo } from 'react';
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
  updateSessionFeedbackDraft,
  endSession,
} from '@/lib/firestore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Loader2, X, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { SessionInstance, Student, SessionProgress as Phase17SessionProgress } from '@/lib/types';
import type { PetlandProfile } from '@/modules/petland/types';
import OceanBackground from './ocean-background';

interface Comet {
  id: number;
  left: string;
  top: string;
  duration: number;
  angle: number;
  tailSize: number;
  color: string;
}

// Google Fonts - Contrail One + Poppins
const fontLink = `
  @import url('https://fonts.googleapis.com/css2?family=Contrail+One&family=Poppins:wght@400;500;600;700&display=swap');
`;

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
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [showEndTip, setShowEndTip] = useState(false);
  const [wowActive, setWowActive] = useState(false);
  const [treasureActive, setTreasureActive] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [activeAnimation, setActiveAnimation] = useState<{ type: string; amount?: number } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
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

  // Language Diary
  const [showLanguageDiary, setShowLanguageDiary] = useState(false);
  const [diaryTab, setDiaryTab] = useState<'vocab' | 'grammar' | 'phonics' | 'feedback'>('vocab');

  // Feedback draft (synced to Firestore on blur)
  const [fbTitle, setFbTitle] = useState('');
  const [fbDescription, setFbDescription] = useState('');
  const [fbInstructions, setFbInstructions] = useState('');

  const [comets, setComets] = useState<Comet[]>([]);
  const cometIdRef = useRef(0);
  const cometTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastAngleRef = useRef<number>(0);

  const starColors = ['white', '#FFD700', '#fe598b', '#e2d6f4', '#f8dab9'];
  const fixedStars = useMemo(() => Array.from({ length: 35 }).map((_, i) => ({
    id: i,
    size: 2 + Math.random() * 5,
    top: Math.random() * 95,
    left: Math.random() * 95,
    duration: 1 + Math.random() * 3,
    color: starColors[Math.floor(Math.random() * starColors.length)],
  })), []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const launchComet = () => {
      const startEdge = Math.random();
      let startX, startY, newAngle;

      if (startEdge < 0.5) {
        startX = (5 + Math.random() * 90) + '%';
        startY = '-10%';
        newAngle = -50 + Math.random() * 100;
      } else if (startEdge < 0.75) {
        startX = '-10%';
        startY = (Math.random() * 70) + '%';
        newAngle = 20 + Math.random() * 60;
      } else {
        startX = '110%';
        startY = (Math.random() * 70) + '%';
        newAngle = -(20 + Math.random() * 60);
      }

      while (Math.abs(newAngle - lastAngleRef.current) < 15) {
        newAngle += (Math.random() < 0.5 ? 20 : -20);
      }
      lastAngleRef.current = newAngle;

      let duration = 3 + Math.random() * 9;
      if (Math.random() < 0.2) duration /= 5;
      const tailSize = 60 + Math.random() * 120;
      const colors = ['rgba(255,255,255,0.9)', 'rgba(226,214,244,0.9)', 'rgba(248,218,185,0.9)', 'rgba(138,43,226,0.9)'];
      const color = colors[Math.floor(Math.random() * colors.length)];

      const newComet: Comet = { id: cometIdRef.current++, left: startX, top: startY, duration, angle: newAngle, tailSize, color };
      setComets(prev => [...prev, newComet]);
      setTimeout(() => setComets(prev => prev.filter(c => c.id !== newComet.id)), duration * 1000);
    };

    const startNextComet = () => {
      cometTimerRef.current = setTimeout(() => { launchComet(); startNextComet(); }, (3 + Math.random() * 5) * 1000);
    };

    launchComet();
    startNextComet();
    return () => { if (cometTimerRef.current) clearTimeout(cometTimerRef.current); };
  }, []);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      if (!user?.uid || !sessionInstanceId) return;

      try {
        const isPractice = sessionInstanceId.startsWith('practice-');

        let studentId = 'practice';

        if (isPractice) {
          // Practice mode — no real session instance, no student
          setSession(null);
          setStudent(null);
        } else {
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
          studentId = sessionData.studentId;

          // Load student
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
        setFbTitle(progressData.feedbackTitle || '');
        setFbDescription(progressData.feedbackDescription || '');
        setFbInstructions(progressData.feedbackInstructions || '');

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
      toast({ title: 'Phonics added' });
    } catch (err) {
      toast({ title: 'Error adding phonics', variant: 'destructive' });
    }
  };

  const handleTreasureChest = async (amount: number) => {
    if (!progress) return;
    playSound('treasure');
    setActiveAnimation({ type: `treasure-${amount}`, amount });
    setTimeout(() => setActiveAnimation(null), 2500);
    try { await addTreasureChest(progress.id, amount); }
    catch { toast({ title: 'Error', variant: 'destructive' }); }
  };

  const handleWow = async () => {
    if (!progress) return;
    playSound('wow');
    setActiveAnimation({ type: 'wow' });
    setTimeout(() => setActiveAnimation(null), 2000);
    try { await addWow(progress.id); }
    catch { toast({ title: 'Error', variant: 'destructive' }); }
  };

  const handleOopsie = async () => {
    if (!progress) return;
    playSound('oopsie');
    setActiveAnimation({ type: 'oopsie' });
    setTimeout(() => setActiveAnimation(null), 2000);
    try { await addOopsie(progress.id); }
    catch { toast({ title: 'Error', variant: 'destructive' }); }
  };

  const handleBehavior = async (type: 'out-to-lunch' | 'chatterbox' | 'disruptive') => {
    if (!progress) return;
    setActiveAnimation({ type: `behavior-${type}` });
    setTimeout(() => setActiveAnimation(null), 1500);
    try { await addBehaviorDeduction(progress.id, type); }
    catch (err) { toast({ title: `Error: ${(err as Error).message}`, variant: 'destructive' }); }
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

  const playSound = (type: string) => {
    // Using Web Audio API to generate simple beeps for now (can be stacked)
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = audioContext.currentTime;
    
    if (type === 'wow') {
      // Wow sound: ascending notes
      const notes = [262, 294, 330, 392]; // C, D, E, G
      notes.forEach((freq, idx) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.3, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.1 + 0.2);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.2);
      });
    } else if (type === 'treasure') {
      // Treasure sound: higher ascending beeps
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.3);
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'oopsie') {
      // Oopsie sound: descending sad notes
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.4);
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    }
  };

  const handleBoom = () => {
    setActiveAnimation({ type: 'boom' });
    setTimeout(() => setActiveAnimation(null), 1500);
  };

  const handleEndSession = () => {
    if (!progress) return;
    setShowScoreboard(true);
  };

  const handleScoreboardContinue = async () => {
    if (!progress) return;
    try {
      await endSession(progress.id);
      router.push(`/t-portal/sessions/${sessionInstanceId}/debrief`);
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

  const isPracticeMode = sessionInstanceId.startsWith('practice-');

  if (!progress || (!isPracticeMode && (!session || !student))) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Session data not available</p>
      </div>
    );
  }

  const totalXpEarned = progress.totalXpEarned || 0;
  const xpPercentage = Math.min((totalXpEarned / progress.xpTarget) * 100, 100);

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        ${fontLink}
        
        :root {
          --k-navy: #404376;
          --k-slate: #686ea8;
          --k-orange: #f2811d;
          --k-pink: #fe598b;
          --k-peach: #f8dab9;
          --k-ice-blue: #dcebf4;
          --k-lavender: #e2d6f4;
        }

        * { font-family: 'Poppins', sans-serif; }
        .display-font { font-family: 'Contrail One', cursive; }

        @keyframes twinkle {
          0% { opacity: 0.3; transform: scale(0.7); }
          50% { opacity: 1; transform: scale(1.3); }
          100% { opacity: 0.3; transform: scale(0.7); }
        }
        @keyframes nebulaPulse {
          0% { opacity: 0.4; transform: scale(1) rotate(0deg); }
          100% { opacity: 0.9; transform: scale(1.15) rotate(5deg); }
        }
        @keyframes planetFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }

        @keyframes cardSlideIn {
          0% { transform: translateX(40px); opacity: 0; }
          70% { transform: translateX(-4px); }
          100% { transform: translateX(0); opacity: 1; }
        }

        @keyframes wowPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(138,43,226,0.3); }
          50% { box-shadow: 0 0 40px rgba(138,43,226,0.6); }
        }

        @keyframes chestWobble {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-5deg); }
          75% { transform: rotate(5deg); }
        }

        @keyframes wowExplosion {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }

        @keyframes goldGlow {
          0% { opacity: 0; transform: scale(0.2); }
          30% { opacity: 1; }
          100% { opacity: 0; transform: scale(2.5); }
        }
        @keyframes rayShoot {
          0% { transform: scaleY(0); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: scaleY(1); opacity: 0; }
        }
        @keyframes coinShoot {
          0% { transform: translateY(0) scale(0); opacity: 0; }
          15% { opacity: 1; transform: translateY(-20px) scale(1.2); }
          100% { transform: translateY(-190px) scale(0.5); opacity: 0; }
        }
        @keyframes chestOpen {
          0% { transform: scale(0.4) rotate(-8deg); opacity: 0; }
          60% { transform: scale(1.25) rotate(4deg); opacity: 1; }
          80% { transform: scale(0.95) rotate(-1deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes boomExplosion {
          0% { transform: scale(0.2) rotate(-15deg); opacity: 0; }
          55% { transform: scale(1.3) rotate(6deg); opacity: 1; }
          75% { transform: scale(0.92) rotate(-2deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }

        @keyframes circleOrbit {
          0% { transform: rotate(0deg) translateX(100px) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: rotate(360deg) translateX(100px) rotate(-360deg); opacity: 0; }
        }

        @keyframes starBurst {
          0% { opacity: 0; transform: scale(0); }
          50% { opacity: 1; }
          100% { opacity: 0; transform: scale(1); }
        }

        @keyframes treasureSpray {
          0% { transform: translateY(0) rotate(0); opacity: 1; }
          100% { transform: translateY(-200px) rotate(360deg); opacity: 0; }
        }

        @keyframes magicRainbow {
          0%   { color: #ff6ec7; text-shadow: 0 0 10px #ff6ec7, 0 0 30px #ff6ec7, 0 0 60px #ff6ec7; }
          15%  { color: #FFD700; text-shadow: 0 0 10px #FFD700, 0 0 30px #FFD700, 0 0 60px #FFD700; }
          30%  { color: #7fff7f; text-shadow: 0 0 10px #7fff7f, 0 0 30px #7fff7f, 0 0 60px #7fff7f; }
          45%  { color: #60cfff; text-shadow: 0 0 10px #60cfff, 0 0 30px #60cfff, 0 0 60px #60cfff; }
          60%  { color: #e2d6f4; text-shadow: 0 0 10px #e2d6f4, 0 0 30px #8a2be2, 0 0 60px #8a2be2; }
          75%  { color: #fe598b; text-shadow: 0 0 10px #fe598b, 0 0 30px #fe598b, 0 0 60px #fe598b; }
          100% { color: #ff6ec7; text-shadow: 0 0 10px #ff6ec7, 0 0 30px #ff6ec7, 0 0 60px #ff6ec7; }
        }

        @keyframes magicBorderSpin {
          0%   { border-color: #ff6ec7; box-shadow: 0 0 12px #ff6ec7, inset 0 0 12px rgba(255,110,199,0.15); }
          25%  { border-color: #FFD700; box-shadow: 0 0 18px #FFD700, inset 0 0 12px rgba(255,215,0,0.15); }
          50%  { border-color: #60cfff; box-shadow: 0 0 12px #60cfff, inset 0 0 12px rgba(96,207,255,0.15); }
          75%  { border-color: #fe598b; box-shadow: 0 0 18px #fe598b, inset 0 0 12px rgba(254,89,139,0.15); }
          100% { border-color: #ff6ec7; box-shadow: 0 0 12px #ff6ec7, inset 0 0 12px rgba(255,110,199,0.15); }
        }

        @keyframes magicLabelPulse {
          0%, 100% { opacity: 0.8; }
          50%       { opacity: 1;   }
        }

        @keyframes magicFloat {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-4px); }
        }

        @keyframes magicSparkle {
          0%, 100% { opacity: 0; transform: scale(0.5) rotate(0deg); }
          50%       { opacity: 1; transform: scale(1.2) rotate(180deg); }
        }

        @keyframes oopsieShake {
          0%   { transform: translateX(0) rotate(0); }
          8%   { transform: translateX(-30px) rotate(-6deg); }
          16%  { transform: translateX(30px) rotate(6deg); }
          24%  { transform: translateX(-24px) rotate(-4deg); }
          32%  { transform: translateX(24px) rotate(4deg); }
          40%  { transform: translateX(-16px) rotate(-2deg); }
          48%  { transform: translateX(16px) rotate(2deg); }
          56%  { transform: translateX(-8px) rotate(-1deg); }
          64%  { transform: translateX(8px) rotate(1deg); }
          100% { transform: translateX(0) rotate(0); }
        }
        @keyframes wowBounceIn {
          0%   { transform: scale(0.1) rotate(-20deg); opacity: 0; }
          50%  { transform: scale(1.35) rotate(8deg); opacity: 1; }
          70%  { transform: scale(0.9) rotate(-3deg); }
          85%  { transform: scale(1.1) rotate(2deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes wowRainbow {
          0%   { color: #ff6ec7; text-shadow: 0 0 20px #ff6ec7, 0 0 60px #ff6ec7, 0 0 100px #ff6ec7; }
          16%  { color: #FFD700; text-shadow: 0 0 20px #FFD700, 0 0 60px #FFD700, 0 0 100px #FFD700; }
          33%  { color: #7fff7f; text-shadow: 0 0 20px #7fff7f, 0 0 60px #7fff7f, 0 0 100px #7fff7f; }
          50%  { color: #60cfff; text-shadow: 0 0 20px #60cfff, 0 0 60px #60cfff, 0 0 100px #60cfff; }
          66%  { color: #e2d6f4; text-shadow: 0 0 20px #8a2be2, 0 0 60px #8a2be2, 0 0 100px #8a2be2; }
          83%  { color: #fe598b; text-shadow: 0 0 20px #fe598b, 0 0 60px #fe598b, 0 0 100px #fe598b; }
          100% { color: #ff6ec7; text-shadow: 0 0 20px #ff6ec7, 0 0 60px #ff6ec7, 0 0 100px #ff6ec7; }
        }
        @keyframes starShoot {
          0%   { transform: translateY(0) scale(0); opacity: 0; }
          15%  { opacity: 1; transform: translateY(-25px) scale(1.3); }
          100% { transform: translateY(-200px) scale(0.4); opacity: 0; }
        }
        @keyframes rainbowGlow {
          0%   { opacity: 0; transform: scale(0.2); background: radial-gradient(circle, rgba(255,110,199,0.5) 0%, transparent 70%); }
          25%  { opacity: 1; background: radial-gradient(circle, rgba(255,215,0,0.4) 0%, transparent 70%); }
          50%  { background: radial-gradient(circle, rgba(96,207,255,0.4) 0%, transparent 70%); }
          75%  { background: radial-gradient(circle, rgba(127,255,127,0.4) 0%, transparent 70%); }
          100% { opacity: 0; transform: scale(2.5); background: radial-gradient(circle, rgba(138,43,226,0.3) 0%, transparent 70%); }
        }
        @keyframes oopsiePop {
          0%   { transform: scale(0) rotate(-20deg); opacity: 0; }
          60%  { transform: scale(1.3) rotate(10deg); opacity: 1; }
          80%  { transform: scale(0.9) rotate(-5deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes eyePop {
          0%   { transform: scale(0); opacity: 0; }
          50%  { transform: scale(1.4); opacity: 1; }
          100% { transform: scale(1); opacity: 0.9; }
        }
        @keyframes zzzFloat {
          0%   { transform: translateY(0) scale(0.5); opacity: 0; }
          15%  { opacity: 1; }
          100% { transform: translateY(-220px) scale(1.2); opacity: 0; }
        }
        @keyframes bubbleSpray {
          0%   { transform: translateY(0) scale(0); opacity: 0; }
          15%  { opacity: 1; transform: translateY(-20px) scale(1.2); }
          100% { transform: translateY(-180px) scale(0.6); opacity: 0; }
        }
        @keyframes redFlash {
          0%   { opacity: 0; }
          20%  { opacity: 0.5; }
          40%  { opacity: 0.1; }
          60%  { opacity: 0.4; }
          100% { opacity: 0; }
        }
        @keyframes notCoolIn {
          0%   { transform: scale(0.2) rotate(-15deg); opacity: 0; }
          50%  { transform: scale(1.4) rotate(6deg); opacity: 1; }
          70%  { transform: scale(0.88) rotate(-3deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes scoreboardIn {
          0%   { transform: scale(0.7) translateY(30px); opacity: 0; }
          60%  { transform: scale(1.04) translateY(-4px); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes medalDrop {
          0%   { transform: scale(0) rotate(-20deg); opacity: 0; }
          55%  { transform: scale(1.3) rotate(8deg); opacity: 1; }
          80%  { transform: scale(0.9) rotate(-3deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
      `}</style>

      {/* DISPLAY CONTAINER - 16:9 RATIO */}
      <div style={{
        position: 'relative',
        flex: 1,
        aspectRatio: '16/9',
        background: (progress?.theme ?? 'space') === 'ocean'
          ? 'linear-gradient(180deg, #003d6e 0%, #0077be 55%, #00b4d8 100%)'
          : 'linear-gradient(180deg, #0a0a2e 0%, #1a1a4e 30%, #2a1a4e 60%, #0a0a2e 100%)',
        borderRadius: '0px',
        overflow: 'hidden',
      }}>
        
        {/* THEME BACKGROUND */}
        {(progress?.theme ?? 'space') === 'ocean' ? (
          <OceanBackground />
        ) : null}

        {/* SPACE BACKGROUND */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, display: (progress?.theme ?? 'space') === 'ocean' ? 'none' : 'block' }}>
          {/* Stars */}
          {fixedStars.map((star) => (
            <div key={star.id} style={{
              position: 'absolute',
              width: star.size + 'px', height: star.size + 'px',
              background: star.color, borderRadius: '50%',
              top: star.top + '%', left: star.left + '%',
              boxShadow: `0 0 ${star.size * 2}px ${star.color}`,
              animation: `twinkle ${star.duration}s ease-in-out infinite`,
            }} />
          ))}

          {/* Nebulas */}
          <div style={{ position: 'absolute', top: '15%', left: '25%', width: '280px', height: '200px', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(138,43,226,0.25) 0%, rgba(226,214,244,0.15) 40%, transparent 70%)', animation: 'nebulaPulse 5s ease-in-out infinite alternate' }} />
          <div style={{ position: 'absolute', top: '55%', left: '60%', width: '220px', height: '160px', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(242,129,29,0.2) 0%, rgba(248,218,185,0.12) 40%, transparent 70%)', animation: 'nebulaPulse 7s ease-in-out infinite alternate', animationDelay: '1s' }} />
          <div style={{ position: 'absolute', top: '70%', left: '20%', width: '180px', height: '120px', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(254,89,139,0.15) 0%, rgba(244,216,218,0.1) 40%, transparent 70%)', animation: 'nebulaPulse 6s ease-in-out infinite alternate', animationDelay: '2s' }} />

          {/* Planet 1 — large with craters */}
          <div style={{ position: 'absolute', top: '72%', left: '8%', width: '140px', height: '140px', borderRadius: '50%', background: 'radial-gradient(circle at 30% 30%, #f8dab9, #e2d6f4 40%, #686ea8 70%, #404376)', boxShadow: '0 0 100px rgba(104,110,168,0.6), inset -16px -16px 40px rgba(0,0,0,0.4), inset 16px 16px 40px rgba(255,255,255,0.2)', animation: 'planetFloat 6s ease-in-out infinite', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '25%', left: '30%', width: '35px', height: '35px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(226,214,244,0.7) 0%, rgba(248,218,185,0.5) 40%, transparent 100%)', boxShadow: 'inset 0 0 6px rgba(104,110,168,0.3)' }} />
            <div style={{ position: 'absolute', top: '60%', left: '15%', width: '20px', height: '20px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(104,110,168,0.8) 0%, rgba(226,214,244,0.6) 50%, transparent 100%)', boxShadow: 'inset 0 0 5px rgba(104,110,168,0.4)' }} />
            <div style={{ position: 'absolute', top: '45%', left: '70%', width: '45px', height: '45px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(64,67,118,0.9) 0%, rgba(104,110,168,0.7) 30%, transparent 100%)', boxShadow: 'inset 0 0 15px rgba(64,67,118,0.7)' }} />
            <div style={{ position: 'absolute', top: '20%', left: '60%', width: '25px', height: '25px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(226,214,244,0.8) 0%, rgba(248,218,185,0.6) 45%, transparent 100%)', boxShadow: 'inset 0 0 7px rgba(104,110,168,0.4)' }} />
          </div>

          {/* Planet 2 — pink with stripes */}
          <div style={{ position: 'absolute', top: '20%', left: '82%', width: '55px', height: '55px', borderRadius: '50%', background: 'radial-gradient(circle at 30% 30%, #ff9ed2, #fe598b 50%, #ec4899 80%)', boxShadow: '0 0 40px rgba(254,89,139,0.6), inset -6px -6px 15px rgba(0,0,0,0.3), inset 6px 6px 15px rgba(255,255,255,0.3)', animation: 'planetFloat 5s ease-in-out infinite', animationDelay: '1s', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '50%', left: '50%', width: '80px', height: '6px', background: 'rgba(255,255,255,0.7)', transform: 'translate(-50%, -50%) rotate(5deg)' }} />
            <div style={{ position: 'absolute', top: '30%', left: '50%', width: '80px', height: '3px', background: 'rgba(255,215,0,0.8)', transform: 'translate(-50%, -50%) rotate(5deg)' }} />
            <div style={{ position: 'absolute', top: '70%', left: '50%', width: '80px', height: '8px', background: 'rgba(134,239,172,0.7)', transform: 'translate(-50%, -50%) rotate(5deg)', borderRadius: '4px' }} />
            <div style={{ position: 'absolute', top: '40%', left: '50%', width: '80px', height: '5px', background: 'rgba(134,239,172,0.8)', transform: 'translate(-50%, -50%) rotate(5deg)', borderRadius: '2px' }} />
          </div>

          {/* Planet 3 — green with Saturn ring */}
          <div style={{ position: 'absolute', top: '72%', left: '75%', width: '80px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'planetFloat 4s ease-in-out infinite', animationDelay: '0.5s' }}>
            {/* Back arc (behind planet) */}
            <div style={{ position: 'absolute', width: '78px', height: '22px', border: '3px solid rgba(255,215,0,0.75)', borderRadius: '50%', transform: 'rotate(-15deg)', zIndex: 0, boxShadow: '0 0 8px rgba(255,215,0,0.4)' }} />
            {/* Planet */}
            <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'radial-gradient(circle at 30% 30%, #86efac, #22c55e 50%, #15803d)', boxShadow: '0 0 35px rgba(134,239,172,0.6), inset -5px -5px 12px rgba(0,0,0,0.3), inset 5px 5px 12px rgba(255,255,255,0.3)', position: 'relative', zIndex: 1 }} />
            {/* Front arc (in front of planet) — clips to bottom half only */}
            <div style={{ position: 'absolute', width: '78px', height: '22px', border: '3px solid rgba(255,215,0,0.75)', borderRadius: '50%', transform: 'rotate(-15deg)', zIndex: 2, boxShadow: '0 0 8px rgba(255,215,0,0.4)', clipPath: 'inset(50% 0 0 0)' }} />
          </div>

          {/* Comets */}
          {comets.map((comet) => (
            <div key={comet.id}>
              <style>{`
                @keyframes comet-${comet.id} {
                  0%   { transform: rotate(${comet.angle}deg) translateY(0);      opacity: 0; }
                  5%   { transform: rotate(${comet.angle}deg) translateY(0);      opacity: 1; }
                  90%  { transform: rotate(${comet.angle}deg) translateY(1800px); opacity: 0.7; }
                  100% { transform: rotate(${comet.angle}deg) translateY(2000px); opacity: 0; }
                }
              `}</style>
              <div style={{
                position: 'absolute', left: comet.left, top: comet.top,
                width: '3px', height: comet.tailSize + 'px',
                background: `linear-gradient(to top, white 3px, ${comet.color} 8px, rgba(226,214,244,0.4) 50%, transparent 100%)`,
                borderRadius: '2px', boxShadow: `0 0 12px 4px ${comet.color}`,
                animation: `comet-${comet.id} ${comet.duration}s linear forwards`,
              }} />
            </div>
          ))}
        </div>

        {/* TOP BAR */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          zIndex: 10,
        }}>
          <div style={{ width: '32px' }} />
          <div>
            <div style={{
              background: 'linear-gradient(135deg, var(--k-orange), var(--k-pink))',
              borderRadius: '24px',
              padding: '8px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 4px 20px rgba(242,129,29,0.4)',
            }}>
              <span style={{ fontSize: '20px' }}>🚀</span>
              <span className="display-font" style={{ fontSize: '18px', color: 'white' }}>
                {progress?.sessionQuestion || 'Live Session'}
              </span>
              <span style={{ fontSize: '20px' }}>🚀</span>
            </div>
            {progress?.sessionAim && progress.sessionAim !== progress.sessionQuestion && (
              <div style={{
                textAlign: 'center',
                marginTop: '4px',
                fontSize: '12px',
                color: 'rgba(255,255,255,0.4)',
              }}>
                {progress.sessionAim}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={async () => {
              if (!progress) return;
              const next = (progress.theme ?? 'space') === 'space' ? 'ocean' : 'space';
              await updateSessionTheme(progress.id, next);
            }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', filter: 'drop-shadow(0 0 8px rgba(0,180,216,0.9))', padding: '4px' }}
            title="Switch theme"
          >{(progress?.theme ?? 'space') === 'ocean' ? '🚀' : '🌊'}</button>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button
              type="button"
              onClick={handleEndSession}
              onMouseEnter={() => setShowEndTip(true)}
              onMouseLeave={() => setShowEndTip(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', filter: 'drop-shadow(0 0 8px rgba(254,89,139,0.9))', padding: '4px' }}
            >🏁</button>
            {showEndTip && (
              <div style={{ position: 'absolute', top: '110%', right: 0, background: 'rgba(10,10,46,0.95)', border: '1px solid rgba(254,89,139,0.4)', borderRadius: '8px', padding: '4px 10px', fontSize: '11px', color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap', zIndex: 20 }}>
                End session
              </div>
            )}
          </div>
          </div>
        </div>

        {/* RIGHT PANEL - XP + DIARY + WORD CARDS */}
        <div style={{
          position: 'absolute',
          top: '65px',
          right: '10px',
          width: '158px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 5,
          maxHeight: 'calc(100% - 100px)',
          overflowY: 'auto',
        }}>
          {/* XP COUNTER */}
          <div style={{
            borderRadius: '20px',
            padding: '10px',
            textAlign: 'center',
            backdropFilter: 'blur(4px)',
            background: 'rgba(255,215,0,0.12)',
            border: '2.5px solid rgba(255,215,0,0.35)',
            flexShrink: 0,
          }}>
            <div style={{ fontSize: '30px', lineHeight: 1.1 }}>⭐</div>
            <div className="display-font" style={{ fontSize: '16px', marginTop: '4px', color: '#FFD700' }}>
              {progress?.totalXpEarned || 0}
            </div>
            <div style={{ fontSize: '11px', marginTop: '2px', color: 'rgba(255,215,0,0.5)' }}>XP</div>
          </div>

          {/* LANGUAGE DIARY BUTTON */}
          <button
            onClick={() => setShowLanguageDiary(!showLanguageDiary)}
            style={{
              borderRadius: '20px',
              padding: '10px',
              textAlign: 'center',
              backdropFilter: 'blur(4px)',
              background: showLanguageDiary ? 'linear-gradient(135deg, rgba(138,43,226,0.3), rgba(226,214,244,0.2))' : 'rgba(226,214,244,0.08)',
              border: showLanguageDiary ? '2.5px solid rgba(226,214,244,0.6)' : '2.5px solid rgba(226,214,244,0.25)',
              cursor: 'pointer',
              color: 'white',
              fontFamily: 'Contrail One',
              transition: 'all 0.3s ease',
              flexShrink: 0,
            }}>
            <div style={{ fontSize: '24px', lineHeight: 1.1 }}>📔</div>
            <div className="display-font" style={{ fontSize: '14px', marginTop: '4px', color: 'var(--k-lavender)' }}>
              LANGUAGE DIARY
            </div>
            <div style={{ fontSize: '10px', marginTop: '2px', color: 'rgba(226,214,244,0.5)' }}>
              {(progress?.vocabulary?.length ?? 0) + (progress?.grammar?.length ?? 0) + (progress?.phonics?.length ?? 0)}
            </div>
          </button>

          {/* VOCABULARY CARDS — last 5, newest first */}
          {(progress?.vocabulary?.length ?? 0) > 0 && (
            <div style={{ fontSize: '15px', color: 'var(--k-peach)', fontFamily: 'Contrail One', textAlign: 'center', marginTop: '14px' }}>
              🐱 What's new pussycat!
            </div>
          )}
          {[...(progress?.vocabulary ?? [])].slice(-5).reverse().map((vocab, i) => (
            <div key={`vocab-${i}`} style={{ padding: '2px 4px', animation: 'cardSlideIn 0.5s ease-out' }}>
              <div className="display-font" style={{ fontSize: '18px', lineHeight: 1, color: 'var(--k-lavender)' }}>
                {vocab.word}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '3px' }}>
                {vocab.meaning}
              </div>
            </div>
          ))}

          {/* GRAMMAR CARDS */}
          {progress?.grammar?.map((gram, i) => (
            <div key={`grammar-${i}`} style={{
              background: 'rgba(242,129,29,0.1)',
              border: '2.5px solid rgba(242,129,29,0.25)',
              borderRadius: '18px',
              padding: '10px 12px',
            }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>✍️ sentence tip</div>
              <div className="display-font" style={{ fontSize: '14px', color: 'var(--k-peach)', lineHeight: 1.3, marginTop: '3px' }}>
                {gram.point}
              </div>
            </div>
          ))}

          {/* PHONICS CARDS */}
          {progress?.phonics?.map((ph, i) => (
            <div key={`phonics-${i}`} style={{
              background: 'rgba(220,235,244,0.08)',
              border: '2.5px solid rgba(220,235,244,0.18)',
              borderRadius: '18px',
              padding: '8px 12px',
            }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>🎵 sound</div>
              <div className="display-font" style={{ fontSize: '18px', color: 'var(--k-ice-blue)', lineHeight: 1 }}>
                {ph.sound}
              </div>
              {ph.examples?.length > 0 && (
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
                  {ph.examples.join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* LEFT PANEL - REWARDS */}
        <div style={{
          position: 'absolute',
          top: '65px',
          left: '10px',
          width: '135px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 5,
        }}>
          {/* Wow */}
          <div style={{ textAlign: 'center', padding: '4px 0' }}>
            <div style={{ fontSize: '30px', lineHeight: 1.1 }}>⭐</div>
            <div className="display-font" style={{ fontSize: '16px', marginTop: '4px', color: '#d4a5ff' }}>WOW!</div>
            <div style={{ fontSize: '11px', marginTop: '2px', color: 'rgba(180,130,255,0.5)' }}>{progress?.wows?.length || 0}</div>
          </div>

          {/* Treasure */}
          <div style={{ textAlign: 'center', padding: '4px 0' }}>
            <div style={{ fontSize: '30px', lineHeight: 1.1 }}>🧰</div>
            <div className="display-font" style={{ fontSize: '12px', marginTop: '4px', color: '#FFD700' }}>TREASURE CHEST</div>
            <div style={{ fontSize: '11px', marginTop: '2px', color: 'rgba(255,215,0,0.5)' }}>{progress?.treasureChests?.length || 0}</div>
          </div>

          {/* Behavior */}
          <div style={{ textAlign: 'center', padding: '4px 0' }}>
            <div style={{ fontSize: '22px', lineHeight: 1.1 }}>🎯</div>
            <div className="display-font" style={{ fontSize: '13px', marginTop: '4px', color: 'rgba(134,239,172,0.6)' }}>BEHAVIOR</div>
            <div style={{ fontSize: '10px', marginTop: '2px', color: 'rgba(134,239,172,0.4)' }}>-{progress?.behaviorDeductions?.length || 0}</div>
          </div>

          {/* Oopsie */}
          <div style={{ textAlign: 'center', padding: '4px 0' }}>
            <div style={{ fontSize: '24px', lineHeight: 1.1 }}>👀</div>
            <div className="display-font" style={{ fontSize: '14px', marginTop: '4px', color: 'rgba(255,255,255,0.35)' }}>OOPSIE</div>
            <div style={{ fontSize: '10px', marginTop: '2px', color: 'rgba(255,255,255,0.2)' }}>{progress?.oopsies?.length || 0}</div>
          </div>
        </div>

        {/* LANGUAGE DIARY PANEL - Right Side Overlay */}
        {showLanguageDiary && (
          <>
            {/* Click-outside backdrop */}
            <div
              onClick={() => setShowLanguageDiary(false)}
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 7,
              }}
            />
            {/* Diary Panel */}
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                top: '65px',
                right: '10px',
                width: '38%',
                height: 'calc(100% - 130px)',
                background: 'linear-gradient(135deg, rgba(226,214,244,0.12), rgba(138,43,226,0.12))',
                border: '2.5px solid rgba(226,214,244,0.4)',
                borderRadius: '20px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                backdropFilter: 'blur(8px)',
                zIndex: 8,
                overflow: 'hidden',
              }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--k-lavender)', fontFamily: 'Contrail One' }}>
              📖 Language Diary
            </div>

            {/* Diary Tabs */}
            <div style={{ display: 'flex', gap: '6px', borderBottom: '2px solid rgba(226,214,244,0.2)', flexWrap: 'wrap' }}>
              {(['vocab', 'grammar', 'phonics', 'feedback'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setDiaryTab(tab)}
                  style={{
                    padding: '6px 10px',
                    fontSize: '10px',
                    fontWeight: diaryTab === tab ? 'bold' : 'normal',
                    color: diaryTab === tab ? (tab === 'feedback' ? '#6ee7b7' : 'var(--k-lavender)') : 'rgba(255,255,255,0.4)',
                    background: diaryTab === tab ? (tab === 'feedback' ? 'rgba(16,185,129,0.25)' : 'rgba(138,43,226,0.3)') : 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontFamily: 'Contrail One',
                    transition: 'all 0.2s',
                  }}>
                  {tab === 'vocab' && '📚 Vocab'}
                  {tab === 'grammar' && '✍️ Grammar'}
                  {tab === 'phonics' && '🔤 Phonics'}
                  {tab === 'feedback' && '📝 Feedback'}
                </button>
              ))}
            </div>

            {/* Input */}
            {diaryTab === 'vocab' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <input
                  value={vocabWord}
                  onChange={(e) => setVocabWord(e.target.value)}
                  placeholder="Word (e.g. building)"
                  style={{
                    padding: '8px 10px', borderRadius: '10px',
                    border: '1.5px solid rgba(226,214,244,0.3)',
                    background: 'rgba(0,0,0,0.3)', color: 'white',
                    fontSize: '12px', fontFamily: 'Poppins', outline: 'none',
                  }}
                />
                <input
                  value={vocabMeaning}
                  onChange={(e) => setVocabMeaning(e.target.value)}
                  placeholder="Meaning (e.g. a large structure)"
                  style={{
                    padding: '8px 10px', borderRadius: '10px',
                    border: '1.5px solid rgba(226,214,244,0.3)',
                    background: 'rgba(0,0,0,0.3)', color: 'white',
                    fontSize: '12px', fontFamily: 'Poppins', outline: 'none',
                  }}
                />
                <button
                  onClick={async () => {
                    if (!vocabWord.trim() || !vocabMeaning.trim() || !progress?.id) return;
                    try {
                      await addSessionVocabulary(progress.id, vocabWord.trim(), vocabMeaning.trim());
                      setVocabWord('');
                      setVocabMeaning('');
                    } catch { toast({ title: 'Failed to save word', variant: 'destructive' }); }
                  }}
                  style={{
                    padding: '7px 12px',
                    background: 'linear-gradient(135deg, var(--k-orange), var(--k-pink))',
                    border: 'none', borderRadius: '10px', color: 'white',
                    fontSize: '11px', fontWeight: 'bold', cursor: 'pointer',
                    fontFamily: 'Contrail One',
                  }}>
                  Add Word
                </button>
              </div>
            ) : diaryTab === 'grammar' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <input
                  value={grammarPoint}
                  onChange={(e) => setGrammarPoint(e.target.value)}
                  placeholder="Grammar role (e.g. present perfect)"
                  style={{
                    padding: '8px 10px', borderRadius: '10px',
                    border: '1.5px solid rgba(242,129,29,0.35)',
                    background: 'rgba(0,0,0,0.3)', color: 'white',
                    fontSize: '12px', fontFamily: 'Poppins', outline: 'none',
                  }}
                />
                <input
                  value={grammarExample}
                  onChange={(e) => setGrammarExample(e.target.value)}
                  placeholder="Open cloze — use ___ for blank"
                  style={{
                    padding: '8px 10px', borderRadius: '10px',
                    border: '1.5px solid rgba(242,129,29,0.35)',
                    background: 'rgba(0,0,0,0.3)', color: 'white',
                    fontSize: '12px', fontFamily: 'Poppins', outline: 'none',
                  }}
                />
                <button
                  onClick={handleAddGrammar}
                  style={{
                    padding: '7px 12px',
                    background: 'linear-gradient(135deg, var(--k-orange), var(--k-pink))',
                    border: 'none', borderRadius: '10px', color: 'white',
                    fontSize: '11px', fontWeight: 'bold', cursor: 'pointer',
                    fontFamily: 'Contrail One',
                  }}>
                  Add Grammar
                </button>
              </div>
            ) : diaryTab === 'phonics' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <input
                  value={phonicsSound}
                  onChange={(e) => setPhonicsSound(e.target.value)}
                  placeholder="Keyword (e.g. rock)"
                  style={{
                    padding: '8px 10px', borderRadius: '10px',
                    border: '1.5px solid rgba(220,235,244,0.3)',
                    background: 'rgba(0,0,0,0.3)', color: 'white',
                    fontSize: '12px', fontFamily: 'Poppins', outline: 'none',
                  }}
                />
                <input
                  value={phonicsExamples}
                  onChange={(e) => setPhonicsExamples(e.target.value)}
                  placeholder="Sounds like (e.g. lock)"
                  style={{
                    padding: '8px 10px', borderRadius: '10px',
                    border: '1.5px solid rgba(220,235,244,0.3)',
                    background: 'rgba(0,0,0,0.3)', color: 'white',
                    fontSize: '12px', fontFamily: 'Poppins', outline: 'none',
                  }}
                />
                <button
                  onClick={handleAddPhonics}
                  style={{
                    padding: '7px 12px',
                    background: 'linear-gradient(135deg, var(--k-orange), var(--k-pink))',
                    border: 'none', borderRadius: '10px', color: 'white',
                    fontSize: '11px', fontWeight: 'bold', cursor: 'pointer',
                    fontFamily: 'Contrail One',
                  }}>
                  Add Phonics
                </button>
              </div>
            ) : null}

            {/* Feedback Tab */}
            {diaryTab === 'feedback' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '10px', color: 'rgba(110,231,183,0.7)', fontFamily: 'Poppins', margin: 0 }}>
                  Notes saved here pre-fill the homework draft in the debrief.
                </p>
                <input
                  value={fbTitle}
                  onChange={e => setFbTitle(e.target.value)}
                  onBlur={() => progress && updateSessionFeedbackDraft(progress.id, { feedbackTitle: fbTitle })}
                  placeholder="Homework title (e.g. Animals Workbook)"
                  style={{
                    padding: '7px 10px', borderRadius: '10px',
                    border: '1.5px solid rgba(16,185,129,0.4)',
                    background: 'rgba(0,0,0,0.3)', color: 'white',
                    fontSize: '12px', fontFamily: 'Poppins', outline: 'none',
                  }}
                />
                <textarea
                  value={fbDescription}
                  onChange={e => setFbDescription(e.target.value)}
                  onBlur={() => progress && updateSessionFeedbackDraft(progress.id, { feedbackDescription: fbDescription })}
                  placeholder="What we covered today..."
                  rows={3}
                  style={{
                    padding: '7px 10px', borderRadius: '10px',
                    border: '1.5px solid rgba(16,185,129,0.4)',
                    background: 'rgba(0,0,0,0.3)', color: 'white',
                    fontSize: '12px', fontFamily: 'Poppins', outline: 'none', resize: 'none',
                  }}
                />
                <textarea
                  value={fbInstructions}
                  onChange={e => setFbInstructions(e.target.value)}
                  onBlur={() => progress && updateSessionFeedbackDraft(progress.id, { feedbackInstructions: fbInstructions })}
                  placeholder="Homework instructions for parent..."
                  rows={3}
                  style={{
                    padding: '7px 10px', borderRadius: '10px',
                    border: '1.5px solid rgba(16,185,129,0.4)',
                    background: 'rgba(0,0,0,0.3)', color: 'white',
                    fontSize: '12px', fontFamily: 'Poppins', outline: 'none', resize: 'none',
                  }}
                />
              </div>
            )}

            {/* Entries — hidden on feedback tab */}
            <div style={{
              display: diaryTab === 'feedback' ? 'none' : 'flex',
              flexDirection: 'column',
              gap: '7px',
              overflowY: 'auto',
              flex: 1,
            }}>
              {diaryTab === 'vocab' ? (
                <>
                  {(progress?.vocabulary ?? []).map((v, i) => (
                    <div key={i} style={{
                      borderRadius: '14px', padding: '9px 12px',
                      background: 'linear-gradient(135deg, rgba(226,214,244,0.18), rgba(138,43,226,0.1))',
                      border: '2px solid rgba(226,214,244,0.25)',
                      animation: 'cardSlideIn 0.4s ease-out',
                    }}>
                      <div className="display-font" style={{ fontSize: '15px', lineHeight: 1.1, color: 'var(--k-lavender)' }}>
                        {v.word}
                      </div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '3px' }}>
                        {v.meaning}
                      </div>
                    </div>
                  ))}
                  {(progress?.vocabulary ?? []).length === 0 && (
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: '8px' }}>
                      No words added yet
                    </div>
                  )}
                </>
              ) : diaryTab === 'grammar' ? (
                <>
                  {(progress?.grammar ?? []).map((g, i) => (
                    <div key={i} style={{
                      borderRadius: '14px', padding: '9px 12px',
                      background: 'rgba(242,129,29,0.1)',
                      border: '2px solid rgba(242,129,29,0.25)',
                      animation: 'cardSlideIn 0.4s ease-out',
                    }}>
                      <div className="display-font" style={{ fontSize: '13px', lineHeight: 1.2, color: 'var(--k-peach)' }}>
                        {g.point}
                      </div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', marginTop: '3px', fontStyle: 'italic' }}>
                        {g.example}
                      </div>
                    </div>
                  ))}
                  {(progress?.grammar ?? []).length === 0 && (
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: '8px' }}>
                      No grammar added yet
                    </div>
                  )}
                </>
              ) : (
                <>
                  {(progress?.phonics ?? []).map((p, i) => (
                    <div key={i} style={{
                      borderRadius: '14px', padding: '9px 12px',
                      background: 'rgba(220,235,244,0.08)',
                      border: '2px solid rgba(220,235,244,0.18)',
                      animation: 'cardSlideIn 0.4s ease-out',
                    }}>
                      <div className="display-font" style={{ fontSize: '13px', lineHeight: 1.2, color: 'var(--k-ice-blue)' }}>
                        {p.sound}
                      </div>
                      {p.examples[0] && (
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', marginTop: '3px' }}>
                          sounds like: {p.examples[0]}
                        </div>
                      )}
                    </div>
                  ))}
                  {(progress?.phonics ?? []).length === 0 && (
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: '8px' }}>
                      No phonics added yet
                    </div>
                  )}
                </>
              )}
            </div>
            </div>
          </>
        )}

        {/* BOTTOM BAR - PROGRESS & MAGIC WORD */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '10px 16px',
          background: 'rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          zIndex: 10,
        }}>
          {/* Progress */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <div style={{
                flex: 1,
                height: '16px',
                background: 'rgba(255,255,255,0.06)',
                borderRadius: '10px',
                overflow: 'visible',
                position: 'relative',
              }}>
                <div style={{
                  width: `${Math.min((progress?.totalXpEarned || 0) / (progress?.xpTarget || 60) * 100, 100)}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--k-orange), var(--k-pink), var(--k-lavender))',
                  borderRadius: '10px',
                  transition: 'width 0.5s ease-out',
                }} />
                <img
                  src="/Dork1.png"
                  alt="dork"
                  style={{
                    position: 'absolute',
                    left: `calc(${Math.min((progress?.totalXpEarned || 0) / (progress?.xpTarget || 60) * 100, 100)}% - 24px)`,
                    top: '-16px',
                    width: '48px',
                    height: '48px',
                    objectFit: 'contain',
                    transform: 'scaleX(-1)',
                    transition: 'left 0.5s ease-out',
                  }}
                />
              </div>
              <div style={{ fontSize: '39px', marginLeft: '6px' }}>🏆</div>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '3px',
              fontSize: '11px',
              color: 'rgba(255,255,255,0.3)',
            }}>
              <span className="display-font">{progress?.totalXpEarned || 0}</span>
              <span>/ {progress?.xpTarget || 60} XP</span>
            </div>
          </div>

          {/* Magic Word */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(138,43,226,0.25), rgba(255,110,199,0.15), rgba(255,215,0,0.1))',
            border: '3px solid #ff6ec7',
            borderRadius: '20px',
            padding: '10px 16px',
            textAlign: 'center',
            backdropFilter: 'blur(8px)',
            minWidth: '140px',
            animation: 'magicBorderSpin 3s linear infinite',
            position: 'relative',
          }}>
            {/* Corner sparkles */}
            {['top:-8px;left:-8px', 'top:-8px;right:-8px', 'bottom:-8px;left:-8px', 'bottom:-8px;right:-8px'].map((pos, i) => (
              <span key={i} style={{
                position: 'absolute',
                fontSize: '14px',
                animation: `magicSparkle 1.5s ease-in-out infinite`,
                animationDelay: `${i * 0.35}s`,
                ...(Object.fromEntries(pos.split(';').map(p => { const [k,v] = p.split(':'); return [k, v]; })))
              }}>✨</span>
            ))}
            <div className="display-font" style={{
              fontSize: '10px',
              fontFamily: 'Contrail One',
              animation: 'magicLabelPulse 2s ease-in-out infinite',
              letterSpacing: '0.15em',
              color: '#FFD700',
              textShadow: '0 0 8px #FFD700',
            }}>
              ⭐ MAGIC WORD ⭐
            </div>
            <div className="display-font" style={{
              fontSize: '22px',
              letterSpacing: '0.12em',
              marginTop: '4px',
              animation: 'magicRainbow 3s linear infinite',
              fontWeight: 'bold',
            }}>
              {progress?.magicWord || '? ? ?'}
            </div>
          </div>
        </div>

        {/* ANIMATION OVERLAY */}
        {activeAnimation && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20,
            pointerEvents: 'none',
          }}>
            {activeAnimation.type === 'wow' && (
              <>
                {/* Rainbow burst glow */}
                <div style={{ position: 'absolute', width: '560px', height: '560px', borderRadius: '50%', animation: 'rainbowGlow 2s ease-out forwards' }} />
                {/* Rainbow rays */}
                {[...Array(10)].map((_, i) => (
                  <div key={`ray-${i}`} style={{ position: 'absolute', width: '5px', height: '280px', background: `linear-gradient(to top, ${['#ff6ec7','#FFD700','#7fff7f','#60cfff','#e2d6f4','#fe598b','#ff6ec7','#FFD700','#7fff7f','#60cfff'][i]}, transparent)`, transform: `rotate(${i * 36}deg)`, transformOrigin: 'bottom center', bottom: '50%', animation: 'rayShoot 1.6s ease-out forwards', animationDelay: `${i * 0.04}s` }} />
                ))}
                {/* Stars spraying out */}
                {[...Array(12)].map((_, i) => (
                  <div key={`star-${i}`} style={{ position: 'absolute', transform: `rotate(${i * 30}deg)`, transformOrigin: 'center center' }}>
                    <div style={{ fontSize: '34px', marginTop: '-90px', animation: 'starShoot 1.4s ease-out forwards', animationDelay: `${0.1 + i * 0.04}s`, opacity: 0 }}>⭐</div>
                  </div>
                ))}
                {/* WOW! text */}
                <div style={{ fontSize: '180px', fontFamily: 'Contrail One', fontWeight: 'bold', animation: 'wowBounceIn 0.7s cubic-bezier(0.34, 1.56, 0.64, 1), wowRainbow 0.4s linear 0.7s infinite', zIndex: 21, position: 'relative' }}>
                  WOW!
                </div>
              </>
            )}

            {activeAnimation.type.startsWith('treasure-') && (
              <>
                {/* Gold radiant glow */}
                <div style={{ position: 'absolute', width: '520px', height: '520px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,215,0,0.55) 0%, rgba(255,165,0,0.2) 45%, transparent 70%)', animation: 'goldGlow 2s ease-out forwards' }} />
                {/* Gold rays */}
                {[...Array(8)].map((_, i) => (
                  <div key={`ray-${i}`} style={{ position: 'absolute', width: '6px', height: '260px', background: 'linear-gradient(to top, rgba(255,215,0,0.95), rgba(255,215,0,0.3) 60%, transparent)', transform: `rotate(${i * 45}deg)`, transformOrigin: 'bottom center', bottom: '50%', animation: 'rayShoot 1.4s ease-out forwards', animationDelay: `${i * 0.04}s` }} />
                ))}
                {/* Coins flying out */}
                {[...Array(10)].map((_, i) => (
                  <div key={`coin-${i}`} style={{ position: 'absolute', transform: `rotate(${i * 36}deg)`, transformOrigin: 'center center' }}>
                    <div style={{ fontSize: '32px', marginTop: '-80px', animation: 'coinShoot 1.3s ease-out forwards', animationDelay: `${0.1 + i * 0.04}s`, opacity: 0 }}>🪙</div>
                  </div>
                ))}
                {/* Chest */}
                <div style={{ fontSize: '160px', animation: 'chestOpen 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)', filter: 'drop-shadow(0 0 50px rgba(255,215,0,1)) drop-shadow(0 0 100px rgba(255,165,0,0.5))', position: 'relative', zIndex: 25 }}>
                  🧰
                </div>
                {/* Amount */}
                <div style={{ position: 'absolute', fontSize: '90px', fontFamily: 'Contrail One', color: '#FFD700', textShadow: '0 0 40px rgba(255,215,0,1), 0 0 80px rgba(255,165,0,0.8)', animation: 'wowExplosion 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.35s forwards', opacity: 0, top: '62%', zIndex: 26 }}>
                  +{activeAnimation.amount}
                </div>
              </>
            )}

            {activeAnimation.type === 'oopsie' && (
              <>
                {/* Red warning glow */}
                <div style={{ position: 'absolute', width: '580px', height: '580px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,50,0,0.45) 0%, rgba(242,129,29,0.2) 45%, transparent 70%)', animation: 'goldGlow 2s ease-out forwards' }} />
                {/* Scattered 👀 eyes popping up at random positions */}
                {[
                  { top: '15%', left: '12%' }, { top: '10%', left: '55%' }, { top: '18%', left: '80%' },
                  { top: '45%', left: '5%'  }, { top: '75%', left: '18%' }, { top: '80%', left: '60%' },
                  { top: '70%', left: '85%' }, { top: '40%', left: '88%' }, { top: '55%', left: '48%' },
                ].map((pos, i) => (
                  <div key={i} style={{ position: 'absolute', fontSize: '52px', top: pos.top, left: pos.left, animation: 'eyePop 1.8s ease-out forwards', animationDelay: `${i * 0.08}s`, opacity: 0 }}>👀</div>
                ))}
                {/* OOPSIE! text — shaking */}
                <div style={{ fontSize: '170px', fontFamily: 'Contrail One', fontWeight: 'bold', color: '#f2811d', textShadow: '0 0 30px rgba(255,80,0,0.9), 0 0 70px rgba(242,129,29,0.6)', animation: 'oopsiePop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1), oopsieShake 0.5s ease-in-out 0.8s 2', zIndex: 21, position: 'relative' }}>
                  OOPSIE!
                </div>
              </>
            )}

            {activeAnimation.type === 'behavior-out-to-lunch' && (
              <>
                {/* Screen dim */}
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,10,0.4)', animation: 'goldGlow 2s ease-out forwards' }} />
                {/* ZZZs floating up */}
                {[...Array(8)].map((_, i) => (
                  <div key={i} style={{ position: 'absolute', fontSize: `${28 + i * 8}px`, left: `${30 + i * 6}%`, bottom: '35%', color: '#a78bfa', textShadow: '0 0 10px #8a2be2', animation: 'zzzFloat 1.8s ease-out forwards', animationDelay: `${i * 0.15}s`, opacity: 0 }}>Z</div>
                ))}
                <div style={{ fontSize: '140px', fontFamily: 'Contrail One', color: '#a78bfa', textShadow: '0 0 30px rgba(138,43,226,0.8)', animation: 'wowBounceIn 0.6s cubic-bezier(0.34,1.56,0.64,1)', zIndex: 21, position: 'relative' }}>
                  😴 ZZZZZZ
                </div>
                <div style={{ position: 'absolute', fontSize: '60px', fontFamily: 'Contrail One', color: 'rgba(167,139,250,0.8)', top: '65%', animation: 'wowExplosion 0.5s ease-out 0.4s forwards', opacity: 0 }}>-3 XP</div>
              </>
            )}

            {activeAnimation.type === 'behavior-chatterbox' && (
              <>
                {/* Speech bubbles spraying out */}
                {[...Array(10)].map((_, i) => (
                  <div key={i} style={{ position: 'absolute', transform: `rotate(${i * 36}deg)`, transformOrigin: 'center center' }}>
                    <div style={{ fontSize: '36px', marginTop: '-80px', animation: 'bubbleSpray 1.3s ease-out forwards', animationDelay: `${0.1 + i * 0.05}s`, opacity: 0 }}>💬</div>
                  </div>
                ))}
                <div style={{ fontSize: '120px', fontFamily: 'Contrail One', color: '#f2811d', textShadow: '0 0 30px rgba(242,129,29,0.8)', animation: 'wowBounceIn 0.6s cubic-bezier(0.34,1.56,0.64,1)', zIndex: 21, position: 'relative' }}>
                  🗣️ SHHH!
                </div>
                <div style={{ position: 'absolute', fontSize: '55px', fontFamily: 'Contrail One', color: 'rgba(242,129,29,0.9)', top: '65%', animation: 'wowExplosion 0.5s ease-out 0.4s forwards', opacity: 0 }}>-2 XP</div>
              </>
            )}

            {activeAnimation.type === 'behavior-disruptive' && (
              <>
                {/* Red flash overlay */}
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(220,0,0,0.35)', animation: 'redFlash 1s ease-out forwards' }} />
                {/* Warning signs spraying */}
                {[...Array(8)].map((_, i) => (
                  <div key={i} style={{ position: 'absolute', transform: `rotate(${i * 45}deg)`, transformOrigin: 'center center' }}>
                    <div style={{ fontSize: '38px', marginTop: '-80px', animation: 'bubbleSpray 1.2s ease-out forwards', animationDelay: `${i * 0.06}s`, opacity: 0 }}>⚠️</div>
                  </div>
                ))}
                <div style={{ fontSize: '130px', fontFamily: 'Contrail One', color: '#ff2020', textShadow: '0 0 30px rgba(255,0,0,0.9), 0 0 70px rgba(255,50,0,0.6)', animation: 'notCoolIn 0.6s cubic-bezier(0.34,1.56,0.64,1), oopsieShake 0.4s ease-in-out 0.7s 2', zIndex: 21, position: 'relative' }}>
                  NOT COOL!
                </div>
                <div style={{ position: 'absolute', fontSize: '60px', fontFamily: 'Contrail One', color: 'rgba(255,32,32,0.9)', top: '65%', animation: 'wowExplosion 0.5s ease-out 0.4s forwards', opacity: 0 }}>-5 XP</div>
              </>
            )}

            {activeAnimation.type === 'boom' && (
              <>
                <div style={{ position: 'absolute', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,100,0,0.4) 0%, rgba(255,50,0,0.15) 50%, transparent 70%)', animation: 'goldGlow 1.5s ease-out forwards' }} />
                <div style={{ fontSize: '160px', fontFamily: 'Contrail One', fontWeight: 'bold', color: '#FF4500', textShadow: '0 0 30px rgba(255,69,0,0.9), 0 0 60px rgba(255,165,0,0.7), 0 0 100px rgba(255,50,0,0.5)', animation: 'boomExplosion 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)', zIndex: 21 }}>
                  💥 BOOM!
                </div>
              </>
            )}
          </div>
        )}

        {/* SCOREBOARD OVERLAY */}
        {showScoreboard && progress && (() => {
          const deductions = progress.behaviorDeductions?.length ?? 0;
          const xpPct = progress.xpTarget > 0 ? progress.totalXpEarned / progress.xpTarget : 0;
          const medal =
            deductions >= 3 ? null :
            xpPct >= 1 && deductions === 0 ? 'gold' :
            xpPct >= 0.6 && deductions <= 1 ? 'silver' :
            xpPct >= 0.3 && deductions <= 2 ? 'bronze' :
            null;
          const medalEmoji   = medal === 'gold' ? '🥇' : medal === 'silver' ? '🥈' : medal === 'bronze' ? '🥉' : null;
          const medalLabel   = medal === 'gold' ? 'Gold Dork' : medal === 'silver' ? 'Silver Dork' : medal === 'bronze' ? 'Bronze Dork' : null;
          const medalColor   = medal === 'gold' ? '#FFD700' : medal === 'silver' ? '#C0C0C0' : medal === 'bronze' ? '#CD7F32' : null;
          const vocabCount   = progress.vocabulary?.length ?? 0;
          const grammarCount = progress.grammar?.length ?? 0;
          const phonicsCount = progress.phonics?.length ?? 0;
          const wowCount     = progress.wows?.length ?? 0;
          return (
            <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(5,5,25,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowScoreboard(false)}>
              <div style={{ animation: 'scoreboardIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards', background: 'linear-gradient(145deg, rgba(26,26,78,0.97) 0%, rgba(42,26,78,0.97) 100%)', border: '2px solid rgba(226,214,244,0.3)', borderRadius: '24px', padding: '36px 48px', textAlign: 'center', minWidth: '360px', boxShadow: '0 0 80px rgba(138,43,226,0.4)' }} onClick={e => e.stopPropagation()}>

                <p style={{ fontSize: '13px', letterSpacing: '3px', color: 'rgba(226,214,244,0.5)', textTransform: 'uppercase', marginBottom: '6px' }}>Session Complete</p>
                <p className="display-font" style={{ fontSize: '32px', color: 'white', marginBottom: '24px', textShadow: '0 0 20px rgba(226,214,244,0.5)' }}>
                  {progress.sessionQuestion || 'Great work!'}
                </p>

                {/* Medal */}
                {medalEmoji ? (
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ fontSize: '72px', animation: 'medalDrop 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.3s both', display: 'inline-block' }}>{medalEmoji}</div>
                    <p style={{ fontSize: '18px', fontWeight: 'bold', color: medalColor!, marginTop: '4px', textShadow: `0 0 20px ${medalColor}` }}>{medalLabel}</p>
                  </div>
                ) : (
                  <div style={{ marginBottom: '24px', fontSize: '13px', color: 'rgba(254,89,139,0.7)', letterSpacing: '1px' }}>No medal this time — keep going! 💪</div>
                )}

                {/* Stats grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '28px' }}>
                  {[
                    { label: 'XP', value: `${progress.totalXpEarned} / ${progress.xpTarget}`, color: '#FFD700' },
                    { label: '⭐ Wows', value: wowCount, color: '#60cfff' },
                    { label: '📖 Vocab', value: vocabCount, color: '#86efac' },
                    { label: '✍️ Grammar', value: grammarCount, color: '#fdba74' },
                    { label: '🔤 Phonics', value: phonicsCount, color: '#a78bfa' },
                    { label: '⚠️ Deductions', value: deductions, color: deductions >= 3 ? '#fe598b' : 'rgba(255,255,255,0.5)' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '10px 8px' }}>
                      <p style={{ fontSize: '11px', color: 'rgba(226,214,244,0.5)', marginBottom: '4px' }}>{label}</p>
                      <p style={{ fontSize: '20px', fontWeight: 'bold', color }}>{value}</p>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleScoreboardContinue}
                  style={{ background: 'linear-gradient(135deg, #f2811d, #fe598b)', border: 'none', borderRadius: '14px', padding: '12px 32px', fontSize: '15px', fontWeight: 'bold', color: 'white', cursor: 'pointer', boxShadow: '0 4px 20px rgba(242,129,29,0.4)', letterSpacing: '0.5px' }}
                >
                  Continue to Debrief →
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      {/* CONTROL PANEL - Below display */}
      <TooltipProvider>
        <div style={{
          background: 'rgba(26, 26, 46, 0.8)',
          borderTop: '1px solid rgba(226,214,244,0.1)',
          padding: '12px 16px',
          maxHeight: '120px',
          overflowY: 'auto',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm" 
                  onClick={handleWow} 
                  className="text-xs"
                  style={{
                    background: 'rgba(138,43,226,0.2)',
                  }}>
                  ✨ WOW
                </Button>
              </TooltipTrigger>
              <TooltipContent>Nice Job!</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm" 
                  onClick={() => handleTreasureChest(5)} 
                  variant="outline" 
                  className="text-xs"
                  style={{
                  }}>
                  🧰 +5
                </Button>
              </TooltipTrigger>
              <TooltipContent>Small Treasure</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm" 
                  onClick={() => handleTreasureChest(10)} 
                  variant="outline" 
                  className="text-xs"
                  style={{
                  }}>
                  🧰 +10
                </Button>
              </TooltipTrigger>
              <TooltipContent>Good Effort!</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm" 
                  onClick={() => handleTreasureChest(15)} 
                  variant="outline" 
                  className="text-xs"
                  style={{
                  }}>
                  🧰 +15
                </Button>
              </TooltipTrigger>
              <TooltipContent>Great Work!</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm" 
                  onClick={() => handleTreasureChest(20)} 
                  variant="outline" 
                  className="text-xs"
                  style={{
                  }}>
                  🧰 +20
                </Button>
              </TooltipTrigger>
              <TooltipContent>Excellent!</TooltipContent>
            </Tooltip>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginTop: '8px' }}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm" 
                  onClick={handleOopsie} 
                  variant="outline" 
                  className="text-xs"
                  style={{
                    background: 'rgba(242,129,29,0.2)',
                  }}>
                  👀 Oopsie!
                </Button>
              </TooltipTrigger>
              <TooltipContent>Observation</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm" 
                  onClick={() => handleBehavior('out-to-lunch')} 
                  variant="outline" 
                  className="text-xs"
                  style={{
                  }}>
                  😴 -3
                </Button>
              </TooltipTrigger>
              <TooltipContent>Out to Lunch</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm" 
                  onClick={() => handleBehavior('chatterbox')} 
                  variant="outline" 
                  className="text-xs"
                  style={{
                  }}>
                  🗣️ -2
                </Button>
              </TooltipTrigger>
              <TooltipContent>Chatterbox</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="sm" 
                  onClick={() => handleBehavior('disruptive')} 
                  variant="outline" 
                  className="text-xs"
                  style={{
                  }}>
                  😬 -5
                </Button>
              </TooltipTrigger>
              <TooltipContent>Disruptive</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  onClick={handleBoom}
                  className="text-xs"
                  style={{
                    background: 'linear-gradient(135deg, var(--k-orange), var(--k-pink))',
                    color: 'white',
                    fontWeight: 'bold',
                    filter: 'brightness(1.2) drop-shadow(0 0 10px rgba(242,129,29,0.6))',
                  }}>
                  💥 BOOM!
                </Button>
              </TooltipTrigger>
              <TooltipContent>Commit action</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  onClick={handleEndSession}
                  variant="outline"
                  className="text-xs col-span-1"
                  style={{
                    borderColor: 'rgba(226,214,244,0.3)',
                    color: 'rgba(226,214,244,0.7)',
                    background: 'rgba(0,0,0,0.3)',
                  }}>
                  🏁 End
                </Button>
              </TooltipTrigger>
              <TooltipContent>End session → debrief</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </TooltipProvider>

    </div>
  );
}
