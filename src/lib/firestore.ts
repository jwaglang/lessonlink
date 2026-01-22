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
} from 'firebase/firestore';
import { db } from './firebase';
import type { Student, Lesson, Availability, CourseTemplate, ApprovalRequest, UserSettings, StudentPackage, TeacherProfile, Review } from './types';

// Collection references
const studentsCollection = collection(db, 'students');
const lessonsCollection = collection(db, 'lessons');
const availabilityCollection = collection(db, 'availability');
const courseTemplatesCollection = collection(db, 'courseTemplates');
const approvalRequestsCollection = collection(db, 'approvalRequests');
const userSettingsCollection = collection(db, 'userSettings');
const studentPackagesCollection = collection(db, 'studentPackages');
const teacherProfilesCollection = collection(db, 'teacherProfiles');
const reviewsCollection = collection(db, 'reviews');

// ============================================
// COURSE TEMPLATES
// ============================================

export async function getCourseTemplates(): Promise<CourseTemplate[]> {
  const snapshot = await getDocs(courseTemplatesCollection);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as CourseTemplate));
}

export async function addCourseTemplate(data: Omit<CourseTemplate, 'id'>): Promise<CourseTemplate> {
  const docRef = await addDoc(courseTemplatesCollection, data);
  return {
    id: docRef.id,
    ...data
  };
}

export async function updateCourseTemplate(id: string, data: Partial<Omit<CourseTemplate, 'id'>>): Promise<CourseTemplate> {
  const docRef = doc(db, 'courseTemplates', id);
  await updateDoc(docRef, data);
  const updated = await getDoc(docRef);
  return {
    id: updated.id,
    ...updated.data()
  } as CourseTemplate;
}

export async function deleteCourseTemplate(id: string): Promise<{ id: string }> {
  const docRef = doc(db, 'courseTemplates', id);
  await deleteDoc(docRef);
  return { id };
}

// ============================================
// STUDENTS
// ============================================

export async function getStudents(): Promise<Student[]> {
  const studentsSnapshot = await getDocs(studentsCollection);
  const lessonsSnapshot = await getDocs(lessonsCollection);
  
  const allLessons = lessonsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Lesson));

  return studentsSnapshot.docs.map(doc => {
    const studentData = doc.data();
    const studentLessons = allLessons.filter(l => l.studentId === doc.id);
    return {
      id: doc.id,
      ...studentData,
      lessons: studentLessons
    } as Student;
  });
}

export async function getStudentById(id: string): Promise<Student | undefined> {
  const docRef = doc(db, 'students', id);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return undefined;
  }

  // Get student's lessons
  const lessonsQuery = query(lessonsCollection, where('studentId', '==', id));
  const lessonsSnapshot = await getDocs(lessonsQuery);
  const lessons = lessonsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Lesson));

  return {
    id: docSnap.id,
    ...docSnap.data(),
    lessons
  } as Student;
}

export async function addStudent(data: Pick<Student, 'name' | 'email'>): Promise<Student> {
  const newStudentData = {
    name: data.name,
    email: data.email,
    avatarUrl: '/avatars/default.png',
    status: 'currently enrolled' as const,
    enrollmentStatus: 'Active',
    paymentStatus: 'unpaid',
    prepaidPackage: { initialValue: 0, balance: 0, currency: 'USD' },
    goalMet: false,
  };

  const docRef = await addDoc(studentsCollection, newStudentData);
  
  return {
    id: docRef.id,
    ...newStudentData,
    lessons: []
  };
}

export async function updateStudentStatus(id: string, status: Student['status']): Promise<Student> {
  const docRef = doc(db, 'students', id);
  await updateDoc(docRef, { status });
  
  const updated = await getStudentById(id);
  if (!updated) throw new Error("Student not found");
  return updated;
}

export async function updateStudent(id: string, data: Partial<Pick<Student, 'name' | 'email'>>): Promise<Student> {
  const docRef = doc(db, 'students', id);
  await updateDoc(docRef, data);
  
  const updated = await getStudentById(id);
  if (!updated) throw new Error("Student not found");
  return updated;
}

