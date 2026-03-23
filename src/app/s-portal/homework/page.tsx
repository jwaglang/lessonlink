'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { getHomeworkByStudent } from '@/lib/firestore';
import type { HomeworkAssignment } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, CheckCircle, Clock, Star, FileText } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import PageHeader from '@/components/page-header';

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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-5 w-5" />
            Assignments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {homework.length === 0 ? 'No homework assigned yet.' : 'No homework matching this filter.'}
            </p>
          ) : (
            <div className="space-y-3">
              {filtered.map((hw) => (
                <div
                  key={hw.id}
                  className="rounded-md border px-4 py-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{hw.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{TYPE_LABELS[hw.homeworkType] || hw.homeworkType}</span>
                          <span>·</span>
                          <span>Assigned {format(parseISO(hw.createdAt), 'MMM d, yyyy')}</span>
                          {hw.dueDate && (
                            <>
                              <span>·</span>
                              <span>Due {format(parseISO(hw.dueDate), 'MMM d')}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge className={STATUS_CONFIG[hw.status]?.color || ''}>
                      {STATUS_CONFIG[hw.status]?.label || hw.status}
                    </Badge>
                  </div>

                  {hw.description && (
                    <p className="text-sm text-muted-foreground pl-8">{hw.description}</p>
                  )}

                  {/* Show grade details if graded */}
                  {hw.grading && (
                    <div className="pl-8 p-3 bg-green-50 dark:bg-green-900/20 rounded-md space-y-1">
                      <div className="flex items-center gap-4 text-sm">
                        <span className="font-medium text-green-700 dark:text-green-300">
                          Score: {hw.grading.achievedScore}/{hw.grading.maxScore} ({Math.round(hw.grading.score)}%)
                        </span>
                        {hw.grading.practiceHours > 0 && (
                          <span className="text-muted-foreground">
                            {hw.grading.practiceHours < 1
                              ? `${Math.round(hw.grading.practiceHours * 60)}min practice`
                              : `${hw.grading.practiceHours.toFixed(1)}h practice`
                            }
                          </span>
                        )}
                      </div>
                      {hw.grading.teacherNotes && (
                        <p className="text-sm text-muted-foreground italic">
                          "{hw.grading.teacherNotes}"
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
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
