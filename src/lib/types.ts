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

export interface CourseTemplate {
  id: string;
  title: string;
  duration: 30 | 60;
  pitch: string;
  description: string;
  rate: number; // single lesson rate in teacher's default currency
  packageOptions?: PackageOption[];
  thumbnailUrl: string;
  imageUrl: string;
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
