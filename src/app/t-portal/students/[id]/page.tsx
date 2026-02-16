'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Student } from '@/lib/types';
import { getStudentById } from '@/lib/firestore';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, MessageSquare, Pause, BookOpen } from 'lucide-react';
import PageHeader from '@/components/page-header';
import ProfileProgressTab from './components/profile-progress-tab';
import SessionsTab from './components/sessions-tab';
import PackagesTab from './components/packages-tab';
import PaymentsTab from './components/payments-tab';

export default function LearnerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStudent() {
      setLoading(true);
      const data = await getStudentById(studentId);
      setStudent(data);
      setLoading(false);
    }
    if (studentId) fetchStudent();
  }, [studentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <p className="text-muted-foreground">Loading learner profile...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center p-16 gap-4">
        <p className="text-muted-foreground">Learner not found.</p>
        <Button variant="outline" onClick={() => router.push('/t-portal/students')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Roster
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      {/* Back button */}
      <Button variant="ghost" size="sm" className="w-fit" onClick={() => router.push('/t-portal/students')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Roster
      </Button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="text-lg">{student.name.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{student.name}</h1>
              <StatusBadge status={student.status} />
            </div>
            <p className="text-sm text-muted-foreground">{student.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <MessageSquare className="mr-2 h-4 w-4" /> Send Message
          </Button>
          <Button variant="outline" size="sm">
            <Pause className="mr-2 h-4 w-4" /> Pause Package
          </Button>
          <Button variant="outline" size="sm">
            <BookOpen className="mr-2 h-4 w-4" /> Assign Unit
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="w-full">
        <TabsList>
          <TabsTrigger value="profile">Profile & Progress</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="packages">Packages & Credits</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <ProfileProgressTab
            studentId={studentId}
            student={student}
            onStudentUpdate={(updated) => setStudent(updated)}
          />
        </TabsContent>

        <TabsContent value="sessions" className="mt-6">
          <SessionsTab studentId={studentId} student={student} />
        </TabsContent>

        <TabsContent value="packages" className="mt-6">
          <PackagesTab studentId={studentId} student={student} />
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <PaymentsTab studentId={studentId} student={student} />
        </TabsContent>
      </Tabs>
    </div>
  );
}