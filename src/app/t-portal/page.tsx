'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/page-header';
import { useAuth } from '@/components/auth-provider';
import {
  getStudents,
  getSessionInstancesByTeacherUid,
  createMessage,
  getAllStudentPackages,
  getAllStudentProgress,
  getAllStudentCredits,
  getApprovalRequests,
} from '@/lib/firestore';
import {
  BarChart,
  Users,
  DollarSign,
  Package,
  BookOpen,
  ShieldAlert,
} from 'lucide-react';
import { format, isFuture, parseISO } from 'date-fns';
import RevenueChart from './reports/components/revenue-chart';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Student, SessionInstance, StudentPackage, StudentCredit, StudentProgress as SP, ApprovalRequest } from '@/lib/types';
import { generateTutorAlerts, getAlertConfig, type Alert } from '@/lib/alerts';

type ConversionRate = {
  from: string;
  to: string;
  rate: number;
};

function instanceDateIso(instance: SessionInstance): string {
  const anyInst = instance as any;
  return anyInst.lessonDate || anyInst.date || '';
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [sessionInstances, setSessionInstances] = useState<SessionInstance[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [defaultCurrency, setDefaultCurrency] = useState('EUR');

  // Enriched data
  const [allPackages, setAllPackages] = useState<StudentPackage[]>([]);
  const [allProgress, setAllProgress] = useState<SP[]>([]);

  // Star Trek Alert System
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!user?.uid) return;

      const studentData = await getStudents();
      setStudents(studentData);

      // Fetch real sessions for this tutor
      let instanceData: SessionInstance[] = [];
      try {
        instanceData = await getSessionInstancesByTeacherUid(user.uid);
      } catch (e) {
        console.error('Error fetching sessions:', e);
      }
      setSessionInstances(instanceData);

      // Fetch packages, progress, credits, and approvals
      const [pkgData, progressData, creditData, approvalData] = await Promise.all([
        getAllStudentPackages(),
        getAllStudentProgress(),
        getAllStudentCredits(),
        getApprovalRequests(),
      ]);
      setAllPackages(pkgData);
      setAllProgress(progressData);

      // Generate alerts
      const generatedAlerts = generateTutorAlerts(
        studentData,
        pkgData,
        creditData,
        instanceData,
        approvalData
      );
      setAlerts(generatedAlerts);

      // Revenue calculation
      const savedSettings = localStorage.getItem('lessonLinkSettings');
      let rates: ConversionRate[] = [
        { from: 'USD', to: 'EUR', rate: 0.92 },
        { from: 'RUB', to: 'EUR', rate: 0.01 },
        { from: 'CNY', to: 'EUR', rate: 0.13 },
      ];
      let currency = 'EUR';

      if (savedSettings) {
        const { currencySettings } = JSON.parse(savedSettings);
        if (currencySettings) {
          rates = currencySettings.conversionRates;
          currency = currencySettings.defaultCurrency;
          setDefaultCurrency(currency);
        }
      }

      const revenue = instanceData
        .filter((l: any) => l.status === 'paid' && l.paymentAmount && l.paymentCurrency)
        .reduce((sum: number, l: any) => {
          if (l.paymentCurrency === currency) return sum + l.paymentAmount!;
          const conversion = rates.find(r => r.from === l.paymentCurrency && r.to === currency);
          return conversion ? sum + (l.paymentAmount! * conversion.rate) : sum;
        }, 0);

      setTotalRevenue(revenue);

      // Send one-time chat notification for red/yellow alerts (once per day)
      const redYellowAlerts = generatedAlerts.filter((a) => a.level === 'red' || a.level === 'yellow');
      if (redYellowAlerts.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        const notifKey = `ll-alerts-notified-${today}`;
        if (!localStorage.getItem(notifKey)) {
          const summary = redYellowAlerts
            .slice(0, 10)
            .map((a) => `[${a.level.toUpperCase()}] ${a.title}: ${a.description}`)
            .join('\n');
          try {
            await createMessage({
              type: 'notification',
              from: 'system',
              fromType: 'system',
              to: user?.uid ?? '',
              toType: 'teacher',
              content: `Daily Alert Summary — ${redYellowAlerts.length} alert${redYellowAlerts.length !== 1 ? 's' : ''} require your attention:\n\n${summary}`,
              timestamp: new Date().toISOString(),
              read: false,
              actionLink: '/t-portal',
              createdAt: new Date().toISOString(),
            });
            localStorage.setItem(notifKey, 'true');
          } catch (err) {
            console.error('Failed to send alert notification:', err);
          }
        }
      }
    }

    fetchData();
  }, [user?.uid]);

  // Derived data
  const upcomingSessions = sessionInstances
    .filter((instance) => {
      const d = instanceDateIso(instance);
      return d ? isFuture(parseISO(d)) : false;
    })
    .sort((a, b) => new Date(instanceDateIso(a)).getTime() - new Date(instanceDateIso(b)).getTime())
    .slice(0, 5);

  // Package stats
  const activePackages = allPackages.filter((p) => p.status === 'active');
  const totalHoursRemaining = activePackages.reduce((sum, p) => sum + (p.hoursRemaining ?? 0), 0);

  // Progress stats
  const learnersWithProgress = new Set(allProgress.map((p) => p.studentId)).size;
  const avgCompletion = allProgress.length > 0
    ? allProgress.reduce((sum, p) => sum + p.percentComplete, 0) / allProgress.length
    : 0;

  const currencySymbols: { [key: string]: string } = {
    EUR: '€',
    USD: '$',
    GBP: '£',
    JPY: '¥',
  };

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8">
      <PageHeader title="Tutor Dashboard" />

      {/* Star Trek Alert System */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 font-headline">
                <ShieldAlert className="h-5 w-5" />
                Alerts
                <Badge variant="secondary" className="ml-1">
                  {alerts.length}
                </Badge>
              </CardTitle>
              {alerts.length > 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllAlerts(!showAllAlerts)}
                >
                  {showAllAlerts ? 'Show less' : `View all (${alerts.length})`}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {(showAllAlerts ? alerts : alerts.slice(0, 3)).map((alert) => {
              const config = getAlertConfig(alert.level);
              return (
                <div
                  key={alert.id}
                  className={`border-l-4 ${config.borderColor} ${config.bgColor} rounded-md p-3`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${config.badgeClass}`}>
                          {config.label}
                        </span>
                        <span className={`text-sm font-semibold ${config.textColor}`}>
                          {alert.title}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{alert.description}</p>
                    </div>
                    {alert.link && (
                      <Link
                        href={alert.link}
                        className="text-xs text-primary hover:underline whitespace-nowrap"
                      >
                        View
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {alerts.length === 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-headline">
              <ShieldAlert className="h-5 w-5" />
              Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">All systems nominal.</p>
          </CardContent>
        </Card>
      )}

      {/* Row 1: Key stat cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">
              {currencySymbols[defaultCurrency] || '$'}{totalRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Across all paid sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Learners</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">
              {students.filter(s => s.status === 'active' || s.status === 'trial').length}
            </div>
            <p className="text-xs text-muted-foreground">
              {students.length} total learners
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessions</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">
              {sessionInstances.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {upcomingSessions.length} upcoming
            </p>
          </CardContent>
        </Card>

      </div>

      {/* Row 2: Progress + Packages enriched cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Learner Progress Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline">
              <BookOpen className="h-5 w-5" />
              Learner Progress
            </CardTitle>
            <CardDescription>
              Course progress overview across all learners
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-md border p-3 text-center">
                <p className="text-2xl font-bold">{learnersWithProgress}</p>
                <p className="text-xs text-muted-foreground">Learners with progress</p>
              </div>
              <div className="rounded-md border p-3 text-center">
                <p className="text-2xl font-bold">{avgCompletion.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">Average completion</p>
              </div>
            </div>
            {allProgress.length > 0 ? (
              <div className="space-y-3">
                {/* Show top 5 most recent progress entries */}
                {allProgress.slice(0, 5).map((prog) => {
                  const student = students.find((s) => s.id === prog.studentId);
                  return (
                    <div key={prog.id} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{student?.name ?? 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">
                          {prog.unitsCompleted}/{prog.unitsTotal} units · {prog.sessionsCompleted}/{prog.sessionsTotal} sessions
                        </p>
                      </div>
                      <div className="w-24 flex items-center gap-2">
                        <Progress value={prog.percentComplete} className="h-2 flex-1" />
                        <span className="text-xs text-muted-foreground w-8 text-right">
                          {prog.percentComplete}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No course progress recorded yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Packages Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline">
              <Package className="h-5 w-5" />
              Packages Overview
            </CardTitle>
            <CardDescription>
              Active packages and credit hours
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-md border p-3 text-center">
                <p className="text-2xl font-bold">{activePackages.length}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
              <div className="rounded-md border p-3 text-center">
                <p className="text-2xl font-bold">{totalHoursRemaining.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Hours left</p>
              </div>
              <div className="rounded-md border p-3 text-center">
                <p className="text-2xl font-bold">{allPackages.filter((p) => p.status === 'paused').length}</p>
                <p className="text-xs text-muted-foreground">Paused</p>
              </div>
            </div>

            {allPackages.length === 0 && (
              <p className="text-sm text-muted-foreground">No packages created yet.</p>
            )}

            {allPackages.length > 0 && (
              <p className="text-sm text-muted-foreground">{allPackages.length} total package{allPackages.length !== 1 ? 's' : ''}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Revenue chart + Upcoming Sessions */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="font-headline">Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="font-headline">Upcoming Sessions</CardTitle>
            <CardDescription>
              Your next 5 scheduled sessions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingSessions.length > 0 ? (
              upcomingSessions.map((session: any) => {
                const student = students.find((st) => st.id === session.studentId);
                const studentImage = PlaceHolderImages.find(img => img.id === `student${student?.id}`);
                const dateIso = instanceDateIso(session);

                return (
                  <div key={session.id} className="flex items-center space-x-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={studentImage?.imageUrl} alt={student?.name} data-ai-hint={studentImage?.imageHint} />
                      <AvatarFallback>{student?.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium leading-none">{student?.name}</p>
                      <p className="text-sm text-muted-foreground">{session.title}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{dateIso ? format(parseISO(dateIso), 'MMM d') : ''}</p>
                      <p className="text-xs text-muted-foreground">{session.startTime}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming sessions.</p>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
