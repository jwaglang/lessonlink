'use client';
// Q46

import { useState, useEffect } from 'react';
import type { WorkbookFormData, VocabEntry, MinimalPairEntry, FillBlankEntry, RiddleEntry } from '../lib/generator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import ThemePicker from './theme-picker';
import JsonImportPanel from './json-import-panel';
import { useToast } from '@/hooks/use-toast';

const STORAGE_KEY = 'hw-gen-draft-workbook';

const EMPTY_VOCAB: VocabEntry = { word: '', emoji: '', description: '' };
const EMPTY_PAIR: MinimalPairEntry = { wordA: '', wordB: '', correct: 'A' };
const EMPTY_FILL: FillBlankEntry = { sentence: '', answer: '' };
const EMPTY_RIDDLE: RiddleEntry = { clue: '', answer: '' };

function defaultData(): WorkbookFormData {
  return {
    title: '',
    headerEmojiLeft: '',
    headerEmojiRight: '',
    vocabulary: Array.from({ length: 8 }, () => ({ ...EMPTY_VOCAB })),
    readingText: '',
    minimalPairs: Array.from({ length: 4 }, () => ({ ...EMPTY_PAIR })),
    fillBlanks: Array.from({ length: 8 }, () => ({ ...EMPTY_FILL })),
    riddles: Array.from({ length: 4 }, () => ({ ...EMPTY_RIDDLE })),
    finalTaskPrompt: '',
    theme: 'nature',
  };
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, children, defaultOpen = true }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border bg-card">
      <button
        type="button"
        className="flex items-center gap-2 w-full px-4 py-3 text-sm font-semibold text-left"
        onClick={() => setOpen(v => !v)}
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {title}
      </button>
      {open && <div className="px-4 pb-4 space-y-4 border-t pt-4">{children}</div>}
    </div>
  );
}

interface WorkbookFormProps {
  onChange: (data: WorkbookFormData) => void;
}

