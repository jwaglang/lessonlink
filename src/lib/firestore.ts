// ===================================
// LessonLink Firestore - Baseline v7
// Last updated: February 2026
// ===================================
// 
// INVARIANTS (Variant-1 Architecture):
// - `sessions` = curriculum templates only
// - `sessionInstances` = booked/actual classes ONLY
// - Approval ≠ Booking
// - Payment creates `studentCredit`
// - Approval creates `studentProgress` (assigns curriculum)
// - Booking creates `sessionInstance`
// - Completion settles credit + updates progress
// - NO `lessons` collection anywhere
//
// ID CONVENTION (v7):
// - `studentId` = Firebase Auth UID (doc ID = Auth UID)
// - `teacherUid` = Firebase Auth UID
// - No separate `authUid` or `studentAuthUid` fields
// ===================================

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  setDoc,
  limit,
  onSnapshot,
  runTransaction,
  writeBatch,
  increment,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';

import type {
  Student,
  Availability,
  LearnerAvailability,
  Course,
  Level,
  ApprovalRequest,
  ApprovalRequestType,
  UserSettings,
  StudentPackage,
  TeacherProfile,
  Review,
  StudentCredit,
  StudentRewards,
  Message,
  Unit,
  Session,
  SessionInstance,
  StudentProgress,
  Payment,
  AssessmentReport,
  OutputCitation,
  SessionFeedback,
  ScheduleTemplate,
  HomeworkAssignment,
  Reward,
  SessionProgress as Phase17SessionProgress,
  BehaviorDeductionType,
  TreasureChestReward,
  WowReward,
  OopsieEvent,
  BehaviorDeduction,
  SessionVocabulary,
  SessionGrammar,
  SessionPhonics,
  BEHAVIOR_DEDUCTIONS,
} from './types';
import type { PetShopItem, GrammarCard, PhonicsCard } from '@/modules/petland/types';

// ===================================
// Re-export types for convenience
// ===================================
export type {
  Student,
  Availability,
  LearnerAvailability,
  Course,
  Level,
  ApprovalRequest,
  ApprovalRequestType,
  UserSettings,
  StudentPackage,
  TeacherProfile,
  Review,
  StudentCredit,
  StudentRewards,
  Message,
  Unit,
  Session,
  SessionInstance,
  StudentProgress,
  Payment,
  AssessmentReport,
  OutputCitation,
  ScheduleTemplate,
  HomeworkAssignment,
};

// ===================================
// Re-export Firestore primitives for admin/chat pages
// ===================================
export {
  db,
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
};

/* =========================================================
   Collection references
   ========================================================= */

const studentsCollection = collection(db, 'students');
const sessionInstancesCollection = collection(db, 'sessionInstances');
const availabilityCollection = collection(db, 'availability');
const learnerAvailabilityCollection = collection(db, 'learnerAvailability');
const coursesCollection = collection(db, 'courses');
const levelsCollection = collection(db, 'levels');
const unitsCollection = collection(db, 'units');
const sessionsCollection = collection(db, 'sessions');
const approvalRequestsCollection = collection(db, 'approvalRequests');
const userSettingsCollection = collection(db, 'userSettings');
const studentPackagesCollection = collection(db, 'studentPackages');
const teacherProfilesCollection = collection(db, 'teacherProfiles');
const reviewsCollection = collection(db, 'reviews');
const studentCreditCollection = collection(db, 'studentCredit');
const studentProgressCollection = collection(db, 'studentProgress');
const studentRewardsCollection = collection(db, 'studentRewards');
export const messagesCollection = collection(db, 'messages');
const paymentsCollection = collection(db, 'payments');
const assessmentReportsCollection = collection(db, 'assessmentReports');
const sessionFeedbackCollection = collection(db, 'sessionFeedback');
const homeworkAssignmentsCollection = collection(db, 'homeworkAssignments');

/* =========================================================
   Helpers
   ========================================================= */

function asId<T extends object>(id: string, data: any): T {
  return { id, ...(data || {}) } as T;
}

function nowIso(): string {
  return new Date().toISOString();
}

// SessionInstance compatibility: older docs may store date in `date` instead of `lessonDate`
function normalizeSessionInstance(id: string, data: any): SessionInstance {
  const lessonDate = data.lessonDate ?? data.date ?? '';
  return {
    id,
    ...data,
    lessonDate,
  } as SessionInstance;
}

/* =========================================================
   Courses
   ========================================================= */

export async function getCourses(): Promise<Course[]> {
  const snapshot = await getDocs(query(coursesCollection, orderBy('title', 'asc')));
  return snapshot.docs.map(d => asId<Course>(d.id, d.data()));
}

export async function getCourseById(courseId: string): Promise<Course | null> {
  const snap = await getDoc(doc(db, 'courses', courseId));
  return snap.exists() ? asId<Course>(snap.id, snap.data()) : null;
}

