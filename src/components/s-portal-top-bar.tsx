'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { CalendarClock, ShoppingBag, GraduationCap, Search } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import {
  getStudentById,
  getStudentCreditsByStudentId,
  getTeacherProfileById,
} from '@/lib/firestore';
import type { TeacherProfile } from '@/lib/types';

const LOW_CREDIT_THRESHOLD = 6; // hours — below this, Top Up becomes primary

export default function SPortalTopBar() {
  const { user } = useAuth();
  const router = useRouter();

  const [hoursRemaining, setHoursRemaining] = useState<number | null>(null);
  const [assignedTutor, setAssignedTutor] = useState<TeacherProfile | null>(null);
  const [topUpDialogOpen, setTopUpDialogOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!user?.uid) return;

      const [student, credits] = await Promise.all([
        getStudentById(user.uid),
        getStudentCreditsByStudentId(user.uid),
      ]);

      // Calculate hours remaining
      const remaining = credits.reduce(
        (sum, c) => sum + (c.uncommittedHours ?? 0) + (c.committedHours ?? 0),
        0
      );
      setHoursRemaining(remaining);

      // Fetch assigned tutor profile
      if (student?.assignedTeacherId) {
        const tutor = await getTeacherProfileById(student.assignedTeacherId);
        setAssignedTutor(tutor);
      }
    }
    fetchData();
  }, [user]);

  // Context-aware: if credit is low or zero, Top Up is primary
  const creditIsLow = hoursRemaining !== null && hoursRemaining < LOW_CREDIT_THRESHOLD;

  const bookButton = (
    <Button
      variant={creditIsLow ? 'outline' : 'default'}
      size="sm"
      onClick={() => router.push('/s-portal/calendar')}
      className="gap-1.5"
    >
      <CalendarClock className="h-4 w-4" />
      Book
    </Button>
  );

  const topUpButton = (
    <Button
      variant={creditIsLow ? 'default' : 'outline'}
      size="sm"
      onClick={() => setTopUpDialogOpen(true)}
      className="gap-1.5"
    >
      <ShoppingBag className="h-4 w-4" />
      Top Up
    </Button>
  );

  return (
    <>
      {/* Top bar */}
      <div className="flex items-center justify-end gap-2 px-4 py-2 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        {creditIsLow ? (
          <>
            {topUpButton}
            {bookButton}
          </>
        ) : (
          <>
            {bookButton}
            {topUpButton}
          </>
        )}
      </div>

      {/* Top Up dialog */}
      <Dialog open={topUpDialogOpen} onOpenChange={setTopUpDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Top Up</DialogTitle>
            <DialogDescription>
              {creditIsLow
                ? 'Your credit is running low. Top up to keep booking sessions.'
                : 'Purchase a package to add more hours to your balance.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 pt-2">
            {assignedTutor ? (
              <Button
                asChild
                className="w-full justify-start gap-3 h-auto py-3"
                onClick={() => setTopUpDialogOpen(false)}
              >
                <Link href="/s-portal/top-up">
                  <GraduationCap className="h-5 w-5 flex-shrink-0" />
                  <div className="text-left">
                    <p className="font-semibold">Add credit for {assignedTutor.name}</p>
                    <p className="text-xs opacity-80 font-normal">View sessions for your current tutor</p>
                  </div>
                </Link>
              </Button>
            ) : null}

            <Button
              asChild
              variant={assignedTutor ? 'outline' : 'default'}
              className="w-full justify-start gap-3 h-auto py-3"
              onClick={() => setTopUpDialogOpen(false)}
            >
              <Link href="/s-portal/t-profiles">
                <Search className="h-5 w-5 flex-shrink-0" />
                <div className="text-left">
                  <p className="font-semibold">Explore tutors</p>
                  <p className="text-xs opacity-80 font-normal">Browse all available tutors and their packages</p>
                </div>
              </Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
