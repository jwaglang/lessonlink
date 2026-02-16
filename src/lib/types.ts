// ===================================
// LessonLink Types - Baseline v7
// Last updated: February 2026
// ===================================
//
// ID CONVENTION (v7):
// - `studentId` = Firebase Auth UID (student doc ID = Auth UID)
// - `teacherUid` = Firebase Auth UID
// - No separate `authUid` or `studentAuthUid` fields
// ===================================

export type StudentStatus = 'active' | 'trial' | 'paused' | 'completed' | 'churned';

// ============================================
// DRAGON LEVEL SYSTEM
// ============================================

export type DragonLevel = 'egg' | 'white' | 'yellow' | 'orange' | 'green' | 'blue' | 'purple' | 'red' | 'black';

// ============================================
// MESSAGING CONTACT (reusable for student + parent)
// ============================================

export interface MessagingContact {
  app: string;    // 'whatsapp' | 'wechat' | 'kakaotalk' | 'line' | 'telegram' | other
  handle: string;
}

// ============================================
// PARENT / GUARDIAN CONTACT
// ============================================

export interface ParentContact {
  name: string;
  email: string;
  phone: string;
  relationship: 'mother' | 'father' | 'guardian' | 'other';
  country?: string;
  city?: string;
  messaging?: MessagingContact[];
  preferredContactMethod?: string; // e.g. 'email', 'whatsapp', 'wechat', 'phone'
  profession?: string;
  englishProficiency?: 'native' | 'fluent' | 'intermediate' | 'basic' | 'none';
}

// ============================================
// STUDENT
// ============================================

export interface Student {
  id: string; // Firebase Auth UID (doc ID = Auth UID)
  name: string;
  email: string;
  avatarUrl: string;
  status: StudentStatus;
  isNewStudent?: boolean; // true if never had a completed booking
  assignedTeacherId?: string; // teacherUid of assigned teacher
  notes?: string; // T private notes on learner
  enrolledAt?: string; // ISO string
  createdAt?: string;
  updatedAt?: string;

  // Demographics (added Phase 12 Step 4)
  birthday?: string;  // ISO date string (YYYY-MM-DD)
  gender?: string;    // 'boy' | 'girl' | custom write-in
  school?: string;
  dragonLevel?: DragonLevel; // assigned after intake assessment

  // Messaging
  messagingContacts?: MessagingContact[];

  // Parent / Guardian info
  primaryContact?: ParentContact;
  secondaryContact?: ParentContact;
}

export interface SessionInstance {
  id: string;

  // scheduling
  studentId: string;   // Firebase Auth UID (= student doc ID)
  teacherUid: string;  // Firebase Auth UID of teacher
  courseId: string;
  unitId: string;
  sessionId: string;   // template session id

  title?: string; // session title (denormalized for UI)

  lessonDate: string; // YYYY-MM-DD (local date string)
  startTime: string;  // "HH:mm"
  endTime: string;    // "HH:mm"
  durationHours: number; // 0.5 | 1

  // billing
  billingType: 'trial' | 'credit' | 'one_off';
  rate?: number;

  // lifecycle
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  createdAt?: any;
  updatedAt?: any;
  completedAt?: any | null;
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

export type ApprovalRequestType = 'new_student_booking' | 'late_reschedule' | 'late_cancel' | 'package_extension' | 'pause_request' | 'approvalRequest';

export interface ApprovalRequest {
  id: string;
  type: ApprovalRequestType;
  studentId: string; // Firebase Auth UID
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
  // Needed to create a valid sessionInstance on approval
  courseId?: string;
  unitId?: string;
  sessionId?: string;
  durationHours?: number;
  teacherUid?: string;
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
  studentId: string; // Firebase Auth UID
  courseId: string;
  levelId?: string;
  courseTitle: string;
  totalHours: number;
  hoursRemaining: number;
  price: number;
  currency: string;
  purchaseDate: string; // ISO string
  expiresAt: string; // ISO string
  isPaused: boolean;
  pausedAt?: string; // ISO string
  pauseReason?: string;
  totalDaysPaused: number;
  pauseCount: number;           // how many pauses have been used
  status: 'active' | 'expired' | 'completed' | 'paused';
}

export interface StudentCredit {
  id: string;
  studentId: string; // Firebase Auth UID
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
  id?: string;
  studentId: string; // Firebase Auth UID
  courseId: string;
  unitId: string;    // Required in v7
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
  // v7 additions
  status?: 'assigned' | 'in_progress' | 'completed';
  assignedAt?: string;
  hoursReserved?: number;
  createdAt?: string;
  updatedAt?: string;
}


// ============================================
// STUDENT REWARDS (Petland — read-only)
// ============================================

export interface StudentRewards {
  id?: string;
  studentId: string;    // Firebase Auth UID
  xp: number;
  hp: number;
  lastSyncedAt?: string; // ISO string
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
  id: string; // Firebase Auth UID (doc ID = Auth UID)
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
  sessionInstanceId?: string; // preferred link to SessionInstance
  lessonId?: string; // back-compat; historically used for SessionInstance id
  studentId?: string; // Firebase Auth UID (optional for imported reviews)
  studentName: string;
  studentAvatarUrl?: string;
  teacherId: string; // Firebase Auth UID
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

export type MessageType = 'notification' | 'communications';
export type ParticipantType = 'teacher' | 'student' | 'system';
export type RelatedEntityType = 'unit' | 'session' | 'package' | 'credit' | 'approvalRequest';

export interface Message {
  id: string;
  type: MessageType;
  from: string; // studentId (Auth UID) or teacher UID or 'system'
  fromType: ParticipantType;
  to: string; // studentId (Auth UID) or teacher UID
  toType: ParticipantType;
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

// ===================================
// Payments (Pre-Stripe — manual entry)
// ===================================

export type PaymentType = 'one_off' | 'package' | 'course';
export type PaymentMethod = 'bank_transfer' | 'cash' | 'paypal' | 'wechat_pay' | 'stripe' | 'other';
export type PaymentStatus = 'completed' | 'pending' | 'refunded';

export interface Payment {
  id: string;
  studentId: string;
  courseId?: string;
  packageId?: string;
  amount: number;
  currency: string;
  type: PaymentType;
  method: PaymentMethod;
  notes?: string;
  paymentDate: string;   // ISO string
  createdAt: string;     // ISO string
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  status: PaymentStatus;
}