export async function addCourse(course: Omit<Course, 'id'>): Promise<Course> {
  const ref = await addDoc(coursesCollection, { ...course, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
  const snap = await getDoc(ref);
  return asId<Course>(snap.id, snap.data());
}

export async function updateCourse(courseId: string, updates: Partial<Course>): Promise<Course> {
  await updateDoc(doc(db, 'courses', courseId), { ...updates, updatedAt: Timestamp.now() } as any);
  const snap = await getDoc(doc(db, 'courses', courseId));
  return asId<Course>(snap.id, snap.data());
}

export async function deleteCourse(courseId: string): Promise<void> {
  await deleteDoc(doc(db, 'courses', courseId));
}

/** Real-time listener for courses */
export function onCoursesUpdate(callback: (courses: Course[]) => void): Unsubscribe {
  const q = query(coursesCollection, orderBy('title', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const courses = snapshot.docs.map(d => asId<Course>(d.id, d.data()));
    callback(courses);
  });
}

/* =========================================================
   Levels
   ========================================================= */

export async function getLevelsByCourseId(courseId: string): Promise<Level[]> {
  const snapshot = await getDocs(query(levelsCollection, where('courseId', '==', courseId), orderBy('order', 'asc')));
  return snapshot.docs.map(d => asId<Level>(d.id, d.data()));
}

export async function getLevelById(levelId: string): Promise<Level | null> {
  const snap = await getDoc(doc(db, 'levels', levelId));
  return snap.exists() ? asId<Level>(snap.id, snap.data()) : null;
}

export async function addLevel(level: Omit<Level, 'id'>): Promise<Level> {
  const ref = await addDoc(levelsCollection, { ...level, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
  const snap = await getDoc(ref);
  return asId<Level>(snap.id, snap.data());
}

export async function updateLevel(levelId: string, updates: Partial<Level>): Promise<void> {
  await updateDoc(doc(db, 'levels', levelId), { ...updates, updatedAt: Timestamp.now() } as any);
}

export async function deleteLevel(levelId: string): Promise<void> {
  await deleteDoc(doc(db, 'levels', levelId));
}

/** Real-time listener for levels by course */
export function onLevelsUpdate(courseId: string, callback: (levels: Level[]) => void): Unsubscribe {
  const q = query(levelsCollection, where('courseId', '==', courseId), orderBy('order', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const levels = snapshot.docs.map(d => asId<Level>(d.id, d.data()));
    callback(levels);
  });
}

/* =========================================================
   Units (curriculum templates)
   ========================================================= */

export async function getUnitsByCourseId(courseId: string): Promise<Unit[]> {
  const snapshot = await getDocs(query(unitsCollection, where('courseId', '==', courseId), orderBy('order', 'asc')));
  return snapshot.docs.map(d => asId<Unit>(d.id, d.data()));
}

export async function getUnitsByLevelId(levelId: string): Promise<Unit[]> {
  const snapshot = await getDocs(query(unitsCollection, where('levelId', '==', levelId), orderBy('order', 'asc')));
  return snapshot.docs.map(d => asId<Unit>(d.id, d.data()));
}

export async function getUnitById(unitId: string): Promise<Unit | null> {
  const snap = await getDoc(doc(db, 'units', unitId));
  return snap.exists() ? asId<Unit>(snap.id, snap.data()) : null;
}

export async function addUnit(unit: Omit<Unit, 'id'>): Promise<Unit> {
  const ref = await addDoc(unitsCollection, { ...unit, createdAt: Timestamp.now(), updatedAt: Timestamp.now() } as any);
  const snap = await getDoc(ref);
  return asId<Unit>(snap.id, snap.data());
}

export async function updateUnit(unitId: string, updates: Partial<Unit>): Promise<void> {
  await updateDoc(doc(db, 'units', unitId), { ...updates, updatedAt: Timestamp.now() } as any);
}

export async function deleteUnit(unitId: string): Promise<void> {
  await deleteDoc(doc(db, 'units', unitId));
}

/** Real-time listener for units by level */
export function onUnitsUpdate(levelId: string, callback: (units: Unit[]) => void): Unsubscribe {
  const q = query(unitsCollection, where('levelId', '==', levelId), orderBy('order', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const units = snapshot.docs.map(d => asId<Unit>(d.id, d.data()));
    callback(units);
  });
}

/* =========================================================
   Sessions (curriculum templates within units)
   ========================================================= */

export async function getSessionsByUnitId(unitId: string): Promise<Session[]> {
  const snapshot = await getDocs(query(sessionsCollection, where('unitId', '==', unitId), orderBy('order', 'asc')));
  return snapshot.docs.map(d => asId<Session>(d.id, d.data()));
}

export async function getSessionById(sessionId: string): Promise<Session | null> {
  const snap = await getDoc(doc(db, 'sessions', sessionId));
  return snap.exists() ? asId<Session>(snap.id, snap.data()) : null;
}

export async function addSession(session: Omit<Session, 'id'>): Promise<Session> {
  const ref = await addDoc(sessionsCollection, { ...session, createdAt: Timestamp.now(), updatedAt: Timestamp.now() } as any);
  const snap = await getDoc(ref);
  return asId<Session>(snap.id, snap.data());
}

export async function updateSession(sessionId: string, updates: Partial<Session>): Promise<void> {
  await updateDoc(doc(db, 'sessions', sessionId), { ...updates, updatedAt: Timestamp.now() } as any);
}

export async function deleteSession(sessionId: string): Promise<void> {
  await deleteDoc(doc(db, 'sessions', sessionId));
}

/** Real-time listener for sessions by unit */
export function onSessionsUpdate(unitId: string, callback: (sessions: Session[]) => void): Unsubscribe {
  const q = query(sessionsCollection, where('unitId', '==', unitId), orderBy('order', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const sessions = snapshot.docs.map(d => asId<Session>(d.id, d.data()));
    callback(sessions);
  });
}

/* =========================================================
   Students
   ========================================================= */

export async function getStudents(): Promise<Student[]> {
  const snapshot = await getDocs(query(studentsCollection, orderBy('name', 'asc')));
  return snapshot.docs.map(d => asId<Student>(d.id, d.data()));
}

export async function getStudentById(studentId: string): Promise<Student | null> {
  const snap = await getDoc(doc(db, 'students', studentId));
  return snap.exists() ? asId<Student>(snap.id, snap.data()) : null;
}

export async function getStudentByEmail(email: string): Promise<Student | null> {
  const q = query(studentsCollection, where('email', '==', email), limit(1));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const d = snapshot.docs[0];
  return asId<Student>(d.id, d.data());
}

/**
 * Create a student document with a specific ID (typically Auth UID).
 * Uses setDoc instead of addDoc to control the document ID.
 */
export async function createStudent(studentId: string, student: Omit<Student, 'id'>): Promise<Student> {
  const ref = doc(db, 'students', studentId);
  await setDoc(ref, {
    ...student,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  const snap = await getDoc(ref);
  return asId<Student>(snap.id, snap.data());
}

export async function updateStudentStatus(studentId: string, status: Student['status']): Promise<Student> {
  await updateDoc(doc(db, 'students', studentId), { status, updatedAt: Timestamp.now() } as any);
  const snap = await getDoc(doc(db, 'students', studentId));
  return asId<Student>(snap.id, snap.data());
}

export async function updateStudent(studentId: string, updates: Partial<Student>): Promise<Student> {
  await updateDoc(doc(db, 'students', studentId), { ...updates, updatedAt: Timestamp.now() } as any);
  const snap = await getDoc(doc(db, 'students', studentId));
  return asId<Student>(snap.id, snap.data());
}

/**
 * Get or create a student by email.
 * IMPORTANT: authUid must be provided to create the student with Auth UID as document ID.
 * This ensures studentId === Auth UID everywhere.
 */
export async function getOrCreateStudentByEmail(
  email: string, 
  authUid: string,
  defaults?: Partial<Student>
): Promise<Student> {
  // First check if student already exists with this UID
  const existingByUid = await getStudentById(authUid);
  if (existingByUid) return existingByUid;
  
  // Next check by email (in case of old data model)
  const existingByEmail = await getStudentByEmail(email);
  if (existingByEmail) return existingByEmail;

  // Create new student with Auth UID as document ID
  const toCreate: Omit<Student, 'id'> = {
    name: defaults?.name ?? email.split('@')[0],
    email,
    avatarUrl: defaults?.avatarUrl ?? '',
    status: defaults?.status ?? 'active',
    isNewStudent: defaults?.isNewStudent ?? true,
    assignedTeacherId: defaults?.assignedTeacherId,
    // New demographic fields
    birthday: defaults?.birthday,
    gender: defaults?.gender,
    school: defaults?.school,
    dragonLevel: defaults?.dragonLevel,
    messagingContacts: defaults?.messagingContacts,
    primaryContact: defaults?.primaryContact,
    secondaryContact: defaults?.secondaryContact,
  };

  return createStudent(authUid, toCreate);
}

export async function deleteStudent(studentId: string): Promise<void> {
  await deleteDoc(doc(db, 'students', studentId));
}

/** Check if student is new (no completed bookings) */
export async function isNewStudent(studentId: string): Promise<boolean> {
  // First, check if they have any completed sessions
  const q = query(
    sessionInstancesCollection,
    where('studentId', '==', studentId),
    where('status', '==', 'completed'),
    limit(1)
  );
  const snapshot = await getDocs(q);
  if (!snapshot.empty) return false;

  // Also check if they have purchased any packages
  const pkgQuery = query(
    studentPackagesCollection,
    where('studentId', '==', studentId),
    limit(1)
  );
  const pkgSnapshot = await getDocs(pkgQuery);
  if (!pkgSnapshot.empty) return false;

  // Fallback: check explicit isNewStudent field on student doc
  const student = await getStudentById(studentId);
  if (!student) return true;
  if (student.isNewStudent === false) return false;
  
  return true;
}

/* =========================================================
   Session Instances (booked classes)
   ========================================================= */

export async function getSessionInstancesByStudentId(studentId: string): Promise<SessionInstance[]> {
  const snapshot = await getDocs(query(sessionInstancesCollection, where('studentId', '==', studentId), orderBy('createdAt', 'desc')));
  return snapshot.docs.map(d => normalizeSessionInstance(d.id, d.data()));
}

export async function getSessionInstancesByTeacherUid(teacherUid: string): Promise<SessionInstance[]> {
  const snapshot = await getDocs(query(sessionInstancesCollection, where('teacherUid', '==', teacherUid), orderBy('createdAt', 'desc')));
  return snapshot.docs.map(d => normalizeSessionInstance(d.id, d.data()));
}

export async function getSessionInstanceById(instanceId: string): Promise<SessionInstance | null> {
  const snap = await getDoc(doc(db, 'sessionInstances', instanceId));
  return snap.exists() ? normalizeSessionInstance(snap.id, snap.data()) : null;
}

// Back-compat / clarity alias
export async function getSessionInstance(instanceId: string): Promise<SessionInstance | null> {
  return getSessionInstanceById(instanceId);
}

/**
 * Variant-1 booking gate:
 * - Requires studentProgress for (studentId, courseId, unitId)
 * - Requires studentCredit for (studentId, courseId) unless billingType === 'trial'
 * 
 * Note: studentId IS the Auth UID (v7 convention)
 */
export async function bookLesson(input: {
  studentId: string;        // Auth UID (= doc ID)
  teacherUid: string;       // Auth UID of teacher
  courseId?: string;
  unitId?: string;
  sessionId?: string;
  lessonDate: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  billingType: SessionInstance['billingType'];
  rate?: number;
  title?: string;
}): Promise<SessionInstance> {
  // Gate 1: T-L relationship exists (unless trial)
  if (input.billingType !== 'trial') {
    const studentDoc = await getStudentById(input.studentId);
    if (!studentDoc?.assignedTeacherId) {
      throw new Error('No tutor assigned. Please select a tutor first.');
    }
    if (studentDoc.assignedTeacherId !== input.teacherUid) {
      throw new Error('You can only book sessions with your assigned tutor.');
    }
  }

  // Gate 2: credit exists (unless trial)
  if (input.billingType !== 'trial') {
    const credit = await getStudentCredit(input.studentId);
    if (!credit) {
      throw new Error('No credit found. Please complete payment before booking.');
    }
    if (input.billingType === 'credit') {
      const available = credit.uncommittedHours ?? 0;
      if (available < input.durationHours) {
        throw new Error('Insufficient credit. Please top up before booking.');
      }
      // Reserve hours at booking time
      await reserveCredit(input.studentId, input.courseId ?? '', input.durationHours);
    }
  }

  const payload: any = {
    studentId: input.studentId,       // Auth UID
    teacherUid: input.teacherUid,     // Auth UID
    courseId: input.courseId ?? null,
    unitId: input.unitId ?? null,
    sessionId: input.sessionId ?? null,
    title: input.title ?? null,
    lessonDate: input.lessonDate,
    date: input.lessonDate, // compatibility
    startTime: input.startTime,
    endTime: input.endTime,
    durationHours: input.durationHours,
    billingType: input.billingType,
    rate: input.rate ?? null,
    status: 'scheduled',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    completedAt: null,
  };

  const ref = await addDoc(sessionInstancesCollection, payload);
  const snap = await getDoc(ref);
  return normalizeSessionInstance(snap.id, snap.data());
}

/**
 * Update session instance status
 */
export async function updateSessionInstanceStatus(
  instanceId: string,
  status: SessionInstance['status']
): Promise<void> {
  await updateDoc(doc(db, 'sessionInstances', instanceId), {
    status,
    updatedAt: Timestamp.now(),
    ...(status === 'completed' ? { completedAt: Timestamp.now() } : {}),
  } as any);
}

/**
 * Completion workflow (Variant-1):
 * - sessionInstances.status -> 'completed'
 * - studentProgress: sessionsCompleted += 1, totalHoursCompleted += durationHours
 * - studentCredit: committedHours -= durationHours, completedHours += durationHours
 */
/**
 * Completion workflow (Variant-1):
 * - sessionInstances.status -> 'completed'
 * - studentProgress: sessionsCompleted += 1, totalHoursCompleted += durationHours (if progress record exists)
 * - studentCredit: committedHours -= durationHours, completedHours += durationHours, completedSessions += 1
 */
export async function completeSession(instanceId: string): Promise<void> {
  const ref = doc(db, 'sessionInstances', instanceId);

  // 1. Read the session instance to get studentId, courseId, unitId, billingType
  const instSnap = await getDoc(ref);
  if (!instSnap.exists()) throw new Error('SessionInstance not found');
  const inst = normalizeSessionInstance(instSnap.id, instSnap.data());
  if (inst.status === 'completed') return; // Idempotent

  // 2. Find related docs BEFORE the transaction (queries not allowed inside tx)
  let progressDocId: string | null = null;
  if (inst.courseId && inst.unitId) {
    const progressQ = query(
      studentProgressCollection,
      where('studentId', '==', inst.studentId),
      where('courseId', '==', inst.courseId),
      where('unitId', '==', inst.unitId),
      limit(1)
    );
    const progressSnap = await getDocs(progressQ);
    if (!progressSnap.empty) {
      progressDocId = progressSnap.docs[0].id;
    }
  }

  let creditDocId: string | null = null;
  if (inst.billingType === 'credit') {
    const creditQ = query(
      studentCreditCollection,
      where('studentId', '==', inst.studentId),
      limit(1)
    );
    const creditSnap = await getDocs(creditQ);
    if (!creditSnap.empty) {
      creditDocId = creditSnap.docs[0].id;
    }
  }

  // 3. Run transaction with known doc references only
  await runTransaction(db, async (tx) => {
    // === ALL READS FIRST ===
    const txSnap = await tx.get(ref);
    if (!txSnap.exists()) throw new Error('SessionInstance not found');
    const txInst = normalizeSessionInstance(txSnap.id, txSnap.data());
    if (txInst.status === 'completed') return; // Idempotent

    // Read progress doc if it exists
    let pRef: ReturnType<typeof doc> | null = null;
    if (progressDocId) {
      pRef = doc(db, 'studentProgress', progressDocId);
      await tx.get(pRef);
    }

    // Read credit doc if it exists
    let cRef: ReturnType<typeof doc> | null = null;
    if (creditDocId) {
      cRef = doc(db, 'studentCredit', creditDocId);
      await tx.get(cRef);
    }

    // === ALL WRITES AFTER ===
    tx.update(ref, {
      status: 'completed',
      completedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    if (pRef) {
      tx.update(pRef, {
        sessionsCompleted: increment(1),
        totalHoursCompleted: increment(inst.durationHours),
        updatedAt: Timestamp.now(),
        lastActivityAt: Timestamp.now(),
      } as any);
    }

    if (cRef) {
      tx.update(cRef, {
        committedHours: increment(-inst.durationHours),
        completedHours: increment(inst.durationHours),
        completedSessions: increment(1),
        updatedAt: Timestamp.now(),
      } as any);
    }
  });
}

export async function rescheduleSessionInstance(
  instanceId: string,
  newLessonDate: string,
  newStartTime: string,
  newEndTime: string,
  studentId: string
): Promise<{ success: boolean; session?: SessionInstance; approvalRequired?: boolean }> {
  const existing = await getSessionInstance(instanceId);
  if (!existing) throw new Error('SessionInstance not found');

  const scheduledAt = new Date(`${existing.lessonDate}T${existing.startTime}:00`);
  const msUntil = scheduledAt.getTime() - Date.now();
  const hoursUntil = msUntil / (1000 * 60 * 60);

  // If within 12 hours, require teacher approval
  if (hoursUntil < 12) {
    const studentSnap = await getDoc(doc(db, 'students', studentId));
    const studentData: any = studentSnap.exists() ? studentSnap.data() : {};
    await addDoc(approvalRequestsCollection, {
      type: 'late_reschedule',
      studentId,
      studentName: studentData.name || '',
      studentEmail: studentData.email || '',
      lessonId: instanceId,
      courseId: existing.courseId,
      unitId: existing.unitId,
      sessionId: existing.sessionId,
      teacherUid: existing.teacherUid,
      lessonDate: existing.lessonDate,
      lessonTime: existing.startTime,
      newDate: newLessonDate,
      newTime: newStartTime,
      status: 'pending',
      createdAt: nowIso(),
    } as any);
    return { success: false, approvalRequired: true };
  }

  const ref = doc(db, 'sessionInstances', instanceId);
  await updateDoc(ref, {
    lessonDate: newLessonDate,
    date: newLessonDate,
    startTime: newStartTime,
    endTime: newEndTime,
    status: 'rescheduled',
    updatedAt: Timestamp.now(),
  } as any);

  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('SessionInstance not found after reschedule');
  return { success: true, session: normalizeSessionInstance(snap.id, snap.data()) };
}

export async function cancelSessionInstance(
  instanceId: string,
  studentId: string
): Promise<{ success: boolean; approvalRequired?: boolean }> {
  const existing = await getSessionInstance(instanceId);
  if (!existing) throw new Error('SessionInstance not found');

  const scheduledAt = new Date(`${existing.lessonDate}T${existing.startTime}:00`);
  const msUntil = scheduledAt.getTime() - Date.now();
  const hoursUntil = msUntil / (1000 * 60 * 60);

  // If within 24 hours, require teacher approval
  if (hoursUntil < 24) {
    const studentSnap = await getDoc(doc(db, 'students', studentId));
    const studentData: any = studentSnap.exists() ? studentSnap.data() : {};
    await addDoc(approvalRequestsCollection, {
      type: 'late_cancel',
      studentId,
      studentName: studentData.name || '',
      studentEmail: studentData.email || '',
      lessonId: instanceId,
      courseId: existing.courseId,
      unitId: existing.unitId,
      sessionId: existing.sessionId,
      teacherUid: existing.teacherUid,
      lessonDate: existing.lessonDate,
      lessonTime: existing.startTime,
      status: 'pending',
      createdAt: nowIso(),
    } as any);
    return { success: false, approvalRequired: true };
  }

  // Cancel the session
  await updateDoc(doc(db, 'sessionInstances', instanceId), {
    status: 'cancelled',
    updatedAt: Timestamp.now(),
  } as any);

  // Return credit: committed -> uncommitted
  if (existing.billingType === 'credit') {
    const creditQ = query(
      studentCreditCollection,
      where('studentId', '==', existing.studentId),
      limit(1)
    );
    const creditSnap = await getDocs(creditQ);
    if (!creditSnap.empty) {
      const cRef = doc(db, 'studentCredit', creditSnap.docs[0].id);
      await updateDoc(cRef, {
        committedHours: increment(-existing.durationHours),
        uncommittedHours: increment(existing.durationHours),
        updatedAt: Timestamp.now(),
      } as any);
    }
  }

  return { success: true };
}

/* =========================================================
   Availability
   ========================================================= */

export async function getAvailableSlots(dateISO?: string): Promise<Availability[]> {
  const q = dateISO
    ? query(availabilityCollection, where('date', '==', dateISO), where('isAvailable', '==', true))
    : query(availabilityCollection, where('isAvailable', '==', true));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => asId<Availability>(d.id, d.data()));
}

export async function getAvailability(): Promise<Availability[]> {
  const snapshot = await getDocs(availabilityCollection);
  return snapshot.docs.map(d => asId<Availability>(d.id, d.data()));
}

export async function toggleAvailability(date: Date, time: string): Promise<Availability> {
  const { formatISO, startOfDay } = await import('date-fns');
  const dateISO = formatISO(startOfDay(date));

  const q = query(
    availabilityCollection,
    where('date', '==', dateISO),
    where('time', '==', time),
    limit(1)
  );
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const existingDoc = snapshot.docs[0];
    const existingData = existingDoc.data();
    const newAvailability = !existingData.isAvailable;

    await updateDoc(doc(db, 'availability', existingDoc.id), {
      isAvailable: newAvailability,
      updatedAt: Timestamp.now(),
    });

    return {
      id: existingDoc.id,
      ...existingData,
      isAvailable: newAvailability,
    } as Availability;
  }

  const newRef = await addDoc(availabilityCollection, {
    date: dateISO,
    time,
    isAvailable: true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  const newSnap = await getDoc(newRef);
  return asId<Availability>(newSnap.id, newSnap.data());
}

/** Get all LearnerAvailability slots for a student. */
export async function getLearnerAvailability(studentId: string): Promise<LearnerAvailability[]> {
  const snapshot = await getDocs(
    query(learnerAvailabilityCollection, where('studentId', '==', studentId))
  );
  return snapshot.docs.map(d => asId<LearnerAvailability>(d.id, d.data()));
}

/** Toggle a learner's availability slot (create if missing, flip isAvailable if exists). */
export async function toggleLearnerAvailability(
  studentId: string,
  date: Date,
  time: string
): Promise<LearnerAvailability> {
  const { formatISO, startOfDay } = await import('date-fns');
  const dateISO = formatISO(startOfDay(date));

  const q = query(
    learnerAvailabilityCollection,
    where('studentId', '==', studentId),
    where('date', '==', dateISO),
    where('time', '==', time),
    limit(1)
  );
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const existingDoc = snapshot.docs[0];
    const existingData = existingDoc.data();
    const newAvailability = !existingData.isAvailable;
    await updateDoc(doc(db, 'learnerAvailability', existingDoc.id), {
      isAvailable: newAvailability,
      updatedAt: Timestamp.now(),
    });
    return {
      id: existingDoc.id,
      ...existingData,
      isAvailable: newAvailability,
    } as LearnerAvailability;
  }

  const newRef = await addDoc(learnerAvailabilityCollection, {
    studentId,
    date: dateISO,
    time,
    isAvailable: true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  const newSnap = await getDoc(newRef);
  return asId<LearnerAvailability>(newSnap.id, newSnap.data());
}

/** Bulk toggle tutor availability for multiple slots */
export async function toggleAvailabilityBulk(
  slots: { date: Date; time: string }[]
): Promise<Availability[]> {
  const { formatISO, startOfDay } = await import('date-fns');
  const results: Availability[] = [];

  for (const slot of slots) {
    const dateISO = formatISO(startOfDay(slot.date));
    
    const q = query(
      availabilityCollection,
      where('date', '==', dateISO),
      where('time', '==', slot.time),
      limit(1)
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const existingDoc = snapshot.docs[0];
      const existingData = existingDoc.data();
      const newAvailability = !existingData.isAvailable;

      await updateDoc(doc(db, 'availability', existingDoc.id), {
        isAvailable: newAvailability,
        updatedAt: Timestamp.now(),
      });

      results.push({
        id: existingDoc.id,
        ...existingData,
        isAvailable: newAvailability,
      } as Availability);
    } else {
      const newRef = await addDoc(availabilityCollection, {
        date: dateISO,
        time: slot.time,
        isAvailable: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      const newSnap = await getDoc(newRef);
      results.push(asId<Availability>(newSnap.id, newSnap.data()));
    }
  }

  return results;
}

/** Bulk toggle learner availability for multiple slots */
export async function toggleLearnerAvailabilityBulk(
  studentId: string,
  slots: { date: Date; time: string }[]
): Promise<LearnerAvailability[]> {
  const { formatISO, startOfDay } = await import('date-fns');
  const results: LearnerAvailability[] = [];

  for (const slot of slots) {
    const dateISO = formatISO(startOfDay(slot.date));
    
    const q = query(
      learnerAvailabilityCollection,
      where('studentId', '==', studentId),
      where('date', '==', dateISO),
      where('time', '==', slot.time),
      limit(1)
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const existingDoc = snapshot.docs[0];
      const existingData = existingDoc.data();
      const newAvailability = !existingData.isAvailable;

      await updateDoc(doc(db, 'learnerAvailability', existingDoc.id), {
        isAvailable: newAvailability,
        updatedAt: Timestamp.now(),
      });

      results.push({
        id: existingDoc.id,
        ...existingData,
        isAvailable: newAvailability,
      } as LearnerAvailability);
    } else {
      const newRef = await addDoc(learnerAvailabilityCollection, {
        studentId,
        date: dateISO,
        time: slot.time,
        isAvailable: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      const newSnap = await getDoc(newRef);
      results.push(asId<LearnerAvailability>(newSnap.id, newSnap.data()));
    }
  }

  return results;
}

/** 
 * Bulk SET tutor availability — uses writeBatch for single network call.
 * Sets all slots to the given `isAvailable` value (no read-before-write needed).
 * Used by drag-select in availability-calendar.tsx.
 */
export async function setAvailabilityBulk(
  slots: { date: Date; time: string }[],
  isAvailable: boolean
): Promise<Availability[]> {
  const { formatISO, startOfDay: sodFn } = await import('date-fns');
  const batch = writeBatch(db);
  const results: Availability[] = [];

  for (const slot of slots) {
    const dateISO = formatISO(sodFn(slot.date));

    const q = query(
      availabilityCollection,
      where('date', '==', dateISO),
      where('time', '==', slot.time),
      limit(1)
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const existingDoc = snapshot.docs[0];
      batch.update(doc(db, 'availability', existingDoc.id), {
        isAvailable,
        updatedAt: Timestamp.now(),
      });
      results.push({
        id: existingDoc.id,
        ...existingDoc.data(),
        isAvailable,
      } as Availability);
    } else {
      const newRef = doc(availabilityCollection);
      const newData = {
        date: dateISO,
        time: slot.time,
        isAvailable,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      batch.set(newRef, newData);
      results.push({
        id: newRef.id,
        ...newData,
      } as Availability);
    }
  }

  await batch.commit();
  return results;
}

/** 
 * Bulk SET learner availability — uses writeBatch for single network call.
 * Sets all slots to the given `isAvailable` value (no read-before-write needed).
 * Used by drag-select in learner-availability-calendar.tsx.
 */
export async function setLearnerAvailabilityBulk(
  studentId: string,
  slots: { date: Date; time: string }[],
  isAvailable: boolean
): Promise<LearnerAvailability[]> {
  const { formatISO, startOfDay: sodFn } = await import('date-fns');
  const batch = writeBatch(db);
  const results: LearnerAvailability[] = [];

  for (const slot of slots) {
    const dateISO = formatISO(sodFn(slot.date));

    const q = query(
      learnerAvailabilityCollection,
      where('studentId', '==', studentId),
      where('date', '==', dateISO),
      where('time', '==', slot.time),
      limit(1)
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const existingDoc = snapshot.docs[0];
      batch.update(doc(db, 'learnerAvailability', existingDoc.id), {
        isAvailable,
        updatedAt: Timestamp.now(),
      });
      results.push({
        id: existingDoc.id,
        ...existingDoc.data(),
        isAvailable,
      } as LearnerAvailability);
    } else {
      const newRef = doc(learnerAvailabilityCollection);
      const newData = {
        studentId,
        date: dateISO,
        time: slot.time,
        isAvailable,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      batch.set(newRef, newData);
      results.push({
        id: newRef.id,
        ...newData,
      } as LearnerAvailability);
    }
  }

  await batch.commit();
  return results;
}

/* =========================================================
   Approval Requests
   ========================================================= */

export async function getApprovalRequests(status?: ApprovalRequest['status']): Promise<ApprovalRequest[]> {
  const q = status
    ? query(approvalRequestsCollection, where('status', '==', status), orderBy('createdAt', 'desc'))
    : query(approvalRequestsCollection, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => asId<ApprovalRequest>(d.id, d.data()));
}

export async function createApprovalRequest(request: Omit<ApprovalRequest, 'id' | 'studentAuthUid'>): Promise<ApprovalRequest> {
  const ref = await addDoc(approvalRequestsCollection, {
    ...request,
    createdAt: request.createdAt ?? nowIso(),
  } as any);
  const snap = await getDoc(ref);
  return asId<ApprovalRequest>(snap.id, snap.data());
}

export async function resolveApprovalRequest(
  requestId: string,
  resolution: 'approved' | 'denied'
): Promise<ApprovalRequest> {
  const approvalRef = doc(db, 'approvalRequests', requestId);
  const approvalSnap = await getDoc(approvalRef);

  if (!approvalSnap.exists()) throw new Error('Approval request not found');

  const req = asId<ApprovalRequest>(approvalSnap.id, approvalSnap.data());

  // Deny = simple update only
  if (resolution === 'denied') {
    await updateDoc(approvalRef, { status: 'denied', resolvedAt: nowIso() } as any);
    const updated = await getDoc(approvalRef);
    return asId<ApprovalRequest>(updated.id, updated.data());
  }

  // Approved: Variant-1 = assign curriculum only (no booking, no credit creation)
  if (req.type === 'new_student_booking') {
    const r: any = req;

    if (!req.studentId || !r.courseId || !r.unitId) {
      throw new Error('Approval request missing required fields (studentId/courseId/unitId).');
    }

    // Ensure studentProgress exists
    const progressQ = query(
      studentProgressCollection,
      where('studentId', '==', req.studentId),
      where('courseId', '==', r.courseId),
      where('unitId', '==', r.unitId),
      limit(1)
    );
    const progressSnap = await getDocs(progressQ);

    if (progressSnap.empty) {
      const sessionsQ = query(sessionsCollection, where('unitId', '==', r.unitId));
      const sessionsSnap = await getDocs(sessionsQ);
      const sessionsTotal = sessionsSnap.size;

      await addDoc(studentProgressCollection, {
        studentId: req.studentId,
        courseId: r.courseId,
        unitId: r.unitId,
        sessionsTotal,
        sessionsCompleted: 0,
        totalHoursCompleted: 0,
        hoursReserved: r.hoursReserved ?? 0,
        status: 'assigned',
        assignedAt: nowIso(),
        createdAt: nowIso(),
        updatedAt: nowIso(),
      } as any);
    }

    await updateDoc(approvalRef, { status: 'approved', resolvedAt: nowIso() } as any);

    // Notify student to complete payment to book
    // studentId IS the Auth UID in v7
    await createMessage({
      to: req.studentId,
      from: req.teacherUid || 'system',
      fromType: 'system',
      toType: 'student',
      type: 'notification',
      content: 'Approved. Please complete payment to book your sessions.',
      timestamp: nowIso(),
      read: false,
      relatedEntity: { type: 'approvalRequest', id: requestId },
      actionLink: '/s-portal/book',
      createdAt: nowIso(),
    } as any);
  } else if (req.type === 'tutor_assignment') {
    if (resolution === 'approved' && req.teacherUid) {
      // Assign student to teacher
      const studentRef = doc(db, 'students', req.studentId);
      await updateDoc(studentRef, {
        assignedTeacherId: req.teacherUid,
        updatedAt: nowIso(),
      } as any);

      // Notify student via in-app message (in-app only for Phase 1)
      await createMessage({
        to: req.studentId,
        from: req.teacherUid || 'system',
        fromType: 'system',
        toType: 'student',
        type: 'notification',
        content: `${req.teacherName ? req.teacherName + ' approved your request!' : 'Your tutor request has been approved!'} You can now start booking sessions.`,
        timestamp: nowIso(),
        read: false,
        relatedEntity: { type: 'approvalRequest', id: requestId },
        actionLink: '/s-portal/calendar',
        createdAt: nowIso(),
      } as any);
    }
    
    // Update approval status (for both approved and denied)
    await updateDoc(approvalRef, { 
      status: resolution, 
      resolvedAt: nowIso() 
    } as any);
  } else {
    // fallback: approve without side effects
    await updateDoc(approvalRef, { status: 'approved', resolvedAt: nowIso() } as any);
  }

  const updated = await getDoc(approvalRef);
  return asId<ApprovalRequest>(updated.id, updated.data());
}

/* =========================================================
   User Settings
   ========================================================= */

export async function getUserSettings(userId: string, userType: 'teacher' | 'student'): Promise<UserSettings | null> {
  const id = `${userType}-${userId}`;
  const snap = await getDoc(doc(db, 'userSettings', id));
  return snap.exists() ? asId<UserSettings>(snap.id, snap.data()) : null;
}

export async function saveUserSettings(userId: string, settings: Partial<Omit<UserSettings, 'id'>>): Promise<void> {
  const id = `${settings.userType}-${userId}`;
  const ref = doc(db, 'userSettings', id);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, { ...settings, updatedAt: Timestamp.now() } as any);
  } else {
    await setDoc(ref, { ...settings, createdAt: Timestamp.now(), updatedAt: Timestamp.now() } as any);
  }
}

/* =========================================================
   Student Packages
   ========================================================= */

export async function createStudentPackage(pkg: Omit<StudentPackage, 'id'>): Promise<StudentPackage> {
  const ref = await addDoc(studentPackagesCollection, { ...pkg, createdAt: Timestamp.now(), updatedAt: Timestamp.now() } as any);
  const snap = await getDoc(ref);
  return asId<StudentPackage>(snap.id, snap.data());
}

export async function getStudentPackages(studentId: string): Promise<StudentPackage[]> {
  const snapshot = await getDocs(query(studentPackagesCollection, where('studentId', '==', studentId), orderBy('purchaseDate', 'desc')));
  return snapshot.docs.map(d => asId<StudentPackage>(d.id, d.data()));
}

export async function getActiveStudentPackage(studentId: string): Promise<StudentPackage | null> {
  const snapshot = await getDocs(query(
    studentPackagesCollection,
    where('studentId', '==', studentId),
    where('status', '==', 'active'),
    orderBy('purchaseDate', 'desc'),
    limit(1)
  ));
  if (snapshot.empty) return null;
  const d = snapshot.docs[0];
  return asId<StudentPackage>(d.id, d.data());
}

export async function updateStudentPackage(pkgId: string, updates: Partial<StudentPackage>): Promise<void> {
  await updateDoc(doc(db, 'studentPackages', pkgId), { ...updates, updatedAt: Timestamp.now() } as any);
}

export async function getAllStudentPackages(): Promise<StudentPackage[]> {
  const snapshot = await getDocs(query(studentPackagesCollection, orderBy('purchaseDate', 'desc')));
  return snapshot.docs.map(d => asId<StudentPackage>(d.id, d.data()));
}

/* ----- Pause / Unpause ----- */

/**
 * Request a pause for a student package.
 * Creates an ApprovalRequest (type: 'pause_request') and sends notification
 * messages to both tutor and learner. Does NOT actually pause the package —
 * that happens when the approval is granted via executePause().
 */
export async function requestPausePackage(
  pkg: StudentPackage,
  studentName: string,
  studentEmail: string,
  teacherUid: string,
  reason?: string
): Promise<ApprovalRequest> {
  const approval = await createApprovalRequest({
    type: 'pause_request',
    studentId: pkg.studentId,
    studentName,
    studentEmail,
    packageId: pkg.id,
    reason: reason || 'Learner requested a pause',
    status: 'pending',
    createdAt: new Date().toISOString(),
  });

  // Notify tutor
  await createMessage({
    type: 'notification',
    from: 'system',
    fromType: 'system',
    to: teacherUid,
    toType: 'teacher',
    content: `${studentName} has requested to pause their ${pkg.courseTitle} package (${pkg.totalHours}h). Reason: ${reason || 'No reason given'}. Please review and approve or deny.`,
    timestamp: new Date().toISOString(),
    read: false,
    actionLink: '/t-portal/approvals',
    createdAt: new Date().toISOString(),
  });

  // Notify learner
  await createMessage({
    type: 'notification',
    from: 'system',
    fromType: 'system',
    to: pkg.studentId,
    toType: 'student',
    content: `Your pause request for the ${pkg.courseTitle} package has been submitted. Both you and your tutor must agree for the pause to take effect.`,
    timestamp: new Date().toISOString(),
    read: false,
    createdAt: new Date().toISOString(),
  });

  return approval;
}

/**
 * Execute a pause on a package (called when approval is granted).
 * Sets isPaused, pausedAt, status, pauseReason, and increments pauseCount.
 */
export async function executePause(pkgId: string, reason?: string): Promise<void> {
  const ref = doc(db, 'studentPackages', pkgId);
  await updateDoc(ref, {
    isPaused: true,
    pausedAt: new Date().toISOString(),
    pauseReason: reason || null,
    status: 'paused',
    pauseCount: increment(1),
    updatedAt: Timestamp.now(),
  } as any);
}

/**
 * Unpause a student package.
 * Calculates days paused, extends expiresAt by that duration,
 * updates totalDaysPaused, and resets pause state.
 */
export async function unpauseStudentPackage(pkgId: string): Promise<{ daysExtended: number }> {
  const ref = doc(db, 'studentPackages', pkgId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('StudentPackage not found');

  const pkg = asId<StudentPackage>(snap.id, snap.data());
  if (!pkg.isPaused || !pkg.pausedAt) throw new Error('Package is not paused');

  const pausedAt = new Date(pkg.pausedAt);
  const now = new Date();
  const daysPaused = Math.max(1, Math.ceil((now.getTime() - pausedAt.getTime()) / (1000 * 60 * 60 * 24)));

  // Extend expiration date
  const currentExpiry = new Date(pkg.expiresAt);
  currentExpiry.setDate(currentExpiry.getDate() + daysPaused);

  await updateDoc(ref, {
    isPaused: false,
    pausedAt: null,
    pauseReason: null,
    status: 'active',
    totalDaysPaused: (pkg.totalDaysPaused || 0) + daysPaused,
    expiresAt: currentExpiry.toISOString(),
    updatedAt: Timestamp.now(),
  } as any);

  return { daysExtended: daysPaused };
}

/* ----- Student Credits (by student) ----- */

/** Get all StudentCredit records for a student (across all courses). */
export async function getStudentCreditsByStudentId(studentId: string): Promise<StudentCredit[]> {
  const snapshot = await getDocs(query(
    studentCreditCollection,
    where('studentId', '==', studentId),
    orderBy('updatedAt', 'desc')
  ));
  return snapshot.docs.map(d => asId<StudentCredit>(d.id, d.data()));
}

/* =========================================================
   Teacher Profiles
   ========================================================= */

export async function createTeacherProfile(profile: Omit<TeacherProfile, 'id'>): Promise<TeacherProfile> {
  const ref = await addDoc(teacherProfilesCollection, { ...profile, createdAt: Timestamp.now(), updatedAt: Timestamp.now() } as any);
  const snap = await getDoc(ref);
  return asId<TeacherProfile>(snap.id, snap.data());
}

export async function getTeacherProfileByUsername(username: string): Promise<TeacherProfile | null> {
  const snapshot = await getDocs(query(teacherProfilesCollection, where('username', '==', username), limit(1)));
  if (snapshot.empty) return null;
  const d = snapshot.docs[0];
  return asId<TeacherProfile>(d.id, d.data());
}

export async function getTeacherProfileByEmail(email: string): Promise<TeacherProfile | null> {
  const snapshot = await getDocs(query(teacherProfilesCollection, where('email', '==', email), limit(1)));
  if (snapshot.empty) return null;
  const d = snapshot.docs[0];
  return asId<TeacherProfile>(d.id, d.data());
}

export async function getTeacherProfileById(teacherId: string): Promise<TeacherProfile | null> {
  const snap = await getDoc(doc(db, 'teacherProfiles', teacherId));
  return snap.exists() ? asId<TeacherProfile>(snap.id, snap.data()) : null;
}

export async function updateTeacherProfile(teacherId: string, updates: Partial<Omit<TeacherProfile, 'id'>>): Promise<TeacherProfile> {
  await updateDoc(doc(db, 'teacherProfiles', teacherId), { ...updates, updatedAt: Timestamp.now() } as any);
  const snap = await getDoc(doc(db, 'teacherProfiles', teacherId));
  return asId<TeacherProfile>(snap.id, snap.data());
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const snapshot = await getDocs(query(teacherProfilesCollection, where('username', '==', username), limit(1)));
  return snapshot.empty;
}

export async function getAllTeacherProfiles(publishedOnly = false): Promise<TeacherProfile[]> {
  const q = publishedOnly 
    ? query(teacherProfilesCollection, where('isPublished', '==', true), orderBy('name', 'asc'))
    : query(teacherProfilesCollection, orderBy('name', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => asId<TeacherProfile>(d.id, d.data()));
}

/* =========================================================
   Reviews
   ========================================================= */

export async function createReview(review: Omit<Review, 'id' | 'createdAt' | 'pinned' | 'visible'> & Partial<Pick<Review, 'createdAt' | 'pinned' | 'visible'>>): Promise<Review> {
  const ref = await addDoc(reviewsCollection, { ...review, createdAt: review.createdAt ?? nowIso(), pinned: !!review.pinned, visible: review.visible ?? true } as any);
  const snap = await getDoc(ref);
  return asId<Review>(snap.id, snap.data());
}

export async function getReviewsByTeacher(teacherId: string, visibleOnly = true): Promise<Review[]> {
  const constraints = [
      where('teacherId', '==', teacherId),
      orderBy('createdAt', 'desc')
  ];
  if (visibleOnly) {
      constraints.push(where('visible', '==', true));
  }
  const snapshot = await getDocs(query(reviewsCollection, ...constraints));
  return snapshot.docs.map(d => asId<Review>(d.id, d.data()));
}

export async function getPinnedReviews(teacherId: string): Promise<Review[]> {
  const snapshot = await getDocs(query(reviewsCollection, where('teacherId', '==', teacherId), where('pinned', '==', true), where('visible', '==', true), orderBy('createdAt', 'desc')));
  return snapshot.docs.map(d => asId<Review>(d.id, d.data()));
}

export async function getReviewById(reviewId: string): Promise<Review | null> {
  const snap = await getDoc(doc(db, 'reviews', reviewId));
  return snap.exists() ? asId<Review>(snap.id, snap.data()) : null;
}

export async function getAllReviews(): Promise<Review[]> {
  const snapshot = await getDocs(query(reviewsCollection, orderBy('createdAt', 'desc')));
  return snapshot.docs.map(d => asId<Review>(d.id, d.data()));
}

export async function deleteReview(reviewId: string): Promise<void> {
  await deleteDoc(doc(db, 'reviews', reviewId));
}

export async function getReviewedSessionInstanceIds(studentId: string): Promise<string[]> {
  const snapshot = await getDocs(query(reviewsCollection, where('studentId', '==', studentId)));
  return snapshot.docs
    .map(d => {
      const data: any = d.data();
      return data.sessionInstanceId || data.lessonId;
    })
    .filter(Boolean);
}

/* =========================================================
   Student Credit
   ========================================================= */

export async function getAllStudentCredits(): Promise<StudentCredit[]> {
  const snapshot = await getDocs(query(studentCreditCollection, orderBy('updatedAt', 'desc')));
  return snapshot.docs.map(d => asId<StudentCredit>(d.id, d.data()));
}

export async function getStudentCredit(studentId: string, _courseId?: string): Promise<StudentCredit | null> {
  // Course-agnostic: one credit pool per learner
  const snapshot = await getDocs(query(
    studentCreditCollection,
    where('studentId', '==', studentId),
    limit(1)
  ));
  if (snapshot.empty) return null;
  const d = snapshot.docs[0];
  return asId<StudentCredit>(d.id, d.data());
}

export async function createStudentCredit(credit: Omit<StudentCredit, 'id'>): Promise<StudentCredit> {
  const ref = await addDoc(studentCreditCollection, { ...credit, createdAt: Timestamp.now(), updatedAt: Timestamp.now() } as any);
  const snap = await getDoc(ref);
  return asId<StudentCredit>(snap.id, snap.data());
}

export async function updateStudentCredit(creditId: string, updates: Partial<StudentCredit>): Promise<void> {
  await updateDoc(doc(db, 'studentCredit', creditId), { ...updates, updatedAt: Timestamp.now() } as any);
}

export async function deleteStudentCredit(creditId: string): Promise<void> {
  await deleteDoc(doc(db, 'studentCredit', creditId));
}

/**
 * Reserve credit for a unit assignment (uncommitted -> committed).
 */
export async function reserveCredit(studentId: string, _courseId: string, hoursToReserve: number): Promise<void> {
  if (hoursToReserve <= 0) throw new Error('hoursToReserve must be > 0');

  await runTransaction(db, async (tx) => {
    const snapshot = await getDocs(query(
      studentCreditCollection,
      where('studentId', '==', studentId),
      limit(1)
    ));

    if (snapshot.empty) throw new Error('No credit found. Please top up before booking.');

    const creditDoc = snapshot.docs[0];
    const creditRef = doc(db, 'studentCredit', creditDoc.id);
    const creditSnap = await tx.get(creditRef);
    if (!creditSnap.exists()) throw new Error('studentCredit missing');

    const data: any = creditSnap.data();
    const uncommitted = Number(data.uncommittedHours ?? 0);

    if (uncommitted < hoursToReserve) throw new Error('Insufficient uncommitted hours');

    tx.update(creditRef, {
      uncommittedHours: uncommitted - hoursToReserve,
      committedHours: Number(data.committedHours ?? 0) + hoursToReserve,
      updatedAt: Timestamp.now(),
    });
  });
}

/* =========================================================
   Messages (notifications + communications)
   ========================================================= */

export async function createMessage(message: Omit<Message, 'id'>): Promise<Message> {
  const ref = await addDoc(messagesCollection, message as any);
  const snap = await getDoc(ref);
  return asId<Message>(snap.id, snap.data());
}

export async function getMessagesByUser(userUid: string): Promise<Message[]> {
  const incomingQ = query(messagesCollection, where('to', '==', userUid), orderBy('timestamp', 'asc'));
  const outgoingQ = query(messagesCollection, where('from', '==', userUid), orderBy('timestamp', 'asc'));

  const [incoming, outgoing] = await Promise.all([getDocs(incomingQ), getDocs(outgoingQ)]);
  const combined = [
    ...incoming.docs.map(d => asId<Message>(d.id, d.data())),
    ...outgoing.docs.map(d => asId<Message>(d.id, d.data())),
  ];

  combined.sort((a: any, b: any) => String(a.timestamp).localeCompare(String(b.timestamp)));
  return combined;
}

export async function getNotificationsByUser(userUid: string): Promise<Message[]> {
  const qy = query(messagesCollection, where('to', '==', userUid), where('type', '==', 'notification'), orderBy('timestamp', 'desc'));
  const snapshot = await getDocs(qy);
  return snapshot.docs.map(d => asId<Message>(d.id, d.data()));
}

export async function getCommunicationsByUser(userUid: string): Promise<Message[]> {
  const qy = query(messagesCollection, where('to', '==', userUid), where('type', '==', 'communications'), orderBy('timestamp', 'desc'));
  const snapshot = await getDocs(qy);
  return snapshot.docs.map(d => asId<Message>(d.id, d.data()));
}

export async function markMessageAsRead(messageId: string): Promise<void> {
  await updateDoc(doc(db, 'messages', messageId), { read: true } as any);
}

export async function getUnreadCount(userUid: string): Promise<number> {
  const qy = query(messagesCollection, where('to', '==', userUid), where('read', '==', false));
  const snapshot = await getDocs(qy);
  return snapshot.size;
}

export async function getUnreadCountByChannel(userUid: string, channel: Message['type']): Promise<number> {
  const qy = query(messagesCollection, where('to', '==', userUid), where('read', '==', false), where('type', '==', channel));
  const snapshot = await getDocs(qy);
  return snapshot.size;
}

export function subscribeToMessages(userUid: string, onChange: (messages: Message[]) => void): Unsubscribe[] {
  const incomingQ = query(messagesCollection, where('to', '==', userUid), orderBy('timestamp', 'asc'));
  const outgoingQ = query(messagesCollection, where('from', '==', userUid), orderBy('timestamp', 'asc'));

  const state = { incoming: [] as Message[], outgoing: [] as Message[] };

  const emit = () => {
    const combined = [...state.incoming, ...state.outgoing];
    combined.sort((a: any, b: any) => String(a.timestamp).localeCompare(String(b.timestamp)));
    onChange(combined);
  };

  const unsubIncoming = onSnapshot(incomingQ, (snap) => {
    state.incoming = snap.docs.map(d => asId<Message>(d.id, d.data()));
    emit();
  });

  const unsubOutgoing = onSnapshot(outgoingQ, (snap) => {
    state.outgoing = snap.docs.map(d => asId<Message>(d.id, d.data()));
    emit();
  });

  return [unsubIncoming, unsubOutgoing];
}

/* =========================================================
   Student Progress
   ========================================================= */

export async function getStudentProgressByStudentId(studentId: string): Promise<StudentProgress[]> {
  const snapshot = await getDocs(query(studentProgressCollection, where('studentId', '==', studentId), orderBy('updatedAt', 'desc')));
  return snapshot.docs.map(d => asId<StudentProgress>(d.id, d.data()));
}

export async function getAllStudentProgress(): Promise<StudentProgress[]> {
  const snapshot = await getDocs(query(studentProgressCollection, orderBy('updatedAt', 'desc')));
  return snapshot.docs.map(d => asId<StudentProgress>(d.id, d.data()));
}

export async function createStudentProgress(progress: Omit<StudentProgress, 'id'>): Promise<StudentProgress> {
  const ref = await addDoc(studentProgressCollection, { ...progress, createdAt: Timestamp.now(), updatedAt: Timestamp.now() } as any);
  const snap = await getDoc(ref);
  return asId<StudentProgress>(snap.id, snap.data());
}

export async function updateStudentProgress(progressId: string, updates: Partial<StudentProgress>): Promise<void> {
  await updateDoc(doc(db, 'studentProgress', progressId), { ...updates, updatedAt: Timestamp.now() } as any);
}

/* =========================================================
   Student Rewards (Petland — read-only)
   ========================================================= */

export async function getStudentRewardsByStudentId(studentId: string): Promise<StudentRewards | null> {
  const snapshot = await getDocs(query(
    studentRewardsCollection,
    where('studentId', '==', studentId),
    limit(1)
  ));
  if (snapshot.empty) return null;
  const d = snapshot.docs[0];
  return asId<StudentRewards>(d.id, d.data());
}

/* =========================================================
   Payments (Pre-Stripe — manual entry)
   ========================================================= */

export async function createPayment(payment: Omit<Payment, 'id'>): Promise<Payment> {
  const ref = await addDoc(paymentsCollection, { ...payment, createdAt: new Date().toISOString() });
  const snap = await getDoc(ref);
  return asId<Payment>(snap.id, snap.data());
}

export async function getPaymentsByStudentId(studentId: string): Promise<Payment[]> {
  const snapshot = await getDocs(query(
    paymentsCollection,
    where('studentId', '==', studentId),
    orderBy('paymentDate', 'desc')
  ));
  return snapshot.docs.map(d => asId<Payment>(d.id, d.data()));
}

export async function updatePayment(paymentId: string, updates: Partial<Payment>): Promise<void> {
  await updateDoc(doc(db, 'payments', paymentId), updates as any);
}

/* =========================================================
   Assessment Reports (Phase 14)
   ========================================================= */

export async function createAssessmentReport(report: Omit<AssessmentReport, 'id'>): Promise<AssessmentReport> {
  const ref = await addDoc(assessmentReportsCollection, {
    ...report,
    status: 'draft',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  } as any);
  const snap = await getDoc(ref);
  return asId<AssessmentReport>(snap.id, snap.data());
}

export async function getAssessmentReport(reportId: string): Promise<AssessmentReport | null> {
  const snap = await getDoc(doc(db, 'assessmentReports', reportId));
  return snap.exists() ? asId<AssessmentReport>(snap.id, snap.data()) : null;
}

export async function getAssessmentReportsByStudent(studentId: string): Promise<AssessmentReport[]> {
  const snapshot = await getDocs(query(
    assessmentReportsCollection,
    where('studentId', '==', studentId),
    orderBy('createdAt', 'desc')
  ));
  return snapshot.docs.map(d => asId<AssessmentReport>(d.id, d.data()));
}

export async function getAssessmentReportsByUnit(studentId: string, unitId: string): Promise<AssessmentReport[]> {
  const snapshot = await getDocs(query(
    assessmentReportsCollection,
    where('studentId', '==', studentId),
    where('unitId', '==', unitId),
    orderBy('type', 'asc')
  ));
  return snapshot.docs.map(d => asId<AssessmentReport>(d.id, d.data()));
}

export async function updateAssessmentReport(reportId: string, updates: Partial<AssessmentReport>): Promise<void> {
  await updateDoc(doc(db, 'assessmentReports', reportId), { ...updates, updatedAt: nowIso() } as any);
}

/**
 * Finalize an assessment report and link it to studentProgress.
 * - Sets status to 'finalized' and finalizedAt timestamp
 * - Links the report ID to the student's progress record (initialAssessmentId or finalAssessmentId)
 * - Updates assessmentScoreAvg on the progress record (average of the 3 numeric dimensions)
 * - Updates gseBandAtStart or gseBandAtEnd if GSE band is set
 */
export async function finalizeAssessmentReport(reportId: string): Promise<void> {
  const reportSnap = await getDoc(doc(db, 'assessmentReports', reportId));
  if (!reportSnap.exists()) throw new Error('Assessment report not found');

  const report = asId<AssessmentReport>(reportSnap.id, reportSnap.data()) as AssessmentReport;

  // 1. Finalize the report
  await updateDoc(doc(db, 'assessmentReports', reportId), {
    status: 'finalized',
    finalizedAt: nowIso(),
    updatedAt: nowIso(),
  } as any);

  // 2. Find the matching studentProgress record
  const progressQ = query(
    studentProgressCollection,
    where('studentId', '==', report.studentId),
    where('courseId', '==', report.courseId),
    where('unitId', '==', report.unitId),
    limit(1)
  );
  const progressSnap = await getDocs(progressQ);
  if (progressSnap.empty) {
    console.warn('No studentProgress found for this assessment — skipping progress link.');
    return;
  }

  const progressDoc = progressSnap.docs[0];
  const progressRef = doc(db, 'studentProgress', progressDoc.id);

  // 3. Calculate score average (3 numeric dimensions)
  const scoreAvg = Number(
    (
      (report.communicativeEffectiveness +
        report.emergentLanguageComplexity +
        report.fluency) / 3
    ).toFixed(2)
  );

  // 4. Build the progress update based on assessment type
  const progressUpdate: Record<string, any> = {
    updatedAt: nowIso(),
  };

  if (report.type === 'initial') {
    progressUpdate.initialAssessmentId = reportId;
    if (report.gseBand) {
      progressUpdate.gseBandAtStart = {
        min: report.gseBand.min,
        max: report.gseBand.max,
        cefr: report.gseBand.cefr,
      };
    }
  } else if (report.type === 'final') {
    progressUpdate.finalAssessmentId = reportId;
    progressUpdate.assessmentScoreAvg = scoreAvg;
    if (report.gseBand) {
      progressUpdate.gseBandAtEnd = {
        min: report.gseBand.min,
        max: report.gseBand.max,
        cefr: report.gseBand.cefr,
      };
    }
  }

  await updateDoc(progressRef, progressUpdate);
}

export async function deleteAssessmentReport(reportId: string): Promise<void> {
  const snap = await getDoc(doc(db, 'assessmentReports', reportId));
  if (!snap.exists()) throw new Error('Assessment report not found');
  const data = snap.data() as any;
  if (data.status === 'finalized') throw new Error('Cannot delete a finalized assessment report');
  await deleteDoc(doc(db, 'assessmentReports', reportId));
}

// ========================================
// Session Feedback CRUD (Phase 15/16)
// ========================================

export async function createSessionFeedback(data: Omit<SessionFeedback, 'id'>): Promise<string> {
  const docRef = await addDoc(sessionFeedbackCollection, {
    ...data,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
  return docRef.id;
}

export async function getSessionFeedback(id: string): Promise<SessionFeedback | null> {
  const snap = await getDoc(doc(db, 'sessionFeedback', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as SessionFeedback;
}

export async function getSessionFeedbackByInstance(sessionInstanceId: string): Promise<SessionFeedback | null> {
  const q = query(
    sessionFeedbackCollection,
    where('sessionInstanceId', '==', sessionInstanceId),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as SessionFeedback;
}

export async function getSessionFeedbackByStudent(studentId: string): Promise<SessionFeedback[]> {
  const q = query(
    sessionFeedbackCollection,
    where('studentId', '==', studentId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as SessionFeedback));
}

export async function updateSessionFeedback(id: string, data: Partial<SessionFeedback>): Promise<void> {
  await updateDoc(doc(db, 'sessionFeedback', id), {
    ...data,
    updatedAt: nowIso(),
  } as any);
}

// =========================================
// Schedule Templates (Calendar Feature 3)
// =========================================

const scheduleTemplatesCollection = collection(db, 'scheduleTemplates');

export async function createScheduleTemplate(template: Omit<ScheduleTemplate, 'id'>): Promise<ScheduleTemplate> {
  const ref = await addDoc(scheduleTemplatesCollection, {
    ...template,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
  const snap = await getDoc(ref);
  return asId<ScheduleTemplate>(snap.id, snap.data());
}

export async function getScheduleTemplatesByOwner(ownerId: string): Promise<ScheduleTemplate[]> {
  const q = query(
    scheduleTemplatesCollection,
    where('ownerId', '==', ownerId),
    orderBy('updatedAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => asId<ScheduleTemplate>(d.id, d.data()));
}

export async function updateScheduleTemplate(id: string, updates: Partial<ScheduleTemplate>): Promise<void> {
  await updateDoc(doc(db, 'scheduleTemplates', id), { ...updates, updatedAt: nowIso() } as any);
}

export async function deleteScheduleTemplate(id: string): Promise<void> {
  await deleteDoc(doc(db, 'scheduleTemplates', id));
}

/* =========================================================
   Homework Assignments (Phase 15-B)
   ========================================================= */

export async function createHomeworkAssignment(data: Omit<HomeworkAssignment, 'id'>): Promise<string> {
  const ref = await addDoc(homeworkAssignmentsCollection, {
    ...data,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  } as any);
  return ref.id;
}

export async function getHomeworkAssignment(id: string): Promise<HomeworkAssignment | null> {
  const snap = await getDoc(doc(db, 'homeworkAssignments', id));
  return snap.exists() ? asId<HomeworkAssignment>(snap.id, snap.data()) : null;
}

export async function updateHomeworkAssignment(id: string, data: Partial<HomeworkAssignment>): Promise<void> {
  await updateDoc(doc(db, 'homeworkAssignments', id), {
    ...data,
    updatedAt: nowIso(),
  } as any);
}

export async function deleteHomeworkAssignment(id: string): Promise<void> {
  await deleteDoc(doc(db, 'homeworkAssignments', id));
}

export async function getHomeworkByStudent(studentId: string): Promise<HomeworkAssignment[]> {
  const q = query(homeworkAssignmentsCollection, where('studentId', '==', studentId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => asId<HomeworkAssignment>(d.id, d.data()));
}

/* =========================================================
   Pet Shop Items (Petland Accessories)
   ========================================================= */

const petShopItemsCollection = collection(db, 'petShopItems');

export async function createPetShopItem(data: Omit<PetShopItem, 'id' | 'createdDate'> & { createdDate?: string }, teacherUid: string): Promise<PetShopItem> {
  const ref = await addDoc(petShopItemsCollection, {
    ...data,
    createdBy: teacherUid,
    createdDate: nowIso(),
  } as any);
  const snap = await getDoc(ref);
  return asId<PetShopItem>(snap.id, snap.data());
}

export async function getPetShopItems(): Promise<PetShopItem[]> {
  const snap = await getDocs(petShopItemsCollection);
  return snap.docs.map(d => asId<PetShopItem>(d.id, d.data()));
}

export async function getPetShopItem(itemId: string): Promise<PetShopItem | null> {
  const snap = await getDoc(doc(db, 'petShopItems', itemId));
  return snap.exists() ? asId<PetShopItem>(snap.id, snap.data()) : null;
}

export async function updatePetShopItem(itemId: string, updates: Partial<PetShopItem>): Promise<void> {
  await updateDoc(doc(db, 'petShopItems', itemId), updates as any);
}

export async function deletePetShopItem(itemId: string): Promise<void> {
  await deleteDoc(doc(db, 'petShopItems', itemId));
}

export async function decrementPetShopItemStock(itemId: string): Promise<void> {
  const item = await getPetShopItem(itemId);
  if (item) {
    await updatePetShopItem(itemId, { stock: Math.max(0, item.stock - 1) });
  }
}

export async function getHomeworkBySessionInstance(sessionInstanceId: string): Promise<HomeworkAssignment[]> {
  const q = query(homeworkAssignmentsCollection, where('sessionInstanceId', '==', sessionInstanceId));
  const snap = await getDocs(q);
  return snap.docs.map(d => asId<HomeworkAssignment>(d.id, d.data()));
}

export async function getHomeworkByUnit(unitId: string, studentId: string): Promise<HomeworkAssignment[]> {
  const q = query(
    homeworkAssignmentsCollection,
    where('unitId', '==', unitId),
    where('studentId', '==', studentId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => asId<HomeworkAssignment>(d.id, d.data()));
}

export async function getPendingHomework(studentId: string): Promise<HomeworkAssignment[]> {
  const q = query(
    homeworkAssignmentsCollection,
    where('studentId', '==', studentId),
    where('status', 'in', ['assigned', 'delivered', 'submitted'])
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => asId<HomeworkAssignment>(d.id, d.data()));
}

/**
 * After grading homework, update the related studentProgress record
 * with homework stats (count, accuracy avg, practice hours).
 */
export async function updateProgressWithHomeworkStats(
  studentId: string,
  courseId: string,
  unitId: string
): Promise<void> {
  // Get all graded homework for this unit + student
  const q = query(
    homeworkAssignmentsCollection,
    where('studentId', '==', studentId),
    where('unitId', '==', unitId),
    where('status', '==', 'graded')
  );
  const snap = await getDocs(q);
  const graded = snap.docs.map(d => d.data());

  // Get all homework (any status) for this unit + student
  const allQ = query(
    homeworkAssignmentsCollection,
    where('studentId', '==', studentId),
    where('unitId', '==', unitId)
  );
  const allSnap = await getDocs(allQ);
  const totalAssigned = allSnap.size;

  // Calculate stats
  const totalCompleted = graded.length;
  const completionRate = totalAssigned > 0 ? totalCompleted / totalAssigned : 0;
  const accuracySum = graded.reduce((sum, hw) => sum + (hw.grading?.score ?? 0), 0);
  const accuracyAvg = totalCompleted > 0 ? accuracySum / totalCompleted : 0;
  const practiceHours = graded.reduce((sum, hw) => sum + (hw.grading?.practiceHours ?? 0), 0);

  // Find the matching studentProgress doc
  const progressQ = query(
    studentProgressCollection,
    where('studentId', '==', studentId),
    where('courseId', '==', courseId),
    where('unitId', '==', unitId),
    limit(1)
  );
  const progressSnap = await getDocs(progressQ);

  if (!progressSnap.empty) {
    const progressRef = doc(db, 'studentProgress', progressSnap.docs[0].id);
    await updateDoc(progressRef, {
      homeworkAssigned: totalAssigned,
      homeworkCompleted: totalCompleted,
      homeworkAccuracyAvg: Math.round(accuracyAvg * 100) / 100,
      homeworkCompletionRate: Math.round(completionRate * 100) / 100,
      homeworkPracticeHours: Math.round(practiceHours * 100) / 100,
      updatedAt: nowIso(),
      lastActivityAt: nowIso(),
    } as any);
  }
}

// =========================================================
// Phase 17: Live Session Background - Firestore Functions
// =========================================================

const sessionProgressCollection = collection(db, 'sessionProgress');

/**
 * Create or get session progress for a live session (Phase 17)
 */
export async function getOrCreateSessionProgress(
  sessionInstanceId: string,
  studentId: string,
  teacherId: string,
  options?: {
    sessionQuestion?: string;
    sessionAim?: string;
    xpTarget?: number;
    theme?: 'space' | 'ocean' | 'farm' | 'desert' | 'city';
  }
): Promise<Phase17SessionProgress> {
  const q = query(
    sessionProgressCollection,
    where('sessionInstanceId', '==', sessionInstanceId),
    where('studentId', '==', studentId),
    limit(1)
  );

  const existing = await getDocs(q);
  if (!existing.empty) {
    return asId<Phase17SessionProgress>(existing.docs[0].id, existing.docs[0].data());
  }

  // Create new session progress
  const newProgress = {
    sessionInstanceId,
    studentId,
    teacherId,
    sessionQuestion: options?.sessionQuestion || '',
    sessionAim: options?.sessionAim || '',
    xpTarget: options?.xpTarget || 60,
    theme: options?.theme || 'space',
    treasureChests: [],
    wows: [],
    oopsies: [],
    behaviorDeductions: [],
    vocabulary: [],
    grammar: [],
    phonics: [],
    totalXpEarned: 0,
    status: 'active' as const,
    createdAt: nowIso(),
  };

  const ref = await addDoc(sessionProgressCollection, newProgress);
  const snap = await getDoc(ref);
  return asId<Phase17SessionProgress>(snap.id, snap.data());
}

/**
 * Add treasure chest reward to session
 */
export async function addTreasureChest(
  sessionProgressId: string,
  amount: number
): Promise<void> {
  const ref = doc(db, 'sessionProgress', sessionProgressId);
  const progressSnap = await getDoc(ref);
  if (!progressSnap.exists()) throw new Error('Session progress not found');

  const progress = progressSnap.data() as Phase17SessionProgress;
  const newTreasure: TreasureChestReward = {
    amount,
    timestamp: nowIso(),
  };

  await updateDoc(ref, {
    treasureChests: [...(progress.treasureChests || []), newTreasure],
    totalXpEarned: progress.totalXpEarned + amount,
  } as any);
}

/**
 * Add wow reward to session
 */
export async function addWow(sessionProgressId: string): Promise<void> {
  const ref = doc(db, 'sessionProgress', sessionProgressId);
  const progressSnap = await getDoc(ref);
  if (!progressSnap.exists()) throw new Error('Session progress not found');

  const progress = progressSnap.data() as Phase17SessionProgress;
  const newWow: WowReward = {
    timestamp: nowIso(),
  };

  await updateDoc(ref, {
    wows: [...(progress.wows || []), newWow],
  } as any);
}

/**
 * Add oopsie event to session
 */
export async function addOopsie(sessionProgressId: string): Promise<void> {
  const ref = doc(db, 'sessionProgress', sessionProgressId);
  const progressSnap = await getDoc(ref);
  if (!progressSnap.exists()) throw new Error('Session progress not found');

  const progress = progressSnap.data() as Phase17SessionProgress;
  const newOopsie: OopsieEvent = {
    timestamp: nowIso(),
  };

  await updateDoc(ref, {
    oopsies: [...(progress.oopsies || []), newOopsie],
  } as any);
}

/**
 * Add behavior deduction to session
 */
export async function addBehaviorDeduction(
  sessionProgressId: string,
  type: BehaviorDeductionType
): Promise<void> {
  const ref = doc(db, 'sessionProgress', sessionProgressId);
  const progressSnap = await getDoc(ref);
  if (!progressSnap.exists()) throw new Error('Session progress not found');

  const progress = progressSnap.data() as Phase17SessionProgress;
  const amountMap: Record<string, number> = { 'out-to-lunch': -3, 'chatterbox': -2, 'disruptive': -5 };
  const amount = amountMap[type] ?? -3;

  const newDeduction: BehaviorDeduction = {
    type,
    amount,
    timestamp: nowIso(),
  };

  await updateDoc(ref, {
    behaviorDeductions: [...(progress.behaviorDeductions || []), newDeduction],
    totalXpEarned: progress.totalXpEarned + amount,
  } as any);
}

/**
 * Legacy: Add generic reward to session (deprecated - use addTreasureChest, addWow, etc.)
 */
export async function addReward(
  sessionProgressId: string,
  rewardType: 'wow' | 'treasure' | 'brainfart'
): Promise<void> {
  const ref = doc(db, 'sessionProgress', sessionProgressId);
  const progressSnap = await getDoc(ref);
  if (!progressSnap.exists()) throw new Error('Session progress not found');

  const progress = progressSnap.data() as Phase17SessionProgress;
  
  if (rewardType === 'treasure') {
    const amount = Math.floor(Math.random() * 41) + 10;
    await addTreasureChest(sessionProgressId, amount);
  } else if (rewardType === 'wow') {
    await addWow(sessionProgressId);
  } else if (rewardType === 'brainfart') {
    await addOopsie(sessionProgressId);
  }
}

/**
 * Add vocabulary to session progress
 */
export async function addSessionVocabulary(
  sessionProgressId: string,
  word: string,
  meaning: string
): Promise<void> {
  const ref = doc(db, 'sessionProgress', sessionProgressId);
  const progressSnap = await getDoc(ref);
  if (!progressSnap.exists()) throw new Error('Session progress not found');

  const progress = progressSnap.data() as Phase17SessionProgress;
  const newVocab: SessionVocabulary = {
    word,
    meaning,
    timestamp: nowIso(),
  };

  await updateDoc(ref, {
    vocabulary: [...(progress.vocabulary || []), newVocab],
  } as any);
}

export async function getSessionVocabularyByInstanceId(
  sessionInstanceId: string
): Promise<SessionVocabulary[]> {
  const q = query(
    sessionProgressCollection,
    where('sessionInstanceId', '==', sessionInstanceId),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return [];
  const data = snap.docs[0].data() as Phase17SessionProgress;
  return data.vocabulary || [];
}

/**
 * Add grammar point to session progress
 */
export async function addSessionGrammar(
  sessionProgressId: string,
  point: string,
  example: string
): Promise<void> {
  const ref = doc(db, 'sessionProgress', sessionProgressId);
  const progressSnap = await getDoc(ref);
  if (!progressSnap.exists()) throw new Error('Session progress not found');

  const progress = progressSnap.data() as Phase17SessionProgress;
  const newGrammar: SessionGrammar = {
    point,
    example,
    timestamp: nowIso(),
  };

  await updateDoc(ref, {
    grammar: [...(progress.grammar || []), newGrammar],
  } as any);
}

/**
 * Add phonics item to session progress
 */
export async function addSessionPhonics(
  sessionProgressId: string,
  sound: string,
  examples: string[]
): Promise<void> {
  const ref = doc(db, 'sessionProgress', sessionProgressId);
  const progressSnap = await getDoc(ref);
  if (!progressSnap.exists()) throw new Error('Session progress not found');

  const progress = progressSnap.data() as Phase17SessionProgress;
  const newPhonics: SessionPhonics = {
    sound,
    examples,
    timestamp: nowIso(),
  };

  await updateDoc(ref, {
    phonics: [...(progress.phonics || []), newPhonics],
  } as any);
}

/**
 * Update session question and aim
 */
export async function updateSessionGoals(
  sessionProgressId: string,
  question: string,
  aim: string
): Promise<void> {
  const ref = doc(db, 'sessionProgress', sessionProgressId);
  
  await updateDoc(ref, {
    sessionQuestion: question,
    sessionAim: aim,
  } as any);
}

/**
 * Update XP target for the session
 */
export async function updateSessionTarget(
  sessionProgressId: string,
  xpTarget: number
): Promise<void> {
  const ref = doc(db, 'sessionProgress', sessionProgressId);
  
  await updateDoc(ref, {
    xpTarget,
  } as any);
}

/**
 * Set the magic word for the session
 */
export async function setMagicWord(
  sessionProgressId: string,
  magicWord: string
): Promise<void> {
  const ref = doc(db, 'sessionProgress', sessionProgressId);
  
  await updateDoc(ref, {
    magicWord,
  } as any);
}

/**
 * Update session theme
 */
export async function updateSessionTheme(
  sessionProgressId: string,
  theme: 'space' | 'ocean' | 'farm' | 'desert' | 'city'
): Promise<void> {
  const ref = doc(db, 'sessionProgress', sessionProgressId);
  
  await updateDoc(ref, {
    theme,
  } as any);
}

/**
 * End the session
 */
export async function endSession(sessionProgressId: string): Promise<void> {
  const ref = doc(db, 'sessionProgress', sessionProgressId);
  
  await updateDoc(ref, {
    status: 'completed',
    completedAt: nowIso(),
  } as any);
}

/**
 * Real-time listener for session progress
 */
export function onSessionProgressUpdate(
  sessionProgressId: string,
  callback: (progress: Phase17SessionProgress) => void
): Unsubscribe {
  const ref = doc(db, 'sessionProgress', sessionProgressId);
  return onSnapshot(ref, snap => {
    if (snap.exists()) {
      callback(asId<Phase17SessionProgress>(snap.id, snap.data()));
    }
  });
}

/**
 * Look up session progress by sessionInstanceId (used by debrief page)
 */
export async function getSessionProgressByInstanceId(
  sessionInstanceId: string
): Promise<Phase17SessionProgress | null> {
  const q = query(
    sessionProgressCollection,
    where('sessionInstanceId', '==', sessionInstanceId),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return asId<Phase17SessionProgress>(snap.docs[0].id, snap.docs[0].data());
}

// ===================================
// GRAMMAR & PHONICS SRS SUBCOLLECTIONS
// ===================================

/**
 * Add a grammar card to students/{studentId}/grammar
 */
export async function addGrammarCard(
  studentId: string,
  card: Omit<GrammarCard, 'id'>
): Promise<string> {
  const ref = collection(db, 'students', studentId, 'grammar');
  const docRef = await addDoc(ref, card);
  return docRef.id;
}

/**
 * Get all grammar cards for a student
 */
export async function getGrammarCards(studentId: string): Promise<GrammarCard[]> {
  const ref = collection(db, 'students', studentId, 'grammar');
  const snap = await getDocs(ref);
  return snap.docs.map(d => asId<GrammarCard>(d.id, d.data()));
}

/**
 * Update a grammar card (e.g. after SRS review)
 */
export async function updateGrammarCard(
  studentId: string,
  cardId: string,
  updates: Partial<Omit<GrammarCard, 'id'>>
): Promise<void> {
  const ref = doc(db, 'students', studentId, 'grammar', cardId);
  await updateDoc(ref, updates as any);
}

/**
 * Add a phonics card to students/{studentId}/phonics
 */
export async function addPhonicsCard(
  studentId: string,
  card: Omit<PhonicsCard, 'id'>
): Promise<string> {
  const ref = collection(db, 'students', studentId, 'phonics');
  const docRef = await addDoc(ref, card);
  return docRef.id;
}

/**
 * Get all phonics cards for a student
 */
export async function getPhonicsCards(studentId: string): Promise<PhonicsCard[]> {
  const ref = collection(db, 'students', studentId, 'phonics');
  const snap = await getDocs(ref);
  return snap.docs.map(d => asId<PhonicsCard>(d.id, d.data()));
}

/**
 * Update a phonics card (e.g. after SRS review)
 */
export async function updatePhonicsCard(
  studentId: string,
  cardId: string,
  updates: Partial<Omit<PhonicsCard, 'id'>>
): Promise<void> {
  const ref = doc(db, 'students', studentId, 'phonics', cardId);
  await updateDoc(ref, updates as any);
}

/**
 * Get all session progress records for a student, newest first
 */
export async function getSessionProgressByStudentId(studentId: string): Promise<Phase17SessionProgress[]> {
  const ref = collection(db, 'sessionProgress');
  const q = query(ref, where('studentId', '==', studentId));
  const snap = await getDocs(q);
  const results = snap.docs.map(d => ({ id: d.id, ...d.data() } as Phase17SessionProgress));
  return results.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
}
