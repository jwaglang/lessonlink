'use client';
// Q46

import { useRef } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TemplateImporterProps {
  templateName: string | null;
  onImport: (html: string, filename: string) => void;
  onClear: () => void;
}

export default function TemplateImporter({ templateName, onImport, onClear }: TemplateImporterProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const html = await file.text();
    onImport(html, file.name);
    // Reset input so the same file can be re-selected if needed
    e.target.value = '';
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".html"
        className="hidden"
        onChange={handleFile}
      />
      {templateName ? (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-3">
          <FileText className="h-5 w-5 text-primary flex-shrink-0" />
          <span className="text-sm font-medium flex-1 min-w-0 truncate">{templateName}</span>
          <button
            onClick={onClear}
            className="text-muted-foreground hover:text-destructive transition-colors"
            aria-label="Remove template"
          >
            <X className="h-4 w-4" />
          </button>
          <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
            Replace
          </Button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border py-8 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <Upload className="h-8 w-8" />
          <span className="text-sm font-medium">Click to import template HTML</span>
          <span className="text-xs">Accepts .html files</span>
        </button>
      )}
    </div>
  );
}
