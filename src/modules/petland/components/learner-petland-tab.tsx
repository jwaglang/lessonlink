'use client';

import type { Student } from '@/lib/types';
import StudentDashboard from './student-dashboard';

interface LearnerPetlandTabProps {
  studentId: string;
  student: Student;
  latestSessionInstanceId?: string;
}

/**
 * Simplified Petland tab for the student profile page.
 * Shows the student's pet status and dashboard.
 * Refinement and accessory creation have been moved to the main Petland menu.
 */
export default function LearnerPetlandTab({ studentId, student }: LearnerPetlandTabProps) {
  return <StudentDashboard learnerId={studentId} learnerName={student.name} />;
}
