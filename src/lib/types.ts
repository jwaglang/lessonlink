export type StudentStatus = 'currently enrolled' | 'unenrolled (package over)' | 'unenrolled (goal met)' | 'MIA';

export interface Student {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  status: StudentStatus;
  enrollmentStatus: string; // for AI
  paymentStatus: string; // for AI
  prepaidPackage: {
    initialValue: number;
    balance: number;
  };
  lessons: Lesson[];
  goalMet: boolean;
}

export type LessonStatus = 'paid' | 'unpaid' | 'deducted' | 'scheduled';

export interface Lesson {
  id: string;
  studentId: string;
  title: string;
  date: string; // ISO string
  startTime: string;
  endTime: string;
  status: LessonStatus;
}
