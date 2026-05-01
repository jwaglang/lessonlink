'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface MarkdownViewProps {
  markdown: string;
  downloadFilename: string;
}

function downloadMarkdown(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/markdown; charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function MarkdownView({ markdown, downloadFilename }: MarkdownViewProps) {
  return (
    <div>
      <div className="flex justify-end mb-4 print:hidden">
        <Button variant="outline" size="sm" onClick={() => downloadMarkdown(markdown, downloadFilename)}>
          <Download className="mr-2 h-4 w-4" />
          Download .md
        </Button>
      </div>
      <div className="prose prose-slate max-w-none dark:prose-invert
        prose-h1:font-headline prose-h2:font-headline prose-h3:font-headline
        prose-h1:text-2xl prose-h2:text-xl prose-h2:border-b prose-h2:pb-1
        prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-muted/50
        prose-blockquote:px-4 prose-blockquote:py-1 prose-blockquote:rounded-r
        prose-table:text-sm
        prose-em:leading-relaxed
        print:prose-sm">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {markdown}
        </ReactMarkdown>
      </div>
    </div>
  );
}
