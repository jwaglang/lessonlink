'use client';

import { useState, useEffect } from 'react';
import type { Student, SessionInstance } from '@/lib/types';
import {
  getSessionInstancesByStudentId,
  completeSession,
  cancelSessionInstance,
} from '@/lib/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  BarChart,
  Loader2,
  AlertTriangle,
  CalendarPlus,
} from 'lucide-react';
import { format, parseISO, isFuture, startOfDay, differenceInHours } from 'date-fns';
import Link from 'next/link';

interface SessionsTabProps {
  studentId: string;
  student: Student;
}

export default function SessionsTab({ studentId, student }: SessionsTabProps) {
  const [sessions, setSessions] = useState<SessionInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<SessionInstance | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    async function fetchSessions() {
      setLoading(true);
      try {
        const data = await getSessionInstancesByStudentId(studentId);
        setSessions(data);
      } catch (err) {
        console.error('Error fetching sessions:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSessions();
  }, [studentId]);

  // Derived lists
  const upcoming = sessions
    .filter((s) => s.status === 'scheduled' && s.lessonDate && isFuture(startOfDay(parseISO(s.lessonDate))))
    .sort((a, b) => parseISO(a.lessonDate).getTime() - parseISO(b.lessonDate).getTime());

  const history = sessions
    .filter((s) => s.status !== 'scheduled' || (s.lessonDate && !isFuture(startOfDay(parseISO(s.lessonDate)))))
    .sort((a, b) => parseISO(b.lessonDate).getTime() - parseISO(a.lessonDate).getTime());

  // Stats
  const totalCount = sessions.length;
  const completedCount = sessions.filter((s) => s.status === 'completed').length;
  const upcomingCount = upcoming.length;
  const cancelledCount = sessions.filter((s) => s.status === 'cancelled').length;

  // Actions
  async function handleMarkComplete(session: SessionInstance) {
    setActionLoading(session.id);
    try {
      await completeSession(session.id);
      setSessions((prev) =>
        prev.map((s) => (s.id === session.id ? { ...s, status: 'completed' as const } : s))
      );
    } catch (err) {
      console.error('Error completing session:', err);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleConfirmCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      const result = await cancelSessionInstance(cancelTarget.id, studentId);
      if (result.approvalRequired) {
        // Session wasn't cancelled immediately — approval needed
        setSessions((prev) =>
          prev.map((s) => (s.id === cancelTarget.id ? { ...s, status: 'scheduled' as const } : s))
        );
      } else {
        setSessions((prev) =>
          prev.map((s) => (s.id === cancelTarget.id ? { ...s, status: 'cancelled' as const } : s))
        );
      }
    } catch (err) {
      console.error('Error cancelling session:', err);
    } finally {
      setCancelling(false);
      setCancelTarget(null);
    }
  }

  function isWithin24Hours(session: SessionInstance): boolean {
    const sessionDateTime = parseISO(`${session.lessonDate}T${session.startTime}`);
    return differenceInHours(sessionDateTime, new Date()) < 24;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-sm text-muted-foreground">Loading sessions...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Row 1: Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<BarChart className="h-4 w-4" />} label="Total Sessions" value={totalCount} />
        <StatCard icon={<CheckCircle className="h-4 w-4 text-green-600" />} label="Completed" value={completedCount} />
        <StatCard icon={<Calendar className="h-4 w-4 text-blue-600" />} label="Upcoming" value={upcomingCount} />
        <StatCard icon={<XCircle className="h-4 w-4 text-red-500" />} label="Cancelled" value={cancelledCount} />
      </div>

      {/* Row 2: Upcoming Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-5 w-5" />
            Upcoming Sessions
          </CardTitle>
          <CardDescription>
            Scheduled sessions for {student.name}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming sessions scheduled.</p>
          ) : (
            <div className="space-y-3">
              {upcoming.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between rounded-md border px-4 py-3"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-center min-w-[56px]">
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(session.lessonDate), 'EEE')}
                      </p>
                      <p className="text-lg font-bold">
                        {format(parseISO(session.lessonDate), 'd')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(session.lessonDate), 'MMM')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{session.title || 'Untitled Session'}</p>
                      <p className="text-xs text-muted-foreground">
                        {session.startTime} – {session.endTime} ({session.durationHours}h)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <BillingBadge type={session.billingType} />
                    <Button
                      size="sm"
                      variant="outline"
                      className=""
                      onClick={() => handleMarkComplete(session)}
                      disabled={actionLoading === session.id}
                    >
                      {actionLoading === session.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="mr-1 h-3 w-3" /> Complete
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-300 hover:bg-red-50"
                      onClick={() => setCancelTarget(session)}
                      disabled={actionLoading === session.id}
                    >
                      <XCircle className="mr-1 h-3 w-3" /> Cancel
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 pt-4 border-t">
            <Link href="/t-portal/calendar">
              <Button variant="outline" size="sm">
                <CalendarPlus className="mr-2 h-4 w-4" /> Book a Session
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Row 3: Session History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-5 w-5" />
            Session History
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No past sessions yet.</p>
          ) : (
            <div className="space-y-3">
              {history.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between rounded-md border px-4 py-3"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-center min-w-[56px]">
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(session.lessonDate), 'EEE')}
                      </p>
                      <p className="text-lg font-bold">
                        {format(parseISO(session.lessonDate), 'd')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(session.lessonDate), 'MMM')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{session.title || 'Untitled Session'}</p>
                      <p className="text-xs text-muted-foreground">
                        {session.startTime} – {session.endTime} ({session.durationHours}h)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <BillingBadge type={session.billingType} />
                    <StatusBadge status={session.status} />
                    {session.status === 'completed' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs"
                        onClick={() => window.location.href = '/t-portal/calendar'}
                      >
                        Write Feedback
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={!!cancelTarget} onOpenChange={() => setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this session?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelTarget && isWithin24Hours(cancelTarget) ? (
                <span className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <span>
                    This session is within 24 hours. Cancellation will require approval and will not
                    take effect immediately.
                  </span>
                </span>
              ) : (
                <>
                  This will cancel the session
                  {cancelTarget?.title ? ` "${cancelTarget.title}"` : ''} on{' '}
                  {cancelTarget?.lessonDate
                    ? format(parseISO(cancelTarget.lessonDate), 'MMMM d, yyyy')
                    : ''}
                  . This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Keep Session</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              disabled={cancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Cancel Session'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ── Sub-components ── */

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-9 w-9 rounded-full bg-muted">
            {icon}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    completed: { label: 'Completed', variant: 'default' },
    cancelled: { label: 'Cancelled', variant: 'destructive' },
    rescheduled: { label: 'Rescheduled', variant: 'secondary' },
    scheduled: { label: 'Scheduled', variant: 'outline' },
  };
  const c = config[status] ?? { label: status, variant: 'outline' as const };
  return (
    <Badge
      variant={c.variant}
      className={
        status === 'completed'
          ? 'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300'
          : status === 'rescheduled'
            ? 'bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300'
            : ''
      }
    >
      {c.label}
    </Badge>
  );
}

function BillingBadge({ type }: { type: string }) {
  const config: Record<string, { label: string }> = {
    trial: { label: 'Trial' },
    credit: { label: 'Credit' },
    one_off: { label: 'One-off' },
  };
  const c = config[type] ?? { label: type };
  return (
    <Badge variant="outline" className="text-xs">
      {c.label}
    </Badge>
  );
}