export async function getStudentByEmail(email: string): Promise<Student | undefined> {
  const q = query(studentsCollection, where('email', '==', email));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    return undefined;
  }

  const docSnap = snapshot.docs[0];
  
  // Get student's lessons
  const lessonsQuery = query(lessonsCollection, where('studentId', '==', docSnap.id));
  const lessonsSnapshot = await getDocs(lessonsQuery);
  const lessons = lessonsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Lesson));

  return {
    id: docSnap.id,
    ...docSnap.data(),
    lessons
  } as Student;
}

export async function getOrCreateStudentByEmail(email: string, name?: string): Promise<Student> {
  // First try to find existing student
  const existing = await getStudentByEmail(email);
  if (existing) {
    return existing;
  }

  // Create new student if not found
  const newStudentData = {
    name: name || email.split('@')[0],
    email: email,
    avatarUrl: '/avatars/default.png',
    status: 'currently enrolled' as const,
    enrollmentStatus: 'Active',
    paymentStatus: 'unpaid',
    prepaidPackage: { initialValue: 0, balance: 0, currency: 'USD' },
    goalMet: false,
  };

  const docRef = await addDoc(studentsCollection, newStudentData);
  
  return {
    id: docRef.id,
    ...newStudentData,
    lessons: []
  };
}

export async function deleteStudent(studentId: string): Promise<void> {
  // 1. Find and delete all lessons for this student
  const lessonsQuery = query(lessonsCollection, where('studentId', '==', studentId));
  const lessonsSnapshot = await getDocs(lessonsQuery);
  const deletePromises: Promise<void>[] = [];
  lessonsSnapshot.forEach((doc) => {
    deletePromises.push(deleteDoc(doc.ref));
  });
  await Promise.all(deletePromises);

  // 2. Delete the student document itself
  const studentRef = doc(db, 'students', studentId);
  await deleteDoc(studentRef);
}

// ============================================
// LESSONS
// ============================================

export async function getLessonsByStudentId(studentId: string): Promise<Lesson[]> {
  const q = query(lessonsCollection, where('studentId', '==', studentId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Lesson));
}

export async function getLessonById(id: string): Promise<Lesson | undefined> {
  const docRef = doc(db, 'lessons', id);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return undefined;
  }

  return {
    id: docSnap.id,
    ...docSnap.data()
  } as Lesson;
}

export async function bookLesson(data: {
  studentId: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  rate: number;
}): Promise<Lesson> {
  const newLessonData = {
    ...data,
    status: 'scheduled' as const,
  };

  const docRef = await addDoc(lessonsCollection, newLessonData);
  
  // Mark the availability slot as no longer available
  const { formatISO, startOfDay } = await import('date-fns');
  const dateISO = formatISO(startOfDay(new Date(data.date)));
  const availQuery = query(
    availabilityCollection,
    where('date', '==', dateISO),
    where('time', '==', data.startTime)
  );
  const availSnapshot = await getDocs(availQuery);
  if (!availSnapshot.empty) {
    await updateDoc(doc(db, 'availability', availSnapshot.docs[0].id), {
      isAvailable: false
    });
  }

  return {
    id: docRef.id,
    ...newLessonData
  };
}

