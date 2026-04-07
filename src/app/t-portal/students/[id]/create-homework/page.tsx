'use client';
// Q46

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import ContentTypeSelector, { type ContentType } from './components/content-type-selector';
import TemplateImporter from './components/template-importer';
import KtftPanel from './components/ktft-panel';
import WorkbookForm from './components/workbook-form';
import PhonicsWorkbookForm from './components/phonics-workbook-form';
import SongWorksheetForm from './components/song-worksheet-form';
import PreviewPanel from './components/preview-panel';
import {
  generateWorkbook,
  generatePhonicsWorkbook,
  generateSongWorksheet,
  downloadHtml,
  type WorkbookFormData,
  type PhonicsFormData,
  type SongWorksheetFormData,
} from './lib/generator';

export default function CreateHomeworkPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;
  const { toast } = useToast();

  const [contentType, setContentType] = useState<ContentType | null>(null);
  const [templateHtml, setTemplateHtml] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState<string | null>(null);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // Form data — typed loosely so we can hold any of the three forms
  const [workbookData, setWorkbookData] = useState<WorkbookFormData | null>(null);
  const [phonicsData, setPhonicsData] = useState<PhonicsFormData | null>(null);
  const [songData, setSongData] = useState<SongWorksheetFormData | null>(null);

  const handleWorkbookChange = useCallback((data: WorkbookFormData) => setWorkbookData(data), []);
  const handlePhonicsChange = useCallback((data: PhonicsFormData) => setPhonicsData(data), []);
  const handleSongChange = useCallback((data: SongWorksheetFormData) => setSongData(data), []);

  function handleImport(html: string, filename: string) {
    setTemplateHtml(html);
    setTemplateName(filename);
    setGeneratedHtml(null);
  }

  function handleClearTemplate() {
    setTemplateHtml(null);
    setTemplateName(null);
    setGeneratedHtml(null);
  }

  function handleContentTypeChange(type: ContentType) {
    setContentType(type);
    setGeneratedHtml(null);
    setTemplateHtml(null);
    setTemplateName(null);
  }

  function handleGenerate() {
    if (!templateHtml) {
      toast({ title: 'No Template', description: 'Import a template HTML file first.', variant: 'destructive' });
      return;
    }

    setGenerating(true);
    try {
      let html: string;

      if (contentType === 'workbook') {
        if (!workbookData) throw new Error('Fill in the form first.');
        html = generateWorkbook(templateHtml, workbookData);
      } else if (contentType === 'phonics_workbook') {
        if (!phonicsData) throw new Error('Fill in the form first.');
        html = generatePhonicsWorkbook(templateHtml, phonicsData);
      } else if (contentType === 'song_worksheet') {
        if (!songData) throw new Error('Fill in the form first.');
        html = generateSongWorksheet(templateHtml, songData);
      } else {
        throw new Error('Select a content type first.');
      }

      setGeneratedHtml(html);
      toast({ title: 'Generated', description: 'Scroll down to preview and download.' });
    } catch (err: any) {
      toast({ title: 'Generation Failed', description: err.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  }

  function handleDownload() {
    if (!generatedHtml) return;

    const baseName = (() => {
      if (contentType === 'workbook' && workbookData?.title) return workbookData.title;
      if (contentType === 'phonics_workbook' && phonicsData?.title) return phonicsData.title;
      if (contentType === 'song_worksheet' && songData?.songTitle) return songData.songTitle;
      return 'homework';
    })();

    const filename = `${baseName.replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '-').toLowerCase()}-teacher.html`;
    downloadHtml(generatedHtml, filename);
  }

  const canGenerate = !!contentType && !!templateHtml;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-5xl mx-auto">
      {/* Breadcrumb / back */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <button
          onClick={() => router.push(`/t-portal/students/${studentId}`)}
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Homework
        </button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Create Homework</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Import a Kiddoland template, fill in the content, and download the finished homework file.
        </p>
      </div>

      {/* KTFT Context */}
      <KtftPanel />

      {/* Step 1: Content Type */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">1. Content Type</h2>
        <ContentTypeSelector selected={contentType} onSelect={handleContentTypeChange} />
      </div>

      {/* Step 2: Import Template */}
      {contentType && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">2. Import Template</h2>
          <TemplateImporter
            templateName={templateName}
            onImport={handleImport}
            onClear={handleClearTemplate}
          />
        </div>
      )}

      {/* Step 3: Fill Form */}
      {contentType && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">3. Fill in Content</h2>
          {contentType === 'workbook' && <WorkbookForm onChange={handleWorkbookChange} />}
          {contentType === 'phonics_workbook' && <PhonicsWorkbookForm onChange={handlePhonicsChange} />}
          {contentType === 'song_worksheet' && <SongWorksheetForm onChange={handleSongChange} />}
        </div>
      )}

      {/* Generate button */}
      {contentType && (
        <div className="flex gap-3 items-center pt-2">
          <Button
            size="lg"
            onClick={handleGenerate}
            disabled={!canGenerate || generating}
            className="min-w-32"
          >
            {generating ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate'
            )}
          </Button>
          {!templateHtml && (
            <p className="text-xs text-muted-foreground">Import a template HTML file to enable generate.</p>
          )}
        </div>
      )}

      {/* Preview + Download */}
      {generatedHtml && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">4. Preview &amp; Download</h2>
            <Button onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>
          <PreviewPanel html={generatedHtml} />
          <div className="flex justify-end">
            <Button onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download Teacher File
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
