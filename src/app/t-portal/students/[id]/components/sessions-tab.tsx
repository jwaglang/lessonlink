'use client';

import { useState, useEffect } from 'react';
import type { Student, SessionInstance, SessionFeedback, Payment, Unit, Level } from '@/lib/types';
import {
  getSessionInstancesByStudentId,
  completeSession,
  cancelSessionInstance,
  getSessionFeedbackByStudent,
  updateSessionFeedback,
  createSessionFeedback,
  getPaymentsByStudentId,
  getUnitsByCourseId,
  getLevelsByCourseId,
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
  Sparkles,
  BookOpen,
  FileText,
  Pencil,
  Mail,
} from 'lucide-react';
import { format, parseISO, isFuture, startOfDay, differenceInHours } from 'date-fns';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import AssignHomeworkForm from '@/components/assign-homework-form';

interface SessionsTabProps {
  studentId: string;
  student: Student;
}

export default function SessionsTab({ studentId, student }: SessionsTabProps) {
  const [sessions, setSessions] = useState<SessionInstance[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [unitMap, setUnitMap] = useState<Record<string, Unit>>({});
  const [levelMap, setLevelMap] = useState<Record<string, Level>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<SessionInstance | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [hwDialogSession, setHwDialogSession] = useState<SessionInstance | null>(null);

  // Feedback state
  const [feedbackMap, setFeedbackMap] = useState<Record<string, SessionFeedback>>({});
  const [feedbackDialog, setFeedbackDialog] = useState<{ session: SessionInstance; feedback: SessionFeedback | null } | null>(null);
  const [editingFeedback, setEditingFeedback] = useState(false);
  const [editLines, setEditLines] = useState('');
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchSessions() {
      setLoading(true);
      try {
        const [data, feedbacks, pmts] = await Promise.all([
          getSessionInstancesByStudentId(studentId),
          getSessionFeedbackByStudent(studentId),
          getPaymentsByStudentId(studentId),
        ]);
        setSessions(data);
        setPayments(pmts);

        const courseIds = [...new Set(data.map((s) => s.courseId).filter(Boolean))];
        const [allUnits, allLevels] = await Promise.all([
          Promise.all(courseIds.map((id) => getUnitsByCourseId(id))).then((r) => r.flat()),
          Promise.all(courseIds.map((id) => getLevelsByCourseId(id))).then((r) => r.flat()),
        ]);
        setUnitMap(Object.fromEntries(allUnits.map((u) => [u.id, u])));
        setLevelMap(Object.fromEntries(allLevels.map((l) => [l.id, l])));
        const map: Record<string, SessionFeedback> = {};
        for (const fb of feedbacks) map[fb.sessionInstanceId] = fb;
        setFeedbackMap(map);
      } catch (err) {
        console.error('Error fetching sessions:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSessions();
  }, [studentId]);

  function openFeedbackDialog(session: SessionInstance) {
    const fb = feedbackMap[session.id] ?? null;
    setFeedbackDialog({ session, feedback: fb });
    setEditingFeedback(!fb?.englishReport);
    setEditLines(fb?.englishReport
      ? `${fb.englishReport.summary}\n\n${fb.englishReport.progressHighlights}\n\n${fb.englishReport.suggestedActivities}`
      : '');
  }

  async function sendFeedbackEmail(session: SessionInstance, englishReport: { summary: string; progressHighlights: string; suggestedActivities: string }) {
    const parentEmail = student.primaryContact?.email;
    if (!parentEmail) return null;
    const res = await fetch('/api/email/send-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: parentEmail,
        learnerName: student.name,
        sessionTitle: session.title || 'Untitled Session',
        sessionDate: session.lessonDate || '',
        summary: englishReport.summary,
        progressHighlights: englishReport.progressHighlights,
        suggestedActivities: englishReport.suggestedActivities,
      }),
    });
    return res.ok ? parentEmail : null;
  }

  async function handleSaveFeedbackText() {
    if (!feedbackDialog) return;
    setSavingFeedback(true);
    try {
      const text = editLines.trim();
      const englishReport = { summary: text, progressHighlights: '', suggestedActivities: '', savedAt: new Date().toISOString() };
      const existing = feedbackDialog.feedback;
      let docId = existing?.id;
      if (docId) {
        await updateSessionFeedback(docId, { englishReport });
      } else {
        docId = await createSessionFeedback({
          sessionInstanceId: feedbackDialog.session.id,
          studentId,
          teacherId: feedbackDialog.session.teacherUid || '',
          courseId: feedbackDialog.session.courseId || '',
          unitId: feedbackDialog.session.unitId || '',
          sessionTitle: feedbackDialog.session.title || 'Untitled Session',
          sessionDate: feedbackDialog.session.lessonDate || '',
          teacherNotes: '',
          parentReport: null,
          englishReport,
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      const updated = { ...(existing ?? { id: docId! }), englishReport } as SessionFeedback;
      setFeedbackMap(prev => ({ ...prev, [feedbackDialog.session.id]: updated }));
      setFeedbackDialog(prev => prev ? { ...prev, feedback: updated } : null);
      setEditingFeedback(false);

      const sentTo = await sendFeedbackEmail(feedbackDialog.session, englishReport);
      if (sentTo) {
        toast({ title: 'Saved & sent', description: `Feedback emailed to ${sentTo}.` });
      } else if (!student.primaryContact?.email) {
        toast({ title: 'Saved', description: 'Feedback saved. No parent email on file — email not sent.' });
      } else {
        toast({ title: 'Saved', description: 'Feedback saved. Email delivery failed — try resending.', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSavingFeedback(false);
    }
  }

  async function handleResendFeedbackEmail() {
    if (!feedbackDialog?.feedback?.englishReport) return;
    setSendingEmail(true);
    try {
      const sentTo = await sendFeedbackEmail(feedbackDialog.session, feedbackDialog.feedback.englishReport);
      if (sentTo) {
        toast({ title: 'Email sent', description: `Feedback re-sent to ${sentTo}.` });
      } else {
        toast({ title: 'Not sent', description: 'No parent email on file.', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSendingEmail(false);
    }
  }

  // Derived lists
  const upcoming = sessions
    .filter((s) => s.status === 'scheduled' && s.lessonDate && isFuture(startOfDay(parseISO(s.lessonDate))))
    .sort((a, b) => parseISO(a.lessonDate).getTime() - parseISO(b.lessonDate).getTime());

  const history = sessions
    .filter((s) => s.status !== 'scheduled' || (s.lessonDate && !isFuture(startOfDay(parseISO(s.lessonDate)))))
    .sort((a, b) => parseISO(b.lessonDate).getTime() - parseISO(a.lessonDate).getTime());

  const packagesSorted = [...payments]
    .filter((p) => p.type === 'package' || p.type === 'course')
    .sort((a, b) => parseISO(a.paymentDate).getTime() - parseISO(b.paymentDate).getTime());
  const creditSessionsSorted = [...sessions]
    .filter((s) => s.billingType === 'credit')
    .sort((a, b) => parseISO(a.lessonDate).getTime() - parseISO(b.lessonDate).getTime());
  const oneOffSessionsSorted = [...sessions]
    .filter((s) => s.billingType === 'one_off')
    .sort((a, b) => parseISO(a.lessonDate).getTime() - parseISO(b.lessonDate).getTime());

  function getSessionLabel(session: SessionInstance): string | null {
    if (session.billingType === 'credit') {
      const sessionNum = creditSessionsSorted.findIndex((s) => s.id === session.id) + 1;
      if (packagesSorted.length === 0) return `Session ${sessionNum}`;
      const sessionDate = parseISO(session.lessonDate).getTime();
      let packageNum = 1;
      for (let i = packagesSorted.length - 1; i >= 0; i--) {
        if (sessionDate >= parseISO(packagesSorted[i].paymentDate).getTime()) {
          packageNum = i + 1;
          break;
        }
      }
      return `Package ${packageNum} · Session ${sessionNum}`;
    }
    if (session.billingType === 'one_off') {
      const n = oneOffSessionsSorted.findIndex((s) => s.id === session.id) + 1;
      return `Session ${n}`;
    }
    return null;
  }

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
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled
                        className="w-full"
                      >
                        Scheduled
                      </Button>
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => handleMarkComplete(session)}
                        disabled={actionLoading === session.id}
                      >
                        {actionLoading === session.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" /> Complete
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="w-full"
                        onClick={() => setCancelTarget(session)}
                        disabled={actionLoading === session.id}
                      >
                        <XCircle className="h-3 w-3 mr-1" /> Cancel
                      </Button>
                    </div>
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
                      {getSessionLabel(session) && (
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
                          {getSessionLabel(session)}
                        </p>
                      )}
                      <p className="text-sm font-medium">{session.title || 'Untitled Session'}</p>
                      {session.unitId && unitMap[session.unitId] && (
                        <p className="text-xs text-muted-foreground">
                          {unitMap[session.unitId].title}
                          {unitMap[session.unitId].levelId && levelMap[unitMap[session.unitId].levelId!] && (
                            <> · {levelMap[unitMap[session.unitId].levelId!].title}</>
                          )}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {session.startTime} – {session.endTime} ({session.durationHours}h)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <BillingBadge type={session.billingType} />
                    <div className="grid grid-cols-3 gap-2">
                      {session.status === 'completed' ? (
                        <>
                          <Button size="sm" variant="outline" disabled className="w-full bg-green-50 text-green-700 border-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" /> Completed
                          </Button>
                          <Button
                            size="sm"
                            className="w-full"
                            variant={feedbackMap[session.id]?.englishReport ? 'outline' : 'default'}
                            onClick={() => openFeedbackDialog(session)}
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            {feedbackMap[session.id]?.englishReport ? 'Notes' : 'Add Notes'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={() => setHwDialogSession(session)}
                          >
                            <BookOpen className="h-3 w-3 mr-1" /> Assign HW
                          </Button>
                        </>
                      ) : session.status === 'cancelled' ? (
                        <>
                          <Button size="sm" variant="outline" disabled className="w-full bg-red-50 text-red-700 border-red-200">
                            <XCircle className="h-3 w-3 mr-1" /> Cancelled
                          </Button>
                          <Button size="sm" variant="outline" disabled className="w-full opacity-50">Complete</Button>
                          <Button size="sm" variant="outline" disabled className="w-full opacity-50">Cancel</Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="outline" disabled className="w-full bg-amber-50 text-amber-700 border-amber-200">
                            Rescheduled
                          </Button>
                          <Button size="sm" variant="outline" disabled className="w-full opacity-50">Complete</Button>
                          <Button size="sm" variant="outline" disabled className="w-full opacity-50">Cancel</Button>
                        </>
                      )}
                    </div>
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

      {/* Feedback Notes Dialog */}
      <Dialog open={!!feedbackDialog} onOpenChange={() => setFeedbackDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Session Feedback Notes
            </DialogTitle>
            {feedbackDialog && (
              <p className="text-sm text-muted-foreground">
                {feedbackDialog.session.title || 'Untitled Session'} — {feedbackDialog.session.lessonDate}
              </p>
            )}
          </DialogHeader>

          {feedbackDialog?.feedback?.englishReport && !editingFeedback ? (
            <div className="space-y-3 text-sm">
              <p className="whitespace-pre-wrap">{feedbackDialog.feedback.englishReport.summary}</p>
              {feedbackDialog.feedback.englishReport.progressHighlights && (
                <p className="whitespace-pre-wrap text-muted-foreground">{feedbackDialog.feedback.englishReport.progressHighlights}</p>
              )}
              {feedbackDialog.feedback.englishReport.suggestedActivities && (
                <p className="whitespace-pre-wrap text-muted-foreground">{feedbackDialog.feedback.englishReport.suggestedActivities}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Saved {new Date(feedbackDialog.feedback.englishReport.savedAt).toLocaleString()}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Paste or type the English feedback. You can include all sections as plain text.
              </p>
              <Textarea
                rows={8}
                placeholder="Summary, progress highlights, suggested activities..."
                value={editLines}
                onChange={e => setEditLines(e.target.value)}
              />
            </div>
          )}

          <DialogFooter className="gap-2">
            {feedbackDialog?.feedback?.englishReport && !editingFeedback ? (
              <>
                <Button variant="outline" size="sm" onClick={handleResendFeedbackEmail} disabled={sendingEmail}>
                  {sendingEmail ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Mail className="h-3 w-3 mr-1" />}
                  Resend Email
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  const r = feedbackDialog.feedback!.englishReport!;
                  setEditLines([r.summary, r.progressHighlights, r.suggestedActivities].filter(Boolean).join('\n\n'));
                  setEditingFeedback(true);
                }}>
                  <Pencil className="h-3 w-3 mr-1" /> Edit
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => setFeedbackDialog(null)}>Cancel</Button>
                <Button size="sm" onClick={handleSaveFeedbackText} disabled={savingFeedback || !editLines.trim()}>
                  {savingFeedback ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                  Save
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Homework Dialog */}
      <Dialog open={!!hwDialogSession} onOpenChange={() => setHwDialogSession(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Assign Homework
            </DialogTitle>
          </DialogHeader>
          {hwDialogSession && (
            <AssignHomeworkForm
              studentId={hwDialogSession.studentId}
              teacherId={hwDialogSession.teacherUid || ''}
              courseId={hwDialogSession.courseId || ''}
              unitId={hwDialogSession.unitId || ''}
              sessionId={hwDialogSession.sessionId || undefined}
              sessionInstanceId={hwDialogSession.id}
              sessionTitle={hwDialogSession.title || ''}
              parentEmail={student.primaryContact?.email}
              learnerName={student.name}
              onAssigned={() => setHwDialogSession(null)}
              onCancel={() => setHwDialogSession(null)}
            />
          )}
        </DialogContent>
      </Dialog>
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
