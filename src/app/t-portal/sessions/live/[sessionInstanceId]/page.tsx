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
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Loader2, X, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { SessionInstance, Student, SessionProgress as Phase17SessionProgress } from '@/lib/types';
import type { PetlandProfile } from '@/modules/petland/types';

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
  const [wowActive, setWowActive] = useState(false);
  const [treasureActive, setTreasureActive] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [activeAnimation, setActiveAnimation] = useState<{ type: string; amount?: number } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
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

  // Language Diary
  const [showLanguageDiary, setShowLanguageDiary] = useState(false);
  const [diaryTab, setDiaryTab] = useState<'vocab' | 'grammar' | 'phonics'>('vocab');
  const [diaryNotes, setDiaryNotes] = useState('');
  const [diaryEntries, setDiaryEntries] = useState<Array<{
    type: 'vocab' | 'grammar' | 'phonics';
    content: string;
    timestamp: Date;
  }>>([]);

  // Single active comet at a time - no repeated vectors
  const [activeComet, setActiveComet] = useState<{
    left: string;
    top: string;
    duration: number;
    angle: number;
    tailSize: number;
    isActive: boolean;
  } | null>(null);

  const cometTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastAngleRef = useRef<number>(0);

  // Single comet timer - one at a time, completely random, no repeated vectors
  useEffect(() => {
    const startNextComet = (isFirst = false) => {
      // First comet appears quickly (0.5-2s), subsequent ones wait 10-20s
      const waitTime = isFirst ? (0.5 + Math.random() * 1.5) : (10 + Math.random() * 10);
      
      cometTimerRef.current = setTimeout(() => {
        // Generate angle, ensuring it's different from last comet
        let newAngle = 170 + Math.random() * 100; // 170-270deg
        while (Math.abs(newAngle - lastAngleRef.current) < 30) {
          newAngle = 170 + Math.random() * 100; // Ensure at least 30deg difference
        }
        lastAngleRef.current = newAngle;

        // Random start position (can come from any edge/corner)
        const startEdge = Math.random();
        let startX, startY;

        if (startEdge < 0.25) {
          // Top edge
          startX = (10 + Math.random() * 80) + '%';
          startY = '-20%';
        } else if (startEdge < 0.5) {
          // Right edge
          startX = '105%';
          startY = (Math.random() * 80) + '%';
        } else if (startEdge < 0.75) {
          // Bottom edge
          startX = (10 + Math.random() * 80) + '%';
          startY = '105%';
        } else {
          // Left edge
          startX = '-5%';
          startY = (Math.random() * 80) + '%';
        }

        const duration = 1 + Math.random() * 5; // 1-6s speed
        const tailSize = 40 + Math.random() * 100; // 40-140px tail length

        const newComet = {
          left: startX,
          top: startY,
          duration,
          angle: newAngle,
          tailSize,
          isActive: true,
        };
        
        console.log('Comet appearing:', newComet);
        setActiveComet(newComet);
        
        // Hide after animation and start next wait
        const animTime = duration * 1000;
        cometTimerRef.current = setTimeout(() => {
          console.log('Comet disappearing');
          setActiveComet(null);
          startNextComet(false); // Loop with longer wait
        }, animTime);
      }, waitTime * 1000);
    };

    console.log('Comet effect mounted, starting first timer');
    startNextComet(true); // Start with first=true for quick appearance

    return () => {
      if (cometTimerRef.current) {
        clearTimeout(cometTimerRef.current);
      }
    };
  }, []);

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
    const action = `treasure-${amount}`;
    setSelectedAction(selectedAction === action ? null : action);
  };

  const handleWow = async () => {
    if (!progress) return;
    setSelectedAction(selectedAction === 'wow' ? null : 'wow');
  };

  const handleOopsie = async () => {
    if (!progress) return;
    setSelectedAction(selectedAction === 'oopsie' ? null : 'oopsie');
  };

  const handleBehavior = async (type: 'out-to-lunch' | 'chatterbox' | 'disruptive') => {
    if (!progress) return;
    const action = `behavior-${type}`;
    setSelectedAction(selectedAction === action ? null : action);
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

  const handleAddDiaryEntry = () => {
    if (!diaryNotes.trim()) {
      toast({ title: 'Please enter some notes', variant: 'destructive' });
      return;
    }
    
    const newEntry = {
      type: diaryTab,
      content: diaryNotes,
      timestamp: new Date(),
    };
    
    setDiaryEntries([...diaryEntries, newEntry]);
    setDiaryNotes('');
    toast({ title: `${diaryTab.charAt(0).toUpperCase() + diaryTab.slice(1)} note saved` });
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

  const handleBoom = async () => {
    if (!selectedAction || !progress) return;
    
    const action = selectedAction;
    playSound(action);
    setActiveAnimation({ type: action });
    
    try {
      if (action === 'wow') {
        await addWow(progress.id);
      } else if (action.startsWith('treasure-')) {
        const amount = parseInt(action.split('-')[1]);
        await addTreasureChest(progress.id, amount);
      } else if (action === 'oopsie') {
        await addOopsie(progress.id);
      } else if (action.startsWith('behavior-')) {
        const behaviorType = action.split('-').slice(1).join('-') as 'out-to-lunch' | 'chatterbox' | 'disruptive';
        await addBehaviorDeduction(progress.id, behaviorType);
      }
    } catch (err) {
      toast({ title: 'Error committing action', variant: 'destructive' });
    }
    
    setSelectedAction(null);
    setTimeout(() => setActiveAnimation(null), 2000);
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
          0% { opacity: 0.2; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1.2); }
        }

        @keyframes cometFly {
          0% { transform: translateX(0) translateY(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateX(-600px) translateY(200px); opacity: 0; }
        }

        @keyframes comet0 {
          0% { transform: rotate(201deg) translate(0, 0); opacity: 0; }
          1.2% { opacity: 0.9; }
          32% { opacity: 0.5; }
          40% { transform: rotate(201deg) translate(0, -700px); opacity: 0; }
          100% { transform: rotate(201deg) translate(0, -700px); opacity: 0; }
        }

        @keyframes comet1 {
          0% { transform: rotate(219deg) translate(0, 0); opacity: 0; }
          1.2% { opacity: 0.85; }
          32% { opacity: 0.5; }
          40% { transform: rotate(219deg) translate(0, -650px); opacity: 0; }
          100% { transform: rotate(219deg) translate(0, -650px); opacity: 0; }
        }

        @keyframes comet2 {
          0% { transform: rotate(195deg) translate(0, 0); opacity: 0; }
          1.2% { opacity: 0.9; }
          32% { opacity: 0.5; }
          40% { transform: rotate(195deg) translate(0, -720px); opacity: 0; }
          100% { transform: rotate(195deg) translate(0, -720px); opacity: 0; }
        }

        @keyframes comet3 {
          0% { transform: rotate(211deg) translate(0, 0); opacity: 0; }
          1.2% { opacity: 0.85; }
          32% { opacity: 0.5; }
          40% { transform: rotate(211deg) translate(0, -680px); opacity: 0; }
          100% { transform: rotate(211deg) translate(0, -680px); opacity: 0; }
        }

        @keyframes nebulaPulse {
          0% { opacity: 0.5; transform: scale(1); }
          100% { opacity: 1; transform: scale(1.1); }
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

        @keyframes oopsieShake {
          0%, 100% { transform: translateX(0) rotate(0); }
          10% { transform: translateX(-20px) rotate(-5deg); }
          20% { transform: translateX(20px) rotate(5deg); }
          30% { transform: translateX(-15px) rotate(-3deg); }
          40% { transform: translateX(15px) rotate(3deg); }
          50% { transform: translateX(-10px) rotate(-2deg); }
          60% { transform: translateX(10px) rotate(2deg); }
          70% { transform: translateX(-5px) rotate(-1deg); }
          80% { transform: translateX(5px) rotate(1deg); }
        }

        @keyframes eyesCenterBehind {
          0% { transform: rotate(0deg) translateX(120px) rotate(0deg); opacity: 1; }
          60% { transform: rotate(180deg) translateX(120px) rotate(-180deg); opacity: 1; }
          75% { transform: rotate(180deg) translateX(0px) rotate(-180deg); opacity: 1; }
          100% { transform: rotate(180deg) translateX(0px) rotate(-180deg); opacity: 0; }
        }
      `}</style>

      {/* DISPLAY CONTAINER - 16:9 RATIO */}
      <div style={{
        position: 'relative',
        flex: 1,
        aspectRatio: '16/9',
        background: 'linear-gradient(180deg, #0a0a2e 0%, #1a1a4e 30%, #2a1a4e 60%, #0a0a2e 100%)',
        borderRadius: '0px',
        overflow: 'hidden',
      }}>
        
        {/* SPACE THEME BACKGROUND - 50% opacity */}
        <div style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.5,
          pointerEvents: 'none',
          zIndex: 0,
        }}>
          {/* Stars — doubled, varied sizes, opacities, twinkle rates */}
          {[
            { size: 2, top: '5%', left: '20%', opacity: 0.6, twinkleDuration: 2.5 },
            { size: 4, top: '12%', left: '75%', opacity: 0.9, twinkleDuration: 3.5 },
            { size: 3, top: '22%', left: '45%', opacity: 0.5, twinkleDuration: 2 },
            { size: 2, top: '35%', left: '8%', opacity: 0.7, twinkleDuration: 4 },
            { size: 5, top: '55%', left: '92%', opacity: 0.8, twinkleDuration: 2.8 },
            { size: 2, top: '68%', left: '30%', opacity: 0.4, twinkleDuration: 3.2 },
            { size: 3, top: '78%', left: '65%', opacity: 0.9, twinkleDuration: 2.2 },
            { size: 2, top: '88%', left: '15%', opacity: 0.6, twinkleDuration: 3.8 },
            { size: 3, top: '8%', left: '60%', opacity: 0.7, twinkleDuration: 3 },
            { size: 2, top: '18%', left: '35%', opacity: 0.5, twinkleDuration: 2.6 },
            { size: 4, top: '42%', left: '82%', opacity: 0.8, twinkleDuration: 3.3 },
            { size: 2, top: '50%', left: '12%', opacity: 0.6, twinkleDuration: 2.4 },
            { size: 3, top: '62%', left: '70%', opacity: 0.9, twinkleDuration: 3.6 },
            { size: 2, top: '72%', left: '48%', opacity: 0.5, twinkleDuration: 2.1 },
            { size: 5, top: '85%', left: '38%', opacity: 0.7, twinkleDuration: 3.9 },
            { size: 2, top: '28%', left: '88%', opacity: 0.8, twinkleDuration: 2.7 },
          ].map((star, i) => (
            <style key={`twinkle-${i}`}>
              {`
                @keyframes twinkle-${i} {
                  0% { opacity: ${star.opacity * 0.2}; }
                  100% { opacity: ${star.opacity}; }
                }
              `}
            </style>
          ))}
          {[
            { size: 2, top: '5%', left: '20%', opacity: 0.6, twinkleDuration: 2.5 },
            { size: 4, top: '12%', left: '75%', opacity: 0.9, twinkleDuration: 3.5 },
            { size: 3, top: '22%', left: '45%', opacity: 0.5, twinkleDuration: 2 },
            { size: 2, top: '35%', left: '8%', opacity: 0.7, twinkleDuration: 4 },
            { size: 5, top: '55%', left: '92%', opacity: 0.8, twinkleDuration: 2.8 },
            { size: 2, top: '68%', left: '30%', opacity: 0.4, twinkleDuration: 3.2 },
            { size: 3, top: '78%', left: '65%', opacity: 0.9, twinkleDuration: 2.2 },
            { size: 2, top: '88%', left: '15%', opacity: 0.6, twinkleDuration: 3.8 },
            { size: 3, top: '8%', left: '60%', opacity: 0.7, twinkleDuration: 3 },
            { size: 2, top: '18%', left: '35%', opacity: 0.5, twinkleDuration: 2.6 },
            { size: 4, top: '42%', left: '82%', opacity: 0.8, twinkleDuration: 3.3 },
            { size: 2, top: '50%', left: '12%', opacity: 0.6, twinkleDuration: 2.4 },
            { size: 3, top: '62%', left: '70%', opacity: 0.9, twinkleDuration: 3.6 },
            { size: 2, top: '72%', left: '48%', opacity: 0.5, twinkleDuration: 2.1 },
            { size: 5, top: '85%', left: '38%', opacity: 0.7, twinkleDuration: 3.9 },
            { size: 2, top: '28%', left: '88%', opacity: 0.8, twinkleDuration: 2.7 },
          ].map((star, i) => (
            <div
              key={`star-${i}`}
              style={{
                position: 'absolute',
                width: `${star.size}px`,
                height: `${star.size}px`,
                background: 'white',
                borderRadius: '50%',
                top: star.top,
                left: star.left,
                animation: `twinkle-${i} ${star.twinkleDuration}s ease-in-out infinite alternate`,
              }}
            />
          ))}

          {/* Single comet - one at a time, completely random, no repeated vectors */}
          {activeComet && (
            <>
              <style>
                {`
                  @keyframes active-comet {
                    0% { transform: rotate(${activeComet.angle}deg) translate(0, 0); opacity: 0; }
                    1% { opacity: 0.9; }
                    80% { opacity: 0.5; }
                    100% { transform: rotate(${activeComet.angle}deg) translate(0, -${activeComet.tailSize * 1.4}px); opacity: 0; }
                  }
                `}
              </style>
              <div
                style={{
                  position: 'absolute',
                  left: activeComet.left,
                  top: activeComet.top,
                  width: '2px',
                  height: `${activeComet.tailSize}px`,
                  background: `linear-gradient(to bottom, white 4px, rgba(226,214,244,0.8) 9px, rgba(226,214,244,0.3) 60%, transparent 100%)`,
                  borderRadius: '1px',
                  animation: `active-comet ${activeComet.duration}s linear forwards`,
                  pointerEvents: 'none',
                  boxShadow: '0 0 6px 2px rgba(226,214,244,0.4)',
                  border: '1px solid red',
                }}
              />
            </>
          )}

          {/* Dynamic keyframe for current comet */}
          {activeComet && (
            <style>
              {`
                @keyframes active-comet {
                  0% { transform: rotate(${activeComet.angle}deg) translate(0, 0); opacity: 0; }
                  1% { opacity: 0.9; }
                  80% { opacity: 0.5; }
                  100% { transform: rotate(${activeComet.angle}deg) translate(0, -${activeComet.tailSize * 1.4}px); opacity: 0; }
                }
              `}
            </style>
          )}

          {/* Nebula */}
          <div style={{
            position: 'absolute',
            top: '25%',
            left: '38%',
            width: '180px',
            height: '120px',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(138,43,226,0.1) 0%, transparent 70%)',
            animation: 'nebulaPulse 6s ease-in-out infinite alternate',
          }} />

          {/* Planet */}
          <div style={{
            position: 'absolute',
            top: '62%',
            left: '5%',
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 40% 35%, var(--k-slate), var(--k-navy))',
          }} />
        </div>

        {/* TOP BAR */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '12px 16px',
          zIndex: 10,
        }}>
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
            <div style={{
              textAlign: 'center',
              marginTop: '4px',
              fontSize: '12px',
              color: 'rgba(255,255,255,0.4)',
            }}>
              {progress?.sessionAim}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL - CONTROLS (XP, DIARY) */}
        <div style={{
          position: 'absolute',
          top: '65px',
          right: '10px',
          width: '135px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 5,
        }}>
          {/* XP COUNTER */}
          <div style={{
            borderRadius: '20px',
            padding: '10px',
            textAlign: 'center',
            backdropFilter: 'blur(4px)',
            background: 'rgba(255,215,0,0.12)',
            border: '2.5px solid rgba(255,215,0,0.35)',
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
              fontSize: '14px',
              color: 'white',
              fontFamily: 'Contrail One',
              transition: 'all 0.3s ease',
            }}>
            <div style={{ fontSize: '24px', lineHeight: 1.1 }}>📔</div>
            <div className="display-font" style={{ fontSize: '14px', marginTop: '4px', color: 'var(--k-lavender)' }}>
              DIARY
            </div>
            <div style={{ fontSize: '10px', marginTop: '2px', color: 'rgba(226,214,244,0.5)' }}>
              {diaryEntries.length}
            </div>
          </button>
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
          <div style={{
            borderRadius: '20px',
            padding: '10px',
            textAlign: 'center',
            backdropFilter: 'blur(4px)',
            background: 'rgba(138,43,226,0.12)',
            border: '2.5px solid rgba(180,130,255,0.35)',
          }}>
            <div style={{ fontSize: '30px', lineHeight: 1.1 }}>⭐</div>
            <div className="display-font" style={{ fontSize: '16px', marginTop: '4px', color: '#d4a5ff' }}>
              WOW!
            </div>
            <div style={{ fontSize: '11px', marginTop: '2px', color: 'rgba(180,130,255,0.5)' }}>
              {progress?.wows?.length || 0}
            </div>
          </div>

          {/* Treasure */}
          <div style={{
            borderRadius: '20px',
            padding: '10px',
            textAlign: 'center',
            backdropFilter: 'blur(4px)',
            background: 'rgba(255,215,0,0.12)',
            border: '2.5px solid rgba(255,215,0,0.35)',
          }}>
            <div style={{ fontSize: '30px', lineHeight: 1.1 }}>💎</div>
            <div className="display-font" style={{ fontSize: '16px', marginTop: '4px', color: '#FFD700' }}>
              TREASURE
            </div>
            <div style={{ fontSize: '11px', marginTop: '2px', color: 'rgba(255,215,0,0.5)' }}>
              {progress?.treasureChests?.length || 0}
            </div>
          </div>

          {/* Behavior */}
          <div style={{
            borderRadius: '20px',
            padding: '10px',
            textAlign: 'center',
            backdropFilter: 'blur(4px)',
            background: 'rgba(134,239,172,0.08)',
            border: '2px solid rgba(134,239,172,0.2)',
          }}>
            <div style={{ fontSize: '22px', lineHeight: 1.1 }}>🎯</div>
            <div className="display-font" style={{ fontSize: '13px', marginTop: '4px', color: 'rgba(134,239,172,0.6)' }}>
              BEHAVIOR
            </div>
            <div style={{ fontSize: '10px', marginTop: '2px', color: 'rgba(134,239,172,0.4)' }}>
              -{progress?.behaviorDeductions?.length || 0}
            </div>
          </div>

          {/* Oopsie */}
          <div style={{
            borderRadius: '20px',
            padding: '10px',
            textAlign: 'center',
            backdropFilter: 'blur(4px)',
            background: 'rgba(255,255,255,0.05)',
            border: '2px dashed rgba(255,255,255,0.12)',
          }}>
            <div style={{ fontSize: '24px', lineHeight: 1.1 }}>👀</div>
            <div className="display-font" style={{ fontSize: '14px', marginTop: '4px', color: 'rgba(255,255,255,0.35)' }}>
              OOPSIE
            </div>
            <div style={{ fontSize: '10px', marginTop: '2px', color: 'rgba(255,255,255,0.2)' }}>
              {progress?.oopsies?.length || 0}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL - CONTENT CARDS */}
        <div style={{
          position: 'absolute',
          top: '65px',
          right: '10px',
          width: '158px',
          display: 'flex',
          flexDirection: 'column',
          gap: '7px',
          zIndex: 5,
          maxHeight: 'calc(100% - 100px)',
          overflowY: 'auto',
        }}>
          {/* Vocabulary Cards */}
          {progress?.vocabulary?.map((vocab, i) => (
            <div key={`vocab-${i}`} style={{
              borderRadius: '18px',
              padding: '10px 12px',
              border: '2.5px solid rgba(226,214,244,0.25)',
              background: 'linear-gradient(135deg, rgba(226,214,244,0.18), rgba(138,43,226,0.1))',
              animation: 'cardSlideIn 0.5s ease-out',
            }}>
              <div className="display-font" style={{ fontSize: '20px', lineHeight: 1, color: 'var(--k-lavender)' }}>
                {vocab.word}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '3px' }}>
                {vocab.meaning}
              </div>
            </div>
          ))}

          {/* Grammar Cards */}
          {progress?.grammar?.map((gram, i) => (
            <div key={`grammar-${i}`} style={{
              background: 'rgba(242,129,29,0.1)',
              border: '2.5px solid rgba(242,129,29,0.25)',
              borderRadius: '18px',
              padding: '10px 12px',
              marginTop: '3px',
            }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>Grammar</div>
              <div className="display-font" style={{
                fontSize: '15px',
                color: 'var(--k-peach)',
                lineHeight: 1.3,
                marginTop: '3px',
              }}>
                {gram.point}
              </div>
            </div>
          ))}

          {/* Phonics Cards */}
          {progress?.phonics?.map((phonics, i) => (
            <div key={`phonics-${i}`} style={{
              background: 'rgba(220,235,244,0.08)',
              border: '2.5px solid rgba(220,235,244,0.18)',
              borderRadius: '18px',
              padding: '8px 12px',
            }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>Sound</div>
              <div className="display-font" style={{
                fontSize: '18px',
                color: 'var(--k-ice-blue)',
                lineHeight: 1,
              }}>
                {phonics.sound}
              </div>
            </div>
          ))}
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
                width: '280px',
                maxHeight: 'calc(100% - 130px)',
                background: 'linear-gradient(135deg, rgba(226,214,244,0.12), rgba(138,43,226,0.12))',
                border: '2.5px solid rgba(226,214,244,0.4)',
                borderRadius: '20px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                backdropFilter: 'blur(8px)',
                zIndex: 8,
                overflow: 'hidden',
              }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--k-lavender)', fontFamily: 'Contrail One' }}>
              📖 Language Diary
            </div>

            {/* Diary Tabs */}
            <div style={{ display: 'flex', gap: '6px', borderBottom: '2px solid rgba(226,214,244,0.2)' }}>
              {(['vocab', 'grammar', 'phonics'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setDiaryTab(tab)}
                  style={{
                    padding: '6px 10px',
                    fontSize: '10px',
                    fontWeight: diaryTab === tab ? 'bold' : 'normal',
                    color: diaryTab === tab ? 'var(--k-lavender)' : 'rgba(255,255,255,0.4)',
                    background: diaryTab === tab ? 'rgba(138,43,226,0.3)' : 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontFamily: 'Contrail One',
                    transition: 'all 0.2s',
                  }}>
                  {tab === 'vocab' && '📚 Vocab'}
                  {tab === 'grammar' && '✍️ Grammar'}
                  {tab === 'phonics' && '🔤 Phonics'}
                </button>
              ))}
            </div>

            {/* Notes Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <textarea
                value={diaryNotes}
                onChange={(e) => setDiaryNotes(e.target.value)}
                placeholder={`Add ${diaryTab} notes here...`}
                style={{
                  padding: '8px',
                  borderRadius: '10px',
                  border: '1.5px solid rgba(226,214,244,0.3)',
                  background: 'rgba(0,0,0,0.3)',
                  color: 'white',
                  fontSize: '11px',
                  fontFamily: 'Poppins',
                  resize: 'vertical',
                  minHeight: '60px',
                  maxHeight: '80px',
                  overflow: 'auto',
                }}
              />
              <button
                onClick={handleAddDiaryEntry}
                style={{
                  padding: '6px 12px',
                  background: 'linear-gradient(135deg, var(--k-orange), var(--k-pink))',
                  border: 'none',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontFamily: 'Contrail One',
                }}>
                Save Note
              </button>
            </div>

            {/* Recent Entries */}
            <div style={{
              fontSize: '12px',
              fontWeight: 'bold',
              color: 'rgba(255,255,255,0.6)',
              fontFamily: 'Contrail One',
            }}>
              Recent Entries
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: '120px',
              overflowY: 'auto',
            }}>
              {diaryEntries
                .filter(e => e.type === diaryTab)
                .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                .slice(0, 5)
                .map((entry, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '8px',
                      background: 'rgba(0,0,0,0.3)',
                      borderRadius: '8px',
                      fontSize: '10px',
                      color: 'rgba(255,255,255,0.8)',
                      lineHeight: 1.3,
                      borderLeft: '3px solid var(--k-lavender)',
                    }}>
                    {entry.content}
                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginTop: '3px' }}>
                      {entry.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                ))}
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
                  position: 'relative',
                  transition: 'width 0.5s ease-out',
                }} />
                <div style={{
                  position: 'absolute',
                  right: '-10px',
                  top: '-10px',
                  fontSize: '28px',
                  lineHeight: 1,
                }}>
                  🐉
                </div>
              </div>
              <div style={{ fontSize: '26px', marginLeft: '6px' }}>🏆</div>
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
            background: 'linear-gradient(135deg, rgba(226,214,244,0.12), rgba(138,43,226,0.12))',
            border: '2.5px dashed rgba(226,214,244,0.4)',
            borderRadius: '20px',
            padding: '10px',
            textAlign: 'center',
            backdropFilter: 'blur(4px)',
            minWidth: '120px',
          }}>
            <div style={{
              fontSize: '11px',
              color: 'rgba(255,255,255,0.35)',
              fontFamily: 'Contrail One',
            }}>
              MAGIC
            </div>
            <div className="display-font" style={{
              fontSize: '20px',
              color: 'var(--k-lavender)',
              letterSpacing: '0.12em',
              marginTop: '4px',
            }}>
              {progress?.magicWord ? '****' : '????'}
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
                {/* Giant WOW text */}
                <div style={{
                  fontSize: '180px',
                  fontFamily: 'Contrail One',
                  color: '#8a2be2',
                  fontWeight: 'bold',
                  textShadow: '0 0 20px rgba(138,43,226,0.8), 0 0 40px rgba(138,43,226,0.5)',
                  animation: 'wowExplosion 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  zIndex: 21,
                }}>
                  WOW!
                </div>
                {/* Circling stars */}
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      fontSize: '40px',
                      animation: `circleOrbit ${1.5}s linear`,
                      animationDelay: `${i * 0.125}s`,
                      transformOrigin: '0 0',
                    }}>
                    ⭐
                  </div>
                ))}
              </>
            )}

            {activeAnimation.type.startsWith('treasure-') && (
              <>
                {/* Treasure burst particles */}
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      fontSize: '50px',
                      transform: `rotate(${(i * 360) / 8}deg) translateX(150px)`,
                      animation: 'treasureSpray 1s ease-out',
                      transformOrigin: '0 0',
                    }}>
                    💎
                  </div>
                ))}
                <div style={{
                  fontSize: '120px',
                  fontFamily: 'Contrail One',
                  color: '#FFD700',
                  textShadow: '0 0 30px rgba(255,215,0,0.8)',
                  animation: 'wowExplosion 0.5s ease-out',
                }}>
                  +{activeAnimation.amount}
                </div>
              </>
            )}

            {activeAnimation.type === 'oopsie' && (
              <>
                {/* Giant OOPSIE text */}
                <div style={{
                  fontSize: '180px',
                  fontFamily: 'Contrail One',
                  color: '#f2811d',
                  fontWeight: 'bold',
                  textShadow: '0 0 30px rgba(242,129,29,0.9), 0 0 60px rgba(242,129,29,0.6)',
                  animation: 'wowExplosion 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  zIndex: 21,
                }}>
                  OOPSIE!
                </div>
                {/* Single eyes circling and stopping behind text */}
                <div
                  style={{
                    position: 'absolute',
                    fontSize: '60px',
                    animation: `eyesCenterBehind 2s ease-in-out`,
                    transformOrigin: '0 0',
                  }}>
                  👀
                </div>
              </>
            )}

            {activeAnimation.type.startsWith('behavior-') && (
              <div style={{
                fontSize: '100px',
                fontFamily: 'Contrail One',
                color: 'var(--k-orange)',
                animation: 'oopsieShake 0.7s ease-in-out',
              }}>
                ⚠️
              </div>
            )}
          </div>
        )}
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
                    background: selectedAction === 'wow' ? 'rgba(138,43,226,0.4)' : 'rgba(138,43,226,0.2)',
                    border: selectedAction === 'wow' ? '2px solid #8a2be2' : undefined,
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
                    background: selectedAction === 'treasure-5' ? 'rgba(255,215,0,0.4)' : undefined,
                    border: selectedAction === 'treasure-5' ? '2px solid #FFD700' : undefined,
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
                    background: selectedAction === 'treasure-10' ? 'rgba(255,215,0,0.4)' : undefined,
                    border: selectedAction === 'treasure-10' ? '2px solid #FFD700' : undefined,
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
                    background: selectedAction === 'treasure-15' ? 'rgba(255,215,0,0.4)' : undefined,
                    border: selectedAction === 'treasure-15' ? '2px solid #FFD700' : undefined,
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
                    background: selectedAction === 'treasure-20' ? 'rgba(255,215,0,0.4)' : undefined,
                    border: selectedAction === 'treasure-20' ? '2px solid #FFD700' : undefined,
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
                    background: selectedAction === 'oopsie' ? 'rgba(242,129,29,0.4)' : 'rgba(242,129,29,0.2)',
                    border: selectedAction === 'oopsie' ? '2px solid #f2811d' : undefined,
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
                    background: selectedAction === 'behavior-out-to-lunch' ? 'rgba(200,150,100,0.4)' : undefined,
                    border: selectedAction === 'behavior-out-to-lunch' ? '2px solid rgba(255,255,255,0.6)' : undefined,
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
                    background: selectedAction === 'behavior-chatterbox' ? 'rgba(200,150,100,0.4)' : undefined,
                    border: selectedAction === 'behavior-chatterbox' ? '2px solid rgba(255,255,255,0.6)' : undefined,
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
                    background: selectedAction === 'behavior-disruptive' ? 'rgba(200,150,100,0.4)' : undefined,
                    border: selectedAction === 'behavior-disruptive' ? '2px solid rgba(255,255,255,0.6)' : undefined,
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
                    cursor: selectedAction ? 'pointer' : 'not-allowed',
                    filter: selectedAction ? 'brightness(1.5) drop-shadow(0 0 15px rgba(242,129,29,0.8))' : 'none',
                  }}>
                  💥 BOOM!
                </Button>
              </TooltipTrigger>
              <TooltipContent>Commit action</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </TooltipProvider>

      {/* Add Content Dialogs */}
      {showAddVocab && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
        }}>
          <div style={{
            background: '#1a1a2e',
            border: '1px solid rgba(226,214,244,0.2)',
            borderRadius: '12px',
            padding: '20px',
            width: '384px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'white', fontFamily: 'Contrail One' }}>
                Add Vocabulary
              </h3>
              <button onClick={() => setShowAddVocab(false)} aria-label="Close">
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <Label className="text-white">Word</Label>
                <Input
                  value={vocabWord}
                  onChange={(e) => setVocabWord(e.target.value)}
                  className="mt-1 bg-slate-700 border-white/20"
                />
              </div>
              <div>
                <Label className="text-white">Meaning</Label>
                <Input
                  value={vocabMeaning}
                  onChange={(e) => setVocabMeaning(e.target.value)}
                  className="mt-1 bg-slate-700 border-white/20"
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <Button variant="outline" size="sm" onClick={() => setShowAddVocab(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddVocab}
                  style={{ background: 'linear-gradient(135deg, #8a5cf6, #a78bfa)' }}
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
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
        }}>
          <div style={{
            background: '#1a1a2e',
            border: '1px solid rgba(226,214,244,0.2)',
            borderRadius: '12px',
            padding: '20px',
            width: '384px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'white', fontFamily: 'Contrail One' }}>
                Add Grammar
              </h3>
              <button onClick={() => setShowAddGrammar(false)} aria-label="Close">
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <Label className="text-white">Point</Label>
                <Input
                  value={grammarPoint}
                  onChange={(e) => setGrammarPoint(e.target.value)}
                  className="mt-1 bg-slate-700 border-white/20"
                />
              </div>
              <div>
                <Label className="text-white">Example</Label>
                <Input
                  value={grammarExample}
                  onChange={(e) => setGrammarExample(e.target.value)}
                  className="mt-1 bg-slate-700 border-white/20"
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <Button variant="outline" size="sm" onClick={() => setShowAddGrammar(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddGrammar}
                  style={{ background: 'linear-gradient(135deg, #f2811d, #f8dab9)' }}
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
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
        }}>
          <div style={{
            background: '#1a1a2e',
            border: '1px solid rgba(226,214,244,0.2)',
            borderRadius: '12px',
            padding: '20px',
            width: '384px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'white', fontFamily: 'Contrail One' }}>
                Add Phonics
              </h3>
              <button onClick={() => setShowAddPhonics(false)} aria-label="Close">
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <Label className="text-white">Sound</Label>
                <Input
                  value={phonicsSound}
                  onChange={(e) => setPhonicsSound(e.target.value)}
                  className="mt-1 bg-slate-700 border-white/20"
                />
              </div>
              <div>
                <Label className="text-white">Examples (comma separated)</Label>
                <Input
                  value={phonicsExamples}
                  onChange={(e) => setPhonicsExamples(e.target.value)}
                  className="mt-1 bg-slate-700 border-white/20"
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <Button variant="outline" size="sm" onClick={() => setShowAddPhonics(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddPhonics}
                  style={{ background: 'linear-gradient(135deg, #86efac, #dcebf4)' }}
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
