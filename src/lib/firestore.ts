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
  increment,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';

import type {
  Student,
  Availability,
  Course,
  Level,
  ApprovalRequest,
  ApprovalRequestType,
  UserSettings,
  StudentPackage,
  TeacherProfile,
  Review,
  StudentCredit,
  Message,
  Unit,
  Session,
  SessionInstance,
  StudentProgress,
} from './types';

// ===================================
// Re-export types for convenience
// ===================================
export type {
  Student,
  Availability,
  Course,
  Level,
  ApprovalRequest,
  ApprovalRequestType,
  UserSettings,
  StudentPackage,
  TeacherProfile,
  Review,
  StudentCredit,
  Message,
  Unit,
  Session,
  SessionInstance,
  StudentProgress,
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
export const messagesCollection = collection(db, 'messages');

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
    status: defaults?.status ?? 'currently enrolled',
    enrollmentStatus: defaults?.enrollmentStatus ?? 'unknown',
    paymentStatus: defaults?.paymentStatus ?? 'unknown',
    prepaidPackage: defaults?.prepaidPackage ?? { initialValue: 0, balance: 0, currency: 'EUR' },
    goalMet: defaults?.goalMet ?? false,
    isNewStudent: defaults?.isNewStudent ?? true,
    assignedTeacherId: defaults?.assignedTeacherId,
  };

  return createStudent(authUid, toCreate);
}

export async function deleteStudent(studentId: string): Promise<void> {
  await deleteDoc(doc(db, 'students', studentId));
}

/** Check if student is new (no completed bookings) */
export async function isNewStudent(studentId: string): Promise<boolean> {
  const student = await getStudentById(studentId);
  if (!student) return true;
  if (student.isNewStudent === true) return true;
  if (student.isNewStudent === false) return false;
  
  // Fallback: check if they have any completed sessions
  const q = query(
    sessionInstancesCollection,
    where('studentId', '==', studentId),
    where('status', '==', 'completed'),
    limit(1)
  );
  const snapshot = await getDocs(q);
  return snapshot.empty;
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
  courseId: string;
  unitId: string;
  sessionId: string;
  lessonDate: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  billingType: SessionInstance['billingType'];
  rate?: number;
  title?: string;
}): Promise<SessionInstance> {
  // Gate 1: progress exists (unless trial)
  if (input.billingType !== 'trial') {
    const progressQ = query(
      studentProgressCollection,
      where('studentId', '==', input.studentId),
      where('courseId', '==', input.courseId),
      where('unitId', '==', input.unitId),
      limit(1)
    );
    const progressSnap = await getDocs(progressQ);
    if (progressSnap.empty) {
      throw new Error('Unit not assigned. Please request approval first.');
    }
  }

  // Gate 2: credit exists (unless trial)
  if (input.billingType !== 'trial') {
    const credit = await getStudentCredit(input.studentId, input.courseId);
    if (!credit) {
      throw new Error('No credit found. Please complete payment before booking.');
    }
    if (input.billingType === 'credit' && typeof credit.committedHours === 'number' && credit.committedHours < input.durationHours) {
      throw new Error('Insufficient reserved credit for this unit.');
    }
  }

  const payload: any = {
    studentId: input.studentId,       // Auth UID
    teacherUid: input.teacherUid,     // Auth UID
    courseId: input.courseId,
    unitId: input.unitId,
    sessionId: input.sessionId,
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
export async function completeSession(instanceId: string): Promise<void> {
  const ref = doc(db, 'sessionInstances', instanceId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('SessionInstance not found');

    const inst = normalizeSessionInstance(snap.id, snap.data());

    if (inst.status === 'completed') return; // Idempotent

    tx.update(ref, {
      status: 'completed',
      completedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // Progress update (best-effort)
    const progressQ = query(
      studentProgressCollection,
      where('studentId', '==', inst.studentId),
      where('courseId', '==', inst.courseId),
      where('unitId', '==', inst.unitId),
      limit(1)
    );

    const progressSnap = await getDocs(progressQ);
    if (!progressSnap.empty) {
      const pRef = doc(db, 'studentProgress', progressSnap.docs[0].id);
      tx.update(pRef, {
        sessionsCompleted: increment(1),
        totalHoursCompleted: increment(inst.durationHours),
        updatedAt: Timestamp.now(),
        lastActivityAt: Timestamp.now(),
      } as any);
    }

    // Credit settlement
    if (inst.billingType === 'credit') {
      const creditQ = query(
        studentCreditCollection,
        where('studentId', '==', inst.studentId),
        where('courseId', '==', inst.courseId),
        limit(1)
      );
      const creditSnap = await getDocs(creditQ);
      if (!creditSnap.empty) {
        const cRef = doc(db, 'studentCredit', creditSnap.docs[0].id);
        tx.update(cRef, {
          committedHours: increment(-inst.durationHours),
          completedHours: increment(inst.durationHours),
          updatedAt: Timestamp.now(),
        } as any);
      }
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

  await updateDoc(doc(db, 'sessionInstances', instanceId), {
    status: 'cancelled',
    updatedAt: Timestamp.now(),
  } as any);
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
      studentAuthUid: req.studentAuthUid,
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

export async function decrementPackageLessons(pkgId: string, decrementBy = 1): Promise<void> {
  await runTransaction(db, async (tx) => {
    const ref = doc(db, 'studentPackages', pkgId);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('StudentPackage not found');
    const data: any = snap.data();
    const current = typeof data.balance === 'number' ? data.balance : 0;
    tx.update(ref, { balance: Math.max(0, current - decrementBy), updatedAt: Timestamp.now() });
  });
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

export async function createReview(review: Omit<Review, 'id'>): Promise<Review> {
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

export async function getStudentCredit(studentId: string, courseId: string): Promise<StudentCredit | null> {
  const snapshot = await getDocs(query(
    studentCreditCollection,
    where('studentId', '==', studentId),
    where('courseId', '==', courseId),
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
export async function reserveCredit(studentId: string, courseId: string, hoursToReserve: number): Promise<void> {
  if (hoursToReserve <= 0) throw new Error('hoursToReserve must be > 0');

  await runTransaction(db, async (tx) => {
    const snapshot = await getDocs(query(
      studentCreditCollection,
      where('studentId', '==', studentId),
      where('courseId', '==', courseId),
      limit(1)
    ));

    if (snapshot.empty) throw new Error('No studentCredit found for this course');

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

export async function createStudentProgress(progress: Omit<StudentProgress, 'id'>): Promise<StudentProgress> {
  const ref = await addDoc(studentProgressCollection, { ...progress, createdAt: Timestamp.now(), updatedAt: Timestamp.now() } as any);
  const snap = await getDoc(ref);
  return asId<StudentProgress>(snap.id, snap.data());
}

export async function updateStudentProgress(progressId: string, updates: Partial<StudentProgress>): Promise<void> {
  await updateDoc(doc(db, 'studentProgress', progressId), { ...updates, updatedAt: Timestamp.now() } as any);
}