export async function rescheduleLesson(
  lessonId: string,
  newDate: string,
  newStartTime: string,
  newEndTime: string,
  studentId: string,
  forceApproval: boolean = false
): Promise<{ success: boolean; lesson?: Lesson; approvalRequired?: boolean; approvalRequest?: ApprovalRequest }> {
  const lessonRef = doc(db, 'lessons', lessonId);
  const lessonSnap = await getDoc(lessonRef);
  
  if (!lessonSnap.exists()) {
    throw new Error("Lesson not found");
  }

  const oldLesson = lessonSnap.data();
  const { formatISO, startOfDay, differenceInHours, parseISO } = await import('date-fns');
  const { toZonedTime } = await import('date-fns-tz');

  // Get teacher's timezone for the 12-hour rule
  const teacherSettings = await getTeacherSettings();
  const teacherTimezone = teacherSettings?.timezone || 'UTC';

  // Calculate hours until lesson in teacher's timezone
  const now = new Date();
  const lessonDateTime = parseISO(`${oldLesson.date.split('T')[0]}T${oldLesson.startTime}:00`);
  const nowInTeacherTz = toZonedTime(now, teacherTimezone);
  const lessonInTeacherTz = toZonedTime(lessonDateTime, teacherTimezone);
  const hoursUntilLesson = differenceInHours(lessonInTeacherTz, nowInTeacherTz);

  // If less than 12 hours and not forcing approval, create approval request
  if (hoursUntilLesson < 12 && !forceApproval) {
    const student = await getStudentById(studentId);
    const approvalRequest = await createApprovalRequest({
      type: 'late_reschedule',
      studentId,
      studentName: student?.name || 'Unknown',
      studentEmail: student?.email || 'Unknown',
      lessonId,
      lessonTitle: oldLesson.title,
      lessonDate: oldLesson.date,
      lessonTime: oldLesson.startTime,
      newDate,
      newTime: newStartTime,
      reason: `Reschedule requested with less than 12 hours notice (${hoursUntilLesson.toFixed(1)} hours before lesson)`,
    });
    return { success: false, approvalRequired: true, approvalRequest };
  }

  // Proceed with reschedule
  // Free up the old time slot
  const oldDateISO = formatISO(startOfDay(new Date(oldLesson.date)));
  const oldAvailQuery = query(
    availabilityCollection,
    where('date', '==', oldDateISO),
    where('time', '==', oldLesson.startTime)
  );
  const oldAvailSnapshot = await getDocs(oldAvailQuery);
  if (!oldAvailSnapshot.empty) {
    await updateDoc(doc(db, 'availability', oldAvailSnapshot.docs[0].id), {
      isAvailable: true
    });
  }

  // Mark the new time slot as unavailable
  const newDateISO = formatISO(startOfDay(new Date(newDate)));
  const newAvailQuery = query(
    availabilityCollection,
    where('date', '==', newDateISO),
    where('time', '==', newStartTime)
  );
  const newAvailSnapshot = await getDocs(newAvailQuery);
  if (!newAvailSnapshot.empty) {
    await updateDoc(doc(db, 'availability', newAvailSnapshot.docs[0].id), {
      isAvailable: false
    });
  }

  // Update the lesson
  await updateDoc(lessonRef, {
    date: newDate,
    startTime: newStartTime,
    endTime: newEndTime
  });

  const updated = await getDoc(lessonRef);
  return {
    success: true,
    lesson: {
      id: updated.id,
      ...updated.data()
    } as Lesson
  };
}

export async function cancelLesson(
  lessonId: string,
  studentId: string,
  forceApproval: boolean = false
): Promise<{ success: boolean; approvalRequired?: boolean; approvalRequest?: ApprovalRequest }> {
  const lessonRef = doc(db, 'lessons', lessonId);
  const lessonSnap = await getDoc(lessonRef);
  
  if (!lessonSnap.exists()) {
    throw new Error("Lesson not found");
  }

  const lesson = lessonSnap.data();
  const { formatISO, startOfDay, differenceInHours, parseISO } = await import('date-fns');
  const { toZonedTime } = await import('date-fns-tz');

  // Get teacher's timezone for the 24-hour rule
  const teacherSettings = await getTeacherSettings();
  const teacherTimezone = teacherSettings?.timezone || 'UTC';

  // Calculate hours until lesson in teacher's timezone
  const now = new Date();
  const lessonDateTime = parseISO(`${lesson.date.split('T')[0]}T${lesson.startTime}:00`);
  const nowInTeacherTz = toZonedTime(now, teacherTimezone);
  const lessonInTeacherTz = toZonedTime(lessonDateTime, teacherTimezone);
  const hoursUntilLesson = differenceInHours(lessonInTeacherTz, nowInTeacherTz);

  // If less than 24 hours and not forcing approval, create approval request
  if (hoursUntilLesson < 24 && !forceApproval) {
    const student = await getStudentById(studentId);
    const approvalRequest = await createApprovalRequest({
      type: 'late_cancel',
      studentId,
      studentName: student?.name || 'Unknown',
      studentEmail: student?.email || 'Unknown',
      lessonId,
      lessonTitle: lesson.title,
      lessonDate: lesson.date,
      lessonTime: lesson.startTime,
      reason: `Cancellation requested with less than 24 hours notice (${hoursUntilLesson.toFixed(1)} hours before lesson)`,
    });
    return { success: false, approvalRequired: true, approvalRequest };
  }

  // Proceed with cancellation
  // Free up the time slot
  const dateISO = formatISO(startOfDay(new Date(lesson.date)));
  const availQuery = query(
    availabilityCollection,
    where('date', '==', dateISO),
    where('time', '==', lesson.startTime)
  );
  const availSnapshot = await getDocs(availQuery);
  if (!availSnapshot.empty) {
    await updateDoc(doc(db, 'availability', availSnapshot.docs[0].id), {
      isAvailable: true
    });
  }

  // Delete the lesson
  await deleteDoc(lessonRef);
  
  return { success: true };
}

