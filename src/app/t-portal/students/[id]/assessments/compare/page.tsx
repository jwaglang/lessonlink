'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import {
  getStudentById,
  getUnitById,
  getCourseById,
  getAssessmentReportsByUnit,
} from '@/lib/firestore';
import type { Student, Unit, Course, AssessmentReport } from '@/lib/types';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  FileText,
  CheckCircle,
  MessageSquare,
  Brain,
  Zap,
} from 'lucide-react';

// ========================================
// Score Bar Component
// ========================================

function ScoreBar({
  label,
  initialScore,
  finalScore,
  max,
}: {
  label: string;
  initialScore: number;
  finalScore: number;
  max: number;
}) {
  const initialPercent = (initialScore / max) * 100;
  const finalPercent = (finalScore / max) * 100;
  const delta = finalScore - initialScore;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{initialScore}</span>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm font-semibold">{finalScore}</span>
          {delta !== 0 && (
            <Badge variant={delta > 0 ? 'default' : 'destructive'} className="text-xs">
              {delta > 0 ? '+' : ''}{delta}
            </Badge>
          )}
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-12">Initial</span>
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-muted-foreground/40 rounded-full" style={{ width: `${initialPercent}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-12">Final</span>
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${finalPercent}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ========================================
// Task Completion Comparison
// ========================================

function TaskCompletionComparison({
  initial,
  final,
}: {
  initial: AssessmentReport['taskCompletion'];
  final: AssessmentReport['taskCompletion'];
}) {
  const labels: Record<string, string> = {
    achieved: '✅ Achieved',
    partial: '⚠️ Partial',
    not_achieved: '❌ Not Achieved',
  };
  const rank: Record<string, number> = { not_achieved: 0, partial: 1, achieved: 2 };
  const delta = rank[final] - rank[initial];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Task Completion</span>
        {delta !== 0 && (
          <Badge variant={delta > 0 ? 'default' : 'destructive'} className="text-xs">
            {delta > 0 ? 'Improved' : 'Declined'}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="text-xs">{labels[initial]}</Badge>
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <Badge variant="secondary" className="text-xs font-semibold">{labels[final]}</Badge>
      </div>
    </div>
  );
}

// ========================================
// Citation Comparison
// ========================================

function CitationComparison({
  initialCitations,
  finalCitations,
}: {
  initialCitations: AssessmentReport['outputCitations'];
  finalCitations: AssessmentReport['outputCitations'];
}) {
  const dimensions = ['task_completion', 'communicative_effectiveness', 'emergent_language', 'fluency'] as const;
  const dimensionLabels: Record<string, string> = {
    task_completion: 'Task Completion',
    communicative_effectiveness: 'Communicative Effectiveness',
    emergent_language: 'Emergent Language',
    fluency: 'Fluency',
  };

  const hasCitations = (dim: string, list: AssessmentReport['outputCitations']) =>
    list.filter((c) => c.dimension === dim);

  return (
    <div className="space-y-4">
      {dimensions.map((dim) => {
        const initialForDim = hasCitations(dim, initialCitations);
        const finalForDim = hasCitations(dim, finalCitations);
        if (initialForDim.length === 0 && finalForDim.length === 0) return null;

        return (
          <div key={dim} className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {dimensionLabels[dim]}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Initial</p>
                {initialForDim.length === 0 ? (
                  <p className="text-xs italic text-muted-foreground">No citations</p>
                ) : (
                  initialForDim.map((c) => (
                    <p key={c.id} className="text-sm italic mb-1">&ldquo;{c.quote}&rdquo;</p>
                  ))
                )}
              </div>
              <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
                <p className="text-xs text-muted-foreground mb-1">Final</p>
                {finalForDim.length === 0 ? (
                  <p className="text-xs italic text-muted-foreground">No citations</p>
                ) : (
                  finalForDim.map((c) => (
                    <p key={c.id} className="text-sm italic mb-1">&ldquo;{c.quote}&rdquo;</p>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ========================================
// Main Page Component
// ========================================

export default function AssessmentComparisonPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const studentId = params.id as string;
  const unitId = searchParams.get('unitId') ?? '';

  const [student, setStudent] = useState<Student | null>(null);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [reports, setReports] = useState<AssessmentReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [studentData, unitData, reportData] = await Promise.all([
          getStudentById(studentId),
          unitId ? getUnitById(unitId) : null,
          unitId ? getAssessmentReportsByUnit(studentId, unitId) : [],
        ]);
        setStudent(studentData);
        setUnit(unitData);
        setReports(reportData);

        if (unitData?.courseId) {
          const courseData = await getCourseById(unitData.courseId);
          setCourse(courseData);
        }
      } catch (err) {
        console.error('Error loading comparison data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [studentId, unitId]);

  const initialReport = reports.find((r) => r.type === 'initial');
  const finalReport = reports.find((r) => r.type === 'final');

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-sm text-muted-foreground">Loading comparison...</p>
      </div>
    );
  }

  if (!initialReport || !finalReport) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Both an initial and final assessment are required to view the comparison.
              {!initialReport && ' Missing: Initial assessment.'}
              {!finalReport && ' Missing: Final assessment.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate overall score averages
  const initialAvg = (
    (initialReport.communicativeEffectiveness +
      initialReport.emergentLanguageComplexity +
      initialReport.fluency) / 3
  ).toFixed(1);

  const finalAvg = (
    (finalReport.communicativeEffectiveness +
      finalReport.emergentLanguageComplexity +
      finalReport.fluency) / 3
  ).toFixed(1);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Before / After Comparison
          </h1>
          <p className="text-sm text-muted-foreground">
            {student?.name ?? 'Unknown'} · {course?.title ?? ''} · {unit?.title ?? ''}
          </p>
        </div>
      </div>

      {/* Score Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle className="h-5 w-5" />
            Score Comparison
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overall average */}
          <div className="flex items-center justify-center gap-6 py-4 bg-muted/30 rounded-lg">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Initial Avg</p>
              <p className="text-2xl font-bold text-muted-foreground">{initialAvg}</p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Final Avg</p>
              <p className="text-2xl font-bold text-primary">{finalAvg}</p>
            </div>
          </div>

          <Separator />

          {/* Task Completion */}
          <TaskCompletionComparison
            initial={initialReport.taskCompletion}
            final={finalReport.taskCompletion}
          />

          <Separator />

          {/* Numeric dimensions */}
          <ScoreBar
            label="Communicative Effectiveness"
            initialScore={initialReport.communicativeEffectiveness}
            finalScore={finalReport.communicativeEffectiveness}
            max={5}
          />

          <ScoreBar
            label="Emergent Language Complexity"
            initialScore={initialReport.emergentLanguageComplexity}
            finalScore={finalReport.emergentLanguageComplexity}
            max={5}
          />

          <ScoreBar
            label="Fluency"
            initialScore={initialReport.fluency}
            finalScore={finalReport.fluency}
            max={5}
          />
        </CardContent>
      </Card>

      {/* GSE Progression */}
      {(initialReport.gseBand || finalReport.gseBand) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="h-5 w-5" />
              GSE Progression
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-6 py-4">
              {initialReport.gseBand ? (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Initial</p>
                  <p className="text-sm font-semibold">
                    GSE {initialReport.gseBand.min}-{initialReport.gseBand.max}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ≈ CEFR {initialReport.gseBand.cefr}
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Initial</p>
                  <p className="text-sm text-muted-foreground italic">Not set</p>
                </div>
              )}
              <ArrowRight className="h-5 w-5 text-primary" />
              {finalReport.gseBand ? (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Final</p>
                  <p className="text-sm font-semibold text-primary">
                    GSE {finalReport.gseBand.min}-{finalReport.gseBand.max}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ≈ CEFR {finalReport.gseBand.cefr} · Cambridge {finalReport.gseBand.cambridge}
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Final</p>
                  <p className="text-sm text-muted-foreground italic">Not set</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Output Citations Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5" />
            Learner Output: Before & After
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CitationComparison
            initialCitations={initialReport.outputCitations}
            finalCitations={finalReport.outputCitations}
          />
        </CardContent>
      </Card>

      {/* AI Growth Summary */}
      {finalReport.aiAnalysis?.growthSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-5 w-5" />
              AI Growth Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">{finalReport.aiAnalysis.growthSummary}</p>

            {finalReport.aiAnalysis.deltaHighlights && finalReport.aiAnalysis.deltaHighlights.length > 0 && (
              <>
                <Separator />
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Growth by Dimension</p>
                <div className="space-y-3">
                  {finalReport.aiAnalysis.deltaHighlights.map((d, i) => (
                    <div key={i} className="bg-muted/30 rounded-lg p-3 space-y-1">
                      <p className="text-xs font-medium capitalize">{d.dimension.replace(/_/g, ' ')}</p>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">{d.initial}</span>
                        <ArrowRight className="h-3 w-3 text-primary" />
                        <span className="font-medium">{d.final}</span>
                      </div>
                      {d.evidence && (
                        <p className="text-xs text-muted-foreground italic">{d.evidence}</p>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Teacher Notes Side by Side */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-5 w-5" />
            Teacher Observations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Initial Assessment</p>
              <p className="text-sm whitespace-pre-wrap">{initialReport.teacherNotes || 'No notes recorded.'}</p>
            </div>
            <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
              <p className="text-xs font-medium text-muted-foreground mb-2">Final Assessment</p>
              <p className="text-sm whitespace-pre-wrap">{finalReport.teacherNotes || 'No notes recorded.'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Back Button */}
      <div className="border-t pt-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Learner Profile
        </Button>
      </div>
    </div>
  );
}
