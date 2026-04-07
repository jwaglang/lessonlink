'use client';
// Q46

import { useState, useEffect } from 'react';
import type { SongWorksheetFormData, SongVocabEntry, SongMatchingEntry, SongQuestion, TinyTalk, QuestionType } from '../lib/generator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import ThemePicker from './theme-picker';
import AnimationPicker from './animation-picker';
import JsonImportPanel from './json-import-panel';
import { useToast } from '@/hooks/use-toast';

const STORAGE_KEY = 'hw-gen-draft-song';

const LEVELS = ['WHITE', 'YELLOW', 'ORANGE', 'GREEN', 'BLUE', 'PURPLE', 'RED', 'BLACK'];

const EMPTY_VOCAB: SongVocabEntry = { word: '', emoji: '', definition: '' };
const EMPTY_MATCH: SongMatchingEntry = { sentence: '', answerEmoji: '', answerWord: '' };
const EMPTY_QUESTION: SongQuestion = { question: '', type: 'yes_no', answer: '' };
const EMPTY_TALK: TinyTalk = { prompt: '' };

function defaultData(): SongWorksheetFormData {
  return {
    songTitle: '',
    youtubeUrl: '',
    level: 'WHITE',
    fullLyrics: '',
    vocabulary: Array.from({ length: 6 }, () => ({ ...EMPTY_VOCAB })),
    matching: Array.from({ length: 6 }, () => ({ ...EMPTY_MATCH })),
    questions: Array.from({ length: 4 }, () => ({ ...EMPTY_QUESTION })),
    tinyTalks: Array.from({ length: 2 }, () => ({ ...EMPTY_TALK })),
    theme: 'music',
    sectionEmojis: ['🎵', '📖', '🔤', '🔗', '❓', '💬'],
    animationType: 'floating_particles',
    animationEmoji: '🎵',
  };
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border bg-card">
      <button className="flex items-center gap-2 w-full px-4 py-3 text-sm font-semibold text-left" onClick={() => setOpen(v => !v)}>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {title}
      </button>
      {open && <div className="px-4 pb-4 space-y-4 border-t pt-4">{children}</div>}
    </div>
  );
}

interface SongWorksheetFormProps {
  onChange: (data: SongWorksheetFormData) => void;
}

