import type { Student, Lesson } from './types';
import { subDays, addDays, formatISO } from 'date-fns';

const today = new Date();

let lessons: Lesson[] = [
  { id: 'l1', studentId: '1', title: 'Algebra II', date: formatISO(subDays(today, 10)), startTime: '10:00', endTime: '11:00', status: 'paid', rate: 25, paymentAmount: 25, paymentCurrency: 'USD' },
  { id: 'l2', studentId: '1', title: 'Algebra II', date: formatISO(subDays(today, 3)), startTime: '10:00', endTime: '11:00', status: 'deducted', rate: 25 },
  { id: 'l3', studentId: '1', title: 'Algebra II', date: formatISO(addDays(today, 4)), startTime: '10:00', endTime: '11:00', status: 'scheduled', rate: 25 },
  { id: 'l4', studentId: '2', title: 'Creative Writing', date: formatISO(subDays(today, 8)), startTime: '14:00', endTime: '15:00', status: 'paid', rate: 2000, paymentAmount: 2000, paymentCurrency: 'RUB' },
  { id: 'l5', studentId: '2', title: 'Creative Writing', date: formatISO(addDays(today, 6)), startTime: '14:00', endTime: '15:00', status: 'scheduled', rate: 2000 },
  { id: 'l6', studentId: '3', title: 'History 101', date: formatISO(subDays(today, 1)), startTime: '11:00', endTime: '12:00', status: 'unpaid', rate: 30 },
  { id: 'l7', studentId: '3', title: 'History 101', date: formatISO(addDays(today, 7)), startTime: '11:00', endTime: '12:00', status: 'scheduled', rate: 30 },
  { id: 'l8', studentId: '4', title: 'Physics Fundamentals', date: formatISO(subDays(today, 5)), startTime: '16:00', endTime: '17:00', status: 'deducted', rate: 40 },
  { id: 'l9', studentId: '4', title: 'Physics Fundamentals', date: formatISO(addDays(today, 2)), startTime: '16:00', endTime: '17:00', status: 'scheduled', rate: 40 },
  { id: 'l10', studentId: '5', title: 'Spanish for Beginners', date: formatISO(subDays(today, 14)), startTime: '09:00', endTime: '10:00', status: 'paid', rate: 150, paymentAmount: 150, paymentCurrency: 'CNY' },
];

let students: Student[] = [
  {
    id: '1',
    name: 'Alex Johnson',
    email: 'alex.j@example.com',
    avatarUrl: '/avatars/student1.png',
    status: 'currently enrolled',
    enrollmentStatus: 'Active',
    paymentStatus: 'paid',
    prepaidPackage: { initialValue: 500, balance: 250, currency: 'USD' },
    lessons: lessons.filter(l => l.studentId === '1'),
    goalMet: false,
  },
  {
    id: '2',
    name: 'Maria Garcia',
    email: 'maria.g@example.com',
    avatarUrl: '/avatars/student2.png',
    status: 'currently enrolled',
    enrollmentStatus: 'Active',
    paymentStatus: 'unpaid',
    prepaidPackage: { initialValue: 0, balance: 0, currency: 'RUB' },
    lessons: lessons.filter(l => l.studentId === '2'),
    goalMet: false,
  },
  {
    id: '3',
    name: 'James Smith',
    email: 'james.s@example.com',
    avatarUrl: '/avatars/student3.png',
    status: 'unenrolled (goal met)',
    enrollmentStatus: 'Inactive',
    paymentStatus: 'paid',
    prepaidPackage: { initialValue: 300, balance: 0, currency: 'EUR' },
    lessons: lessons.filter(l => l.studentId === '3'),
    goalMet: true,
  },
  {
    id: '4',
    name: 'Emily White',
    email: 'emily.w@example.com',
    avatarUrl: '/avatars/student4.png',
    status: 'unenrolled (package over)',
    enrollmentStatus: 'Inactive',
    paymentStatus: 'paid',
    prepaidPackage: { initialValue: 800, balance: 0, currency: 'USD' },
    lessons: lessons.filter(l => l.studentId === '4'),
    goalMet: false,
  },
  {
    id: '5',
    name: 'David Brown',
    email: 'david.b@example.com',
    avatarUrl: '/avatars/student5.png',
    status: 'MIA',
    enrollmentStatus: 'Active',
    paymentStatus: 'unpaid',
    prepaidPackage: { initialValue: 0, balance: 0, currency: 'CNY' },
    lessons: lessons.filter(l => l.studentId === '5'),
    goalMet: false,
  },
];

export async function getStudents(): Promise<Student[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  return students;
}

export async function getStudentById(id: string): Promise<Student | undefined> {
  await new Promise(resolve => setTimeout(resolve, 500));
  return students.find(s => s.id === id);
}

export async function getLessons(): Promise<Lesson[]> {
  await new Promise(resolve => setTimeout(resolve, 500));
  return lessons;
}

export async function addStudent(data: Pick<Student, 'name' | 'email'>): Promise<Student> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const newId = String(students.length + 1);
    const newStudent: Student = {
        id: newId,
        name: data.name,
        email: data.email,
        avatarUrl: `/avatars/student${newId}.png`,
        status: 'currently enrolled',
        enrollmentStatus: 'Active',
        paymentStatus: 'unpaid',
        prepaidPackage: { initialValue: 0, balance: 0, currency: 'USD' },
        lessons: [],
        goalMet: false,
    };
    students = [newStudent, ...students];
    return newStudent;
}


export async function updateStudentStatus(id: string, status: Student['status']): Promise<Student> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const studentIndex = students.findIndex(s => s.id === id);
    if(studentIndex === -1) throw new Error("Student not found");
    students[studentIndex].status = status;
    return students[studentIndex];
}

export async function updateStudent(id: string, data: Partial<Pick<Student, 'name' | 'email'>>): Promise<Student> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const studentIndex = students.findIndex(s => s.id === id);
    if (studentIndex === -1) throw new Error("Student not found");
    
    const updatedStudent = { ...students[studentIndex], ...data };
    students[studentIndex] = updatedStudent;
    
    return updatedStudent;
}

export async function updateLessonStatus(id: string, status: Lesson['status']): Promise<Lesson> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const lessonIndex = lessons.findIndex(l => l.id === id);
    if(lessonIndex === -1) throw new Error("Lesson not found");
    lessons[lessonIndex].status = status;

    // If lesson is paid, but has no payment info, add some mock payment
    if (status === 'paid' && !lessons[lessonIndex].paymentAmount) {
        lessons[lessonIndex].paymentAmount = lessons[lessonIndex].rate;
        lessons[lessonIndex].paymentCurrency = 'USD';
    }

    return lessons[lessonIndex];
}
