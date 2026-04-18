'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { addPhonicsCard, getPhonicsRepoCard, addPhonicsRepoCard, updatePhonicsRepoCard, getAllPhonicsRepoCards, backfillPhonicsRepository } from '@/lib/firestore';
import { getWordIPA } from '../ai/get-word-ipa';
import { generatePhonemeContrast } from '../ai/generate-phoneme-contrast';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Trash2, Library } from 'lucide-react';
import type { PhonicsCard, PhonicsRepositoryCard } from '../types';
import { PhonicsGame } from './unified-flashcard-review';

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
  const [previewPair, setPreviewPair] = useState<{ word1: string; word2: string } | null>(null);
  const [capturedGameData, setCapturedGameData] = useState<{
    imageUrl: string; sentence: string; pictureWord: string;
    audioWord: string; otherWord: string; isMatch: boolean;
  } | null>(null);

  // Repository
  const [repoCard, setRepoCard] = useState<PhonicsRepositoryCard | null>(null);
  const [checkingRepo, setCheckingRepo] = useState(false);
  const [repoList, setRepoList] = useState<PhonicsRepositoryCard[]>([]);
  const [loadingRepo, setLoadingRepo] = useState(false);
  const [showBrowse, setShowBrowse] = useState(false);
  const [backfilling, setBackfilling] = useState(false);

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
    setRepoCard(null); setCapturedGameData(null);
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
    setRepoCard(null);
    setCapturedGameData(null);
    setCheckingRepo(true);
    try {
      const existing = await getPhonicsRepoCard(keyword.trim().toLowerCase(), phoneme);
      if (existing) {
        setRepoCard(existing);
        setContrast({ pairWord: existing.pairWord, targetIPA: existing.targetIPA, pairIPA: existing.pairIPA, minimalPairs: existing.minimalPairs });
        if (existing.gameData) setCapturedGameData(existing.gameData);
      } else {
        setGeneratingContrast(true);
        const result = await generatePhonemeContrast(keyword, phoneme);
        setContrast(result);
      }
    } catch {
      toast({ title: 'Failed — try again', variant: 'destructive' });
    } finally {
      setCheckingRepo(false);
      setGeneratingContrast(false);
    }
  };

  const handleGenerateNew = async () => {
    if (!selectedPhoneme) return;
    setRepoCard(null);
    setContrast(null);
    setCapturedGameData(null);
    setGeneratingContrast(true);
    try {
      const result = await generatePhonemeContrast(keyword, selectedPhoneme);
      setContrast(result);
    } catch {
      toast({ title: 'Contrast generation failed — try again', variant: 'destructive' });
    } finally {
      setGeneratingContrast(false);
    }
  };

  const handleBackfill = async () => {
    setBackfilling(true);
    try {
      const { added, skipped } = await backfillPhonicsRepository();
      toast({ title: `Backfill complete — ${added} added, ${skipped} already existed` });
      if (showBrowse) {
        const all = await getAllPhonicsRepoCards();
        setRepoList(all);
      }
    } catch {
      toast({ title: 'Backfill failed', variant: 'destructive' });
    } finally {
      setBackfilling(false);
    }
  };

  const handleBrowse = async () => {
    const opening = !showBrowse;
    setShowBrowse(opening);
    if (!opening) return;
    setLoadingRepo(true);
    try {
      const all = await getAllPhonicsRepoCards();
      setRepoList(all);
    } catch {
      toast({ title: 'Failed to load repository', variant: 'destructive' });
    } finally {
      setLoadingRepo(false);
    }
  };

  const handleUseRepoCard = (rc: PhonicsRepositoryCard) => {
    setKeyword(rc.keyword);
    setKeywordIPA(rc.keywordIPA);
    setSelectedPhoneme(rc.targetPhoneme);
    setContrast({ pairWord: rc.pairWord, targetIPA: rc.targetIPA, pairIPA: rc.pairIPA, minimalPairs: rc.minimalPairs });
    setRepoCard(rc);
    if (rc.gameData) setCapturedGameData(rc.gameData);
    setShowBrowse(false);
  };

  const handleSave = async () => {
    if (!keyword.trim() || !contrast) return;
    setSaving(true);
    try {
      const cardData = {
        keyword: keyword.trim().toLowerCase(),
        keywordIPA,
        targetPhoneme: selectedPhoneme || '',
        pairWord: contrast.pairWord,
        targetIPA: contrast.targetIPA,
        pairIPA: contrast.pairIPA,
        minimalPairs: contrast.minimalPairs,
        ...(capturedGameData ? { gameData: capturedGameData } : {}),
      };

      // Save to student's collection
      await addPhonicsCard(studentId, { ...cardData, srsLevel: 1, lastReviewDate: '', sessionInstanceId: '', createdDate: todayString() });

      // Save/update in shared repository
      if (repoCard) {
        // Update repo card with gameData if we now have it and repo didn't
        if (capturedGameData && !repoCard.gameData) {
          await updatePhonicsRepoCard(repoCard.id, { gameData: capturedGameData });
        }
      } else {
        // New card — add to repo
        await addPhonicsRepoCard({ ...cardData, createdDate: todayString() });
      }

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
    <div className="flex flex-col gap-6">
    <div className="grid lg:grid-cols-2 gap-6">
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

            {(checkingRepo || generatingContrast) && (
              <div className="flex items-center gap-2 text-xs text-sky-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                {checkingRepo ? 'Checking repository…' : 'Generating minimal pairs…'}
              </div>
            )}

            {/* Repo match banner */}
            {repoCard && contrast && (
              <div className="flex items-center justify-between gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs">
                <span className="text-emerald-700 font-medium">✓ Found in repository</span>
                <Button size="sm" variant="ghost" className="h-6 text-xs text-emerald-600 hover:text-emerald-800 px-2" onClick={handleGenerateNew}>
                  Generate new instead
                </Button>
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
                <p className="text-xs text-sky-500">Click a pair to preview the flashcard game:</p>
                <div className="flex flex-wrap gap-1">
                  {contrast.minimalPairs.map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPreviewPair(p)}
                      className="text-xs bg-white border border-sky-200 rounded px-2 py-1 font-mono text-sky-800 hover:border-sky-400 hover:bg-sky-100 transition-all cursor-pointer"
                    >
                      {p.word1} / {p.word2}
                    </button>
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

        {/* Preview dialog — opens when T clicks a specific pair */}
        {contrast && previewPair && (
          <Dialog open={!!previewPair} onOpenChange={(open) => { if (!open) setPreviewPair(null); }}>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-sky-700 text-base">
                  🔤 {previewPair.word1} / {previewPair.word2}
                </DialogTitle>
              </DialogHeader>
              <PhonicsGame
                key={`${previewPair.word1}-${previewPair.word2}`}
                card={{
                  id: '__preview__',
                  keyword,
                  keywordIPA,
                  targetPhoneme: selectedPhoneme || '',
                  pairWord: contrast.pairWord,
                  targetIPA: contrast.targetIPA,
                  pairIPA: contrast.pairIPA,
                  minimalPairs: [previewPair],
                  srsLevel: 1,
                  lastReviewDate: '',
                  sessionInstanceId: '',
                  createdDate: '',
                }}
                onGenerated={data => setCapturedGameData(data)}
                onAnswer={() => setPreviewPair(null)}
                canGenerate={true}
              />
            </DialogContent>
          </Dialog>
        )}

      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle className="text-base">Phonics List ({cards.length} cards)</CardTitle>
      </CardHeader>
      <CardContent>
        {cards.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No phonics cards yet.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
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
    </div>

    {/* Repository browser */}
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Library className="h-4 w-4 text-sky-500" />
            Phonics Repository
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={handleBackfill} disabled={backfilling}>
              {backfilling ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Backfill
            </Button>
            <Button variant="ghost" size="sm" className="text-xs" onClick={handleBrowse}>
              {showBrowse ? 'Hide' : 'Browse'}
            </Button>
          </div>
        </div>
      </CardHeader>
      {showBrowse && (
        <CardContent>
          {loadingRepo && (
            <div className="flex items-center gap-2 text-xs text-sky-500 py-3">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading repository…
            </div>
          )}
          {!loadingRepo && repoList.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-3">Repository is empty.</p>
          )}
          {!loadingRepo && repoList.length > 0 && (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {repoList.map(rc => (
                <div key={rc.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className="font-bold text-sky-700">{rc.keyword}</span>
                    <span className="font-mono text-xs text-sky-500">{rc.keywordIPA}</span>
                    <span className="font-mono text-xs bg-sky-100 text-sky-700 rounded px-1">{rc.targetPhoneme}</span>
                    <span className="text-muted-foreground text-xs">vs</span>
                    <span className="text-slate-600">{rc.pairWord}</span>
                    {rc.gameData && <span className="text-xs text-emerald-600">✓ game ready</span>}
                  </div>
                  <Button size="sm" variant="outline" className="shrink-0 text-xs h-7" onClick={() => handleUseRepoCard(rc)}>
                    Use
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
    </div>
  );
}
