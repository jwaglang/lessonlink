'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  getSessionProgressByInstanceId,
  getStudentById,
  addGrammarCard,
  addPhonicsCard,
  createHomeworkAssignment,
  getSessionInstance,
} from '@/lib/firestore';
import { generateSentence } from '@/modules/petland/ai/generate-sentence';
import { generateCloze } from '@/modules/petland/ai/generate-cloze';
import { generateMinimalPairs } from '@/modules/petland/ai/generate-minimal-pairs';
import { useAuth } from '@/components/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wand2, CheckSquare, Square, ChevronRight } from 'lucide-react';
import type { SessionProgress, SessionVocabulary, SessionGrammar, SessionPhonics, SessionInstance, HomeworkType } from '@/lib/types';
import type { Student } from '@/lib/types';

const fontLink = `@import url('https://fonts.googleapis.com/css2?family=Contrail+One&family=Poppins:wght@400;500;600;700&display=swap');`;

// ─── Per-item state shapes ─────────────────────────────────────────────────────

interface VocabItem {
  original: SessionVocabulary;
  word: string;
  meaning: string;
  sentence: string;
  level: number;
  included: boolean;
  generating: boolean;
}

interface GrammarItem {
  original: SessionGrammar;
  role: string;
  cloze: string;
  answer: string;
  included: boolean;
  generating: boolean;
}

interface PhonicsItem {
  original: SessionPhonics;
  keyword: string;
  pairWord: string;
  targetIPA: string;
  pairIPA: string;
  minimalPairs: Array<{ word1: string; word2: string }>;
  included: boolean;
  generating: boolean;
}

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type TabId = 'vocab' | 'grammar' | 'phonics' | 'feedback';

const TABS: { id: TabId; label: string; emoji: string; accent: string; border: string; bg: string }[] = [
  { id: 'vocab',    label: 'Vocab',    emoji: '📚', accent: '#686ea8', border: 'rgba(104,110,168,0.4)', bg: 'rgba(104,110,168,0.08)' },
  { id: 'grammar',  label: 'Grammar',  emoji: '✍️', accent: '#f2811d', border: 'rgba(242,129,29,0.4)',  bg: 'rgba(242,129,29,0.08)'  },
  { id: 'phonics',  label: 'Phonics',  emoji: '🔤', accent: '#fe598b', border: 'rgba(254,89,139,0.4)', bg: 'rgba(254,89,139,0.08)'  },
  { id: 'feedback', label: 'Feedback', emoji: '📝', accent: '#10b981', border: 'rgba(16,185,129,0.4)',  bg: 'rgba(16,185,129,0.08)'  },
];

const HOMEWORK_TYPE_OPTIONS: { value: HomeworkType; label: string }[] = [
  { value: 'workbook',          label: 'Workbook'          },
  { value: 'phonics_workbook',  label: 'Phonics Workbook'  },
  { value: 'song_worksheet',    label: 'Song Worksheet'    },
  { value: 'sentence_switcher', label: 'Sentence Switcher' },
  { value: 'other',             label: 'Other'             },
];

