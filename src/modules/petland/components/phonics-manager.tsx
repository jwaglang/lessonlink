'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { addPhonicsCard } from '@/lib/firestore';
import { getWordIPA } from '../ai/get-word-ipa';
import { generatePhonemeContrast } from '../ai/generate-phoneme-contrast';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Trash2 } from 'lucide-react';
import type { PhonicsCard } from '../types';

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface Props {
  studentId: string;
  prefill?: { keyword: string; pairWord: string } | null;
  onPrefillConsumed?: () => void;
}

export default function PhonicsManager({ studentId, prefill, onPrefillConsumed }: Props) {
  const { toast } = useToast();
  const [cards, setCards] = useState<PhonicsCard[]>([]);

  // Step 1 — keyword
  const [keyword, setKeyword] = useState('');
  const [keywordIPA, setKeywordIPA] = useState('');
  const [phonemes, setPhonemes] = useState<string[]>([]);
  const [gettingIPA, setGettingIPA] = useState(false);

  // Step 2 — phoneme selection + contrast
  const [selectedPhoneme, setSelectedPhoneme] = useState<string | null>(null);
  const [contrast, setContrast] = useState<{
    pairWord: string; targetIPA: string; pairIPA: string;
    minimalPairs: Array<{ word1: string; word2: string }>;
  } | null>(null);
  const [generatingContrast, setGeneratingContrast] = useState(false);
  const [saving, setSaving] = useState(false);

  // Live subscribe
  useEffect(() => {
    const ref = collection(db, 'students', studentId, 'phonics');
    const unsub = onSnapshot(ref, snap => {
      setCards(snap.docs.map(d => ({ id: d.id, ...d.data() } as PhonicsCard)));
    });
    return () => unsub();
  }, [studentId]);

  // Accept prefill from session cards
  useEffect(() => {
    if (!prefill) return;
    setKeyword(prefill.keyword);
    resetAfterKeyword();
    onPrefillConsumed?.();
  }, [prefill]); // eslint-disable-line react-hooks/exhaustive-deps

  const resetAfterKeyword = () => {
    setKeywordIPA(''); setPhonemes([]); setSelectedPhoneme(null); setContrast(null);
  };

  const handleGetIPA = async () => {
    if (!keyword.trim()) return;
    setGettingIPA(true);
    resetAfterKeyword();
    try {
      const result = await getWordIPA(keyword.trim());
      setKeywordIPA(result.fullIPA);
      setPhonemes(result.phonemes);
    } catch {
      toast({ title: 'IPA generation failed — try again', variant: 'destructive' });
    } finally {
      setGettingIPA(false);
    }
  };

  const handleSelectPhoneme = async (phoneme: string) => {
    setSelectedPhoneme(phoneme);
    setContrast(null);
    setGeneratingContrast(true);
    try {
      const result = await generatePhonemeContrast(keyword, phoneme);
      setContrast(result);
    } catch {
      toast({ title: 'Contrast generation failed — try again', variant: 'destructive' });
    } finally {
      setGeneratingContrast(false);
    }
  };

  const handleSave = async () => {
    if (!keyword.trim() || !contrast) return;
    setSaving(true);
    try {
      await addPhonicsCard(studentId, {
        keyword,
        keywordIPA,
        targetPhoneme: selectedPhoneme || '',
        pairWord: contrast.pairWord,
        targetIPA: contrast.targetIPA,
        pairIPA: contrast.pairIPA,
        minimalPairs: contrast.minimalPairs,
        srsLevel: 1,
        lastReviewDate: '',
        sessionInstanceId: '',
        createdDate: todayString(),
      });
      toast({ title: 'Phonics card saved' });
      setKeyword(''); resetAfterKeyword();
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cardId: string) => {
    await deleteDoc(doc(db, 'students', studentId, 'phonics', cardId)).catch(console.error);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Add Phonics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Step 1 — keyword + IPA */}
        <div className="flex gap-2 items-end">
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Keyword</Label>
            <Input
              placeholder="e.g. ship"
              value={keyword}
              onChange={e => { setKeyword(e.target.value); resetAfterKeyword(); }}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGetIPA}
            disabled={gettingIPA || !keyword.trim()}
          >
            {gettingIPA ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Get IPA
          </Button>
        </div>

        {/* Step 2 — phoneme chips */}
        {phonemes.length > 0 && (
          <div className="space-y-2 rounded-lg border border-sky-200 bg-sky-50 p-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-sky-600 font-semibold uppercase tracking-wide">IPA</span>
              <span className="font-mono text-sky-800 font-bold">{keywordIPA}</span>
            </div>
            <div>
              <p className="text-xs text-sky-500 mb-2">Click the target phoneme:</p>
              <div className="flex gap-2 flex-wrap">
                {phonemes.map((ph, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectPhoneme(ph)}
                    className={`font-mono text-lg px-3 py-1.5 rounded-lg border-2 transition-all cursor-pointer
                      ${selectedPhoneme === ph
                        ? 'border-sky-500 bg-sky-500 text-white shadow-md'
                        : 'border-sky-300 bg-white text-sky-800 hover:border-sky-400 hover:bg-sky-100'
                      }`}
                  >
                    {ph}
                  </button>
                ))}
              </div>
            </div>

            {generatingContrast && (
              <div className="flex items-center gap-2 text-xs text-sky-500">
                <Loader2 className="h-3 w-3 animate-spin" /> Generating minimal pairs…
              </div>
            )}

            {contrast && (
              <div className="space-y-2 pt-2 border-t border-sky-200">
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-mono font-bold text-sky-700">{contrast.targetIPA}</span>
                  <span className="font-bold text-sky-900">{keyword}</span>
                  <span className="text-sky-400">vs</span>
                  <span className="font-mono font-bold text-slate-500">{contrast.pairIPA}</span>
                  <span className="font-bold text-slate-700">{contrast.pairWord}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {contrast.minimalPairs.map((p, i) => (
                    <span key={i} className="text-xs bg-white border border-sky-200 rounded px-2 py-0.5 font-mono text-sky-800">
                      {p.word1} / {p.word2}
                    </span>
                  ))}
                </div>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-k-orange hover:bg-k-orange/90 text-white mt-1"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Save Card
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Saved cards */}
        {cards.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs text-muted-foreground font-medium">Saved phonics cards ({cards.length})</p>
            {cards.map(card => (
              <div key={card.id} className="flex items-start justify-between gap-2 text-sm rounded-md border px-3 py-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sky-700">{card.keyword}</span>
                  <span className="font-mono text-xs text-sky-500">{card.keywordIPA}</span>
                  <span className="text-muted-foreground text-xs">·</span>
                  <span className="font-mono text-xs bg-sky-100 text-sky-700 rounded px-1">{card.targetPhoneme}</span>
                  <span className="text-muted-foreground text-xs">vs</span>
                  <span className="text-slate-600">{card.pairWord}</span>
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
  );
}
