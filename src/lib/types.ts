

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
  isNewStudent?: boolean; // true if never had a completed booking
}

export type LessonStatus = 'paid' | 'unpaid' | 'deducted' | 'scheduled' | 'pending_approval';

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
  packageId?: string; // if booked as part of a package
}

export interface Availability {
  id: string;
  date: string; // ISO string for the date
  time: string; // "HH:00" format
  isAvailable: boolean;
}

export interface PackageOption {
  lessons: number;
  price: number;
  discount?: number; // percentage discount
}

export interface Course {
  id: string;
  title: string;
  pitch: string;
  description: string;
  hourlyRate: number; // Base hourly rate (e.g., $50/hour)
  discount60min?: number; // Optional % discount for 60-min lessons (0-100)
  thumbnailUrl: string;
  imageUrl: string;
}

export interface Level {
    id: string;
    courseId: string;
    title: string;
    gseRange: string;
    order: number;
    createdAt: string;
    updatedAt: string;
}

export interface Unit {
    id: string;
    courseId: string;
    levelId?: string;
    title: string;
    bigQuestion: string;
    description: string;
    order: number;
    estimatedHours: number;
    thumbnailUrl: string;
    initialAssessmentId?: string | null;
    finalEvaluationId?: string | null;
    finalProjectId?: string | null;
    finalProjectType?: string | null;
}

export interface Session {
    id: string;
    unitId: string;
    courseId: string;
    levelId?: string;
    title: string;
    littleQuestion: string;
    description: string;
    order: number;
    duration: number;
    thumbnailUrl: string;
    materials: string[];
    homeworkId?: string | null;
}

export type ApprovalRequestType = 'new_student_booking' | 'late_reschedule' | 'late_cancel' | 'package_extension' | 'pause_request';

export interface ApprovalRequest {
  id: string;
  type: ApprovalRequestType;
  studentId: string;
  studentName: string;
  studentEmail: string;
  lessonId?: string;
  lessonTitle?: string;
  lessonDate?: string;
  lessonTime?: string;
  newDate?: string; // for reschedule requests
  newTime?: string; // for reschedule requests
  packageId?: string; // for extension/pause requests
  reason?: string;
  status: 'pending' | 'approved' | 'denied';
  createdAt: string; // ISO string
  resolvedAt?: string; // ISO string
}

export interface UserSettings {
  id: string;
  odecIdOrEmail: string; // odec ID for teacher, email for students
  userType: 'teacher' | 'student';
  timezone: string; // e.g., 'Europe/Lisbon'
  timezoneConfirmed: boolean;
}

export interface StudentPackage {
  id: string;
  studentId: string;
  courseId: string;
  levelId?: string;
  courseTitle: string;
  totalLessons: number;
  lessonsRemaining: number;
  price: number;
  currency: string;
  purchaseDate: string; // ISO string
  expirationDate: string; // ISO string, calculated based on 1 class/week
  plannedBreaks?: { start: string; end: string }[]; // planned at purchase
  pauseUsed: boolean; // whether the one-time pause has been used
  pauseStart?: string; // ISO string
  pauseEnd?: string; // ISO string
  status: 'active' | 'expired' | 'completed' | 'paused';
}

export interface StudentCredit {
  id: string;
  studentId: string;
  courseId: string;
  packageId: string;              // Links to studentPackages
  totalHours: number;             // Total hours purchased (e.g., 10)
  uncommittedHours: number;       // Hours available for new units
  committedHours: number;         // Hours reserved for assigned units
  completedHours: number;         // Hours already used/consumed
  currency: string;               // USD, EUR, etc.
  createdAt: string;              // ISO timestamp
  updatedAt: string;              // ISO timestamp
}