export async function getAvailableSlots(): Promise<Availability[]> {
  const q = query(availabilityCollection, where('isAvailable', '==', true));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Availability));
}

// ============================================
// LESSONS
// ============================================

export async function getLessons(): Promise<Lesson[]> {
  const snapshot = await getDocs(lessonsCollection);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Lesson));
}

export async function addLesson(data: Omit<Lesson, 'id' | 'status'>): Promise<Lesson> {
  const newLessonData = {
    ...data,
    status: 'scheduled' as const,
  };

  const docRef = await addDoc(lessonsCollection, newLessonData);
  
  return {
    id: docRef.id,
    ...newLessonData
  };
}

export async function updateLessonStatus(id: string, status: Lesson['status']): Promise<Lesson> {
  const docRef = doc(db, 'lessons', id);
  const updateData: Record<string, any> = { status };

  // If lesson is marked as paid, add payment info
  if (status === 'paid') {
    const lessonSnap = await getDoc(docRef);
    const lessonData = lessonSnap.data();
    
    if (lessonData && !lessonData.paymentAmount) {
      updateData.paymentAmount = lessonData.rate;
      
      // Get student's currency
      if (lessonData.studentId) {
        const studentRef = doc(db, 'students', lessonData.studentId);
        const studentSnap = await getDoc(studentRef);
        if (studentSnap.exists()) {
          updateData.paymentCurrency = studentSnap.data()?.prepaidPackage?.currency || 'USD';
        }
      }
    }
  }

  await updateDoc(docRef, updateData);
  
  const updated = await getDoc(docRef);
  return {
    id: updated.id,
    ...updated.data()
  } as Lesson;
}

// ============================================
// AVAILABILITY
// ============================================

export async function getAvailability(): Promise<Availability[]> {
  const snapshot = await getDocs(availabilityCollection);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Availability));
}

export async function toggleAvailability(date: Date, time: string): Promise<Availability> {
  const { formatISO, startOfDay } = await import('date-fns');
  const dateISO = formatISO(startOfDay(date));
  
  // Check if slot already exists
  const q = query(
    availabilityCollection,
    where('date', '==', dateISO),
    where('time', '==', time)
  );
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    // Toggle existing slot
    const existingDoc = snapshot.docs[0];
    const existingData = existingDoc.data();
    const newAvailability = !existingData.isAvailable;
    
    await updateDoc(doc(db, 'availability', existingDoc.id), {
      isAvailable: newAvailability
    });
    
    return {
      id: existingDoc.id,
      date: dateISO,
      time,
      isAvailable: newAvailability
    };
  } else {
    // Create new slot (defaults to available)
    const newSlotData = {
      date: dateISO,
      time,
      isAvailable: true
    };
    
    const docRef = await addDoc(availabilityCollection, newSlotData);
    
    return {
      id: docRef.id,
      ...newSlotData
    };
  }
}

// ============================================
// APPROVAL REQUESTS
// ============================================

export async function createApprovalRequest(data: Omit<ApprovalRequest, 'id' | 'status' | 'createdAt'>): Promise<ApprovalRequest> {
  const newRequest = {
    ...data,
    status: 'pending' as const,
    createdAt: new Date().toISOString(),
  };

  const docRef = await addDoc(approvalRequestsCollection, newRequest);
  
  return {
    id: docRef.id,
    ...newRequest
  };
}

export async function getApprovalRequests(status?: 'pending' | 'approved' | 'denied'): Promise<ApprovalRequest[]> {
  let q;
  if (status) {
    q = query(approvalRequestsCollection, where('status', '==', status));
  } else {
    q = approvalRequestsCollection;
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as ApprovalRequest));
}

