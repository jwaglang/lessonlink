'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { getStudentPackages, getStudentCreditsByStudentId } from '@/lib/firestore';
import { calculatePrice, type PackageType, type Duration } from '@/lib/pricing';
import type { StudentPackage, StudentCredit } from '@/lib/types';
import PageHeader from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Clock, Package, CreditCard, Wallet, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';

export default function TopUpPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [selectedDuration, setSelectedDuration] = useState<Duration>(60);
  const [purchaseLoading, setPurchaseLoading] = useState<PackageType | null>(null);
  const [packages, setPackages] = useState<StudentPackage[]>([]);
  const [credits, setCredits] = useState<StudentCredit[]>([]);
  const [loading, setLoading] = useState(true);

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
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user?.uid]);

  // Total hours remaining across all credits
  const totalHoursRemaining = credits.reduce(
    (sum, c) => sum + (c.uncommittedHours ?? 0) + (c.committedHours ?? 0),
    0
  );

  async function handlePurchase(packageType: PackageType) {
    if (!user || !user.email) return;
    setPurchaseLoading(packageType);

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageType,
          duration: selectedDuration,
          studentId: user.uid,
          studentEmail: user.email,
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('No checkout URL returned:', data);
        setPurchaseLoading(null);
      }
    } catch (err) {
      console.error('Purchase error:', err);
      setPurchaseLoading(null);
    }
  }

  const packageOptions: { type: PackageType; label: string; description: string; icon: string }[] = [
    { type: 'single', label: 'Single Session', description: 'Try a lesson or make up a missed one', icon: '🎯' },
    { type: '10-pack', label: '10-Pack', description: 'Great for short-term goals', icon: '📦' },
    { type: 'full-course', label: 'Full Course (60 hrs)', description: 'Complete one proficiency level', icon: '🎓' },
  ];

  if (loading) {
    return (
      <div className="flex flex-col gap-8 p-4 md:p-8">
        <PageHeader title="Top Up" description="Add hours to your balance" />
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8">
      <div className="mb-2">
        <Link href="/s-portal">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      <PageHeader title="Top Up" description="Purchase hours to use on any course">
        <div className="flex items-center gap-3">
          <Card className="px-4 py-2">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Balance:</span>
              <span className="font-bold text-lg">{totalHoursRemaining.toFixed(1)}h</span>
            </div>
          </Card>
        </div>
      </PageHeader>

      {/* Duration Toggle */}
      <div>
        <p className="text-sm font-medium mb-3">Session Duration</p>
        <div className="flex gap-3">
          {([30, 60] as Duration[]).map((d) => (
            <Button
              key={d}
              variant={selectedDuration === d ? 'default' : 'outline'}
              onClick={() => setSelectedDuration(d)}
              className="flex-1"
            >
              <Clock className="h-4 w-4 mr-2" />
              {d} minutes
            </Button>
          ))}
        </div>
      </div>

      {/* Package Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {packageOptions.map((opt) => {
          const price = calculatePrice(opt.type, selectedDuration);
          const isLoading = purchaseLoading === opt.type;

          return (
            <Card key={opt.type} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="text-2xl">{opt.icon}</span>
                    {opt.label}
                  </CardTitle>
                  {price.discountPercent > 0 && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                      {price.discountPercent}% off
                    </Badge>
                  )}
                </div>
                <CardDescription>{opt.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Per lesson</span>
                    <span>
                      {price.discountPercent > 0 && (
                        <span className="line-through text-muted-foreground mr-2">
                          €{price.basePerLesson.toFixed(2)}
                        </span>
                      )}
                      <span className="font-semibold">€{price.discountedPerLesson.toFixed(2)}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Sessions</span>
                    <span>{price.sessions}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total hours</span>
                    <span>{price.hours}h</span>
                  </div>
                  <div className="flex items-center justify-between text-sm border-t pt-2 mt-2">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>€{price.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Processing fee (3%)</span>
                    <span>€{price.processingFee.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-bold border-t pt-2 mt-1">
                    <span>Total</span>
                    <span>€{price.total.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
              <div className="p-6 pt-0">
                <Button
                  className="w-full"
                  onClick={() => handlePurchase(opt.type)}
                  disabled={!!purchaseLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Purchase
                    </>
                  )}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Purchase History */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Package className="h-5 w-5" />
          Purchase History
        </h2>
        {packages.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No purchases yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {packages.map((pkg) => (
              <Card key={pkg.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{pkg.courseTitle}</p>
                      <p className="text-sm text-muted-foreground">
                        {pkg.totalHours}h · Purchased {pkg.purchaseDate ? format(parseISO(pkg.purchaseDate), 'MMM d, yyyy') : '—'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">€{pkg.price?.toFixed(2) ?? '—'}</p>
                      <Badge
                        variant="secondary"
                        className={
                          pkg.status === 'active'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : pkg.status === 'expired'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                            : ''
                        }
                      >
                        {pkg.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