export default function SessionDebriefPage() {
  const { sessionInstanceId } = useParams() as { sessionInstanceId: string };
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const [progress, setProgress] = useState<SessionProgress | null>(null);
  const [sessionInst, setSessionInst] = useState<SessionInstance | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [tab, setTab] = useState<TabId>('vocab');

  const [vocabItems, setVocabItems] = useState<VocabItem[]>([]);
  const [grammarItems, setGrammarItems] = useState<GrammarItem[]>([]);
  const [phonicsItems, setPhonicsItems] = useState<PhonicsItem[]>([]);

  // Feedback / homework draft state
  const [hwTitle, setHwTitle] = useState('');
  const [hwDescription, setHwDescription] = useState('');
  const [hwInstructions, setHwInstructions] = useState('');
  const [hwType, setHwType] = useState<HomeworkType>('workbook');

  // ── Load ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user?.uid || !sessionInstanceId) return;

    const load = async () => {
      try {
        const prog = await getSessionProgressByInstanceId(sessionInstanceId);
        if (!prog) {
          toast({ title: 'Session progress not found', variant: 'destructive' });
          router.push('/t-portal');
          return;
        }
        if (prog.teacherId !== user.uid) {
          toast({ title: 'Access denied', variant: 'destructive' });
          router.push('/t-portal');
          return;
        }

        setProgress(prog);
        setHwTitle(prog.feedbackTitle || (prog.sessionQuestion ? `${prog.sessionQuestion} — Homework` : 'Session Homework'));
        setHwDescription(prog.feedbackDescription || '');
        setHwInstructions(prog.feedbackInstructions || '');

        if (prog.studentId && prog.studentId !== 'practice') {
          try { setStudent(await getStudentById(prog.studentId)); } catch { /* cosmetic */ }
          // Load session instance for courseId/unitId (needed for homework creation)
          try {
            const inst = await getSessionInstance(prog.sessionInstanceId);
            if (inst) setSessionInst(inst);
          } catch { /* non-blocking */ }
        }

        setVocabItems((prog.vocabulary || []).map(v => ({
          original: v, word: v.word, meaning: v.meaning,
          sentence: '', level: 2, included: true, generating: false,
        })));
        setGrammarItems((prog.grammar || []).map(g => ({
          original: g, role: g.point, cloze: g.example,
          answer: '', included: true, generating: false,
        })));
        setPhonicsItems((prog.phonics || []).map(p => ({
          original: p, keyword: p.sound, pairWord: p.examples[0] || '',
          targetIPA: '', pairIPA: '', minimalPairs: [], included: true, generating: false,
        })));
      } catch {
        toast({ title: 'Failed to load session', variant: 'destructive' });
        router.push('/t-portal');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user?.uid, sessionInstanceId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── AI generators ──────────────────────────────────────────────────────────

  const generateVocab = async (idx: number) => {
    const item = vocabItems[idx];
    if (!item.word.trim()) return;
    setVocabItems(prev => prev.map((v, i) => i === idx ? { ...v, generating: true } : v));
    try {
      const sentence = await generateSentence(item.word, item.level);
      setVocabItems(prev => prev.map((v, i) => i === idx ? { ...v, sentence, generating: false } : v));
    } catch {
      toast({ title: 'AI failed for vocab — try again', variant: 'destructive' });
      setVocabItems(prev => prev.map((v, i) => i === idx ? { ...v, generating: false } : v));
    }
  };

  const generateGrammar = async (idx: number) => {
    const item = grammarItems[idx];
    if (!item.role.trim() || !item.cloze.trim()) return;
    setGrammarItems(prev => prev.map((g, i) => i === idx ? { ...g, generating: true } : g));
    try {
      const result = await generateCloze(item.role, item.cloze);
      setGrammarItems(prev => prev.map((g, i) =>
        i === idx ? { ...g, cloze: result.cloze, answer: result.answer, generating: false } : g
      ));
    } catch {
      toast({ title: 'AI failed for grammar — try again', variant: 'destructive' });
      setGrammarItems(prev => prev.map((g, i) => i === idx ? { ...g, generating: false } : g));
    }
  };

  const generatePhonics = async (idx: number) => {
    const item = phonicsItems[idx];
    if (!item.keyword.trim() || !item.pairWord.trim()) return;
    setPhonicsItems(prev => prev.map((p, i) => i === idx ? { ...p, generating: true } : p));
    try {
      const result = await generateMinimalPairs(item.keyword, item.pairWord);
      setPhonicsItems(prev => prev.map((p, i) =>
        i === idx ? { ...p, targetIPA: result.targetIPA, pairIPA: result.pairIPA, minimalPairs: result.pairs, generating: false } : p
      ));
    } catch {
      toast({ title: 'AI failed for phonics — try again', variant: 'destructive' });
      setPhonicsItems(prev => prev.map((p, i) => i === idx ? { ...p, generating: false } : p));
    }
  };

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleProcess = async () => {
    if (!progress) return;
    const studentId = progress.studentId;
    if (!studentId || studentId === 'practice') {
      router.push('/t-portal');
      return;
    }
    const sessionInstanceIdVal = progress.sessionInstanceId;
    const today = todayString();

    setProcessing(true);
    try {
      for (const item of vocabItems.filter(v => v.included)) {
        await addDoc(collection(db, 'students', studentId, 'vocabulary'), {
          word: item.word,
          sentence: item.sentence || item.meaning,
          level: item.level,
          imageUrl: '',
          type: item.level > 3 ? 'cloze' : 'basic',
          srsLevel: 1,
          lastReviewDate: '',
          sessionInstanceId: sessionInstanceIdVal,
          questionPrompt: '',
          createdDate: today,
          createdAt: new Date().toISOString(),
        });
      }
      for (const item of grammarItems.filter(g => g.included)) {
        await addGrammarCard(studentId, {
          role: item.role, cloze: item.cloze, answer: item.answer,
          srsLevel: 1, lastReviewDate: '', sessionInstanceId: sessionInstanceIdVal, createdDate: today,
        });
      }
      for (const item of phonicsItems.filter(p => p.included)) {
        await addPhonicsCard(studentId, {
          keyword: item.keyword, pairWord: item.pairWord,
          targetIPA: item.targetIPA, pairIPA: item.pairIPA, minimalPairs: item.minimalPairs,
          srsLevel: 1, lastReviewDate: '', sessionInstanceId: sessionInstanceIdVal, createdDate: today,
        });
      }

      const total = vocabItems.filter(v => v.included).length + grammarItems.filter(g => g.included).length + phonicsItems.filter(p => p.included).length;
      if (total > 0) toast({ title: `${total} item${total !== 1 ? 's' : ''} added to SRS` });

      // Create homework draft if any feedback field is filled
      const hasFeedback = hwTitle.trim() || hwDescription.trim() || hwInstructions.trim();
      if (hasFeedback) {
        await createHomeworkAssignment({
          studentId,
          teacherId: progress.teacherId,
          courseId: sessionInst?.courseId || '',
          unitId: sessionInst?.unitId || '',
          sessionId: sessionInst?.sessionId || undefined,
          sessionInstanceId: sessionInstanceIdVal,
          title: hwTitle.trim() || 'Session Homework',
          description: hwDescription.trim() || undefined,
          teacherInstructions: hwInstructions.trim() || undefined,
          homeworkType: hwType,
          deliveryMethod: 'manual',
          status: 'assigned',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        toast({ title: 'Homework draft created — edit and send from the learner profile' });
      }

      router.push(studentId !== 'practice' ? `/t-portal/students/${studentId}` : '/t-portal');
    } catch (err) {
      console.error('[Debrief] handleProcess error:', err);
      toast({ title: 'Failed to save some items', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '10px', fontFamily: 'Poppins, sans-serif' }}>
        <style>{fontLink}</style>
        <Loader2 className="animate-spin h-5 w-5" style={{ color: '#686ea8' }} />
        <span style={{ color: '#686ea8' }}>Loading session…</span>
      </div>
    );
  }

  if (!progress) return null;

  const isPractice = progress.studentId === 'practice';
  const studentName = student?.name || (isPractice ? 'Practice Session' : 'Learner');

  const counts = { vocab: vocabItems.length, grammar: grammarItems.length, phonics: phonicsItems.length, feedback: 0 };
  const includedCount = vocabItems.filter(v => v.included).length + grammarItems.filter(g => g.included).length + phonicsItems.filter(p => p.included).length;
  const hasFeedback = !!(hwTitle.trim() || hwDescription.trim() || hwInstructions.trim());

  const activeTab = TABS.find(t => t.id === tab)!;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #f5f3ff 0%, #fdf2f8 50%, #fff7ed 100%)', fontFamily: 'Poppins, sans-serif', padding: '32px 16px' }}>
      <style>{fontLink}</style>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <p style={{ fontSize: '12px', letterSpacing: '3px', textTransform: 'uppercase', color: '#a78bfa', fontWeight: 600, marginBottom: '6px' }}>
            Session Complete
          </p>
          <h1 style={{ fontFamily: 'Contrail One, cursive', fontSize: '32px', color: '#404376', margin: 0, lineHeight: 1.1 }}>
            Session Debrief
          </h1>
          <p style={{ fontSize: '14px', color: '#686ea8', marginTop: '6px' }}>
            {studentName}{progress.sessionQuestion ? ` · ${progress.sessionQuestion}` : ''}
          </p>
        </div>

        {/* Summary bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
          padding: '14px 18px', borderRadius: '16px', marginBottom: '24px',
          background: 'linear-gradient(135deg, rgba(104,110,168,0.12), rgba(242,129,29,0.08))',
          border: '1.5px solid rgba(104,110,168,0.2)',
        }}>
          <span style={{ fontSize: '13px', color: '#404376', fontWeight: 600 }}>
            📚 {counts.vocab} &nbsp;·&nbsp; ✍️ {counts.grammar} &nbsp;·&nbsp; 🔤 {counts.phonics}
          </span>
          <span style={{ fontSize: '13px', color: '#686ea8' }}>captured this session</span>
          <span style={{ marginLeft: 'auto', fontSize: '13px', fontWeight: 700, color: '#f2811d' }}>
            {includedCount} selected
          </span>
        </div>

        {/* Practice banner */}
        {isPractice && (
          <div style={{
            padding: '12px 18px', borderRadius: '12px', marginBottom: '20px',
            background: 'rgba(254,89,139,0.08)', border: '1.5px solid rgba(254,89,139,0.25)',
            fontSize: '13px', color: '#fe598b', fontWeight: 500,
          }}>
            Practice session — items are not saved to any learner.
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                flex: 1, padding: '10px 8px', borderRadius: '12px', border: '2px solid',
                borderColor: tab === t.id ? t.accent : 'rgba(104,110,168,0.15)',
                background: tab === t.id ? t.bg : 'white',
                cursor: 'pointer', fontFamily: 'Poppins, sans-serif',
                fontSize: '13px', fontWeight: tab === t.id ? 700 : 500,
                color: tab === t.id ? t.accent : '#686ea8',
                transition: 'all 0.15s',
              }}
            >
              {t.emoji} {t.label}
              {counts[t.id] > 0 && (
                <span style={{
                  marginLeft: '6px', fontSize: '11px', fontWeight: 700,
                  background: tab === t.id ? t.accent : 'rgba(104,110,168,0.15)',
                  color: tab === t.id ? 'white' : '#686ea8',
                  padding: '1px 7px', borderRadius: '20px',
                }}>
                  {counts[t.id]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── VOCAB TAB ── */}
        {tab === 'vocab' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {vocabItems.length === 0 && (
              <p style={{ textAlign: 'center', color: '#a78bfa', fontSize: '14px', padding: '32px 0' }}>No vocabulary captured this session.</p>
            )}
            {vocabItems.map((item, idx) => (
              <div key={idx} style={{
                borderRadius: '16px', padding: '16px', opacity: item.included ? 1 : 0.4, transition: 'opacity 0.2s',
                background: 'white', border: `2px solid ${item.included ? 'rgba(104,110,168,0.25)' : 'rgba(104,110,168,0.1)'}`,
                boxShadow: item.included ? '0 2px 12px rgba(104,110,168,0.1)' : 'none',
              }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <button
                    type="button"
                    onClick={() => setVocabItems(prev => prev.map((v, i) => i === idx ? { ...v, included: !v.included } : v))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#686ea8', padding: '2px', marginTop: '2px', flexShrink: 0 }}
                  >
                    {item.included ? <CheckSquare size={20} /> : <Square size={20} />}
                  </button>
                  <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: '#a78bfa', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>Word</label>
                      <input
                        value={item.word}
                        onChange={e => setVocabItems(prev => prev.map((v, i) => i === idx ? { ...v, word: e.target.value } : v))}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1.5px solid rgba(104,110,168,0.25)', fontFamily: 'Poppins', fontSize: '13px', color: '#404376', marginTop: '4px', boxSizing: 'border-box', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#a78bfa', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>Meaning</label>
                      <input
                        value={item.meaning}
                        onChange={e => setVocabItems(prev => prev.map((v, i) => i === idx ? { ...v, meaning: e.target.value } : v))}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1.5px solid rgba(104,110,168,0.25)', fontFamily: 'Poppins', fontSize: '13px', color: '#404376', marginTop: '4px', boxSizing: 'border-box', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#a78bfa', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>Level (1–5)</label>
                      <input
                        type="number" min={1} max={5} value={item.level}
                        onChange={e => setVocabItems(prev => prev.map((v, i) => i === idx ? { ...v, level: Number(e.target.value) } : v))}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1.5px solid rgba(104,110,168,0.25)', fontFamily: 'Poppins', fontSize: '13px', color: '#404376', marginTop: '4px', boxSizing: 'border-box', outline: 'none' }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => generateVocab(idx)}
                        disabled={item.generating || !item.included}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          padding: '7px 12px', borderRadius: '8px', border: '1.5px solid rgba(104,110,168,0.3)',
                          background: 'white', color: '#686ea8', fontFamily: 'Poppins', fontSize: '12px',
                          fontWeight: 600, cursor: item.generating || !item.included ? 'not-allowed' : 'pointer',
                          opacity: item.generating || !item.included ? 0.5 : 1,
                        }}
                      >
                        {item.generating ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
                        Generate sentence
                      </button>
                    </div>
                  </div>
                </div>
                {item.sentence && (
                  <div style={{ marginLeft: '32px', marginTop: '10px', padding: '10px 12px', borderRadius: '10px', background: 'rgba(104,110,168,0.07)', border: '1px solid rgba(104,110,168,0.15)' }}>
                    <p style={{ fontSize: '11px', color: '#a78bfa', fontWeight: 600, marginBottom: '4px' }}>Example sentence</p>
                    <input
                      value={item.sentence}
                      onChange={e => setVocabItems(prev => prev.map((v, i) => i === idx ? { ...v, sentence: e.target.value } : v))}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', border: '1.5px solid rgba(104,110,168,0.2)', fontFamily: 'Poppins', fontSize: '13px', color: '#404376', boxSizing: 'border-box', outline: 'none', background: 'white' }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── GRAMMAR TAB ── */}
        {tab === 'grammar' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {grammarItems.length === 0 && (
              <p style={{ textAlign: 'center', color: '#f2811d', fontSize: '14px', padding: '32px 0' }}>No grammar captured this session.</p>
            )}
            {grammarItems.map((item, idx) => (
              <div key={idx} style={{
                borderRadius: '16px', padding: '16px', opacity: item.included ? 1 : 0.4, transition: 'opacity 0.2s',
                background: 'white', border: `2px solid ${item.included ? 'rgba(242,129,29,0.25)' : 'rgba(242,129,29,0.1)'}`,
                boxShadow: item.included ? '0 2px 12px rgba(242,129,29,0.08)' : 'none',
              }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <button
                    type="button"
                    onClick={() => setGrammarItems(prev => prev.map((g, i) => i === idx ? { ...g, included: !g.included } : g))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f2811d', padding: '2px', marginTop: '2px', flexShrink: 0 }}
                  >
                    {item.included ? <CheckSquare size={20} /> : <Square size={20} />}
                  </button>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'flex-end' }}>
                      <div>
                        <label style={{ fontSize: '11px', color: '#f2811d', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>Grammar role</label>
                        <input
                          value={item.role}
                          onChange={e => setGrammarItems(prev => prev.map((g, i) => i === idx ? { ...g, role: e.target.value } : g))}
                          placeholder="e.g. present perfect"
                          style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1.5px solid rgba(242,129,29,0.25)', fontFamily: 'Poppins', fontSize: '13px', color: '#404376', marginTop: '4px', boxSizing: 'border-box', outline: 'none' }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => generateGrammar(idx)}
                        disabled={item.generating || !item.included}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          padding: '7px 12px', borderRadius: '8px', border: '1.5px solid rgba(242,129,29,0.3)',
                          background: 'white', color: '#f2811d', fontFamily: 'Poppins', fontSize: '12px',
                          fontWeight: 600, cursor: item.generating || !item.included ? 'not-allowed' : 'pointer',
                          opacity: item.generating || !item.included ? 0.5 : 1, whiteSpace: 'nowrap',
                        }}
                      >
                        {item.generating ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
                        Polish cloze
                      </button>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#f2811d', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>Open cloze (use ___ for blank)</label>
                      <input
                        value={item.cloze}
                        onChange={e => setGrammarItems(prev => prev.map((g, i) => i === idx ? { ...g, cloze: e.target.value } : g))}
                        placeholder="e.g. I ___ been here before."
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1.5px solid rgba(242,129,29,0.25)', fontFamily: 'Poppins', fontSize: '13px', color: '#404376', marginTop: '4px', boxSizing: 'border-box', outline: 'none' }}
                      />
                    </div>
                  </div>
                </div>
                {item.answer && (
                  <div style={{ marginLeft: '32px', marginTop: '10px', padding: '10px 12px', borderRadius: '10px', background: 'rgba(242,129,29,0.06)', border: '1px solid rgba(242,129,29,0.15)' }}>
                    <p style={{ fontSize: '11px', color: '#f2811d', fontWeight: 600, marginBottom: '4px' }}>Answer</p>
                    <input
                      value={item.answer}
                      onChange={e => setGrammarItems(prev => prev.map((g, i) => i === idx ? { ...g, answer: e.target.value } : g))}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', border: '1.5px solid rgba(242,129,29,0.2)', fontFamily: 'Poppins', fontSize: '13px', color: '#404376', boxSizing: 'border-box', outline: 'none', background: 'white' }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── PHONICS TAB ── */}
        {tab === 'phonics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {phonicsItems.length === 0 && (
              <p style={{ textAlign: 'center', color: '#fe598b', fontSize: '14px', padding: '32px 0' }}>No phonics captured this session.</p>
            )}
            {phonicsItems.map((item, idx) => (
              <div key={idx} style={{
                borderRadius: '16px', padding: '16px', opacity: item.included ? 1 : 0.4, transition: 'opacity 0.2s',
                background: 'white', border: `2px solid ${item.included ? 'rgba(254,89,139,0.25)' : 'rgba(254,89,139,0.1)'}`,
                boxShadow: item.included ? '0 2px 12px rgba(254,89,139,0.08)' : 'none',
              }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <button
                    type="button"
                    onClick={() => setPhonicsItems(prev => prev.map((p, i) => i === idx ? { ...p, included: !p.included } : p))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fe598b', padding: '2px', marginTop: '2px', flexShrink: 0 }}
                  >
                    {item.included ? <CheckSquare size={20} /> : <Square size={20} />}
                  </button>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ fontSize: '11px', color: '#fe598b', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>Keyword</label>
                        <input
                          value={item.keyword}
                          onChange={e => setPhonicsItems(prev => prev.map((p, i) => i === idx ? { ...p, keyword: e.target.value } : p))}
                          placeholder="e.g. rock"
                          style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1.5px solid rgba(254,89,139,0.25)', fontFamily: 'Poppins', fontSize: '13px', color: '#404376', marginTop: '4px', boxSizing: 'border-box', outline: 'none' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', color: '#fe598b', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>Sounds like</label>
                        <input
                          value={item.pairWord}
                          onChange={e => setPhonicsItems(prev => prev.map((p, i) => i === idx ? { ...p, pairWord: e.target.value } : p))}
                          placeholder="e.g. lock"
                          style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1.5px solid rgba(254,89,139,0.25)', fontFamily: 'Poppins', fontSize: '13px', color: '#404376', marginTop: '4px', boxSizing: 'border-box', outline: 'none' }}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => generatePhonics(idx)}
                      disabled={item.generating || !item.included}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px', width: 'fit-content',
                        padding: '7px 12px', borderRadius: '8px', border: '1.5px solid rgba(254,89,139,0.3)',
                        background: 'white', color: '#fe598b', fontFamily: 'Poppins', fontSize: '12px',
                        fontWeight: 600, cursor: item.generating || !item.included ? 'not-allowed' : 'pointer',
                        opacity: item.generating || !item.included ? 0.5 : 1,
                      }}
                    >
                      {item.generating ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
                      Generate IPA + minimal pairs
                    </button>
                  </div>
                </div>

                {(item.targetIPA || item.minimalPairs.length > 0) && (
                  <div style={{ marginLeft: '32px', marginTop: '10px', padding: '12px', borderRadius: '10px', background: 'rgba(254,89,139,0.05)', border: '1px solid rgba(254,89,139,0.15)' }}>
                    {item.targetIPA && (
                      <div style={{ display: 'flex', gap: '20px', fontSize: '13px', marginBottom: '8px' }}>
                        <span>
                          <span style={{ fontSize: '11px', color: '#fe598b', fontWeight: 600 }}>Target: </span>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#404376' }}>{item.targetIPA}</span>
                          <span style={{ fontSize: '11px', color: '#a78bfa', marginLeft: '4px' }}>({item.keyword})</span>
                        </span>
                        <span>
                          <span style={{ fontSize: '11px', color: '#fe598b', fontWeight: 600 }}>Pair: </span>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#686ea8' }}>{item.pairIPA}</span>
                          <span style={{ fontSize: '11px', color: '#a78bfa', marginLeft: '4px' }}>({item.pairWord})</span>
                        </span>
                      </div>
                    )}
                    {item.minimalPairs.length > 0 && (
                      <div>
                        <p style={{ fontSize: '11px', color: '#fe598b', fontWeight: 600, marginBottom: '6px' }}>Minimal pairs ({item.minimalPairs.length})</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {item.minimalPairs.map((pair, pi) => (
                            <span key={pi} style={{ fontSize: '12px', background: 'white', border: '1px solid rgba(254,89,139,0.2)', borderRadius: '6px', padding: '3px 10px', fontFamily: 'monospace', color: '#404376', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {pair.word1} <ChevronRight size={12} style={{ color: '#fe598b' }} /> {pair.word2}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── FEEDBACK TAB ── */}
        {tab === 'feedback' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '14px 16px', borderRadius: '12px', background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', fontSize: '13px', color: '#059669' }}>
              Fill in the fields below and they'll be saved as a homework draft on the learner's profile for you to edit and send.
            </div>

            <div>
              <label style={{ fontSize: '11px', color: '#10b981', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>Homework Title</label>
              <input
                value={hwTitle}
                onChange={e => setHwTitle(e.target.value)}
                placeholder="e.g. Animals Unit — Workbook"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1.5px solid rgba(16,185,129,0.3)', fontFamily: 'Poppins', fontSize: '13px', color: '#404376', marginTop: '6px', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: '#10b981', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>What we covered <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(description for parent)</span></label>
              <textarea
                value={hwDescription}
                onChange={e => setHwDescription(e.target.value)}
                placeholder="e.g. Today we practised animal vocabulary and the structure 'It has...' We played a guessing game and talked about our favourite animals."
                rows={4}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1.5px solid rgba(16,185,129,0.3)', fontFamily: 'Poppins', fontSize: '13px', color: '#404376', marginTop: '6px', boxSizing: 'border-box', outline: 'none', resize: 'vertical' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: '#10b981', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>Homework Instructions <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(what to do)</span></label>
              <textarea
                value={hwInstructions}
                onChange={e => setHwInstructions(e.target.value)}
                placeholder="e.g. Complete pages 4–6 of the workbook. Focus on the listening activity — play the audio twice before answering."
                rows={3}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1.5px solid rgba(16,185,129,0.3)', fontFamily: 'Poppins', fontSize: '13px', color: '#404376', marginTop: '6px', boxSizing: 'border-box', outline: 'none', resize: 'vertical' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: '#10b981', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>Homework Type</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                {HOMEWORK_TYPE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setHwType(opt.value)}
                    style={{
                      padding: '6px 14px', borderRadius: '20px', border: '1.5px solid',
                      borderColor: hwType === opt.value ? '#10b981' : 'rgba(16,185,129,0.2)',
                      background: hwType === opt.value ? 'rgba(16,185,129,0.12)' : 'white',
                      color: hwType === opt.value ? '#059669' : '#686ea8',
                      fontFamily: 'Poppins', fontSize: '12px', fontWeight: hwType === opt.value ? 700 : 500,
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '32px', paddingTop: '20px', borderTop: '1.5px solid rgba(104,110,168,0.15)' }}>
          <button
            type="button"
            onClick={() => router.push(
              progress.studentId && !isPractice ? `/t-portal/students/${progress.studentId}` : '/t-portal'
            )}
            disabled={processing}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Poppins', fontSize: '14px', color: '#686ea8', fontWeight: 500, padding: '8px 4px' }}
          >
            {isPractice ? 'Close' : 'Skip'}
          </button>

          {isPractice ? (
            <p style={{ fontSize: '12px', color: '#a78bfa', fontStyle: 'italic' }}>
              Practice session — items are not saved to any learner.
            </p>
          ) : (
            <button
              type="button"
              onClick={handleProcess}
              disabled={processing || (includedCount === 0 && !hasFeedback)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '12px 28px', borderRadius: '12px', border: 'none',
                background: processing || (includedCount === 0 && !hasFeedback)
                  ? 'rgba(104,110,168,0.3)'
                  : 'linear-gradient(135deg, #f2811d, #fe598b)',
                color: 'white', fontFamily: 'Contrail One, cursive', fontSize: '15px',
                cursor: processing || (includedCount === 0 && !hasFeedback) ? 'not-allowed' : 'pointer',
                boxShadow: processing || (includedCount === 0 && !hasFeedback) ? 'none' : '0 4px 20px rgba(242,129,29,0.35)',
                transition: 'all 0.2s',
              }}
            >
              {processing && <Loader2 size={16} className="animate-spin" />}
              {hasFeedback && includedCount === 0 ? 'Save Homework Draft' : includedCount > 0 && hasFeedback ? `Process & Save (${includedCount} + HW)` : `Process & Finish (${includedCount})`}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