export async function resolveApprovalRequest(
  requestId: string, 
  resolution: 'approved' | 'denied'
): Promise<ApprovalRequest> {
  const docRef = doc(db, 'approvalRequests', requestId);
  const requestSnap = await getDoc(docRef);
  
  if (!requestSnap.exists()) {
    throw new Error("Approval request not found");
  }

  const request = requestSnap.data() as ApprovalRequest;
  
  await updateDoc(docRef, {
    status: resolution,
    resolvedAt: new Date().toISOString()
  });

  // If approved, execute the action
  if (resolution === 'approved') {
    if (request.type === 'new_student_booking' && request.lessonDate && request.lessonTime && request.lessonTitle) {
      // Create the lesson for the new student
      // Get course info to determine duration and rate
      const courses = await getCourseTemplates();
      const course = courses.find(c => c.title === request.lessonTitle);
      // Default to 60 minutes and calculate rate from hourlyRate
      const duration = 60;
      const rate = course ? (course.hourlyRate * (course.discount60min ? (1 - course.discount60min / 100) : 1)) : 0;
      
      const startHour = parseInt(request.lessonTime.split(':')[0]);
      const endTime = `${(startHour + (duration / 60)).toString().padStart(2, '0')}:00`;
      
      await bookLesson({
        studentId: request.studentId,
        title: request.lessonTitle,
        date: request.lessonDate,
        startTime: request.lessonTime,
        endTime: endTime,
        rate: rate,
      });
    } else if (request.type === 'late_reschedule' && request.lessonId && request.newDate && request.newTime) {
      // Calculate end time (assume same duration)
      const lesson = await getLessonById(request.lessonId);
      if (lesson) {
        const startHour = parseInt(request.newTime.split(':')[0]);
        const originalStart = parseInt(lesson.startTime.split(':')[0]);
        const originalEnd = parseInt(lesson.endTime.split(':')[0]);
        const duration = originalEnd - originalStart;
        const endTime = `${(startHour + duration).toString().padStart(2, '0')}:00`;
        
        await rescheduleLesson(request.lessonId, request.newDate, request.newTime, endTime, request.studentId, true);
      }
    } else if (request.type === 'late_cancel' && request.lessonId) {
      await cancelLesson(request.lessonId, request.studentId, true);
    }
    // Handle other approval types as needed
  }

  const updated = await getDoc(docRef);
  return {
    id: updated.id,
    ...updated.data()
  } as ApprovalRequest;
}

// ============================================
// USER SETTINGS
// ============================================

export async function getUserSettings(userIdOrEmail: string, userType: 'teacher' | 'student'): Promise<UserSettings | undefined> {
  const q = query(
    userSettingsCollection,
    where('userIdOrEmail', '==', userIdOrEmail),
    where('userType', '==', userType)
  );
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    return undefined;
  }

  return {
    id: snapshot.docs[0].id,
    ...snapshot.docs[0].data()
  } as UserSettings;
}

export async function getTeacherSettings(): Promise<UserSettings | undefined> {
  const q = query(userSettingsCollection, where('userType', '==', 'teacher'));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    return undefined;
  }

  return {
    id: snapshot.docs[0].id,
    ...snapshot.docs[0].data()
  } as UserSettings;
}

export async function saveUserSettings(data: Omit<UserSettings, 'id'>): Promise<UserSettings> {
  // Check if settings already exist
  const existing = await getUserSettings(data.userIdOrEmail, data.userType);
  
  if (existing) {
    const docRef = doc(db, 'userSettings', existing.id);
    await updateDoc(docRef, data);
    return { id: existing.id, ...data };
  }

  const docRef = await addDoc(userSettingsCollection, data);
  return { id: docRef.id, ...data };
}

// ============================================
// STUDENT PACKAGES
// ============================================

export async function createStudentPackage(data: Omit<StudentPackage, 'id'>): Promise<StudentPackage> {
  const docRef = await addDoc(studentPackagesCollection, data);
  return { id: docRef.id, ...data };
}

export async function getStudentPackages(studentId: string): Promise<StudentPackage[]> {
  const q = query(studentPackagesCollection, where('studentId', '==', studentId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as StudentPackage));
}

export async function getActiveStudentPackage(studentId: string, courseId?: string): Promise<StudentPackage | undefined> {
  let q = query(
    studentPackagesCollection,
    where('studentId', '==', studentId),
    where('status', '==', 'active')
  );
  
  const snapshot = await getDocs(q);
  const packages = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as StudentPackage));

  if (courseId) {
    return packages.find(p => p.courseId === courseId);
  }
  
  return packages[0];
}

