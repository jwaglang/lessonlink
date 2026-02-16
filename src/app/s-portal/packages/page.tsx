'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import {
  getStudentPackages,
  getStudentCreditsByStudentId,
  requestPausePackage,
} from '@/lib/firestore';
import { canPause, pausesRemaining, getMaxPauses } from '@/lib/pause-rules';
import type { StudentPackage, StudentCredit } from '@/lib/types';
import PageHeader from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  CreditCard,
  Package,
  Clock,
  CalendarDays,
  Pause,
  Loader2,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import { format, parseISO, differenceInDays } from 'date-fns';

export default function MyPackagesPage() {
  const { user } = useAuth();
  const [packages, setPackages] = useState<StudentPackage[]>([]);
  const [credits, setCredits] = useState<StudentCredit[]>([]);
  const [loading, setLoading] = useState(true);

  // Pause request dialog
  const [pausePkg, setPausePkg] = useState<StudentPackage | null>(null);
  const [pauseReason, setPauseReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!user?.uid) return;
      setLoading(true);
      try {
        const [pkgData, creditData] = await Promise.all([
          getStudentPackages(user.uid),
          getStudentCreditsByStudentId(user.uid),
        ]);
        setPackages(pkgData);
        setCredits(creditData);
      } catch (err) {
        console.error('Error fetching packages:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user?.uid]);

  async function handlePauseRequest() {
    if (!pausePkg || !user?.uid) return;
    setSubmitting(true);
    try {
      await requestPausePackage(
        pausePkg,
        '',             // student name — filled by Firestore function
        user.email ?? '',
        pausePkg.studentId, // teacherUid placeholder
        pauseReason || undefined
      );
      setPausePkg(null);
      setPauseReason('');
      // Refresh packages
      const updated = await getStudentPackages(user.uid);
      setPackages(updated);
    } catch (err) {
      console.error('Error requesting pause:', err);
    } finally {
      setSubmitting(false);
    }
  }

  function getCreditForPackage(pkg: StudentPackage): StudentCredit | undefined {
    return credits.find((c) => c.courseId === pkg.courseId);
  }

  // Summary stats
  const activePackages = packages.filter((p) => p.status === 'active');
  const totalHoursRemaining = activePackages.reduce((sum, p) => sum + p.remainingHours, 0);
  const totalHours = packages.reduce((sum, p) => sum + p.totalHours, 0);

  if (loading) {
    return (
      <div className="flex flex-col gap-8 p-4 md:p-8">
        <PageHeader title="My Packages" description="View your purchased lesson packages">
          <Link href="/s-portal/calendar">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Book a Session
            </Button>
          </Link>
        </PageHeader>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading packages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8">
      <PageHeader
        title="My Packages"
        description="Your purchased lesson packages and credit balances"
      >
        <Link href="/s-portal/calendar">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Book a Session
          </Button>
        </Link>
      </PageHeader>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Packages</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{packages.length}</div>
            <p className="text-xs text-muted-foreground">{activePackages.length} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours}</div>
            <p className="text-xs text-muted-foreground">purchased</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hours Remaining</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHoursRemaining.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">across active packages</p>
          </CardContent>
        </Card>
      </div>

      {/* Package list */}
      {packages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No packages purchased yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Contact your tutor to purchase a lesson package.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {packages.map((pkg) => {
            const credit = getCreditForPackage(pkg);
            const daysLeft = pkg.expiresAt
              ? differenceInDays(parseISO(pkg.expiresAt), new Date())
              : null;
            const usedPercent = pkg.totalHours > 0
              ? ((pkg.totalHours - pkg.remainingHours) / pkg.totalHours) * 100
              : 0;

            return (
              <Card key={pkg.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      {pkg.packageName}
                    </CardTitle>
                    <PackageStatusBadge status={pkg.status} isPaused={pkg.isPaused} />
                  </div>
                  <CardDescription className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      Purchased: {pkg.purchaseDate ? format(parseISO(pkg.purchaseDate), 'MMM d, yyyy') : '—'}
                    </span>
                    {pkg.expiresAt && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Expires: {format(parseISO(pkg.expiresAt), 'MMM d, yyyy')}
                        {daysLeft !== null && daysLeft >= 0 && daysLeft <= 14 && (
                          <Badge variant="outline" className="ml-1 text-amber-600 border-amber-300">
                            {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
                          </Badge>
                        )}
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Hours progress bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>
                        {pkg.remainingHours.toFixed(1)}h remaining of {pkg.totalHours}h
                      </span>
                      <span className="text-muted-foreground">{usedPercent.toFixed(0)}% used</span>
                    </div>
                    <Progress value={usedPercent} className="h-2" />
                  </div>

                  {/* Credit breakdown */}
                  {credit && (
                    <div className="rounded-md border p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Credit Breakdown</p>
                      <CreditBar credit={credit} />
                    </div>
                  )}

                  {/* Pause info */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {pkg.pauseCount} of {getMaxPauses(pkg.totalHours)} pause{getMaxPauses(pkg.totalHours) !== 1 ? 's' : ''} used
                    </span>
                    {pkg.status === 'active' && canPause(pkg) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPausePkg(pkg)}
                      >
                        <Pause className="h-3.5 w-3.5 mr-1" />
                        Request Pause
                      </Button>
                    )}
                    {pkg.isPaused && (
                      <Badge variant="secondary">
                        Paused since {pkg.pausedAt ? format(parseISO(pkg.pausedAt), 'MMM d') : '—'}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pause Request Dialog */}
      <Dialog open={!!pausePkg} onOpenChange={() => { setPausePkg(null); setPauseReason(''); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Pause</DialogTitle>
            <DialogDescription>
              Request a pause for {pausePkg?.packageName}. Both you and your tutor must agree to the pause.
              {pausePkg && (
                <span className="block mt-1">
                  {pausesRemaining(pausePkg)} pause{pausesRemaining(pausePkg) !== 1 ? 's' : ''} remaining for this package.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Reason (optional)
            </label>
            <Textarea
              value={pauseReason}
              onChange={(e) => setPauseReason(e.target.value)}
              placeholder="Why do you need to pause?"
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPausePkg(null); setPauseReason(''); }}>
              Cancel
            </Button>
            <Button onClick={handlePauseRequest} disabled={submitting}>
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Pause className="mr-2 h-4 w-4" />
              )}
              Request Pause
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Sub-components ── */

function PackageStatusBadge({ status, isPaused }: { status: string; isPaused: boolean }) {
  if (isPaused) {
    return <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">Paused</Badge>;
  }
  const config: Record<string, { label: string; className: string }> = {
    active: { label: 'Active', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
    expired: { label: 'Expired', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
    completed: { label: 'Completed', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  };
  const c = config[status] ?? { label: status, className: '' };
  return <Badge variant="secondary" className={c.className}>{c.label}</Badge>;
}

function CreditBar({ credit }: { credit: StudentCredit }) {
  const total = credit.totalHours || 1;
  const uncommitted = (credit.uncommittedHours / total) * 100;
  const committed = (credit.committedHours / total) * 100;
  const completed = (credit.completedHours / total) * 100;

  return (
    <div className="space-y-2">
      <div className="flex h-3 rounded-full overflow-hidden bg-muted">
        <div className="bg-blue-500" style={{ width: `${completed}%` }} title={`Completed: ${credit.completedHours}h`} />
        <div className="bg-amber-400" style={{ width: `${committed}%` }} title={`Committed: ${credit.committedHours}h`} />
        <div className="bg-green-400" style={{ width: `${uncommitted}%` }} title={`Available: ${credit.uncommittedHours}h`} />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-green-400 inline-block" />
          Available {credit.uncommittedHours}h
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-amber-400 inline-block" />
          Committed {credit.committedHours}h
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-blue-500 inline-block" />
          Completed {credit.completedHours}h
        </span>
      </div>
    </div>
  );
}
