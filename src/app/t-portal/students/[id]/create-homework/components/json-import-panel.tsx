'use client';
// Q46

import { useState } from 'react';
import { ClipboardPaste, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface JsonImportPanelProps {
  onImport: (json: Record<string, unknown>) => void;
  onClear: () => void;
}

export default function JsonImportPanel({ onImport, onClear }: JsonImportPanelProps) {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleImport() {
    setError(null);
    const trimmed = raw.trim();
    if (!trimmed) {
      setError('Paste a lessonData JSON object first.');
      return;
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        setError('Expected a JSON object (starts with {). Check the format.');
        return;
      }
      onImport(parsed as Record<string, unknown>);
      setOpen(false);
      setRaw('');
    } catch {
      setError('Invalid JSON — check for missing quotes or commas.');
    }
  }

  function handleClear() {
    setRaw('');
    setError(null);
    onClear();
  }

  return (
    <div className="rounded-lg border bg-card">
      <button
        type="button"
        className="flex items-center gap-2 w-full px-4 py-3 text-sm font-semibold text-left"
        onClick={() => setOpen(v => !v)}
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <ClipboardPaste className="h-4 w-4 text-muted-foreground" />
        Paste Unit Plan Data
        <span className="ml-auto text-xs font-normal text-muted-foreground">Import from lessonData JSON</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t pt-4">
          <p className="text-xs text-muted-foreground">
            Paste the <code className="bg-muted px-1 rounded">lessonData</code> JSON object from a unit plan.
            Fields that match will be populated automatically. Unrecognised keys are ignored.
          </p>
          <Textarea
            value={raw}
            onChange={e => { setRaw(e.target.value); setError(null); }}
            placeholder={'{\n  "title": "Farm Animals",\n  "flashcards": [...],\n  ...\n}'}
            rows={8}
            className="font-mono text-xs"
          />
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleImport}>
              <ClipboardPaste className="h-3 w-3 mr-1" />
              Import
            </Button>
            <Button size="sm" variant="outline" onClick={handleClear}>
              <X className="h-3 w-3 mr-1" />
              Clear Import
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