export async function updateStudentPackage(id: string, data: Partial<StudentPackage>): Promise<StudentPackage> {
  const docRef = doc(db, 'studentPackages', id);
  await updateDoc(docRef, data);
  const updated = await getDoc(docRef);
  return { id: updated.id, ...updated.data() } as StudentPackage;
}

export async function decrementPackageLessons(packageId: string): Promise<StudentPackage> {
  const docRef = doc(db, 'studentPackages', packageId);
  const packageSnap = await getDoc(docRef);
  
  if (!packageSnap.exists()) {
    throw new Error("Package not found");
  }

  const pkg = packageSnap.data() as StudentPackage;
  const newRemaining = pkg.lessonsRemaining - 1;
  const newStatus = newRemaining <= 0 ? 'completed' : pkg.status;

  await updateDoc(docRef, {
    lessonsRemaining: newRemaining,
    status: newStatus
  });

  return { id: packageId, ...pkg, lessonsRemaining: newRemaining, status: newStatus };
}

export function calculatePackageExpiration(lessonsCount: number, startDate: Date, plannedBreaks?: { start: string; end: string }[]): Date {
  const { addWeeks, addDays, parseISO, differenceInDays } = require('date-fns');
  
  // Base: 1 lesson per week minimum
  let expirationDate = addWeeks(startDate, lessonsCount);
  
  // Add time for planned breaks
  if (plannedBreaks && plannedBreaks.length > 0) {
    for (const breakPeriod of plannedBreaks) {
      const breakStart = parseISO(breakPeriod.start);
      const breakEnd = parseISO(breakPeriod.end);
      const breakDays = differenceInDays(breakEnd, breakStart);
      expirationDate = addDays(expirationDate, breakDays);
    }
  }
  
  return expirationDate;
}

// ============================================
// HELPER: Check if student is new
// ============================================

export async function isNewStudent(studentId: string): Promise<boolean> {
  const lessons = await getLessonsByStudentId(studentId);
  // A student is "new" if they have no completed lessons (only scheduled or none)
  const completedLessons = lessons.filter(l => l.status === 'paid' || l.status === 'deducted');
  return completedLessons.length === 0;
}

// ============================================
// TEACHER PROFILES
// ============================================

export async function createTeacherProfile(data: Omit<TeacherProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<TeacherProfile> {
  // Check if username is available
  const isAvailable = await isUsernameAvailable(data.username);
  if (!isAvailable) {
    throw new Error('Username is already taken');
  }

  const now = new Date().toISOString();
  const profileData = {
    ...data,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(teacherProfilesCollection, profileData);
  
  return {
    id: docRef.id,
    ...profileData,
  };
}

export async function getTeacherProfileByUsername(username: string): Promise<TeacherProfile | undefined> {
  const q = query(teacherProfilesCollection, where('username', '==', username.toLowerCase()));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    return undefined;
  }

  return {
    id: snapshot.docs[0].id,
    ...snapshot.docs[0].data(),
  } as TeacherProfile;
}

export async function getTeacherProfileByEmail(email: string): Promise<TeacherProfile | undefined> {
  const q = query(teacherProfilesCollection, where('email', '==', email));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    return undefined;
  }

  return {
    id: snapshot.docs[0].id,
    ...snapshot.docs[0].data(),
  } as TeacherProfile;
}

export async function getTeacherProfileById(id: string): Promise<TeacherProfile | undefined> {
  const docRef = doc(db, 'teacherProfiles', id);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return undefined;
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as TeacherProfile;
}

export async function updateTeacherProfile(id: string, data: Partial<Omit<TeacherProfile, 'id' | 'createdAt'>>): Promise<TeacherProfile> {
  const docRef = doc(db, 'teacherProfiles', id);
  
  // If updating username, check availability
  if (data.username) {
    const existing = await getTeacherProfileById(id);
    if (existing && existing.username !== data.username) {
      const isAvailable = await isUsernameAvailable(data.username);
      if (!isAvailable) {
        throw new Error('Username is already taken');
      }
    }
  }

  await updateDoc(docRef, {
    ...data,
    updatedAt: new Date().toISOString(),
  });

  const updated = await getDoc(docRef);
  return {
    id: updated.id,
    ...updated.data(),
  } as TeacherProfile;
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const q = query(teacherProfilesCollection, where('username', '==', username.toLowerCase()));
  const snapshot = await getDocs(q);
  return snapshot.empty;
}

