
import type { Student, Lesson, Availability, Course } from './types';
import { subDays, addDays, formatISO, startOfDay } from 'date-fns';

const today = new Date();

let courses: Course[] = [
    { id: 'c1', title: 'Algebra II', hourlyRate: 50, pitch: 'Master advanced algebra concepts.', description: 'A full course on Algebra II.', thumbnailUrl: 'course-thumb1', imageUrl: 'course-hero1' },
    { id: 'c2', title: 'Creative Writing', hourlyRate: 70, pitch: 'Unleash your inner author.', description: 'Learn the art of storytelling.', thumbnailUrl: 'course-thumb2', imageUrl: 'course-hero2' },
    { id: 'c3', title: 'History 101', hourlyRate: 40, pitch: 'Journey through the ages.', description: 'An introduction to world history.', thumbnailUrl: 'course-thumb3', imageUrl: 'course-hero3' },
    { id: 'c4', title: 'Physics Fundamentals', hourlyRate: 80, pitch: 'Explore the laws of the universe.', description: 'Grasp the core principles of physics.', thumbnailUrl: 'course-thumb4', imageUrl: 'course-hero4' },
    { id: 'c5', title: 'Spanish for Beginners', hourlyRate: 30, pitch: 'Start speaking Spanish today.', description: 'A beginner-friendly introduction to Spanish.', thumbnailUrl: 'course-thumb5', imageUrl: 'course-hero5' },
];


let lessons: Lesson[] = [
  { id: 'l1', studentId: '1', title: 'Algebra II', date: formatISO(subDays(today, 10)), startTime: '10:00', endTime: '11:00', status: 'paid', rate: 25, paymentAmount: 25, paymentCurrency: 'USD' },
  { id: 'l2', studentId: '1', title: 'Algebra II', date: formatISO(subDays(today, 3)), startTime: '10:00', endTime: '11:00', status: 'deducted', rate: 25 },
  { id: 'l3', studentId: '1', title: 'Algebra II', date: formatISO(addDays(today, 4)), startTime: '10:00', endTime: '11:00', status: 'scheduled', rate: 25 },
  { id: 'l4', studentId: '2', title: 'Creative Writing', date: formatISO(subDays(today, 8)), startTime: '14:00', endTime: '15:00', status: 'paid', rate: 35, paymentAmount: 2800, paymentCurrency: 'RUB' },
  { id: 'l5', studentId: '2', title: 'Creative Writing', date: formatISO(addDays(today, 6)), startTime: '14:00', endTime: '15:00', status: 'scheduled', rate: 35 },
  { id: 'l6', studentId: '3', title: 'History 101', date: formatISO(subDays(today, 1)), startTime: '11:00', endTime: '12:00', status: 'unpaid', rate: 20 },
  { id: 'l7', studentId: '3', title: 'History 101', date: formatISO(addDays(today, 7)), startTime: '11:00', endTime: '12:00', status: 'scheduled', rate: 20 },
  { id: 'l8', studentId: '4', title: 'Physics Fundamentals', date: formatISO(subDays(today, 5)), startTime: '16:00', endTime: '17:00', status: 'deducted', rate: 40 },
  { id: 'l9', studentId: '4', title: 'Physics Fundamentals', date: formatISO(addDays(today, 2)), startTime: '16:00', endTime: '17:00', status: 'scheduled', rate: 40 },
  { id: 'l10', studentId: '5', title: 'Spanish for Beginners', date: formatISO(subDays(today, 14)), startTime: '09:00', endTime: '10:00', status: 'paid', rate: 15, paymentAmount: 110, paymentCurrency: 'CNY' },
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

let availability: Availability[] = [
    { id: 'a1', date: formatISO(startOfDay(addDays(today, 1))), time: '10:00', isAvailable: true },
    { id: 'a2', date: formatISO(startOfDay(addDays(today, 1))), time: '11:00', isAvailable: true },
    { id: 'a3', date: formatISO(startOfDay(addDays(today, 2))), time: '14:00', isAvailable: true },
    { id: 'a4', date: formatISO(startOfDay(addDays(today, 2))), time: '15:00', isAvailable: true },
];

export async function getCourses(): Promise<Course[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return courses;
}

export async function addCourse(data: Omit<Course, 'id'>): Promise<Course> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const newCourse: Course = {
        ...data,
        id: `c${courses.length + 1}`,
    };
    courses.unshift(newCourse);
    return newCourse;
}

export async function updateCourse(id: string, data: Partial<Omit<Course, 'id'>>): Promise<Course> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const index = courses.findIndex(ct => ct.id === id);
    if (index === -1) throw new Error("Course not found");
    courses[index] = { ...courses[index], ...data };
    return courses[index];
}

export async function deleteCourse(id: string): Promise<{ id: string }> {
    await new Promise(resolve => setTimeout(resolve, 300));
    courses = courses.filter(ct => ct.id !== id);
    return { id };
}

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

export async function addLesson(data: Omit<Lesson, 'id' | 'status'>): Promise<Lesson> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const newId = `l${lessons.length + 1}`;
    const newLesson: Lesson = {
        id: newId,
        ...data,
        status: 'scheduled',
    };
    lessons = [newLesson, ...lessons];
    return newLesson;
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
        // Mock currency based on student, in a real app this would be more robust
        const student = students.find(s => s.id === lessons[lessonIndex].studentId);
        lessons[lessonIndex].paymentCurrency = student?.prepaidPackage.currency || 'USD';
    }

    return lessons[lessonIndex];
}

export async function getAvailability(): Promise<Availability[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return availability;
}

export async function toggleAvailability(date: Date, time: string): Promise<Availability> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const dateISO = formatISO(startOfDay(date));
    const existingSlotIndex = availability.findIndex(a => a.date === dateISO && a.time === time);

    if (existingSlotIndex > -1) {
        const updatedSlot = { ...availability[existingSlotIndex], isAvailable: !availability[existingSlotIndex].isAvailable };
        availability[existingSlotIndex] = updatedSlot;
        return updatedSlot;
    } else {
        const newId = `a${availability.length + 1}`;
        const newSlot: Availability = {
            id: newId,
            date: dateISO,
            time: time,
            isAvailable: true,
        };
        availability.push(newSlot);
        return newSlot;
    }
}
