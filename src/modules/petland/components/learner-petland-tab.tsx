'use client';

import type { Student } from '@/lib/types';
import StudentDashboard from './student-dashboard';
import VocabularyManager from './vocabulary-manager';

interface LearnerPetlandTabProps {
  studentId: string;
  student: Student;
  latestSessionInstanceId?: string;
}

export default function LearnerPetlandTab({ studentId, student, latestSessionInstanceId }: LearnerPetlandTabProps) {
  return (
    <div className="flex flex-col gap-8">
      <VocabularyManager studentId={studentId} latestSessionInstanceId={latestSessionInstanceId} />
      <StudentDashboard learnerId={studentId} learnerName={student.name} />
    </div>
  );
}
