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
    currency: string;
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
  paymentAmount?: number;
  paymentCurrency?: string;
  rate: number;
}

export interface Availability {
  id: string;
  date: string; // ISO string for the date
  time: string; // "HH:00" format
  isAvailable: boolean;
}

export interface LessonType {
  id: string;
  name: string;
  rate: number;
  currency: string;
}
