'use client';

import { useState, useEffect } from 'react';
import type { Student, Payment, PaymentType, PaymentMethod, PaymentStatus, Course } from '@/lib/types';
import {
  getPaymentsByStudentId,
  createPayment,
  updatePayment,
  getCourses,
  createStudentCredit,
  getStudentCredit,
  updateStudentCredit,
} from '@/lib/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  DollarSign,
  Plus,
  Info,
  CreditCard,
  Loader2,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

const CURRENCY_OPTIONS = [
  { value: 'EUR', label: 'EUR (€)', symbol: '€' },
  { value: 'USD', label: 'USD ($)', symbol: '$' },
  { value: 'GBP', label: 'GBP (£)', symbol: '£' },
  { value: 'CNY', label: 'CNY (¥)', symbol: '¥' },
];

const TYPE_OPTIONS: { value: PaymentType; label: string }[] = [
  { value: 'one_off', label: 'One-off' },
  { value: 'package', label: 'Package' },
  { value: 'course', label: 'Course' },
];

const METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'wechat_pay', label: 'WeChat Pay' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'other', label: 'Other' },
];

interface PaymentsTabProps {
  studentId: string;
  student: Student;
}

export default function PaymentsTab({ studentId, student }: PaymentsTabProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Record payment dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formAmount, setFormAmount] = useState('');
  const [formCurrency, setFormCurrency] = useState('EUR');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formType, setFormType] = useState<PaymentType>('one_off');
  const [formMethod, setFormMethod] = useState<PaymentMethod>('bank_transfer');
  const [formNotes, setFormNotes] = useState('');
  const [formCourseId, setFormCourseId] = useState('');
  const [formHours, setFormHours] = useState('');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [paymentData, courseData] = await Promise.all([
          getPaymentsByStudentId(studentId),
          getCourses(),
        ]);
        setPayments(paymentData);
        setCourses(courseData);
      } catch (err) {
        console.error('Error fetching payments:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [studentId]);

  function resetForm() {
    setFormAmount('');
    setFormCurrency('EUR');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormType('one_off');
    setFormMethod('bank_transfer');
    setFormNotes('');
    setFormCourseId('');
    setFormHours('');
  }

  async function handleSubmit() {
    const amount = parseFloat(formAmount);
    if (!amount || amount <= 0) return;

    setSubmitting(true);
    try {
      const payment = await createPayment({
        studentId,
        amount,
        currency: formCurrency,
        paymentDate: formDate,
        type: formType,
        method: formMethod,
        notes: formNotes || undefined,
        courseId: formCourseId || undefined,
        status: 'completed',
        createdAt: new Date().toISOString(),
      });

      // If package payment with hours, create/update StudentCredit
      if (formType === 'package' && formCourseId && formHours) {
        const hours = parseFloat(formHours);
        if (hours > 0) {
          const existingCredit = await getStudentCredit(studentId, formCourseId);
          if (existingCredit) {
            await updateStudentCredit(existingCredit.id, {
              totalHours: existingCredit.totalHours + hours,
              uncommittedHours: existingCredit.uncommittedHours + hours,
              updatedAt: new Date().toISOString(),
            });
          } else {
            await createStudentCredit({
              studentId,
              courseId: formCourseId,
              packageId: '',
              totalHours: hours,
              uncommittedHours: hours,
              committedHours: 0,
              completedHours: 0,
              currency: formCurrency,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        }
      }

      setPayments((prev) => [payment, ...prev]);
      setDialogOpen(false);
      resetForm();
    } catch (err) {
      console.error('Error recording payment:', err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMarkRefunded(paymentId: string) {
    try {
      await updatePayment(paymentId, { status: 'refunded' });
      setPayments((prev) =>
        prev.map((p) => (p.id === paymentId ? { ...p, status: 'refunded' as PaymentStatus } : p))
      );
    } catch (err) {
      console.error('Error updating payment:', err);
    }
  }

  function getCurrencySymbol(code: string): string {
    return CURRENCY_OPTIONS.find((c) => c.value === code)?.symbol ?? code;
  }

  function getMethodLabel(method: string): string {
    return METHOD_OPTIONS.find((m) => m.value === method)?.label ?? method;
  }

  function getTypeLabel(type: string): string {
    return TYPE_OPTIONS.find((t) => t.value === type)?.label ?? type;
  }

  // Summary
  const totalReceived = payments
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0);
  const defaultCurrency = payments.length > 0 ? payments[0].currency : 'EUR';

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-sm text-muted-foreground">Loading payments...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Stripe banner */}
      <div className="flex items-center gap-3 rounded-md border border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800 px-4 py-3">
        <CreditCard className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
        <p className="text-sm text-green-800 dark:text-green-300">
          Stripe payments are active. Students can purchase packages from your profile page.
        </p>
      </div>

      {/* Summary + action */}
      <div className="flex items-center justify-between">
        <div>
          {payments.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Total received: <span className="font-semibold text-foreground">{getCurrencySymbol(defaultCurrency)}{totalReceived.toFixed(2)}</span>
              {' '}across {payments.filter((p) => p.status === 'completed').length} payment{payments.filter((p) => p.status === 'completed').length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Record Payment
        </Button>
      </div>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-5 w-5" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between rounded-md border px-4 py-3"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-muted">
                      <DollarSign className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {getCurrencySymbol(payment.currency)}{payment.amount.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(payment.paymentDate), 'MMM d, yyyy')} — {getMethodLabel(payment.method)}
                      </p>
                      {payment.notes && (
                        <p className="text-xs text-muted-foreground mt-0.5">{payment.notes}</p>
                      )}
                      {payment.stripeSessionId && (
                        <p className="text-xs text-muted-foreground mt-0.5">Stripe: {payment.stripeSessionId.slice(0, 20)}...</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {getTypeLabel(payment.type)}
                    </Badge>
                    <PaymentStatusBadge status={payment.status} />
                    {payment.status === 'completed' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground"
                        onClick={() => handleMarkRefunded(payment.id)}
                      >
                        Refund
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Record Payment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Manually record a payment for {student.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Amount + Currency */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Amount
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Currency
                </label>
                <select
                  value={formCurrency}
                  onChange={(e) => setFormCurrency(e.target.value)}
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {CURRENCY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Payment Date
              </label>
              <Input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Type */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Type
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as PaymentType)}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Package-specific fields */}
            {formType === 'package' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Course
                  </label>
                  <select
                    value={formCourseId}
                    onChange={(e) => setFormCourseId(e.target.value)}
                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select course...</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Hours Purchased
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={formHours}
                    onChange={(e) => setFormHours(e.target.value)}
                    placeholder="10"
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            {/* Method */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Method
              </label>
              <select
                value={formMethod}
                onChange={(e) => setFormMethod(e.target.value as PaymentMethod)}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {METHOD_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Notes (optional)
              </label>
              <Textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Additional details..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || !formAmount}>
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <DollarSign className="mr-2 h-4 w-4" />
              )}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Sub-components ── */

function PaymentStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    completed: {
      label: 'Completed',
      className: 'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300',
    },
    pending: {
      label: 'Pending',
      className: 'bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300',
    },
    refunded: {
      label: 'Refunded',
      className: 'bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300',
    },
  };
  const c = config[status] ?? { label: status, className: '' };
  return (
    <Badge variant="secondary" className={c.className}>
      {c.label}
    </Badge>
  );
}
