'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import type { Student } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Eye } from 'lucide-react';
import StudentDashboard from '@/modules/petland/components/student-dashboard';

export default function BrowsePetStatusTabContent() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  useEffect(() => {
    if (!user?.uid) return;

    const studentsCollection = collection(db, 'students');
    const q = query(studentsCollection, where('assignedTeacherId', '==', user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const studentsData = snapshot.docs.map((doc) => {
        const data = doc.data();
        return { id: doc.id, ...data } as Student;
      });
      setStudents(studentsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 gap-2">
        <Loader2 className="animate-spin h-5 w-5" />
        <span>Loading learners...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Select a Learner</CardTitle>
          <CardDescription>Choose a learner to view their pet status and vitals.</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
            <SelectTrigger className="w-full md:w-64">
              <SelectValue placeholder="Choose a learner..." />
            </SelectTrigger>
            <SelectContent>
              {students.map((student) => (
                <SelectItem key={student.id} value={student.id}>
                  {student.displayName || student.name || 'Unknown'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedStudent && <StudentDashboard learnerId={selectedStudent.id} learnerName={selectedStudent.name} />}
    </div>
  );
}
