'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { getHomeworkByStudent, updateHomeworkAssignment, getHomeworkAssignment } from '@/lib/firestore';
import { parseHomeworkJson, isValidKiddolandExport, detectToolType } from '@/lib/homework-parser';
import type { HomeworkAssignment } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  BookOpen,
  CheckCircle,
  Clock,
  Star,
  FileText,
  Upload,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { format, parseISO, differenceInDays, isPast } from 'date-fns';
import PageHeader from '@/components/page-header';
import { useToast } from '@/hooks/use-toast';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  assigned: { label: 'Assigned', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  delivered: { label: 'Delivered', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  submitted: { label: 'Submitted', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  graded: { label: 'Graded', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
};

const TYPE_LABELS: Record<string, string> = {
  workbook: 'Workbook',
  phonics_workbook: 'Phonics',
  song_worksheet: 'Worksheet',
  sentence_switcher: 'Sentence Switcher',
  other: 'Other',
};

export default function HomeworkPage() {
  const { user, loading: authLoading } = useAuth();
  const [homework, setHomework] = useState<HomeworkAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (authLoading || !user?.uid) return;

    async function fetchHomework() {
      setLoading(true);
      try {
        const data = await getHomeworkByStudent(user!.uid);
        setHomework(data);
      } catch (err) {
        console.error('Error fetching homework:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchHomework();
  }, [user?.uid, authLoading]);

  const filtered = statusFilter === 'all'
    ? homework
    : homework.filter(h => h.status === statusFilter);

  // Stats
  const totalCount = homework.length;
  const gradedCount = homework.filter(h => h.status === 'graded').length;
  const pendingCount = homework.filter(h => h.status !== 'graded').length;
  const avgScore = gradedCount > 0
    ? Math.round(homework.filter(h => h.grading).reduce((sum, h) => sum + (h.grading?.score ?? 0), 0) / gradedCount)
    : 0;
  const totalPracticeHours = homework
    .filter(h => h.grading)
    .reduce((sum, h) => sum + (h.grading?.practiceHours ?? 0), 0);

  function handleHomeworkUpdate(updated: HomeworkAssignment) {
    setHomework(prev => prev.map(h => h.id === updated.id ? updated : h));
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <p className="text-muted-foreground">Loading homework...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <PageHeader
        title="My Homework"
        description="View your assigned homework and grades"
      />

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<BookOpen className="h-4 w-4" />} label="Total" value={totalCount} />
        <StatCard icon={<CheckCircle className="h-4 w-4 text-green-600" />} label="Graded" value={gradedCount} />
        <StatCard icon={<Clock className="h-4 w-4 text-amber-600" />} label="Pending" value={pendingCount} />
        <StatCard icon={<Star className="h-4 w-4 text-purple-600" />} label="Avg Score" value={avgScore} suffix="%" />
      </div>

      {/* Practice Hours Banner */}
      {totalPracticeHours > 0 && (
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-6 w-6 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Practice Time</p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {totalPracticeHours < 1
                    ? `${Math.round(totalPracticeHours * 60)} minutes`
                    : `${totalPracticeHours.toFixed(1)} hours`
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'assigned', 'delivered', 'submitted', 'graded'].map(f => (
          <Button
            key={f}
            size="sm"
            variant={statusFilter === f ? 'default' : 'outline'}
            onClick={() => setStatusFilter(f)}
          >
            {f === 'all' ? 'All' : STATUS_CONFIG[f]?.label ?? f}
          </Button>
        ))}
      </div>

      {/* Homework List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center py-8">
              {homework.length === 0 ? 'No homework assigned yet.' : 'No homework matching this filter.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((hw) => (
            <HomeworkCard key={hw.id} homework={hw} onUpdate={handleHomeworkUpdate} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Homework Card (expandable) ── */

function HomeworkCard({ homework: hw, onUpdate }: { homework: HomeworkAssignment; onUpdate: (hw: HomeworkAssignment) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { toast } = useToast();

  // Due date logic
  const dueDate = hw.dueDate ? parseISO(hw.dueDate) : null;
  const isOverdue = dueDate ? isPast(dueDate) : false;
  const daysUntilDue = dueDate ? differenceInDays(dueDate, new Date()) : null;

  function getDueDateColor(): string {
    if (!dueDate) return '';
    if (isOverdue) return 'text-red-600 dark:text-red-400';
    if (daysUntilDue !== null && daysUntilDue <= 2) return 'text-amber-600 dark:text-amber-400';
    return 'text-green-600 dark:text-green-400';
  }

  function getDueDateLabel(): string {
    if (!dueDate) return '';
    if (isOverdue) return `Overdue (was ${format(dueDate, 'MMM d')})`;
    if (daysUntilDue === 0) return 'Due today';
    if (daysUntilDue === 1) return 'Due tomorrow';
    return `Due ${format(dueDate, 'MMM d')} (${daysUntilDue} days)`;
  }

  const canUpload = (hw.status === 'assigned' || hw.status === 'delivered') && !isOverdue;
  const canResubmit = hw.status === 'submitted' && !isOverdue;

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    try {
      const text = await file.text();
      const rawJson = JSON.parse(text);

      if (!isValidKiddolandExport(rawJson)) {
        throw new Error('This does not look like a Kiddoland homework export. Please check the file.');
      }

      const toolType = detectToolType(rawJson) || hw.homeworkType;
      const parsedResults = parseHomeworkJson(rawJson, toolType);

      await updateHomeworkAssignment(hw.id, {
        submission: {
          uploadedAt: new Date().toISOString(),
          uploadedBy: 'student',
          rawJson,
          parsedResults,
        },
        status: 'submitted',
      });

      toast({
        title: 'Work Submitted!',
        description: `${Math.round(parsedResults.completionRate * 100)}% completed. Your teacher will review it soon.`,
      });

      onUpdate({
        ...hw,
        status: 'submitted',
        submission: {
          uploadedAt: new Date().toISOString(),
          uploadedBy: 'student',
          rawJson,
          parsedResults,
        },
      });
    } catch (err: any) {
      console.error('Upload error:', err);
      setUploadError(err.message || 'Failed to upload. Make sure it\'s a valid JSON export from your workbook.');
    } finally {
      setUploading(false);
      // Reset file input
      e.target.value = '';
    }
  }

  return (
    <Card className={hw.status === 'graded' ? 'border-green-200 dark:border-green-800' : ''}>
      {/* Collapsed summary — always visible */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{hw.title}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{TYPE_LABELS[hw.homeworkType] || hw.homeworkType}</span>
              {dueDate && (
                <>
                  <span>·</span>
                  <span className={getDueDateColor()}>{getDueDateLabel()}</span>
                </>
              )}
              {hw.grading && (
                <>
                  <span>·</span>
                  <span className="font-medium text-green-700 dark:text-green-300">
                    {Math.round(hw.grading.score)}%
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge className={STATUS_CONFIG[hw.status]?.color || ''}>
            {STATUS_CONFIG[hw.status]?.label || hw.status}
          </Badge>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>

      {/* Expanded detail view */}
      {expanded && (
        <CardContent className="pt-0 pb-4 space-y-4 border-t">

          {/* Description */}
          {hw.description && (
            <div className="pt-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">About This Homework</p>
              <p className="text-sm">{hw.description}</p>
            </div>
          )}

          {/* Teacher Instructions */}
          {(hw as any).teacherInstructions && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
              <p className="text-xs font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wide mb-1">Teacher Instructions</p>
              <p className="text-sm">{(hw as any).teacherInstructions}</p>
            </div>
          )}

          {/* Assignment info */}
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span>Assigned: {format(parseISO(hw.createdAt), 'MMM d, yyyy')}</span>
            {dueDate && (
              <span className={getDueDateColor()}>
                {isOverdue ? '⚠️' : '📅'} {getDueDateLabel()}
              </span>
            )}
          </div>

          {/* === STATUS-BASED SECTIONS === */}

          {/* Assigned / Delivered — show upload button */}
          {(hw.status === 'assigned' || hw.status === 'delivered') && (
            <div className="space-y-3">
              {canUpload ? (
                <div className="p-4 border-2 border-dashed border-purple-200 dark:border-purple-800 rounded-lg text-center space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-purple-400" />
                  <p className="text-sm font-medium">Ready to submit your work?</p>
                  <p className="text-xs text-muted-foreground">
                    Click the Export button in your workbook, then upload the JSON file here.
                  </p>
                  <div className="pt-2">
                    <Label htmlFor="hw-upload" className="cursor-pointer">
                      <Button asChild variant="default" disabled={uploading}>
                        <span>
                          {uploading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              Upload My Work
                            </>
                          )}
                        </span>
                      </Button>
                    </Label>
                    <Input
                      id="hw-upload"
                      type="file"
                      accept=".json"
                      onChange={handleUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                  </div>
                </div>
              ) : isOverdue ? (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  This homework is past due. Please contact your teacher.
                </div>
              ) : null}

              {uploadError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-md text-red-800 dark:text-red-300 text-sm">
                  {uploadError}
                </div>
              )}
            </div>
          )}

          {/* Submitted — show confirmation + resubmit option */}
          {hw.status === 'submitted' && (
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md text-sm text-amber-800 dark:text-amber-300">
                ✅ Work submitted! Your teacher will review and grade it soon.
              </div>

              {hw.submission?.parsedResults && (
                <div className="p-3 bg-muted rounded-md text-sm space-y-1">
                  <p>Activities completed: {hw.submission.parsedResults.completedActivities.length} of {hw.submission.parsedResults.totalActivities}</p>
                  {hw.submission.parsedResults.totalPracticeMinutes > 0 && (
                    <p>Practice time: {hw.submission.parsedResults.totalPracticeMinutes} minutes</p>
                  )}
                </div>
              )}

              {canResubmit && (
                <div>
                  <Label htmlFor="hw-resubmit" className="cursor-pointer">
                    <Button asChild variant="outline" size="sm" disabled={uploading}>
                      <span>
                        {uploading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Try Again?
                          </>
                        )}
                      </span>
                    </Button>
                  </Label>
                  <Input
                    id="hw-resubmit"
                    type="file"
                    accept=".json"
                    onChange={handleUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </div>
              )}

              {isOverdue && hw.status === 'submitted' && (
                <div className="p-2 text-xs text-muted-foreground">
                  Work submitted. No further changes allowed (past due date).
                </div>
              )}
            </div>
          )}

          {/* Graded — show score, feedback, and progress summary */}
          {hw.status === 'graded' && hw.grading && (
            <div className="space-y-3">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your Score</p>
                    <p className="text-3xl font-bold text-green-700 dark:text-green-300">
                      {hw.grading.achievedScore}/{hw.grading.maxScore}
                    </p>
                    <p className="text-sm text-muted-foreground">{Math.round(hw.grading.score)}%</p>
                  </div>
                  <div className="text-right">
                    {hw.grading.practiceHours > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Practice Time</p>
                        <p className="text-lg font-bold text-purple-700 dark:text-purple-300">
                          {hw.grading.practiceHours < 1
                            ? `${Math.round(hw.grading.practiceHours * 60)} min`
                            : `${hw.grading.practiceHours.toFixed(1)} hrs`
                          }
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {hw.grading.teacherNotes && (
                  <div className="border-t border-green-200 dark:border-green-700 pt-3">
                    <p className="text-xs font-medium text-green-700 dark:text-green-300 uppercase tracking-wide mb-1">Teacher Feedback</p>
                    <p className="text-sm italic">"{hw.grading.teacherNotes}"</p>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Graded on {format(parseISO(hw.grading.gradedAt), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

/* ── Sub-components ── */

function StatCard({ icon, label, value, suffix }: { icon: React.ReactNode; label: string; value: number; suffix?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-9 w-9 rounded-full bg-muted">
            {icon}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-bold">{value}{suffix || ''}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
