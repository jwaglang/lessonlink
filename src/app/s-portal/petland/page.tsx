'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { getStudentById } from '@/lib/firestore';
import StudentDashboard from '@/modules/petland/components/student-dashboard';
import PageHeader from '@/components/page-header';

export default function PetlandPage() {
  const { user, loading: authLoading } = useAuth();
  const [learnerName, setLearnerName] = useState('');
  const [nameLoading, setNameLoading] = useState(true);
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') ?? 'home';

  useEffect(() => {
    if (authLoading || !user?.uid) return;
    async function fetchName() {
      const student = await getStudentById(user!.uid);
      setLearnerName(student?.name ?? '');
      setNameLoading(false);
    }
    fetchName();
  }, [user?.uid, authLoading]);

  if (authLoading || nameLoading) {
    return (
      <div className="flex items-center justify-center p-16">
        <p className="text-muted-foreground">Loading Petland...</p>
      </div>
    );
  }

  if (!user?.uid) return null;

  return (
    <div className="p-4 md:p-8">
      <PageHeader title="Petland" description="Your virtual pet companion" />
      <div className="mt-6">
        <StudentDashboard learnerId={user.uid} learnerName={learnerName} viewerRole="student" initialTab={initialTab} />
      </div>
    </div>
  );
}
