'use client';

import { useState, useEffect } from 'react';
import type { Student, HomeworkAssignment } from '@/lib/types';
import { getHomeworkByStudent, updateHomeworkAssignment, updateProgressWithHomeworkStats } from '@/lib/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
  BookOpen,
  Upload,
  CheckCircle,
  Clock,
  BarChart,
  Loader2,
  FileText,
  Star,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { parseHomeworkJson, isValidKiddolandExport, detectToolType } from '@/lib/homework-parser';

interface HomeworkTabProps {
  studentId: string;
  student: Student;
}

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

export default function HomeworkTab({ studentId, student }: HomeworkTabProps) {
  const [homework, setHomework] = useState<HomeworkAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [uploadTarget, setUploadTarget] = useState<HomeworkAssignment | null>(null);
  const [gradeTarget, setGradeTarget] = useState<HomeworkAssignment | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchHomework() {
      setLoading(true);
      try {
        const data = await getHomeworkByStudent(studentId);
        setHomework(data);
      } catch (err) {
        console.error('Error fetching homework:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchHomework();
  }, [studentId]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-sm text-muted-foreground">Loading homework...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<BookOpen className="h-4 w-4" />} label="Total Assigned" value={totalCount} />
        <StatCard icon={<CheckCircle className="h-4 w-4 text-green-600" />} label="Graded" value={gradedCount} />
        <StatCard icon={<Clock className="h-4 w-4 text-amber-600" />} label="Pending" value={pendingCount} />
        <StatCard icon={<Star className="h-4 w-4 text-purple-600" />} label="Avg Score" value={avgScore} suffix="%" />
      </div>

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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-5 w-5" />
            Homework Assignments
          </CardTitle>
          <CardDescription>
            {filtered.length} assignment{filtered.length !== 1 ? 's' : ''}
            {statusFilter !== 'all' ? ` (${STATUS_CONFIG[statusFilter]?.label})` : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No homework assignments found.</p>
          ) : (
            <div className="space-y-3">
              {filtered.map((hw) => (
                <div
                  key={hw.id}
                  className="flex items-center justify-between rounded-md border px-4 py-3"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{hw.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{TYPE_LABELS[hw.homeworkType] || hw.homeworkType}</span>
                        <span>·</span>
                        <span>{format(parseISO(hw.createdAt), 'MMM d, yyyy')}</span>
                        {hw.dueDate && (
                          <>
                            <span>·</span>
                            <span>Due {format(parseISO(hw.dueDate), 'MMM d')}</span>
                          </>
                        )}
                      </div>
                      {hw.grading && (
                        <div className="flex items-center gap-2 text-xs mt-1">
                          <span className="font-medium text-green-700">
                            Score: {hw.grading.achievedScore}/{hw.grading.maxScore} ({Math.round(hw.grading.score)}%)
                          </span>
                          {hw.grading.practiceHours > 0 && (
                            <>
                              <span>·</span>
                              <span>
                                {hw.grading.practiceHours < 1
                                  ? `${Math.round(hw.grading.practiceHours * 60)}min practice`
                                  : `${hw.grading.practiceHours.toFixed(1)}h practice`
                                }
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className={STATUS_CONFIG[hw.status]?.color || ''}>
                      {STATUS_CONFIG[hw.status]?.label || hw.status}
                    </Badge>
                    {(hw.status === 'assigned' || hw.status === 'delivered') && (
                      <Button size="sm" variant="outline" onClick={() => setUploadTarget(hw)}>
                        <Upload className="h-3 w-3 mr-1" /> Upload
                      </Button>
                    )}
                    {hw.status === 'submitted' && (
                      <Button size="sm" onClick={() => setGradeTarget(hw)}>
                        <Star className="h-3 w-3 mr-1" /> Grade
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload JSON Dialog */}
      <UploadDialog
        homework={uploadTarget}
        onClose={() => setUploadTarget(null)}
        onUploaded={(updated) => {
          setHomework(prev => prev.map(h => h.id === updated.id ? updated : h));
          setUploadTarget(null);
          // Auto-open grade dialog
          setGradeTarget(updated);
        }}
      />

      {/* Grade Dialog */}
      <GradeDialog
        homework={gradeTarget}
        student={student}
        onClose={() => setGradeTarget(null)}
        onGraded={(updated) => {
          setHomework(prev => prev.map(h => h.id === updated.id ? updated : h));
          setGradeTarget(null);
        }}
      />
    </div>
  );
}

/* ── Upload Dialog ── */

function UploadDialog({
  homework,
  onClose,
  onUploaded,
}: {
  homework: HomeworkAssignment | null;
  onClose: () => void;
  onUploaded: (hw: HomeworkAssignment) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !homework) return;

    setUploading(true);
    setError(null);

    try {
      const text = await file.text();
      const rawJson = JSON.parse(text);

      // Validate the JSON looks like a Kiddoland export
      if (!isValidKiddolandExport(rawJson)) {
        throw new Error('This does not appear to be a valid Kiddoland homework export. Please check the file and try again.');
      }

      // Auto-detect tool type or use the homework's type
      const toolType = detectToolType(rawJson) || homework.homeworkType;

      // Parse the JSON into normalized results
      const parsedResults = parseHomeworkJson(rawJson, toolType);

      // Update the homework doc directly via client Firestore
      await updateHomeworkAssignment(homework.id, {
        submission: {
          uploadedAt: new Date().toISOString(),
          uploadedBy: 'teacher',
          rawJson,
          parsedResults,
        },
        status: 'submitted',
      });

      toast({
        title: 'Results Uploaded',
        description: `Completion: ${Math.round(parsedResults.completionRate * 100)}% — ${parsedResults.totalPracticeMinutes ?? 0} minutes of practice`,
      });

      // Return updated homework (re-fetch would be cleaner but this works)
      onUploaded({
        ...homework,
        status: 'submitted',
        submission: {
          uploadedAt: new Date().toISOString(),
          uploadedBy: 'teacher',
          rawJson,
          parsedResults,
        },
      });
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to parse file. Make sure it\'s a valid Kiddoland export JSON.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={!!homework} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Results
          </DialogTitle>
        </DialogHeader>
        {homework && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload the JSON export from the Kiddoland workbook/worksheet for <strong>{homework.title}</strong>.
            </p>
            <div className="space-y-2">
              <Label htmlFor="json-upload">Select JSON file</Label>
              <Input
                id="json-upload"
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                disabled={uploading}
              />
            </div>
            {uploading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Parsing results...
              </div>
            )}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
                {error}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ── Grade Dialog ── */

function GradeDialog({
  homework,
  student,
  onClose,
  onGraded,
}: {
  homework: HomeworkAssignment | null;
  student: Student;
  onClose: () => void;
  onGraded: (hw: HomeworkAssignment) => void;
}) {
  const [score, setScore] = useState(0);
  const [teacherNotes, setTeacherNotes] = useState('');
  const [grading, setGrading] = useState(false);
  const { toast } = useToast();

  // Set initial score from parsed results when dialog opens
  useEffect(() => {
    if (homework?.submission?.parsedResults) {
      setScore(Math.round(homework.submission.parsedResults.completionRate * 100));
      setTeacherNotes('');
    }
  }, [homework?.id]);

  async function handleGrade() {
    if (!homework) return;
    setGrading(true);

    try {
      const maxScore = homework.submission?.parsedResults?.totalActivities ?? 0;
      const achievedScore = Math.round((score / 100) * maxScore);
      const practiceMinutes = homework.submission?.parsedResults?.totalPracticeMinutes ?? 0;
      const practiceHours = Math.round((practiceMinutes / 60) * 100) / 100;

      // Update homework doc directly via client Firestore
      await updateHomeworkAssignment(homework.id, {
        grading: {
          score,
          maxScore,
          achievedScore,
          teacherNotes: teacherNotes.trim() || undefined,
          gradedAt: new Date().toISOString(),
          gradedBy: homework.teacherId,
          practiceHours,
        },
        status: 'graded',
      });

      // Update studentProgress with homework stats
      await updateProgressWithHomeworkStats(
        homework.studentId,
        homework.courseId,
        homework.unitId
      );

      // Send graded email to parent (server-side — needs Resend API key)
      if (student.primaryContact?.email) {
        try {
          await fetch('/api/email/send-homework-graded', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              parentEmail: student.primaryContact.email,
              learnerName: student.name,
              title: homework.title,
              score,
              achievedScore,
              maxScore,
              practiceHours,
              teacherNotes: teacherNotes.trim() || undefined,
            }),
          });
        } catch (emailErr) {
          // Email failure should not block grading
          console.error('Failed to send graded email:', emailErr);
        }
      }

      toast({ title: 'Homework Graded', description: `Score: ${achievedScore}/${maxScore} (${score}%)` });

      onGraded({
        ...homework,
        status: 'graded',
        grading: {
          score,
          maxScore,
          achievedScore,
          teacherNotes: teacherNotes.trim() || undefined,
          gradedAt: new Date().toISOString(),
          gradedBy: homework.teacherId,
          practiceHours,
        },
      });
    } catch (err: any) {
      console.error('Grade error:', err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setGrading(false);
    }
  }

  const parsed = homework?.submission?.parsedResults;

  return (
    <Dialog open={!!homework} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Grade Homework
          </DialogTitle>
        </DialogHeader>
        {homework && parsed && (
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-md space-y-2 text-sm">
              <p><strong>Title:</strong> {homework.title}</p>
              <p><strong>Activities:</strong> {parsed.completedActivities.length} of {parsed.totalActivities} completed</p>
              <p><strong>Completion:</strong> {Math.round(parsed.completionRate * 100)}%</p>
              {parsed.totalPracticeMinutes > 0 && (
                <p><strong>Practice Time:</strong> {parsed.totalPracticeMinutes} minutes</p>
              )}
              {parsed.wordLevels && Object.keys(parsed.wordLevels).length > 0 && (
                <div>
                  <strong>Vocabulary Mastery:</strong>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(parsed.wordLevels).map(([word, level]) => (
                      <Badge key={word} variant="outline" className="text-xs">
                        {word}: {level}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {parsed.matchingScore && (
                <p><strong>Matching:</strong> {parsed.matchingScore.correct}/{parsed.matchingScore.total}</p>
              )}
              {parsed.singCount !== undefined && (
                <p><strong>Sing-Alongs:</strong> {parsed.singCount}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Score: {score}%</Label>
              <Slider
                value={[score]}
                onValueChange={([v]) => setScore(v)}
                min={0}
                max={100}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="grade-notes">Teacher Notes (optional)</Label>
              <Textarea
                id="grade-notes"
                placeholder="Great job on the vocabulary section..."
                value={teacherNotes}
                onChange={(e) => setTeacherNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleGrade} disabled={grading} className="flex-1">
                {grading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Grading...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Save Grade
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={onClose} disabled={grading}>
                Cancel
              </Button>
            </div>

            {student.primaryContact?.email && (
              <p className="text-xs text-muted-foreground">
                A grading notification will be sent to {student.primaryContact.email}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
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