export default function WorkbookForm({ onChange }: WorkbookFormProps) {
  const { toast } = useToast();
  const [data, setData] = useState<WorkbookFormData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : defaultData();
    } catch {
      return defaultData();
    }
  });

  // Debounced auto-save + parent callback
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      onChange(data);
    }, 300);
    return () => clearTimeout(timer);
  }, [data, onChange]);

  function set<K extends keyof WorkbookFormData>(key: K, value: WorkbookFormData[K]) {
    setData(prev => ({ ...prev, [key]: value }));
  }

  function setVocab(index: number, field: keyof VocabEntry, value: string) {
    setData(prev => {
      const vocab = [...prev.vocabulary];
      vocab[index] = { ...vocab[index], [field]: value };
      return { ...prev, vocabulary: vocab };
    });
  }

  function addVocab() {
    setData(prev => ({ ...prev, vocabulary: [...prev.vocabulary, { ...EMPTY_VOCAB }] }));
  }

  function removeVocab(index: number) {
    setData(prev => ({ ...prev, vocabulary: prev.vocabulary.filter((_, i) => i !== index) }));
  }

  function setPair(index: number, field: keyof MinimalPairEntry, value: string) {
    setData(prev => {
      const pairs = [...prev.minimalPairs];
      pairs[index] = { ...pairs[index], [field]: value } as MinimalPairEntry;
      return { ...prev, minimalPairs: pairs };
    });
  }

  function setFill(index: number, field: keyof FillBlankEntry, value: string) {
    setData(prev => {
      const fills = [...prev.fillBlanks];
      fills[index] = { ...fills[index], [field]: value };
      return { ...prev, fillBlanks: fills };
    });
  }

  function setRiddle(index: number, field: keyof RiddleEntry, value: string) {
    setData(prev => {
      const riddles = [...prev.riddles];
      riddles[index] = { ...riddles[index], [field]: value };
      return { ...prev, riddles: riddles };
    });
  }

  function handleImport(json: Record<string, unknown>) {
    const populated: string[] = [];

    setData(prev => {
      const next = { ...prev };

      if (typeof json.title === 'string') { next.title = json.title; populated.push('Title'); }
      if (typeof json.headerEmojiLeft === 'string') { next.headerEmojiLeft = json.headerEmojiLeft; populated.push('Header emoji left'); }
      if (typeof json.headerEmojiRight === 'string') { next.headerEmojiRight = json.headerEmojiRight; populated.push('Header emoji right'); }
      if (typeof json.readingText === 'string') { next.readingText = json.readingText; populated.push('Reading text'); }
      if (typeof json.finalTask === 'string') { next.finalTaskPrompt = json.finalTask; populated.push('Final task'); }

      if (Array.isArray(json.flashcards) && json.flashcards.length > 0) {
        next.vocabulary = json.flashcards.map((fc: any) => ({
          word: fc.word ?? '',
          emoji: fc.image ?? '',
          description: fc.description ?? '',
        }));
        populated.push(`Vocabulary (${next.vocabulary.length} words)`);
      }

      if (Array.isArray(json.minimalPairs) && json.minimalPairs.length > 0) {
        next.minimalPairs = json.minimalPairs.map((mp: any) => ({
          wordA: mp.word1 ?? '',
          wordB: mp.word2 ?? '',
          // correct is stored as 0/1 in lessonData, convert back to 'A'/'B'
          correct: mp.correct === 0 ? 'A' : 'B' as 'A' | 'B',
        }));
        populated.push(`Minimal pairs (${next.minimalPairs.length})`);
      }

      if (Array.isArray(json.fillInBlanks) && json.fillInBlanks.length > 0) {
        next.fillBlanks = json.fillInBlanks.map((fb: any) => ({
          sentence: fb.text ?? '',
          answer: fb.answer ?? '',
        }));
        populated.push(`Fill-in-blanks (${next.fillBlanks.length})`);
      }

      if (Array.isArray(json.listeningQuestions) && json.listeningQuestions.length > 0) {
        next.riddles = json.listeningQuestions.map((lq: any) => ({
          clue: lq.question ?? lq.audioText ?? '',
          // recover the correct answer from the options array
          answer: Array.isArray(lq.options) && typeof lq.correct === 'number'
            ? (lq.options[lq.correct] ?? '')
            : '',
        }));
        populated.push(`Riddles/listening (${next.riddles.length})`);
      }

      return next;
    });

    toast({
      title: 'Import successful',
      description: populated.length > 0
        ? `Populated: ${populated.join(', ')}.`
        : 'No matching fields found in the JSON.',
    });
  }

  function handleClearImport() {
    const fresh = defaultData();
    setData(fresh);
    localStorage.removeItem(STORAGE_KEY);
  }

  function clearForm() {
    const fresh = defaultData();
    setData(fresh);
    localStorage.removeItem(STORAGE_KEY);
  }

  const vocabWords = data.vocabulary.map(v => v.word).filter(Boolean);

  return (
    <div className="space-y-4">
      <JsonImportPanel onImport={handleImport} onClear={handleClearImport} />

      <div className="flex justify-end">
        <Button size="sm" variant="ghost" onClick={clearForm} className="text-muted-foreground">
          Clear Form
        </Button>
      </div>

      {/* Basics */}
      <Section title="Basics">
        <div className="space-y-2">
          <Label htmlFor="wb-title">Lesson Title</Label>
          <Input
            id="wb-title"
            value={data.title}
            onChange={e => set('title', e.target.value)}
            placeholder="e.g. Farm Animals"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Header Emoji (Left)</Label>
            <Input
              value={data.headerEmojiLeft}
              onChange={e => set('headerEmojiLeft', e.target.value)}
              placeholder="🐄"
              className="text-lg"
            />
          </div>
          <div className="space-y-2">
            <Label>Header Emoji (Right)</Label>
            <Input
              value={data.headerEmojiRight}
              onChange={e => set('headerEmojiRight', e.target.value)}
              placeholder="🌾"
              className="text-lg"
            />
          </div>
        </div>
      </Section>

      {/* Vocabulary */}
      <Section title={`Vocabulary (${data.vocabulary.length})`}>
        <div className="space-y-3">
          {data.vocabulary.map((v, i) => (
            <div key={i} className="grid grid-cols-[auto_1fr_80px_1fr_32px] gap-2 items-center">
              <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}.</span>
              <Input
                value={v.word}
                onChange={e => setVocab(i, 'word', e.target.value)}
                placeholder="Word"
              />
              <Input
                value={v.emoji}
                onChange={e => setVocab(i, 'emoji', e.target.value)}
                placeholder="Emoji"
                className="text-center text-lg"
              />
              <Input
                value={v.description}
                onChange={e => setVocab(i, 'description', e.target.value)}
                placeholder="Description for matching"
              />
              <button
                onClick={() => removeVocab(i)}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Remove"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={addVocab} className="mt-2">
          <Plus className="h-3 w-3 mr-1" /> Add Word
        </Button>
      </Section>

      {/* Reading Text */}
      <Section title="Reading Text">
        <div className="space-y-2">
          <Label>Reading Passage</Label>
          <Textarea
            value={data.readingText}
            onChange={e => set('readingText', e.target.value)}
            placeholder="8-12 sentences using all 8 vocabulary words..."
            rows={6}
          />
        </div>
      </Section>

      {/* Minimal Pairs */}
      <Section title="Minimal Pairs (×4)">
        <div className="space-y-3">
          {data.minimalPairs.map((mp, i) => (
            <div key={i} className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-start">
              <span className="text-xs text-muted-foreground w-5 text-right pt-2">{i + 1}.</span>
              <div className="space-y-1">
                <Label className="text-xs">Word A</Label>
                <Input value={mp.wordA} onChange={e => setPair(i, 'wordA', e.target.value)} placeholder="cap" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Word B</Label>
                <Input value={mp.wordB} onChange={e => setPair(i, 'wordB', e.target.value)} placeholder="cup" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Correct</Label>
                <RadioGroup
                  value={mp.correct}
                  onValueChange={v => setPair(i, 'correct', v)}
                  className="flex gap-3 pt-1"
                >
                  <div className="flex items-center gap-1">
                    <RadioGroupItem value="A" id={`mp-${i}-a`} />
                    <Label htmlFor={`mp-${i}-a`} className="text-xs">A</Label>
                  </div>
                  <div className="flex items-center gap-1">
                    <RadioGroupItem value="B" id={`mp-${i}-b`} />
                    <Label htmlFor={`mp-${i}-b`} className="text-xs">B</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Fill-in-Blanks */}
      <Section title="Fill-in-Blanks (×8)">
        <div className="space-y-3">
          {data.fillBlanks.map((fb, i) => (
            <div key={i} className="grid grid-cols-[auto_1fr_160px] gap-2 items-center">
              <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}.</span>
              <Input
                value={fb.sentence}
                onChange={e => setFill(i, 'sentence', e.target.value)}
                placeholder='e.g. A ___ gives us milk.'
              />
              <Select value={fb.answer} onValueChange={v => setFill(i, 'answer', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Answer" />
                </SelectTrigger>
                <SelectContent>
                  {vocabWords.length === 0 ? (
                    <SelectItem value="__empty" disabled>Add vocab first</SelectItem>
                  ) : (
                    vocabWords.map(w => (
                      <SelectItem key={w} value={w}>{w}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </Section>

      {/* Riddles */}
      <Section title="Riddles (×4)">
        <div className="space-y-3">
          {data.riddles.map((r, i) => (
            <div key={i} className="grid grid-cols-[auto_1fr_160px] gap-2 items-center">
              <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}.</span>
              <Input
                value={r.clue}
                onChange={e => setRiddle(i, 'clue', e.target.value)}
                placeholder="I say moo. I give milk. What am I?"
              />
              <Select value={r.answer} onValueChange={v => setRiddle(i, 'answer', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Answer" />
                </SelectTrigger>
                <SelectContent>
                  {vocabWords.length === 0 ? (
                    <SelectItem value="__empty" disabled>Add vocab first</SelectItem>
                  ) : (
                    vocabWords.map(w => (
                      <SelectItem key={w} value={w}>{w}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </Section>

      {/* Final Task */}
      <Section title="Final Task">
        <div className="space-y-2">
          <Label>Task Prompt</Label>
          <Textarea
            value={data.finalTaskPrompt}
            onChange={e => set('finalTaskPrompt', e.target.value)}
            placeholder="e.g. Draw your favorite farm animal!"
            rows={3}
          />
        </div>
      </Section>

      {/* Theme */}
      <Section title="Theme">
        <ThemePicker value={data.theme} onChange={v => set('theme', v)} />
      </Section>
    </div>
  );
}
