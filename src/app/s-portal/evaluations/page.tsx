'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import {
  getAssessmentReportsByStudent,
  getUnitById,
  getCourseById,
} from '@/lib/firestore';
import type { AssessmentReport, Unit, Course } from '@/lib/types';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileText, Star, TrendingUp, BookOpen, Lightbulb } from 'lucide-react';

// ========================================
// Report Card Component
// ========================================

function EvaluationCard({
  report,
  unitTitle,
  courseTitle,
}: {
  report: AssessmentReport;
  unitTitle: string;
  courseTitle: string;
}) {
  const parentReport = report.parentReport;

  // Only show if parent report exists and is approved
  if (!parentReport || !parentReport.approvedByTeacher) return null;

  const gseBand = report.gseBand;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {courseTitle} · {unitTitle}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={report.type === 'initial' ? 'secondary' : 'default'}>
              {report.type === 'initial' ? 'Initial' : 'Final'}
            </Badge>
            {report.finalizedAt && (
              <span className="text-xs text-muted-foreground">
                {new Date(report.finalizedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
            <Star className="h-3 w-3" />
            Summary
          </p>
          <p className="text-sm">{parentReport.summary}</p>
        </div>

        {/* Progress Highlights */}
        {parentReport.progressHighlights && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              What Your Child Can Do
            </p>
            <p className="text-sm">{parentReport.progressHighlights}</p>
          </div>
        )}

        {/* Suggested Activities */}
        {parentReport.suggestedActivities && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 flex items-center gap-1">
              <Lightbulb className="h-3 w-3" />
              Activities for Home
            </p>
            <p className="text-sm">{parentReport.suggestedActivities}</p>
          </div>
        )}

        {/* GSE Band */}
        {gseBand && (
          <>
            <Separator />
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-sm">
                GSE {gseBand.min}-{gseBand.max}
              </Badge>
              <span className="text-xs text-muted-foreground">
                ≈ CEFR {gseBand.cefr} · Cambridge {gseBand.cambridge}
              </span>
            </div>
          </>
        )}

        {/* Language indicator */}
        <div className="flex justify-end">
          <Badge variant="outline" className="text-xs">
            {parentReport.language === 'en' ? '🇬🇧 English' : parentReport.language === 'zh' ? '🇨🇳 中文' : '🇵🇹 Português'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

// ========================================
// Main Page Component
// ========================================

export default function EvaluationsPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<AssessmentReport[]>([]);
  const [unitMap, setUnitMap] = useState<Record<string, string>>({});
  const [courseMap, setCourseMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user?.uid) return;
      setLoading(true);
      try {
        const allReports = await getAssessmentReportsByStudent(user.uid);

        // Only show finalized reports with approved parent reports
        const visibleReports = allReports.filter(
          (r) => r.status === 'finalized' && r.parentReport?.approvedByTeacher
        );

        setReports(visibleReports);

        // Load unit and course names
        const unitIds = [...new Set(visibleReports.map((r) => r.unitId))];
        const courseIds = [...new Set(visibleReports.map((r) => r.courseId))];

        const units: Record<string, string> = {};
        const courses: Record<string, string> = {};

        await Promise.all([
          ...unitIds.map(async (id) => {
            const unit = await getUnitById(id);
            if (unit) units[id] = unit.title;
          }),
          ...courseIds.map(async (id) => {
            const course = await getCourseById(id);
            if (course) courses[id] = course.title;
          }),
        ]);

        setUnitMap(units);
        setCourseMap(courses);
      } catch (err) {
        console.error('Error loading evaluations:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user?.uid]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-sm text-muted-foreground">Loading evaluations...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          My Evaluations
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Assessment reports from your courses
        </p>
      </div>

      {/* Reports */}
      {reports.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center py-8">
              No evaluation reports yet. Your tutor will share assessment reports here after unit evaluations.
            </p>
          </CardContent>
        </Card>
      ) : (
        reports.map((report) => (
          <EvaluationCard
            key={report.id}
            report={report}
            unitTitle={unitMap[report.unitId] ?? 'Unknown Unit'}
            courseTitle={courseMap[report.courseId] ?? 'Unknown Course'}
          />
        ))
      )}
    </div>
  );
}
