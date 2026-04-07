'use client';
// Q46

import { useState } from 'react';
import { ChevronDown, ChevronRight, Info } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface KtftData {
  level?: string;
  dimensions?: Record<string, string>;
  lexicalBoundary?: string;
  linguisticEmergence?: string;
  gseRange?: string;
  [key: string]: unknown;
}

function parseKtft(json: string): KtftData | null {
  try {
    return JSON.parse(json) as KtftData;
  } catch {
    return null;
  }
}

export default function KtftPanel() {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState('');
  const [parsed, setParsed] = useState<KtftData | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleParse() {
    if (!raw.trim()) {
      setParsed(null);
      setError(null);
      return;
    }
    const result = parseKtft(raw.trim());
    if (!result) {
      setError('Invalid JSON — check the format and try again.');
      setParsed(null);
    } else {
      setParsed(result);
      setError(null);
    }
  }

  return (
    <div className="rounded-lg border bg-card">
      <button
        className="flex items-center gap-2 w-full px-4 py-3 text-sm font-medium text-left"
        onClick={() => setOpen(v => !v)}
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <Info className="h-4 w-4 text-muted-foreground" />
        KTFT Context (optional)
        <span className="ml-auto text-xs text-muted-foreground font-normal">Paste KTFT JSON for level guidance</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t pt-3">
          <Textarea
            placeholder='{"level": "A1", "dimensions": { ... }, ...}'
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={5}
            className="font-mono text-xs"
          />
          <Button size="sm" variant="outline" onClick={handleParse}>
            Parse
          </Button>

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          {parsed && (
            <div className="rounded-md bg-muted p-3 space-y-2 text-sm">
              {parsed.level && (
                <div><span className="font-medium">Level:</span> {parsed.level}</div>
              )}
              {parsed.gseRange && (
                <div><span className="font-medium">GSE Range:</span> {parsed.gseRange}</div>
              )}
              {parsed.lexicalBoundary && (
                <div><span className="font-medium">Lexical Boundary:</span> {parsed.lexicalBoundary}</div>
              )}
              {parsed.linguisticEmergence && (
                <div><span className="font-medium">Linguistic Emergence:</span> {parsed.linguisticEmergence}</div>
              )}
              {parsed.dimensions && typeof parsed.dimensions === 'object' && (
                <div>
                  <p className="font-medium">Robinson Dimensions:</p>
                  <ul className="ml-4 mt-1 space-y-1 text-xs text-muted-foreground">
                    {Object.entries(parsed.dimensions).map(([k, v]) => (
                      <li key={k}><strong>{k}:</strong> {String(v)}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