export default function SongWorksheetForm({ onChange }: SongWorksheetFormProps) {
  const { toast } = useToast();
  const [data, setData] = useState<SongWorksheetFormData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : defaultData();
    } catch {
      return defaultData();
    }
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      onChange(data);
    }, 300);
    return () => clearTimeout(timer);
  }, [data, onChange]);

  function set<K extends keyof SongWorksheetFormData>(key: K, value: SongWorksheetFormData[K]) {
    setData(prev => ({ ...prev, [key]: value }));
  }

  function setVocab(i: number, field: keyof SongVocabEntry, value: string) {
    setData(prev => {
      const vocab = [...prev.vocabulary];
      vocab[i] = { ...vocab[i], [field]: value };
      return { ...prev, vocabulary: vocab };
    });
  }

  function addVocab() {
    setData(prev => ({ ...prev, vocabulary: [...prev.vocabulary, { ...EMPTY_VOCAB }] }));
  }

  function removeVocab(i: number) {
    setData(prev => ({ ...prev, vocabulary: prev.vocabulary.filter((_, idx) => idx !== i) }));
  }

  function setMatch(i: number, field: keyof SongMatchingEntry, value: string) {
    setData(prev => {
      const matching = [...prev.matching];
      matching[i] = { ...matching[i], [field]: value };
      return { ...prev, matching };
    });
  }

  function addMatch() {
    setData(prev => ({ ...prev, matching: [...prev.matching, { ...EMPTY_MATCH }] }));
  }

  function removeMatch(i: number) {
    setData(prev => ({ ...prev, matching: prev.matching.filter((_, idx) => idx !== i) }));
  }

  function setQuestion(i: number, field: keyof SongQuestion, value: string) {
    setData(prev => {
      const questions = [...prev.questions];
      questions[i] = { ...questions[i], [field]: value } as SongQuestion;
      return { ...prev, questions };
    });
  }

  function addQuestion() {
    setData(prev => ({ ...prev, questions: [...prev.questions, { ...EMPTY_QUESTION }] }));
  }

  function removeQuestion(i: number) {
    setData(prev => ({ ...prev, questions: prev.questions.filter((_, idx) => idx !== i) }));
  }

  function setTalk(i: number, value: string) {
    setData(prev => {
      const tinyTalks = [...prev.tinyTalks];
      tinyTalks[i] = { prompt: value };
      return { ...prev, tinyTalks };
    });
  }

  function addTalk() {
    setData(prev => ({ ...prev, tinyTalks: [...prev.tinyTalks, { ...EMPTY_TALK }] }));
  }

  function removeTalk(i: number) {
    setData(prev => ({ ...prev, tinyTalks: prev.tinyTalks.filter((_, idx) => idx !== i) }));
  }

  function setSectionEmoji(i: number, value: string) {
    setData(prev => {
      const emojis = [...prev.sectionEmojis];
      emojis[i] = value;
      return { ...prev, sectionEmojis: emojis };
    });
  }

  function handleImport(json: Record<string, unknown>) {
    const populated: string[] = [];

    setData(prev => {
      const next = { ...prev };

      // Accept songTitle or title
      const titleVal = (json.songTitle ?? json.title) as string | undefined;
      if (typeof titleVal === 'string') { next.songTitle = titleVal; populated.push('Song title'); }
      if (typeof json.youtubeUrl === 'string') { next.youtubeUrl = json.youtubeUrl; populated.push('YouTube URL'); }
      if (typeof json.level === 'string') { next.level = json.level; populated.push('Level'); }
      if (typeof json.fullLyrics === 'string') { next.fullLyrics = json.fullLyrics; populated.push('Lyrics'); }

      if (Array.isArray(json.vocabulary) && json.vocabulary.length > 0) {
        next.vocabulary = json.vocabulary.map((v: any) => ({
          word: v.word ?? '',
          emoji: v.emoji ?? '',
          definition: v.definition ?? '',
        }));
        populated.push(`Vocabulary (${next.vocabulary.length} words)`);
      }

      if (Array.isArray(json.matching) && json.matching.length > 0) {
        next.matching = json.matching.map((m: any) => ({
          sentence: m.sentence ?? '',
          answerEmoji: m.answerEmoji ?? '',
          answerWord: m.answerWord ?? '',
        }));
        populated.push(`Matching (${next.matching.length})`);
      }

      if (Array.isArray(json.questions) && json.questions.length > 0) {
        next.questions = json.questions.map((q: any) => ({
          question: q.question ?? '',
          type: q.type ?? 'yes_no',
          answer: q.answer ?? '',
          ...(Array.isArray(q.options) ? { options: q.options } : {}),
        }));
        populated.push(`Questions (${next.questions.length})`);
      }

      if (Array.isArray(json.tinyTalks) && json.tinyTalks.length > 0) {
        next.tinyTalks = json.tinyTalks.map((t: any) => ({
          prompt: t.prompt ?? '',
        }));
        populated.push(`Tiny talks (${next.tinyTalks.length})`);
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
  const sectionLabels = ['Song', 'Lyrics', 'Vocabulary', 'Matching', 'Questions', 'Tiny Talks'];

  return (
    <div className="space-y-4">
      <JsonImportPanel onImport={handleImport} onClear={handleClearImport} />

      <div className="flex justify-end">
        <Button size="sm" variant="ghost" onClick={clearForm} className="text-muted-foreground">Clear Form</Button>
      </div>

      <Section title="Basics">
        <div className="space-y-2">
          <Label>Song Title</Label>
          <Input value={data.songTitle} onChange={e => set('songTitle', e.target.value)} placeholder="e.g. Old MacDonald Had a Farm" />
        </div>
        <div className="space-y-2">
          <Label>YouTube URL</Label>
          <Input value={data.youtubeUrl} onChange={e => set('youtubeUrl', e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
        </div>
        <div className="space-y-2">
          <Label>Level</Label>
          <Select value={data.level} onValueChange={v => set('level', v)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Section>

      <Section title="Lyrics">
        <div className="space-y-2">
          <Label>Full Song Lyrics</Label>
          <Textarea value={data.fullLyrics} onChange={e => set('fullLyrics', e.target.value)} placeholder="Paste the complete song text here..." rows={8} />
        </div>
      </Section>

      <Section title={`Vocabulary (${data.vocabulary.length})`}>
        <div className="space-y-3">
          {data.vocabulary.map((v, i) => (
            <div key={i} className="grid grid-cols-[auto_1fr_80px_1fr_32px] gap-2 items-center">
              <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}.</span>
              <Input value={v.word} onChange={e => setVocab(i, 'word', e.target.value)} placeholder="Word" />
              <Input value={v.emoji} onChange={e => setVocab(i, 'emoji', e.target.value)} placeholder="Emoji" className="text-center text-lg" />
              <Input value={v.definition} onChange={e => setVocab(i, 'definition', e.target.value)} placeholder="Definition" />
              <button onClick={() => removeVocab(i)} className="text-muted-foreground hover:text-destructive" aria-label="Remove">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={addVocab} className="mt-2">
          <Plus className="h-3 w-3 mr-1" /> Add Word
        </Button>
      </Section>

      <Section title={`Matching (${data.matching.length})`}>
        <div className="space-y-3">
          {data.matching.map((m, i) => (
            <div key={i} className="grid grid-cols-[auto_1fr_80px_160px_32px] gap-2 items-center">
              <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}.</span>
              <Input value={m.sentence} onChange={e => setMatch(i, 'sentence', e.target.value)} placeholder="Gap-fill sentence" />
              <Input value={m.answerEmoji} onChange={e => setMatch(i, 'answerEmoji', e.target.value)} placeholder="Emoji" className="text-center text-lg" />
              <Select value={m.answerWord} onValueChange={v => setMatch(i, 'answerWord', v)}>
                <SelectTrigger><SelectValue placeholder="Answer" /></SelectTrigger>
                <SelectContent>
                  {vocabWords.length === 0
                    ? <SelectItem value="__empty" disabled>Add vocab first</SelectItem>
                    : vocabWords.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)
                  }
                </SelectContent>
              </Select>
              <button onClick={() => removeMatch(i)} className="text-muted-foreground hover:text-destructive" aria-label="Remove">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={addMatch} className="mt-2">
          <Plus className="h-3 w-3 mr-1" /> Add Match
        </Button>
      </Section>

      <Section title={`Questions (${data.questions.length})`}>
        <div className="space-y-4">
          {data.questions.map((q, i) => (
            <div key={i} className="rounded-md border p-3 space-y-2 relative">
              <button onClick={() => removeQuestion(i)} className="absolute top-2 right-2 text-muted-foreground hover:text-destructive" aria-label="Remove">
                <Trash2 className="h-4 w-4" />
              </button>
              <div className="grid grid-cols-[1fr_160px] gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Question</Label>
                  <Input value={q.question} onChange={e => setQuestion(i, 'question', e.target.value)} placeholder="e.g. Does the farmer have a cow?" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Type</Label>
                  <Select value={q.type} onValueChange={v => setQuestion(i, 'type', v as QuestionType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes_no">Yes / No</SelectItem>
                      <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Answer</Label>
                <Input value={q.answer} onChange={e => setQuestion(i, 'answer', e.target.value)} placeholder="Correct answer" />
              </div>
              {q.type === 'multiple_choice' && (
                <div className="grid grid-cols-3 gap-2">
                  {[0, 1, 2].map(optIdx => (
                    <div key={optIdx} className="space-y-1">
                      <Label className="text-xs">Option {optIdx + 1}</Label>
                      <Input
                        value={q.options?.[optIdx] ?? ''}
                        onChange={e => {
                          setData(prev => {
                            const questions = [...prev.questions];
                            const newOpts = [...(questions[i].options ?? ['', '', ''])];
                            newOpts[optIdx] = e.target.value;
                            questions[i] = { ...questions[i], options: newOpts };
                            return { ...prev, questions };
                          });
                        }}
                        placeholder={`Option ${optIdx + 1}`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={addQuestion} className="mt-2">
          <Plus className="h-3 w-3 mr-1" /> Add Question
        </Button>
      </Section>

      <Section title={`Tiny Talks (${data.tinyTalks.length})`}>
        <div className="space-y-3">
          {data.tinyTalks.map((t, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="text-xs text-muted-foreground w-5 text-right pt-2">{i + 1}.</span>
              <Textarea value={t.prompt} onChange={e => setTalk(i, e.target.value)} placeholder="Speaking prompt..." rows={2} className="flex-1" />
              <button onClick={() => removeTalk(i)} className="text-muted-foreground hover:text-destructive pt-2" aria-label="Remove">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={addTalk} className="mt-2">
          <Plus className="h-3 w-3 mr-1" /> Add Talk
        </Button>
      </Section>

      <Section title="Theme & Style">
        <ThemePicker value={data.theme} onChange={v => set('theme', v)} />
        <div className="space-y-2 pt-2">
          <Label>Section Emojis</Label>
          <p className="text-xs text-muted-foreground">One per nav section: {sectionLabels.join(', ')}</p>
          <div className="grid grid-cols-6 gap-2">
            {sectionLabels.map((label, i) => (
              <div key={i} className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">{label}</Label>
                <Input
                  value={data.sectionEmojis[i] ?? ''}
                  onChange={e => setSectionEmoji(i, e.target.value)}
                  placeholder="🎵"
                  className="text-center text-lg px-1"
                />
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Animation">
        <AnimationPicker
          animationType={data.animationType}
          animationEmoji={data.animationEmoji}
          onTypeChange={v => set('animationType', v)}
          onEmojiChange={v => set('animationEmoji', v)}
        />
      </Section>
    </div>
  );
}
