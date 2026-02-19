'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import {
  getStudentById,
  getUnitById,
  getCourseById,
  createAssessmentReport,
  getAssessmentReportsByUnit,
  finalizeAssessmentReport,
} from '@/lib/firestore';
import type { Student, Unit, Course, AssessmentReport, OutputCitation } from '@/lib/types';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ArrowLeft,
  Save,
  CheckCircle,
  Plus,
  Trash2,
  Sparkles,
  FileText,
  Mic,
  ClipboardList,
  Info,
} from 'lucide-react';

// ========================================
// Rubric Descriptors (for tooltips)
// ========================================

const COMMUNICATIVE_DESCRIPTORS: Record<number, string> = {
  1: 'Unable to convey intended meaning',
  2: 'Meaning frequently unclear; significant breakdowns',
  3: 'Meaning partially conveyed; some breakdowns requiring repair',
  4: 'Meaning mostly clear; minor breakdowns that didn\'t impede understanding',
  5: 'Meaning clearly conveyed; no communication breakdowns',
};

const EMERGENT_LANGUAGE_DESCRIPTORS: Record<number, string> = {
  1: 'No productive language output',
  2: 'Minimal vocabulary; single words and isolated phrases only',
  3: 'Limited range; mostly relying on known formulaic chunks',
  4: 'Adequate range; some new forms appearing alongside formulaic chunks',
  5: 'Varied vocabulary and structures; evidence of new/complex forms emerging',
};

const FLUENCY_DESCRIPTORS: Record<number, string> = {
  1: 'Unable to sustain output beyond isolated words',
  2: 'Frequent long pauses; fragmented output',
  3: 'Noticeable pauses and hesitation; some self-correction',
  4: 'Generally fluent with occasional hesitation',
  5: 'Smooth, sustained output with natural pacing',
};

const DIMENSION_OPTIONS: { value: OutputCitation['dimension']; label: string }[] = [
  { value: 'task_completion', label: 'Task Completion' },
  { value: 'communicative_effectiveness', label: 'Communicative Effectiveness' },
  { value: 'emergent_language', label: 'Emergent Language' },
  { value: 'fluency', label: 'Fluency' },
];

// ========================================
// Citation Row Component
// ========================================