export interface StudentProgress {
    studentId: string;
    courseId: string;
    levelId?: string;
    totalHoursCompleted: number;
    targetHours: number;
    percentComplete: number;
    unitsCompleted: number;
    unitsTotal: number;
    sessionsCompleted: number;
    sessionsTotal: number;
    homeworkAccuracyAvg?: number | null;
    assessmentScoreAvg?: number | null;
    evaluationScoreAvg?: number | null;
    overallAccuracy?: number | null;
    lastActivityAt: string;
    startedAt: string;
    completedAt?: string | null;
}


// ============================================
// TEACHER PROFILE
// ============================================

export interface TeacherCertificate {
  title: string;
  issuer: string;
  year: string;
  description?: string;
  verified: boolean;
}

export interface TeacherExperience {
  title: string;
  organization: string;
  location?: string;
  startYear: string;
  endYear?: string; // undefined = current
  description?: string;
}

export interface TeacherProfile {
  id: string;
  username: string; // unique, used in URL /t/[username]
  email: string; // linked to auth
  name: string;
  headline: string; // e.g., "🌟 Fluency Specialist for All Ages 🌟"
  avatarUrl: string;
  coverImageUrl?: string;
  videoUrl?: string; // YouTube intro video
  
  // Bio sections
  aboutMe: string;
  teachingPhilosophy?: string; // "Me as a Teacher"
  lessonStyle?: string; // "My lessons & teaching style"
  teachingMaterials?: string[]; // e.g., ["Presentation slides", "Flashcards"]
  
  // Languages
  nativeLanguage: string;
  otherLanguages?: string[];
  
  // Details
  specialties?: string[]; // e.g., ["Test Preparation", "Kids"]
  interests?: string[]; // e.g., ["Gaming", "Films & TV Series"]
  countryFrom: string;
  cityLiving: string;
  timezone: string;
  teachingSince?: string; // e.g., "Mar 16, 2013"
  
  // Credentials
  certificates?: TeacherCertificate[];
  experience?: TeacherExperience[];
  
  // Stats (auto-calculated or manually set)
  stats: {
    rating: number; // 0-5
    totalStudents: number;
    totalLessons: number;
    attendanceRate: number; // 0-100
    responseRate: number; // 0-100
  };
  
  // Status
  isOnline?: boolean;
  isPublished: boolean; // false = draft, not visible to students
  createdAt: string;
  updatedAt: string;
}

// ============================================
// REVIEWS
// ============================================

export interface Review {
  id: string;
  lessonId?: string; // optional, may be imported without lesson link
  studentId?: string; // optional for imported reviews
  studentName: string;
  studentAvatarUrl?: string;
  teacherId: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string; // ISO string
  
  // Moderation
  pinned: boolean; // teacher can pin up to 5
  visible: boolean; // admin can hide reviews
  
  // Tags (e.g., "Structured lessons", "Provides materials", "For beginners")
  tags?: string[];
  
  // For imported reviews
  imported?: boolean;
  importSource?: string; // e.g., "italki"
}
// Helper function to calculate lesson price based on duration
export function calculateLessonPrice(
  hourlyRate: number,
  duration: 30 | 60,
  discount60?: number
): number {
  // Guard against old data model that may not have hourlyRate
  if (typeof hourlyRate !== 'number' || isNaN(hourlyRate)) {
    return 0;
  }
  if (duration === 30) {
    return hourlyRate / 2; // Always half of hourly rate, no discount
  }
  if (duration === 60 && discount60) {
    return hourlyRate * (1 - discount60 / 100); // Apply discount
  }
  return hourlyRate; // Full hourly rate for 60-min
}

// ===================================
// Messages & Notifications
// ===================================

export type MessageType = 'notification' | 'communication';

export type RelatedEntityType = 'unit' | 'session' | 'package' | 'credit';

export interface Message {
  id: string;
  type: MessageType;
  from: string; // userId or 'system'
  to: string; // userId
  content: string;
  timestamp: string; // ISO string
  read: boolean;
  relatedEntity?: {
    type: RelatedEntityType;
    id: string;
  };
  actionLink?: string; // e.g., "/s-portal/units/abc123"
  createdAt: string; // ISO string
}
