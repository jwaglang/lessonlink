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
} from '@/lib/firestore';
import { generateSentence } from '@/modules/petland/ai/generate-sentence';
import { generateCloze } from '@/modules/petland/ai/generate-cloze';
import { generateMinimalPairs } from '@/modules/petland/ai/generate-minimal-pairs';
import { useAuth } from '@/components/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wand2, CheckSquare, Square, ChevronRight } from 'lucide-react';
import type { SessionProgress, SessionVocabulary, SessionGrammar, SessionPhonics } from '@/lib/types';
import type { Student } from '@/lib/types';

// ─── Per-item state shapes ────────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

type TabId = 'vocab' | 'grammar' | 'phonics';

export default function SessionDebriefPage() {
  const { sessionInstanceId } = useParams() as { sessionInstanceId: string };
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const [progress, setProgress] = useState<SessionProgress | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [tab, setTab] = useState<TabId>('vocab');

  const [vocabItems, setVocabItems] = useState<VocabItem[]>([]);
  const [grammarItems, setGrammarItems] = useState<GrammarItem[]>([]);
  const [phonicsItems, setPhonicsItems] = useState<PhonicsItem[]>([]);

  // ── Load ──────────────────────────────────────────────────────────────────

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

        // Load student info for display + routing
        if (prog.studentId && prog.studentId !== 'practice') {
          try {
            const s = await getStudentById(prog.studentId);
            setStudent(s);
          } catch {
            // non-blocking — student display is cosmetic
          }
        }

        // Initialise item state from sessionProgress
        setVocabItems(
          (prog.vocabulary || []).map(v => ({
            original: v,
            word: v.word,
            meaning: v.meaning,
            sentence: '',
            level: 2,
            included: true,
            generating: false,
          }))
        );

        setGrammarItems(
          (prog.grammar || []).map(g => ({
            original: g,
            role: g.point,
            cloze: g.example,
            answer: '',
            included: true,
            generating: false,
          }))
        );

        setPhonicsItems(
          (prog.phonics || []).map(p => ({
            original: p,
            keyword: p.sound,
            pairWord: p.examples[0] || '',
            targetIPA: '',
            pairIPA: '',
            minimalPairs: [],
            included: true,
            generating: false,
          }))
        );
      } catch (err) {
        toast({ title: 'Failed to load session', variant: 'destructive' });
        router.push('/t-portal');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user?.uid, sessionInstanceId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Generate helpers ──────────────────────────────────────────────────────

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
        i === idx ? {
          ...p,
          targetIPA: result.targetIPA,
          pairIPA: result.pairIPA,
          minimalPairs: result.pairs,
          generating: false,
        } : p
      ));
    } catch {
      toast({ title: 'AI failed for phonics — try again', variant: 'destructive' });
      setPhonicsItems(prev => prev.map((p, i) => i === idx ? { ...p, generating: false } : p));
    }
  };

  // ── Process & Finish ──────────────────────────────────────────────────────

  const handleProcess = async () => {
    if (!progress) return;
    const studentId = progress.studentId;
    const sessionInstanceIdVal = progress.sessionInstanceId;
    const today = todayString();

    setProcessing(true);
    try {
      // Vocab → students/{studentId}/vocabulary
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

      // Grammar → students/{studentId}/grammar
      for (const item of grammarItems.filter(g => g.included)) {
        await addGrammarCard(studentId, {
          role: item.role,
          cloze: item.cloze,
          answer: item.answer,
          srsLevel: 1,
          lastReviewDate: '',
          sessionInstanceId: sessionInstanceIdVal,
          createdDate: today,
        });
      }

      // Phonics → students/{studentId}/phonics
      for (const item of phonicsItems.filter(p => p.included)) {
        await addPhonicsCard(studentId, {
          keyword: item.keyword,
          pairWord: item.pairWord,
          targetIPA: item.targetIPA,
          pairIPA: item.pairIPA,
          minimalPairs: item.minimalPairs,
          srsLevel: 1,
          lastReviewDate: '',
          sessionInstanceId: sessionInstanceIdVal,
          createdDate: today,
        });
      }

      const total =
        vocabItems.filter(v => v.included).length +
        grammarItems.filter(g => g.included).length +
        phonicsItems.filter(p => p.included).length;

      toast({ title: `${total} item${total !== 1 ? 's' : ''} added to SRS` });

      // Route to learner profile (or dashboard if practice mode)
      if (studentId && studentId !== 'practice') {
        router.push(`/t-portal/students/${studentId}`);
      } else {
        router.push('/t-portal');
      }
    } catch (err) {
      console.error('[Debrief] handleProcess error:', err);
      toast({ title: 'Failed to save some items', variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2">
        <Loader2 className="animate-spin h-5 w-5" />
        <span>Loading session…</span>
      </div>
    );
  }

  if (!progress) return null;

  const studentName = student?.name || (progress.studentId === 'practice' ? 'Practice Session' : 'Learner');

  const includedCount =
    vocabItems.filter(v => v.included).length +
    grammarItems.filter(g => g.included).length +
    phonicsItems.filter(p => p.included).length;

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: 'vocab',   label: '📚 Vocab',   count: vocabItems.length   },
    { id: 'grammar', label: '✍️ Grammar', count: grammarItems.length },
    { id: 'phonics', label: '🔤 Phonics', count: phonicsItems.length },
  ];

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#404376]" style={{ fontFamily: 'Contrail One, cursive' }}>
          Session Debrief
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {studentName} · {progress.sessionQuestion || 'No session question set'}
        </p>
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm">
        <span className="text-purple-700 font-medium">
          {vocabItems.length} words · {grammarItems.length} grammar · {phonicsItems.length} phonics
        </span>
        <span className="text-muted-foreground">captured this session</span>
        <span className="ml-auto text-purple-600 font-semibold">{includedCount} selected to save</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {tabs.map(t => (
          <button
            type="button"
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-[#404376] text-[#404376]'
                : 'border-transparent text-muted-foreground hover:text-gray-700'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">{t.count}</Badge>
            )}
          </button>
        ))}
      </div>

      {/* ── VOCAB TAB ── */}
      {tab === 'vocab' && (
        <div className="space-y-3">
          {vocabItems.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">No vocabulary captured this session.</p>
          )}
          {vocabItems.map((item, idx) => (
            <div
              key={idx}
              className={`rounded-xl border p-4 space-y-3 transition-opacity ${item.included ? 'opacity-100' : 'opacity-40'}`}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => setVocabItems(prev => prev.map((v, i) => i === idx ? { ...v, included: !v.included } : v))}
                  className="mt-0.5 text-[#404376] shrink-0"
                  aria-label={item.included ? 'Deselect' : 'Select'}
                >
                  {item.included ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                </button>
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Word</Label>
                    <Input
                      value={item.word}
                      onChange={e => setVocabItems(prev => prev.map((v, i) => i === idx ? { ...v, word: e.target.value } : v))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Meaning</Label>
                    <Input
                      value={item.meaning}
                      onChange={e => setVocabItems(prev => prev.map((v, i) => i === idx ? { ...v, meaning: e.target.value } : v))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Level (1–5)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      value={item.level}
                      onChange={e => setVocabItems(prev => prev.map((v, i) => i === idx ? { ...v, level: Number(e.target.value) } : v))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => generateVocab(idx)}
                      disabled={item.generating || !item.included}
                      className="h-8 gap-1.5 text-xs"
                    >
                      {item.generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                      Generate sentence
                    </Button>
                  </div>
                </div>
              </div>
              {item.sentence && (
                <div className="ml-8 p-2.5 bg-purple-50 rounded-lg border border-purple-100">
                  <p className="text-xs text-muted-foreground mb-1">Example sentence</p>
                  <Input
                    value={item.sentence}
                    onChange={e => setVocabItems(prev => prev.map((v, i) => i === idx ? { ...v, sentence: e.target.value } : v))}
                    className="h-8 text-sm bg-white"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── GRAMMAR TAB ── */}
      {tab === 'grammar' && (
        <div className="space-y-3">
          {grammarItems.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">No grammar captured this session.</p>
          )}
          {grammarItems.map((item, idx) => (
            <div
              key={idx}
              className={`rounded-xl border p-4 space-y-3 transition-opacity ${item.included ? 'opacity-100' : 'opacity-40'}`}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => setGrammarItems(prev => prev.map((g, i) => i === idx ? { ...g, included: !g.included } : g))}
                  className="mt-0.5 text-[#f2811d] shrink-0"
                  aria-label={item.included ? 'Deselect' : 'Select'}
                >
                  {item.included ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                </button>
                <div className="flex-1 space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Grammar role</Label>
                      <Input
                        value={item.role}
                        onChange={e => setGrammarItems(prev => prev.map((g, i) => i === idx ? { ...g, role: e.target.value } : g))}
                        placeholder="e.g. present perfect"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => generateGrammar(idx)}
                        disabled={item.generating || !item.included}
                        className="h-8 gap-1.5 text-xs"
                      >
                        {item.generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                        Polish cloze
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Open cloze (use ___ for blank)</Label>
                    <Input
                      value={item.cloze}
                      onChange={e => setGrammarItems(prev => prev.map((g, i) => i === idx ? { ...g, cloze: e.target.value } : g))}
                      placeholder="e.g. I ___ been here before."
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </div>
              {item.answer && (
                <div className="ml-8 p-2.5 bg-orange-50 rounded-lg border border-orange-100">
                  <p className="text-xs text-muted-foreground mb-1">Answer</p>
                  <Input
                    value={item.answer}
                    onChange={e => setGrammarItems(prev => prev.map((g, i) => i === idx ? { ...g, answer: e.target.value } : g))}
                    className="h-8 text-sm bg-white"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── PHONICS TAB ── */}
      {tab === 'phonics' && (
        <div className="space-y-3">
          {phonicsItems.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">No phonics captured this session.</p>
          )}
          {phonicsItems.map((item, idx) => (
            <div
              key={idx}
              className={`rounded-xl border p-4 space-y-3 transition-opacity ${item.included ? 'opacity-100' : 'opacity-40'}`}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => setPhonicsItems(prev => prev.map((p, i) => i === idx ? { ...p, included: !p.included } : p))}
                  className="mt-0.5 text-[#686ea8] shrink-0"
                  aria-label={item.included ? 'Deselect' : 'Select'}
                >
                  {item.included ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                </button>
                <div className="flex-1 space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Keyword</Label>
                      <Input
                        value={item.keyword}
                        onChange={e => setPhonicsItems(prev => prev.map((p, i) => i === idx ? { ...p, keyword: e.target.value } : p))}
                        placeholder="e.g. rock"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Sounds like (pair word)</Label>
                      <Input
                        value={item.pairWord}
                        onChange={e => setPhonicsItems(prev => prev.map((p, i) => i === idx ? { ...p, pairWord: e.target.value } : p))}
                        placeholder="e.g. lock"
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => generatePhonics(idx)}
                    disabled={item.generating || !item.included}
                    className="h-8 gap-1.5 text-xs"
                  >
                    {item.generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                    Generate IPA + minimal pairs
                  </Button>
                </div>
              </div>

              {/* Generated phonics output */}
              {(item.targetIPA || item.minimalPairs.length > 0) && (
                <div className="ml-8 p-3 bg-blue-50 rounded-lg border border-blue-100 space-y-2">
                  {item.targetIPA && (
                    <div className="flex gap-4 text-sm">
                      <span>
                        <span className="text-muted-foreground text-xs">Target: </span>
                        <span className="font-mono font-medium text-blue-700">{item.targetIPA}</span>
                        <span className="text-muted-foreground text-xs ml-1">({item.keyword})</span>
                      </span>
                      <span>
                        <span className="text-muted-foreground text-xs">Pair: </span>
                        <span className="font-mono font-medium text-blue-500">{item.pairIPA}</span>
                        <span className="text-muted-foreground text-xs ml-1">({item.pairWord})</span>
                      </span>
                    </div>
                  )}
                  {item.minimalPairs.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Minimal pairs ({item.minimalPairs.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {item.minimalPairs.map((pair, pi) => (
                          <span key={pi} className="text-xs bg-white border border-blue-200 rounded px-2 py-1 font-mono">
                            {pair.word1} <ChevronRight className="inline h-3 w-3 text-muted-foreground" /> {pair.word2}
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

      {/* ── Footer actions ── */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <Button
          variant="ghost"
          onClick={() => router.push(
            progress.studentId && progress.studentId !== 'practice'
              ? `/t-portal/students/${progress.studentId}`
              : '/t-portal'
          )}
          disabled={processing}
        >
          Skip
        </Button>
        <Button
          onClick={handleProcess}
          disabled={processing || includedCount === 0}
          className="gap-2"
          style={{ background: 'linear-gradient(135deg, #404376, #686ea8)', color: 'white' }}
        >
          {processing && <Loader2 className="h-4 w-4 animate-spin" />}
          Process & Finish ({includedCount})
        </Button>
      </div>

    </div>
  );
}
