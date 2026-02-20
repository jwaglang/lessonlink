'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  CreditCard,
  CheckCircle2,
  Circle,
  Loader2,
  TrendingDown,
  Wallet,
} from 'lucide-react';
import {
  getStudentCreditsByStudentId,
  getPaymentsByStudentId,
} from '@/lib/firestore';
import type { StudentCredit, Payment } from '@/lib/types';
import Loading from '@/app/loading';
import { useAuth } from '@/components/auth-provider';
import { format, parseISO } from 'date-fns';

// ── Balance gauge ─────────────────────────────────────────────────────────────
// Thresholds (in hours)
const FULL_TANK = 10;   // ≥ 10h = green / full
const LOW_MARK = 3;     // < 3h = red / top-up zone
const AMBER_MARK = 6;   // < 6h = amber / getting low

function BalanceGauge({ hoursRemaining }: { hoursRemaining: number }) {
  const capped = Math.min(hoursRemaining, FULL_TANK);
  const pct = Math.round((capped / FULL_TANK) * 100);

  let color = 'bg-green-500';
  let label = 'Healthy';
  let labelColor = 'text-green-600';
  let description = 'You have plenty of hours. No action needed.';

  if (hoursRemaining < LOW_MARK) {
    color = 'bg-red-500';
    label = 'Top-up zone';
    labelColor = 'text-red-600';
    description = 'Your balance is running very low. Consider purchasing a new package soon.';
  } else if (hoursRemaining < AMBER_MARK) {
    color = 'bg-amber-500';
    label = 'Getting low';
    labelColor = 'text-amber-600';
    description = 'Your balance is getting low. You may want to top up before it runs out.';
  }

  // Gauge segments (5 ticks)
  const ticks = [0, 2, 4, 6, 8, 10];

  return (
    <div className="space-y-3">
      {/* Bar */}
      <div className="relative h-5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Tick labels */}
      <div className="flex justify-between text-xs text-muted-foreground px-0.5">
        {ticks.map((t) => (
          <span key={t}>{t}h</span>
        ))}
      </div>

      {/* Status */}
      <div className="flex items-center justify-between">
        <span className={`text-sm font-semibold ${labelColor}`}>{label}</span>
        <span className="text-sm text-muted-foreground">{hoursRemaining.toFixed(1)}h remaining</span>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

// ── Credit activity row ───────────────────────────────────────────────────────

function CreditRow({ credit }: { credit: StudentCredit }) {
  const available = credit.uncommittedHours ?? 0;
  const committed = credit.committedHours ?? 0;
  const completed = credit.completedHours ?? 0;
  const total = credit.totalHours ?? 0;

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <span>Course credit</span>
        </div>
        <span className="text-xs text-muted-foreground">{total}h total</span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-md bg-green-50 dark:bg-green-950 p-2">
          <p className="font-semibold text-green-700 dark:text-green-400">{available.toFixed(1)}h</p>
          <p className="text-muted-foreground mt-0.5">Available</p>
        </div>
        <div className="rounded-md bg-amber-50 dark:bg-amber-950 p-2">
          <p className="font-semibold text-amber-700 dark:text-amber-400">{committed.toFixed(1)}h</p>
          <p className="text-muted-foreground mt-0.5">Committed</p>
        </div>
        <div className="rounded-md bg-blue-50 dark:bg-blue-950 p-2">
          <p className="font-semibold text-blue-700 dark:text-blue-400">{completed.toFixed(1)}h</p>
          <p className="text-muted-foreground mt-0.5">Completed</p>
        </div>
      </div>
    </div>
  );
}

// ── Payment row ───────────────────────────────────────────────────────────────

function PaymentRow({ payment }: { payment: Payment }) {
  const statusColor: Record<string, string> = {
    completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    refunded: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  const methodLabel: Record<string, string> = {
    stripe: 'Stripe',
    bank_transfer: 'Bank Transfer',
    cash: 'Cash',
    paypal: 'PayPal',
    wechat_pay: 'WeChat Pay',
    other: 'Other',
  };

  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div className="flex items-center gap-3">
        {payment.status === 'completed' ? (
          <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
        ) : payment.status === 'refunded' ? (
          <TrendingDown className="h-4 w-4 text-red-500 flex-shrink-0" />
        ) : (
          <Circle className="h-4 w-4 text-amber-500 flex-shrink-0" />
        )}
        <div>
          <p className="text-sm font-medium">
            {methodLabel[payment.method] ?? payment.method}
          </p>
          <p className="text-xs text-muted-foreground">
            {format(parseISO(payment.paymentDate), 'MMM d, yyyy')}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge
          className={`text-xs ${statusColor[payment.status] ?? ''}`}
          variant="outline"
        >
          {payment.status}
        </Badge>
        <span className="text-sm font-semibold tabular-nums">
          {payment.currency.toUpperCase()} {(payment.amount ?? 0).toFixed(2)}
        </span>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function MyBalancePage() {
  const { user } = useAuth();

  const [credits, setCredits] = useState<StudentCredit[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user?.uid) return;
      const [creditData, paymentData] = await Promise.all([
        getStudentCreditsByStudentId(user.uid),
        getPaymentsByStudentId(user.uid),
      ]);
      setCredits(creditData);
      // Sort payments newest first
      setPayments(
        [...paymentData].sort(
          (a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
        )
      );
      setLoading(false);
    }
    fetchData();
  }, [user]);

  if (loading) return <Loading />;

  // Aggregate totals across all credits
  const totalAvailable = credits.reduce((sum, c) => sum + (c.uncommittedHours ?? 0), 0);
  const totalCommitted = credits.reduce((sum, c) => sum + (c.committedHours ?? 0), 0);
  const totalCompleted = credits.reduce((sum, c) => sum + (c.completedHours ?? 0), 0);
  const totalPurchased = credits.reduce((sum, c) => sum + (c.totalHours ?? 0), 0);
  const hoursRemaining = totalAvailable + totalCommitted; // available + reserved (not yet consumed)

  const totalSpent = payments
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + (p.amount ?? 0), 0);

  const currency = payments.find((p) => p.status === 'completed')?.currency?.toUpperCase() ?? 'USD';

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8">
      <PageHeader
        title="My Balance"
        description="Your current credit balance, payment history, and credit activity."
      />

      {/* ── Section 1: Current Balance ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Current Balance</h2>
        </div>

        {/* Balance Gauge — at a glance */}
        <Card>
          <CardContent className="pt-6">
            <BalanceGauge hoursRemaining={hoursRemaining} />
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-sm">Hours Remaining</span>
              </div>
              <p className="text-3xl font-bold">{hoursRemaining.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground mt-1">available + committed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm">Hours Used</span>
              </div>
              <p className="text-3xl font-bold">{totalCompleted.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground mt-1">of {totalPurchased.toFixed(1)}h purchased</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <CreditCard className="h-4 w-4" />
                <span className="text-sm">Total Spent</span>
              </div>
              <p className="text-3xl font-bold">{totalSpent.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">{currency} across all payments</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Section 2: Credit Activity ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Credit Activity</h2>
        </div>
        <p className="text-sm text-muted-foreground -mt-2">
          How your hours are allocated across courses.
        </p>

        {credits.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {credits.map((c) => (
              <CreditRow key={c.id} credit={c} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-3xl mb-3">🦗</p>
              <p className="text-muted-foreground font-medium">It's a little quiet right now…</p>
              <p className="text-sm text-muted-foreground mt-1">No credit activity yet.</p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* ── Section 3: Payment History ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Payment History</h2>
        </div>

        {payments.length > 0 ? (
          <Card>
            <CardContent className="pt-4 px-4 pb-2">
              {payments.map((p) => (
                <PaymentRow key={p.id} payment={p} />
              ))}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-3xl mb-3">🦗</p>
              <p className="text-muted-foreground font-medium">It's a little quiet right now…</p>
              <p className="text-sm text-muted-foreground mt-1">No payments on record yet.</p>
            </CardContent>
          </Card>
        )}
      </section>

    </div>
  );
}
