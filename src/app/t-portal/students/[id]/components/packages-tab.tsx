'use client';

import { useState, useEffect } from 'react';
import type { Student, StudentPackage, StudentCredit, ApprovalRequest } from '@/lib/types';
import {
  getStudentPackages,
  getStudentCreditsByStudentId,
  getApprovalRequests,
  requestPausePackage,
  unpauseStudentPackage,
} from '@/lib/firestore';
import { useAuth } from '@/components/auth-provider';
import { getMaxPauses, canPause, pausesRemaining } from '@/lib/pause-rules';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  CreditCard,
  Pause,
  Play,
  Clock,
  CalendarDays,
  Package,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

const ADMIN_EMAIL = 'jwag.lang@gmail.com';

interface PackagesTabProps {
  studentId: string;
  student: Student;
}

export default function PackagesTab({ studentId, student }: PackagesTabProps) {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const [packages, setPackages] = useState<StudentPackage[]>([]);
  const [credits, setCredits] = useState<StudentCredit[]>([]);
  const [pendingPauses, setPendingPauses] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Pause request dialog
  const [pauseTarget, setPauseTarget] = useState<StudentPackage | null>(null);
  const [pauseReason, setPauseReason] = useState('');
  const [submittingPause, setSubmittingPause] = useState(false);

  // Unpause dialog
  const [unpauseTarget, setUnpauseTarget] = useState<StudentPackage | null>(null);
  const [unpausingId, setUnpausingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [pkgData, creditData, approvals] = await Promise.all([
          getStudentPackages(studentId),
          getStudentCreditsByStudentId(studentId),
          getApprovalRequests('pending'),
        ]);
        setPackages(pkgData);
        setCredits(creditData);
        // Filter to only pause requests for this student
        setPendingPauses(
          approvals.filter(
            (a) => a.type === 'pause_request' && a.studentId === studentId
          )
        );
      } catch (err) {
        console.error('Error fetching packages data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [studentId]);

  function getCreditForPackage(pkg: StudentPackage): StudentCredit | undefined {
    return credits.find((c) => c.packageId === pkg.id || c.courseId === pkg.courseId);
  }

  function hasPendingPause(pkgId: string): boolean {
    return pendingPauses.some((a) => a.packageId === pkgId);
  }

  // Pause request
  async function handleSubmitPauseRequest() {
    if (!pauseTarget || !user) return;
    setSubmittingPause(true);
    try {
      const approval = await requestPausePackage(
        pauseTarget,
        student.name,
        student.email,
        user.uid,
        pauseReason || undefined
      );
      setPendingPauses((prev) => [...prev, approval]);
      setPauseTarget(null);
      setPauseReason('');
    } catch (err) {
      console.error('Error requesting pause:', err);
    } finally {
      setSubmittingPause(false);
    }
  }

  // Unpause
  async function handleUnpause() {
    if (!unpauseTarget) return;
    setUnpausingId(unpauseTarget.id);
    try {
      const { daysExtended } = await unpauseStudentPackage(unpauseTarget.id);
      setPackages((prev) =>
        prev.map((p) =>
          p.id === unpauseTarget.id
            ? {
                ...p,
                isPaused: false,
                status: 'active' as const,
                totalDaysPaused: (p.totalDaysPaused || 0) + daysExtended,
              }
            : p
        )
      );
      setUnpauseTarget(null);
    } catch (err) {
      console.error('Error unpausing package:', err);
    } finally {
      setUnpausingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-sm text-muted-foreground">Loading packages...</p>
      </div>
    );
  }

  // Summary stats
  const totalHoursAll = packages.reduce((sum, p) => sum + p.totalHours, 0);
  const totalRemainingAll = packages.reduce((sum, p) => sum + p.hoursRemaining, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Summary row */}
      {packages.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<Package className="h-4 w-4" />}
            label="Packages"
            value={String(packages.length)}
          />
          <StatCard
            icon={<Clock className="h-4 w-4" />}
            label="Total Hours"
            value={String(totalHoursAll)}
          />
          <StatCard
            icon={<CreditCard className="h-4 w-4" />}
            label="Hours Remaining"
            value={String(totalRemainingAll)}
          />
          <StatCard
            icon={<Pause className="h-4 w-4" />}
            label="Paused"
            value={String(packages.filter((p) => p.status === 'paused').length)}
          />
        </div>
      )}

      {/* Package cards */}
      {packages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">No packages purchased yet.</p>
          </CardContent>
        </Card>
      ) : (
        packages.map((pkg) => {
          const credit = getCreditForPackage(pkg);
          const maxPauses = getMaxPauses(pkg.totalHours);
          const remaining = pausesRemaining(pkg);
          const isPendingPause = hasPendingPause(pkg.id);

          return (
            <Card key={pkg.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Package className="h-5 w-5" />
                      {pkg.courseTitle}
                    </CardTitle>
                    <CardDescription>
                      {pkg.totalHours}h package — {pkg.currency} {pkg.price.toFixed(2)}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <PackageStatusBadge status={pkg.status} />
                    {isPendingPause && (
                      <Badge variant="outline" className="text-amber-600 border-amber-300">
                        Pause pending approval
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Dates */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Field
                    label="Purchased"
                    value={format(parseISO(pkg.purchaseDate), 'MMM d, yyyy')}
                  />
                  <Field
                    label="Expires"
                    value={format(parseISO(pkg.expiresAt), 'MMM d, yyyy')}
                  />
                  <Field label="Hours Remaining" value={`${pkg.hoursRemaining} / ${pkg.totalHours}`} />
                  <Field
                    label="Pauses Used"
                    value={`${pkg.pauseCount || 0} of ${maxPauses}`}
                  />
                </div>

                {/* Pause info */}
                {pkg.isPaused && pkg.pausedAt && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800 px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">
                        Paused since {format(parseISO(pkg.pausedAt), 'MMM d, yyyy')}
                      </span>
                    </div>
                    {pkg.pauseReason && (
                      <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                        Reason: {pkg.pauseReason}
                      </p>
                    )}
                    {pkg.totalDaysPaused > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Total days paused to date: {pkg.totalDaysPaused}
                      </p>
                    )}
                  </div>
                )}

                {/* Credit breakdown */}
                {credit && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      Credit Breakdown
                    </p>
                    <CreditBar credit={credit} />
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  {pkg.status === 'active' && !isPendingPause && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPauseTarget(pkg)}
                      disabled={!canPause(pkg) && !isAdmin}
                    >
                      <Pause className="mr-1 h-3 w-3" />
                      {canPause(pkg) || isAdmin
                        ? `Request Pause (${remaining} remaining)`
                        : 'No pauses remaining'}
                    </Button>
                  )}
                  {pkg.status === 'paused' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUnpauseTarget(pkg)}
                      disabled={unpausingId === pkg.id}
                    >
                      {unpausingId === pkg.id ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <Play className="mr-1 h-3 w-3" />
                      )}
                      Unpause
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Pause Request Dialog */}
      <Dialog open={!!pauseTarget} onOpenChange={() => setPauseTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Package Pause</DialogTitle>
            <DialogDescription>
              {pauseTarget && (
                <>
                  This package allows {getMaxPauses(pauseTarget.totalHours)} pause
                  {getMaxPauses(pauseTarget.totalHours) > 1 ? 's' : ''}.{' '}
                  {pausesRemaining(pauseTarget)} remaining. Both you and the learner must agree
                  for the pause to take effect.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">Reason for pause</label>
            <Textarea
              value={pauseReason}
              onChange={(e) => setPauseReason(e.target.value)}
              placeholder="Why is this package being paused?"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPauseTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitPauseRequest} disabled={submittingPause}>
              {submittingPause ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Pause className="mr-2 h-4 w-4" />
              )}
              Submit Pause Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unpause Confirmation Dialog */}
      <AlertDialog open={!!unpauseTarget} onOpenChange={() => setUnpauseTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resume this package?</AlertDialogTitle>
            <AlertDialogDescription>
              {unpauseTarget?.pausedAt && (
                <>
                  This package has been paused since{' '}
                  {format(parseISO(unpauseTarget.pausedAt), 'MMMM d, yyyy')}. The expiration date
                  will be extended to account for the pause duration.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnpause}>
              <Play className="mr-2 h-4 w-4" /> Resume Package
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ── Sub-components ── */

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
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

function CreditBar({ credit }: { credit: StudentCredit }) {
  const total = credit.totalHours || 1;
  const uncommittedPct = (credit.uncommittedHours / total) * 100;
  const committedPct = (credit.committedHours / total) * 100;
  const completedPct = (credit.completedHours / total) * 100;

  return (
    <div>
      <div className="flex h-3 w-full rounded-full overflow-hidden bg-muted">
        <div
          className="bg-primary/30 transition-all"
          style={{ width: `${uncommittedPct}%` }}
          title={`Uncommitted: ${credit.uncommittedHours}h`}
        />
        <div
          className="bg-primary/60 transition-all"
          style={{ width: `${committedPct}%` }}
          title={`Committed: ${credit.committedHours}h`}
        />
        <div
          className="bg-primary transition-all"
          style={{ width: `${completedPct}%` }}
          title={`Completed: ${credit.completedHours}h`}
        />
      </div>
      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
        <span>Uncommitted: {credit.uncommittedHours}h</span>
        <span>Committed: {credit.committedHours}h</span>
        <span>Completed: {credit.completedHours}h</span>
      </div>
    </div>
  );
}

function PackageStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    active: { label: 'Active', className: '' },
    paused: {
      label: 'Paused',
      className: 'bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300',
    },
    expired: {
      label: 'Expired',
      className: 'bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300',
    },
    completed: {
      label: 'Completed',
      className: 'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300',
    },
  };
  const c = config[status] ?? { label: status, className: '' };
  return (
    <Badge variant="secondary" className={c.className}>
      {c.label}
    </Badge>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold mt-1">{value}</p>
    </div>
  );
}