export async function getAllTeacherProfiles(publishedOnly: boolean = true): Promise<TeacherProfile[]> {
  let q;
  if (publishedOnly) {
    q = query(teacherProfilesCollection, where('isPublished', '==', true));
  } else {
    q = teacherProfilesCollection;
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as TeacherProfile));
}

// ============================================
// REVIEWS
// ============================================

export async function createReview(data: Omit<Review, 'id' | 'createdAt' | 'pinned' | 'visible'>): Promise<Review> {
  const reviewData = {
    ...data,
    createdAt: new Date().toISOString(),
    pinned: false,
    visible: true,
  };

  const docRef = await addDoc(reviewsCollection, reviewData);
  
  return {
    id: docRef.id,
    ...reviewData,
  };
}

export async function getReviewsByTeacher(teacherId: string, visibleOnly: boolean = true): Promise<Review[]> {
  let q;
  if (visibleOnly) {
    q = query(
      reviewsCollection,
      where('teacherId', '==', teacherId),
      where('visible', '==', true)
    );
  } else {
    q = query(reviewsCollection, where('teacherId', '==', teacherId));
  }
  
  const snapshot = await getDocs(q);
  const reviews = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as Review));

  // Sort: pinned first, then by date (newest first)
  return reviews.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export async function getPinnedReviews(teacherId: string): Promise<Review[]> {
  const q = query(
    reviewsCollection,
    where('teacherId', '==', teacherId),
    where('pinned', '==', true),
    where('visible', '==', true)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as Review));
}

export async function toggleReviewPin(reviewId: string): Promise<Review> {
  const docRef = doc(db, 'reviews', reviewId);
  const reviewSnap = await getDoc(docRef);
  
  if (!reviewSnap.exists()) {
    throw new Error('Review not found');
  }

  const review = reviewSnap.data() as Review;
  const newPinned = !review.pinned;

  // If pinning, check if teacher already has 5 pinned reviews
  if (newPinned) {
    const pinnedReviews = await getPinnedReviews(review.teacherId);
    if (pinnedReviews.length >= 5) {
      throw new Error('Maximum of 5 pinned reviews allowed');
    }
  }

  await updateDoc(docRef, { pinned: newPinned });

  return {
    id: reviewId,
    ...review,
    pinned: newPinned,
  };
}

export async function toggleReviewVisibility(reviewId: string): Promise<Review> {
  const docRef = doc(db, 'reviews', reviewId);
  const reviewSnap = await getDoc(docRef);
  
  if (!reviewSnap.exists()) {
    throw new Error('Review not found');
  }

  const review = reviewSnap.data() as Review;
  const newVisible = !review.visible;

  // If hiding a pinned review, unpin it first
  if (!newVisible && review.pinned) {
    await updateDoc(docRef, { visible: newVisible, pinned: false });
    return {
      id: reviewId,
      ...review,
      visible: newVisible,
      pinned: false,
    };
  }

  await updateDoc(docRef, { visible: newVisible });

  return {
    id: reviewId,
    ...review,
    visible: newVisible,
  };
}

export async function getReviewById(reviewId: string): Promise<Review | undefined> {
  const docRef = doc(db, 'reviews', reviewId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return undefined;
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as Review;
}

export async function getAllReviews(): Promise<Review[]> {
  const snapshot = await getDocs(reviewsCollection);
  const reviews = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as Review));

  // Sort by date (newest first)
  return reviews.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function deleteReview(reviewId: string): Promise<void> {
  const docRef = doc(db, 'reviews', reviewId);
  await deleteDoc(docRef);
}

export async function getReviewByLessonId(lessonId: string): Promise<Review | null> {
  const q = query(reviewsCollection, where('lessonId', '==', lessonId));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    return null;
  }
  
  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  } as Review;
}

export async function getReviewedLessonIds(studentId: string): Promise<string[]> {
  const q = query(reviewsCollection, where('studentId', '==', studentId));
  const snapshot = await getDocs(q);
  
  return snapshot.docs
    .map(doc => doc.data().lessonId)
    .filter((id): id is string => !!id);
}