function CitationRow({
  citation,
  index,
  onChange,
  onRemove,
}: {
  citation: OutputCitation;
  index: number;
  onChange: (index: number, updated: OutputCitation) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Citation {index + 1}</span>
        <Button size="sm" variant="ghost" onClick={() => onRemove(index)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Dimension</Label>
        <select
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={citation.dimension}
          onChange={(e) =>
            onChange(index, { ...citation, dimension: e.target.value as OutputCitation['dimension'] })
          }
        >
          {DIMENSION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Learner Output (exact quote)</Label>
        <Input
          placeholder='e.g. "The cat is go to the house"'
          value={citation.quote}
          onChange={(e) => onChange(index, { ...citation, quote: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Context (optional)</Label>
        <Input
          placeholder="e.g. When describing the picture story"
          value={citation.context ?? ''}
          onChange={(e) => onChange(index, { ...citation, context: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Timestamp in recording (optional)</Label>
        <Input
          placeholder="e.g. 2:35"
          value={citation.timestamp ?? ''}
          onChange={(e) => onChange(index, { ...citation, timestamp: e.target.value })}
        />
      </div>
    </div>
  );
}

// ========================================
// Slider with Descriptor Component
// ========================================

function ScoringSlider({
  label,
  value,
  onChange,
  descriptors,
}: {
  label: string;
  value: number;
  onChange: (val: number) => void;
  descriptors: Record<number, string>;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Label className="text-sm font-medium">{label}</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <div className="space-y-1 text-xs">
                  {Object.entries(descriptors).map(([score, desc]) => (
                    <p key={score}>
                      <strong>{score}:</strong> {desc}
                    </p>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Badge variant="secondary" className="text-sm font-bold">
          {value}
        </Badge>
      </div>
      <Slider
        min={1}
        max={5}
        step={1}
        value={[value]}
        onValueChange={(vals) => onChange(vals[0])}
        className="w-full"
      />
      <p className="text-xs text-muted-foreground italic">{descriptors[value]}</p>
    </div>
  );
}

// ========================================
// Main Page Component
// ========================================

export default function NewAssessmentPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const studentId = params.id as string;
  const unitId = searchParams.get('unitId') ?? '';
  const courseId = searchParams.get('courseId') ?? '';
  const assessmentType = (searchParams.get('type') ?? 'initial') as 'initial' | 'final';

  // Data loading
  const [student, setStudent] = useState<Student | null>(null);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [existingReports, setExistingReports] = useState<AssessmentReport[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [recordingUrl, setRecordingUrl] = useState('');
  const [transcript, setTranscript] = useState('');
  const [teacherNotes, setTeacherNotes] = useState('');

  // Scoring
  const [taskCompletion, setTaskCompletion] = useState<'achieved' | 'partial' | 'not_achieved'>('partial');
  const [communicativeEffectiveness, setCommunicativeEffectiveness] = useState(3);
  const [emergentLanguageComplexity, setEmergentLanguageComplexity] = useState(3);
  const [fluency, setFluency] = useState(3);

  // Citations
  const [citations, setCitations] = useState<OutputCitation[]>([]);

  // Save state
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // AI state
  const [runningAi, setRunningAi] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [aiProvider, setAiProvider] = useState('');
  const [aiModel, setAiModel] = useState('');

  // Finalize state
  const [savedReportId, setSavedReportId] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [finalized, setFinalized] = useState(false);

  // Load student, unit, course, existing reports
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [studentData, unitData, courseData, reports] = await Promise.all([
          getStudentById(studentId),
          unitId ? getUnitById(unitId) : null,
          courseId ? getCourseById(courseId) : null,
          unitId ? getAssessmentReportsByUnit(studentId, unitId) : [],
        ]);
        setStudent(studentData);
        setUnit(unitData);
        setCourse(courseData);
        setExistingReports(reports);
      } catch (err) {
        console.error('Error loading assessment data:', err);
        setError('Failed to load data. Please go back and try again.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [studentId, unitId, courseId]);

  // Check if this type already exists
  const existingOfType = existingReports.find((r) => r.type === assessmentType);

  // Citation management
  function addCitation() {
    setCitations((prev) => [
      ...prev,
      {
        id: `cit-${Date.now()}`,
        dimension: 'task_completion',
        quote: '',
      },
    ]);
  }

  function updateCitation(index: number, updated: OutputCitation) {
    setCitations((prev) => prev.map((c, i) => (i === index ? updated : c)));
  }

  function removeCitation(index: number) {
    setCitations((prev) => prev.filter((_, i) => i !== index));
  }

  // Save draft
  async function handleSaveDraft() {
    if (!user?.uid || !unitId || !courseId) return;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const savedReport = await createAssessmentReport({
        studentId,
        courseId,
        unitId,
        teacherId: user.uid,
        type: assessmentType,
        recordingUrl: recordingUrl || null,
        teacherNotes,
        transcript: transcript || null,
        taskCompletion,
        communicativeEffectiveness,
        emergentLanguageComplexity,
        fluency,
        outputCitations: citations.filter((c) => c.quote.trim() !== ''),
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setSavedReportId(savedReport.id);
      setSaved(true);
    } catch (err: any) {
      console.error('Error saving assessment:', err);
      setError(err.message || 'Failed to save assessment.');
    } finally {
      setSaving(false);
    }
  }

  // Finalize handler
  async function handleFinalize() {
    if (!savedReportId) return;
    const confirmed = window.confirm(
      "Finalize this assessment? This will lock the report and update the learner's progress record. This cannot be undone."
    );
    if (!confirmed) return;
    setFinalizing(true);
    setError('');
    try {
      await finalizeAssessmentReport(savedReportId);
      setFinalized(true);
    } catch (err: any) {
      console.error('Finalize error:', err);
      setError(err.message || 'Failed to finalize assessment.');
    } finally {
      setFinalizing(false);
    }
  }

  // Validation
  const canSave = teacherNotes.trim().length > 0 && citations.some((c) => c.quote.trim() !== '');
  const canRunAi = teacherNotes.trim().length > 0 && citations.some((c) => c.quote.trim() !== '');

  // AI Analysis handler
  async function handleRunAiAnalysis() {
    if (!canRunAi) return;
    setRunningAi(true);
    setError('');
    try {
      const reportData = {
        studentId,
        courseId,
        unitId,
        teacherId: user?.uid ?? '',
        type: assessmentType,
        recordingUrl: recordingUrl || null,
        teacherNotes,
        transcript: transcript || null,
        taskCompletion,
        communicativeEffectiveness,
        emergentLanguageComplexity,
        fluency,
        outputCitations: citations.filter((c) => c.quote.trim() !== ''),
        status: 'draft' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // If final assessment, find the initial to send for comparison
      const initialReport = assessmentType === 'final'
        ? existingReports.find((r) => r.type === 'initial' && r.status === 'finalized')
        : null;

      const response = await fetch('/api/ai/analyze-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report: reportData, initialReport }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'AI analysis failed');
      }

      setAiAnalysis(data.analysis);
      setAiProvider(data.provider ?? '');
      setAiModel(data.model ?? '');
    } catch (err: any) {
      console.error('AI analysis error:', err);
      setError(err.message || 'AI analysis failed. Please try again.');
    } finally {
      setRunningAi(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error && !student) {
    return (
      <div className="p-6">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">
            New {assessmentType === 'initial' ? 'Initial' : 'Final'} Assessment
          </h1>
          <p className="text-sm text-muted-foreground">
            {student?.name ?? 'Unknown'} · {course?.title ?? ''} · {unit?.title ?? ''}
          </p>
        </div>
        <Badge variant={assessmentType === 'initial' ? 'secondary' : 'default'} className="ml-auto">
          {assessmentType === 'initial' ? 'Tiny Talk' : 'Evaluation Monologue'}
        </Badge>
      </div>

      {/* Warning if already exists */}
      {existingOfType && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            ⚠️ A {assessmentType} assessment already exists for this unit (status: {existingOfType.status}).
            Saving will create a new one — consider editing the existing report instead.
          </p>
        </div>
      )}

      {/* Recording Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mic className="h-5 w-5" />
            Recording
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Recording URL (paste link to video/audio)</Label>
            <Input
              placeholder="https://drive.google.com/... or https://youtu.be/..."
              value={recordingUrl}
              onChange={(e) => setRecordingUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Upload to Google Drive, YouTube, or any file host and paste the link here.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Transcript Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5" />
            Learner Transcript
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Paste the learner's speech below</Label>
            <Textarea
              placeholder="Type or paste the learner's spoken output during the assessment task..."
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="min-h-[120px]"
            />
            <p className="text-xs text-muted-foreground">
              This will be analyzed by AI in the future. For now, paste what the learner said as accurately as possible.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Teacher Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-5 w-5" />
            Teacher Observations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Your notes on the learner's performance</Label>
            <Textarea
              placeholder="What did you observe? How did the learner engage with the task? What language emerged?"
              value={teacherNotes}
              onChange={(e) => setTeacherNotes(e.target.value)}
              className="min-h-[120px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Scoring Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle className="h-5 w-5" />
            TBLT Scoring
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Dimension 1: Task Completion */}
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label className="text-sm font-medium">Task Completion</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <p className="text-xs">Did the learner complete the communicative task? This is the primary TBLT measure.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <RadioGroup
              value={taskCompletion}
              onValueChange={(val) => setTaskCompletion(val as typeof taskCompletion)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="achieved" id="tc-achieved" />
                <Label htmlFor="tc-achieved" className="text-sm cursor-pointer">✅ Achieved</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="partial" id="tc-partial" />
                <Label htmlFor="tc-partial" className="text-sm cursor-pointer">⚠️ Partial</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="not_achieved" id="tc-not" />
                <Label htmlFor="tc-not" className="text-sm cursor-pointer">❌ Not Achieved</Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Dimension 2: Communicative Effectiveness */}
          <ScoringSlider
            label="Communicative Effectiveness"
            value={communicativeEffectiveness}
            onChange={setCommunicativeEffectiveness}
            descriptors={COMMUNICATIVE_DESCRIPTORS}
          />

          <Separator />

          {/* Dimension 3: Emergent Language Complexity */}
          <ScoringSlider
            label="Emergent Language Complexity"
            value={emergentLanguageComplexity}
            onChange={setEmergentLanguageComplexity}
            descriptors={EMERGENT_LANGUAGE_DESCRIPTORS}
          />

          <Separator />

          {/* Dimension 4: Fluency */}
          <ScoringSlider
            label="Fluency"
            value={fluency}
            onChange={setFluency}
            descriptors={FLUENCY_DESCRIPTORS}
          />
        </CardContent>
      </Card>

      {/* Output Citations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5" />
            Learner Output Citations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Add specific examples of the learner's actual output. These are the core evidence for assessment and before/after comparison.
          </p>

          {citations.map((citation, index) => (
            <CitationRow
              key={citation.id}
              citation={citation}
              index={index}
              onChange={updateCitation}
              onRemove={removeCitation}
            />
          ))}

          <Button variant="outline" size="sm" onClick={addCitation}>
            <Plus className="mr-1 h-4 w-4" />
            Add Citation
          </Button>
        </CardContent>
      </Card>

      {/* AI Analysis */}
      <Card className={aiAnalysis ? 'border-primary/30' : 'border-dashed'}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className={`h-5 w-5 ${aiAnalysis ? 'text-primary' : 'text-muted-foreground'}`} />
            AI Analysis
            {aiProvider && (
              <Badge variant="outline" className="ml-2 text-xs font-normal">
                {aiProvider} · {aiModel}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!aiAnalysis ? (
            <>
              <p className="text-sm text-muted-foreground">
                AI will review the transcript, teacher notes, scores, and citations to generate insights, GSE band suggestions, and recommended actions.
              </p>
              <Button
                variant="outline"
                onClick={handleRunAiAnalysis}
                disabled={!canRunAi || runningAi}
              >
                <Sparkles className="mr-1 h-4 w-4" />
                {runningAi ? 'Analyzing...' : 'Run AI Analysis'}
              </Button>
              {!canRunAi && !runningAi && (
                <p className="text-xs text-muted-foreground">
                  Enter teacher notes and at least one citation to enable AI analysis.
                </p>
              )}
            </>
          ) : (
            <>
              {/* Summary */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Summary</p>
                <p className="text-sm">{aiAnalysis.summary}</p>
              </div>

              {/* Emergent Language */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Emergent Language Observations</p>
                <p className="text-sm">{aiAnalysis.emergentLanguageObservations}</p>
              </div>

              {/* GSE Band */}
              {aiAnalysis.suggestedGseBand && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Suggested GSE Band</p>
                  <p className="text-sm font-semibold">
                    GSE {aiAnalysis.suggestedGseBand.min}-{aiAnalysis.suggestedGseBand.max}
                    {' '}(≈ CEFR {aiAnalysis.suggestedGseBand.cefr} · Cambridge {aiAnalysis.suggestedGseBand.cambridge})
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{aiAnalysis.suggestedGseBand.reasoning}</p>
                </div>
              )}

              {/* Suggested Actions */}
              {aiAnalysis.suggestedActions && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">For Teacher</p>
                    <ul className="text-sm space-y-1">
                      {aiAnalysis.suggestedActions.forTeacher?.map((action: string, i: number) => (
                        <li key={i} className="flex gap-2"><span className="text-primary">•</span>{action}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">For Learner</p>
                    <ul className="text-sm space-y-1">
                      {aiAnalysis.suggestedActions.forLearner?.map((action: string, i: number) => (
                        <li key={i} className="flex gap-2"><span className="text-primary">•</span>{action}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Growth Summary (final only) */}
              {aiAnalysis.growthSummary && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Growth Summary</p>
                  <p className="text-sm">{aiAnalysis.growthSummary}</p>
                </div>
              )}

              {/* Re-run */}
              <Button variant="outline" size="sm" onClick={handleRunAiAnalysis} disabled={runningAi}>
                <Sparkles className="mr-1 h-4 w-4" />
                {runningAi ? 'Re-analyzing...' : 'Re-run Analysis'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Error message */}
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/30 p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Save Actions */}
      <div className="flex items-center justify-between border-t pt-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Cancel
        </Button>
        <div className="flex items-center gap-3">
          {saved && !finalized && (
            <span className="text-sm text-primary">✓ Draft saved!</span>
          )}
          {finalized && (
            <span className="text-sm text-green-600 font-medium">✓ Finalized!</span>
          )}

          {/* Save Draft — hidden once finalized */}
          {!finalized && (
            <Button onClick={handleSaveDraft} disabled={!canSave || saving || finalizing}>
              <Save className="mr-1 h-4 w-4" />
              {saving ? 'Saving...' : 'Save Draft'}
            </Button>
          )}

          {/* Finalize — appears after draft is saved, hidden once finalized */}
          {saved && !finalized && (
            <Button
              variant="default"
              onClick={handleFinalize}
              disabled={finalizing}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="mr-1 h-4 w-4" />
              {finalizing ? 'Finalizing...' : 'Finalize'}
            </Button>
          )}

          {/* Generate Parent Report — appears after finalized */}
          {finalized && (
            <Button variant="outline" onClick={handleGenerateParentReport} disabled={generatingParentReport}>
              <Sparkles className="mr-1 h-4 w-4" />
              Generate Parent Report
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
