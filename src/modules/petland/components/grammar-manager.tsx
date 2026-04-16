'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { addGrammarCard } from '@/lib/firestore';
import { generateGrammarCard } from '../ai/generate-grammar-card';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wand2, Loader2, Trash2 } from 'lucide-react';
import type { GrammarCard } from '../types';

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface Props {
  studentId: string;
  prefill?: { role: string; cloze: string } | null;
  onPrefillConsumed?: () => void;
}

function SentenceSwitcherPreview({ sentence, errorWords }: { sentence: string; errorWords: string[] }) {
  const lower = errorWords.map(w => w.toLowerCase());
  const tokens = sentence.split(/(\s+)/);
  return (
    <span>
      {tokens.map((token, i) => {
        const clean = token.replace(/[.,!?;:]$/, '');
        const isError = lower.includes(clean.toLowerCase());
        return isError
          ? <span key={i} className="text-red-500 font-bold">{token}</span>
          : <span key={i}>{token}</span>;
      })}
    </span>
  );
}

export default function GrammarManager({ studentId, prefill, onPrefillConsumed }: Props) {
  const { toast } = useToast();
  const [cards, setCards] = useState<GrammarCard[]>([]);

  // Form fields
  const [rule, setRule] = useState('');
  const [target, setTarget] = useState('');
  const [wrongSentence, setWrongSentence] = useState('');
  const [correctSentence, setCorrectSentence] = useState('');
  const [errorWords, setErrorWords] = useState<string[]>([]);
  const [answer, setAnswer] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Live subscribe
  useEffect(() => {
    const ref = collection(db, 'students', studentId, 'grammar');
    const unsub = onSnapshot(ref, snap => {
      setCards(snap.docs.map(d => ({ id: d.id, ...d.data() } as GrammarCard)));
    });
    return () => unsub();
  }, [studentId]);

  // Accept prefill from session cards (point → rule, example → target)
  useEffect(() => {
    if (!prefill) return;
    setRule(prefill.role);
    setTarget(prefill.cloze);
    setWrongSentence(''); setCorrectSentence(''); setErrorWords([]); setAnswer('');
    onPrefillConsumed?.();
  }, [prefill]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerate = async () => {
    if (!rule.trim() || !target.trim()) return;
    setGenerating(true);
    try {
      const result = await generateGrammarCard(rule, target);
      setWrongSentence(result.wrongSentence);
      setCorrectSentence(result.correctSentence);
      setErrorWords(result.errorWords);
      setAnswer(result.answer);
    } catch {
      toast({ title: 'AI generation failed — try again', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!rule.trim() || !wrongSentence.trim()) return;
    setSaving(true);
    try {
      await addGrammarCard(studentId, {
        rule,
        target,
        wrongSentence,
        correctSentence,
        errorWords,
        answer,
        srsLevel: 1,
        lastReviewDate: '',
        sessionInstanceId: '',
        createdDate: todayString(),
      });
      toast({ title: 'Grammar card saved' });
      setRule(''); setTarget(''); setWrongSentence(''); setCorrectSentence(''); setErrorWords([]); setAnswer('');
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cardId: string) => {
    await deleteDoc(doc(db, 'students', studentId, 'grammar', cardId)).catch(console.error);
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Add Grammar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Grammar Rule</Label>
            <Input placeholder="e.g. Present Perfect" value={rule} onChange={e => setRule(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Target</Label>
            <Input placeholder="e.g. to go" value={target} onChange={e => setTarget(e.target.value)} />
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerate}
          disabled={generating || !rule.trim() || !target.trim()}
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Wand2 className="h-4 w-4 mr-1" />}
          Generate Sentence Switcher
        </Button>

        {wrongSentence && (
          <div className="space-y-3 rounded-lg border border-orange-200 bg-orange-50 p-4">
            <div className="space-y-1">
              <Label className="text-xs text-orange-600 font-semibold uppercase tracking-wide">Sentence Switcher</Label>
              <p className="text-sm font-medium">
                <SentenceSwitcherPreview sentence={wrongSentence} errorWords={errorWords} />
              </p>
              <Input
                className="text-sm mt-1"
                value={wrongSentence}
                onChange={e => setWrongSentence(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-green-600 font-semibold uppercase tracking-wide">Correct Version</Label>
              <Input className="text-sm" value={correctSentence} onChange={e => setCorrectSentence(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Error words (comma-separated)</Label>
                <Input
                  className="text-sm"
                  value={errorWords.join(', ')}
                  onChange={e => setErrorWords(e.target.value.split(',').map(w => w.trim()).filter(Boolean))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Answer</Label>
                <Input className="text-sm" value={answer} onChange={e => setAnswer(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {wrongSentence && (
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="bg-k-orange hover:bg-k-orange/90 text-white"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Save Card
          </Button>
        )}

      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="text-base">Grammar List ({cards.length} cards)</CardTitle>
      </CardHeader>
      <CardContent>
        {cards.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No grammar cards yet.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {cards.map(card => (
              <div key={card.id} className="flex items-start justify-between gap-2 text-sm rounded-md border px-3 py-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-orange-600 bg-orange-100 rounded px-1.5 py-0.5">{card.rule}</span>
                    <span className="text-xs text-muted-foreground">{card.target}</span>
                  </div>
                  <p className="text-xs">
                    <SentenceSwitcherPreview sentence={card.wrongSentence} errorWords={card.errorWords || []} />
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleDelete(card.id)}>
                  <Trash2 className="h-3 w-3 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
}
