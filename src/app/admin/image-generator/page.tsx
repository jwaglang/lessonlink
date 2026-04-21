'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Copy, Check, ImageIcon, RotateCcw, Save, Trash2 } from 'lucide-react';
import PageHeader from '@/components/page-header';
import { collection, addDoc, getDocs, deleteDoc, doc, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ── Built-in prompts (real LL prompts) ──────────────────────────────────────
// Use {{subject}} as the placeholder in templates.

const BUILT_IN_STYLES: { value: string; label: string; hint: string; template: string }[] = [
  {
    value: 'ghibli-scene',
    label: 'Ghibli — Scene / Character',
    hint: 'General Ghibli style. Best for characters, scenes, backgrounds.',
    template:
      'Studio Ghibli-style hand-drawn animation. {{subject}}. ' +
      'Warm, enchanting colours, soft natural lighting, detailed and whimsical design. ' +
      'Centered composition on a soft neutral background. No text, no words, no letters. ' +
      'Suitable for a children\'s game. Clean lines.',
  },
  {
    value: 'pet-accessory',
    label: 'Ghibli — Pet Accessory / Item',
    hint: 'Ghibli-style single item on white. Used in Pet Shop.',
    template:
      'Studio Ghibli-style hand-drawn animation. A whimsical pet accessory or magical item. ' +
      'Every detail below must be clearly visible and accurate: {{subject}}. ' +
      'The color, texture, and any objects or materials mentioned must be prominently featured exactly as described. ' +
      'Detailed and enchanting design. Large accessory filling most of the frame, centered composition on plain white or light neutral background. ' +
      'Absolutely no text, letters, numbers, or words anywhere. No scenery or landscape. Suitable for a children\'s game. Soft natural colors, clean lines.',
  },
  {
    value: 'pet-character',
    label: 'Ghibli — Pet / Monster Character',
    hint: 'Adorable Ghibli monster. Used in Petland pet generation.',
    template:
      'Studio Ghibli-style hand-drawn animation. A single adorable monster. ' +
      'Every detail below must be clearly visible and accurate: {{subject}}. ' +
      'The color, texture, and any objects or actions mentioned must be prominently featured exactly as described. ' +
      'Clean anatomically correct design with the proper number of limbs. ' +
      'Centered composition, friendly expression, suitable for a children\'s game. Soft natural colors, clean lines.',
  },
  {
    value: 'kiddoland-vocab',
    label: 'Kiddoland — Vocab Icon',
    hint: 'Colorful flashcard icon. Used in vocabulary activities.',
    template:
      'A playful, colorful flashcard icon representing the concept of "{{subject}}". ' +
      'Interpret the meaning and context provided. Kiddoland style: rounded soft shapes, warm color palette (reds, yellows, blues, greens), witty and expressive. ' +
      'Solid filled colors with subtle soft shading. White or light background. Centered single subject. ' +
      'Stylized and abstract with personality, not minimalist. Visually interesting for young learners. ' +
      'This is for a vocabulary flashcard icon — the word goes on the card elsewhere, so this image must be completely text-free. ' +
      'Do not include any letters, numbers, or written symbols.',
  },
  {
    value: 'phonics-flashcard',
    label: 'Kiddoland — Phonics Flashcard',
    hint: 'Simple flashcard illustration. Used in phonics activities.',
    template:
      'A simple, instantly recognisable flashcard illustration for the word "{{subject}}". ' +
      'Show the single most common, concrete, physical meaning that a child aged 5–10 would immediately recognise. ' +
      'Single subject centred on a white background. No text, letters, or numbers anywhere. ' +
      'Kiddoland style: bold outlines, bright flat colours, friendly and simple. Suitable for a children\'s flashcard.',
  },
  {
    value: 'custom',
    label: 'Custom — write your own',
    hint: 'No template applied. Write the full prompt from scratch.',
    template: '',
  },
];

const AI_OPTIONS = [
  {
    value: 'imagen',
    label: 'Imagen 4 Ultra',
    description: 'Best quality. Photorealistic or painterly results. Slower — use for final assets.',
  },
  {
    value: 'gemini-flash',
    label: 'Gemini Flash',
    description: 'Faster, good for drafts and iteration. Use when testing ideas quickly.',
  },
];

interface SavedPrompt {
  id: string;
  name: string;
  template: string;
  createdAt: number;
}

function buildPrompt(template: string, subject: string): string {
  if (!template) return subject;
  return template.replace(/\{\{subject\}\}/g, subject);
}

export default function ImageGeneratorPage() {
  const [subject, setSubject] = useState('');
  const [styleValue, setStyleValue] = useState('ghibli-scene');
  const [editedPrompt, setEditedPrompt] = useState('');
  const [promptDirty, setPromptDirty] = useState(false);
  const [ai, setAi] = useState<'imagen' | 'gemini-flash'>('imagen');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Saved prompts
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSavedPrompts();
  }, []);

  async function loadSavedPrompts() {
    try {
      const snap = await getDocs(query(collection(db, 'adminImagePrompts'), orderBy('createdAt', 'desc')));
      setSavedPrompts(snap.docs.map(d => ({ id: d.id, ...d.data() } as SavedPrompt)));
    } catch {
      // silently ignore — collection may not exist yet
    }
  }

  // All styles: built-ins + saved
  const allStyles = [
    ...BUILT_IN_STYLES,
    ...savedPrompts.map(p => ({
      value: `saved:${p.id}`,
      label: `★ ${p.name}`,
      hint: 'Your saved prompt.',
      template: p.template,
    })),
  ];

  const selectedStyle = allStyles.find(s => s.value === styleValue) ?? BUILT_IN_STYLES[0];
  const selectedAi = AI_OPTIONS.find(o => o.value === ai);
  const isCustom = styleValue === 'custom';

  // Rebuild prompt when subject or style changes (unless user manually edited)
  useEffect(() => {
    if (!promptDirty) {
      setEditedPrompt(buildPrompt(selectedStyle.template, subject));
    }
  }, [subject, styleValue, promptDirty]);

  function handleStyleChange(val: string) {
    setStyleValue(val);
    setPromptDirty(false);
  }

  function handlePromptEdit(val: string) {
    setEditedPrompt(val);
    setPromptDirty(true);
  }

  function handleReset() {
    setEditedPrompt(buildPrompt(selectedStyle.template, subject));
    setPromptDirty(false);
  }

  async function handleGenerate() {
    const prompt = editedPrompt.trim();
    if (!prompt) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/admin/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: prompt, promptStyle: 'custom', ai }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Unknown error');
      setResult({ url: data.url });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSavePrompt() {
    if (!saveName.trim() || !editedPrompt.trim()) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'adminImagePrompts'), {
        name: saveName.trim(),
        template: editedPrompt.trim(),
        createdAt: Date.now(),
      });
      setSaveDialogOpen(false);
      setSaveName('');
      await loadSavedPrompts();
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSaved(id: string) {
    await deleteDoc(doc(db, 'adminImagePrompts', id));
    await loadSavedPrompts();
    if (styleValue === `saved:${id}`) setStyleValue('ghibli-scene');
  }

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(result.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-3xl">
      <PageHeader
        title="Image Generator"
        description="Generate images using AI. Built-in prompts are the real LL prompts. Save your own for reuse."
      />

      <Card>
        <CardHeader>
          <CardTitle>Generate Image</CardTitle>
          <CardDescription>
            Pick a prompt template as a starting point, then edit the prompt freely before generating.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Style + Subject */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prompt Template</Label>
              <Select value={styleValue} onValueChange={handleStyleChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <p className="px-2 pt-1 pb-0.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Built-in</p>
                  {BUILT_IN_STYLES.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                  {savedPrompts.length > 0 && (
                    <>
                      <p className="px-2 pt-2 pb-0.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Saved</p>
                      {savedPrompts.map(p => (
                        <SelectItem key={`saved:${p.id}`} value={`saved:${p.id}`}>★ {p.name}</SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
              {selectedStyle && (
                <p className="text-xs text-muted-foreground">{selectedStyle.hint}</p>
              )}
            </div>

            {!isCustom && (
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="e.g. a friendly green dragon"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Replaces {`{{subject}}`} in the template.</p>
              </div>
            )}
          </div>

          {/* Editable prompt */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="prompt">
                Prompt
                {promptDirty && <span className="ml-2 text-xs text-amber-500">(edited)</span>}
              </Label>
              <div className="flex gap-2">
                {promptDirty && !isCustom && (
                  <Button variant="ghost" size="sm" onClick={handleReset} className="h-6 px-2 text-xs">
                    <RotateCcw className="mr-1 h-3 w-3" /> Reset
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSaveDialogOpen(true)}
                  className="h-6 px-2 text-xs"
                  disabled={!editedPrompt.trim()}
                >
                  <Save className="mr-1 h-3 w-3" /> Save prompt
                </Button>
              </div>
            </div>
            <Textarea
              id="prompt"
              rows={6}
              value={editedPrompt}
              onChange={e => handlePromptEdit(e.target.value)}
              placeholder={isCustom ? 'Write your full prompt here...' : 'Prompt will appear here — edit freely.'}
              className="font-mono text-xs"
            />
          </div>

          {/* Saved prompts management */}
          {savedPrompts.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Saved Prompts</Label>
              <div className="space-y-1">
                {savedPrompts.map(p => (
                  <div key={p.id} className="flex items-center justify-between rounded-md border px-3 py-1.5">
                    <span className="text-sm">{p.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteSaved(p.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI model */}
          <div className="space-y-2">
            <Label>AI Model</Label>
            <div className="grid grid-cols-2 gap-3">
              {AI_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAi(opt.value as 'imagen' | 'gemini-flash')}
                  className={`text-left p-3 rounded-lg border-2 transition-colors ${
                    ai === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  <p className="font-medium text-sm">{opt.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{opt.description}</p>
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleGenerate} disabled={loading || !editedPrompt.trim()} className="w-full">
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating with {selectedAi?.label}...</>
            ) : (
              <><ImageIcon className="mr-2 h-4 w-4" />Generate Image</>
            )}
          </Button>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md p-3">{error}</p>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader><CardTitle>Result</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <img src={result.url} alt="Generated image" className="w-full rounded-lg border object-contain max-h-[500px]" />
            <div className="flex items-center gap-2">
              <Input value={result.url} readOnly className="text-xs font-mono" />
              <Button variant="outline" size="icon" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save prompt dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Save Prompt</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="save-name">Name</Label>
              <Input
                id="save-name"
                placeholder="e.g. Ghibli egg on moss"
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSavePrompt()}
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Prompt to save</Label>
              <p className="text-xs font-mono bg-muted rounded p-2 line-clamp-4">{editedPrompt}</p>
            </div>
            <Button onClick={handleSavePrompt} disabled={saving || !saveName.trim()} className="w-full">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
