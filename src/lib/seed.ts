import { collection, addDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { subDays, addDays, formatISO, startOfDay } from 'date-fns';

const today = new Date();

const courseTemplatesData = [
  { title: 'Algebra II', duration: 60, rate: 25, pitch: 'Master advanced algebra concepts.', description: 'A full course on Algebra II.', thumbnailUrl: 'course-thumb1', imageUrl: 'course-hero1' },
  { title: 'Creative Writing', duration: 60, rate: 35, pitch: 'Unleash your inner author.', description: 'Learn the art of storytelling.', thumbnailUrl: 'course-thumb2', imageUrl: 'course-hero2' },
  { title: 'History 101', duration: 30, rate: 20, pitch: 'Journey through the ages.', description: 'An introduction to world history.', thumbnailUrl: 'course-thumb3', imageUrl: 'course-hero3' },
  { title: 'Physics Fundamentals', duration: 60, rate: 40, pitch: 'Explore the laws of the universe.', description: 'Grasp the core principles of physics.', thumbnailUrl: 'course-thumb4', imageUrl: 'course-hero4' },
  { title: 'Spanish for Beginners', duration: 30, rate: 15, pitch: 'Start speaking Spanish today.', description: 'A beginner-friendly introduction to Spanish.', thumbnailUrl: 'course-thumb5', imageUrl: 'course-hero5' },
];

const studentsData = [
  { name: 'Alex Johnson', email: 'alex.j@example.com', avatarUrl: '/avatars/student1.png', status: 'currently enrolled', enrollmentStatus: 'Active', paymentStatus: 'paid', prepaidPackage: { initialValue: 500, balance: 250, currency: 'USD' }, goalMet: false },
  { name: 'Maria Garcia', email: 'maria.g@example.com', avatarUrl: '/avatars/student2.png', status: 'currently enrolled', enrollmentStatus: 'Active', paymentStatus: 'unpaid', prepaidPackage: { initialValue: 0, balance: 0, currency: 'RUB' }, goalMet: false },
  { name: 'James Smith', email: 'james.s@example.com', avatarUrl: '/avatars/student3.png', status: 'unenrolled (goal met)', enrollmentStatus: 'Inactive', paymentStatus: 'paid', prepaidPackage: { initialValue: 300, balance: 0, currency: 'EUR' }, goalMet: true },
  { name: 'Emily White', email: 'emily.w@example.com', avatarUrl: '/avatars/student4.png', status: 'unenrolled (package over)', enrollmentStatus: 'Inactive', paymentStatus: 'paid', prepaidPackage: { initialValue: 800, balance: 0, currency: 'USD' }, goalMet: false },
  { name: 'David Brown', email: 'david.b@example.com', avatarUrl: '/avatars/student5.png', status: 'MIA', enrollmentStatus: 'Active', paymentStatus: 'unpaid', prepaidPackage: { initialValue: 0, balance: 0, currency: 'CNY' }, goalMet: false },
];

const getLessonsData = (studentIds: string[]) => [
  { studentId: studentIds[0], title: 'Algebra II', date: formatISO(subDays(today, 10)), startTime: '10:00', endTime: '11:00', status: 'paid', rate: 25, paymentAmount: 25, paymentCurrency: 'USD' },
  { studentId: studentIds[0], title: 'Algebra II', date: formatISO(subDays(today, 3)), startTime: '10:00', endTime: '11:00', status: 'deducted', rate: 25 },
  { studentId: studentIds[0], title: 'Algebra II', date: formatISO(addDays(today, 4)), startTime: '10:00', endTime: '11:00', status: 'scheduled', rate: 25 },
  { studentId: studentIds[1], title: 'Creative Writing', date: formatISO(subDays(today, 8)), startTime: '14:00', endTime: '15:00', status: 'paid', rate: 35, paymentAmount: 2800, paymentCurrency: 'RUB' },
  { studentId: studentIds[1], title: 'Creative Writing', date: formatISO(addDays(today, 6)), startTime: '14:00', endTime: '15:00', status: 'scheduled', rate: 35 },
  { studentId: studentIds[2], title: 'History 101', date: formatISO(subDays(today, 1)), startTime: '11:00', endTime: '12:00', status: 'unpaid', rate: 20 },
  { studentId: studentIds[2], title: 'History 101', date: formatISO(addDays(today, 7)), startTime: '11:00', endTime: '12:00', status: 'scheduled', rate: 20 },
  { studentId: studentIds[3], title: 'Physics Fundamentals', date: formatISO(subDays(today, 5)), startTime: '16:00', endTime: '17:00', status: 'deducted', rate: 40 },
  { studentId: studentIds[3], title: 'Physics Fundamentals', date: formatISO(addDays(today, 2)), startTime: '16:00', endTime: '17:00', status: 'scheduled', rate: 40 },
  { studentId: studentIds[4], title: 'Spanish for Beginners', date: formatISO(subDays(today, 14)), startTime: '09:00', endTime: '10:00', status: 'paid', rate: 15, paymentAmount: 110, paymentCurrency: 'CNY' },
];

const availabilityData = [
  { date: formatISO(startOfDay(addDays(today, 1))), time: '10:00', isAvailable: true },
  { date: formatISO(startOfDay(addDays(today, 1))), time: '11:00', isAvailable: true },
  { date: formatISO(startOfDay(addDays(today, 2))), time: '14:00', isAvailable: true },
  { date: formatISO(startOfDay(addDays(today, 2))), time: '15:00', isAvailable: true },
];

async function clearCollection(collectionName: string) {
  const collectionRef = collection(db, collectionName);
  const snapshot = await getDocs(collectionRef);
  for (const doc of snapshot.docs) {
    await deleteDoc(doc.ref);
  }
}

export async function seedDatabase() {
  console.log('🌱 Starting seed...');

  await clearCollection('courseTemplates');
  await clearCollection('students');
  await clearCollection('lessons');
  await clearCollection('availability');

  for (const course of courseTemplatesData) {
    await addDoc(collection(db, 'courseTemplates'), course);
  }
  console.log('✅ Courses added');

  const studentIds: string[] = [];
  for (const student of studentsData) {
    const docRef = await addDoc(collection(db, 'students'), student);
    studentIds.push(docRef.id);
  }
  console.log('✅ Students added');

  const lessonsData = getLessonsData(studentIds);
  for (const lesson of lessonsData) {
    await addDoc(collection(db, 'lessons'), lesson);
  }
  console.log('✅ Lessons added');

  for (const slot of availabilityData) {
    await addDoc(collection(db, 'availability'), slot);
  }
  console.log('✅ Availability added');

  console.log('🎉 Seed complete!');
}