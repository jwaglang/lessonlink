'use client';
// Q46

import { useRef } from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PreviewPanelProps {
  html: string;
}

export default function PreviewPanel({ html }: PreviewPanelProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  function openInNewTab() {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    // Don't revoke immediately — let the tab load
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Preview</p>
        <Button size="sm" variant="outline" onClick={openInNewTab}>
          <ExternalLink className="h-3 w-3 mr-1" />
          Open in New Tab
        </Button>
      </div>
      <div className="rounded-lg border overflow-hidden" style={{ height: '500px' }}>
        <iframe
          ref={iframeRef}
          srcDoc={html}
          title="Homework Preview"
          className="w-full h-full"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>
  );
}
