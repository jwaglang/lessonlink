'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { logOut } from '@/lib/auth';
import {
  getOrCreateStudentByEmail,
  getAvailableSlots,
  getCourseTemplates,
  bookLesson,
  isNewStudent,
  createApprovalRequest,
} from '@/lib/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LogOut, GraduationCap, Calendar, ChevronLeft, ChevronRight, Clock, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { format, parseISO, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isFuture, startOfDay } from 'date-fns';
import type { Availability, CourseTemplate, Student } from '@/lib/types';
import Link from 'next/link';

export default function BookingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [availableSlots, setAvailableSlots] = useState<Availability[]>([]);
  const [courses, setCourses] = useState<CourseTemplate[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isNew, setIsNew] = useState(false);
  
  // Booking dialog state
  const [selectedSlot, setSelectedSlot] = useState<Availability | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [isBooking, setIsBooking] = useState(false);
  const [bookingResult, setBookingResult] = useState<{
    type: 'success' | 'pending_approval';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    async function fetchData() {
      if (user?.email) {
        const studentRecord = await getOrCreateStudentByEmail(user.email);
        setStudent(studentRecord);
        
        // Check if this is a new student
        const newStudent = await isNewStudent(studentRecord.id);
        setIsNew(newStudent);
        
        const slots = await getAvailableSlots();
        setAvailableSlots(slots);
        
        const courseList = await getCourseTemplates();
        setCourses(courseList);
        
        setLoadingData(false);
      }
    }
    fetchData();
  }, [user]);

  async function handleLogout() {
    await logOut();
    router.push('/login');
  }

  async function handleBookLesson() {
    if (!selectedSlot || !selectedCourse || !student) return;
    
    setIsBooking(true);
    
    const course = courses.find(c => c.id === selectedCourse);
    if (!course) return;

    const endHour = parseInt(selectedSlot.time.split(':')[0]) + (course.duration / 60);
    const endTime = `${endHour.toString().padStart(2, '0')}:00`;

    try {
      if (isNew) {
        // New student - create approval request instead of direct booking
        await createApprovalRequest({
          type: 'new_student_booking',
          studentId: student.id,
          studentName: student.name,
          studentEmail: student.email,
          lessonTitle: course.title,
          lessonDate: selectedSlot.date,
          lessonTime: selectedSlot.time,
          reason: 'First-time booking requires teacher approval.',
        });
        
        setBookingResult({
          type: 'pending_approval',
          message: 'As a new student, your booking request has been sent to the teacher for approval. You will be notified once it is reviewed.'
        });
      } else {
        // Returning student - book directly
        await bookLesson({
          studentId: student.id,
          title: course.title,
          date: selectedSlot.date,
          startTime: selectedSlot.time,
          endTime: endTime,
          rate: course.rate,
        });
        
        // Remove the booked slot from available slots
        setAvailableSlots(prev => prev.filter(s => s.id !== selectedSlot.id));
        
        setBookingResult({
          type: 'success',
          message: 'Your lesson has been successfully scheduled!'
        });
      }
    } catch (error) {
      console.error('Booking failed:', error);
    } finally {
      setIsBooking(false);
    }
  }

  function closeDialog() {
    setSelectedSlot(null);
    setSelectedCourse('');
    setBookingResult(null);
  }

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Filter slots to only show future dates
  const futureSlots = availableSlots.filter(slot => {
    const slotDate = parseISO(slot.date);
    return isFuture(slotDate) || startOfDay(slotDate).getTime() === startOfDay(new Date()).getTime();
  });

  // Group slots by date for the current week
  const slotsByDay = days.map(day => {
    const daySlots = futureSlots.filter(slot => {
      const slotDate = startOfDay(parseISO(slot.date));
      return slotDate.getTime() === startOfDay(day).getTime();
    }).sort((a, b) => a.time.localeCompare(b.time));
    
    return {
      date: day,
      slots: daySlots
    };
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="font-headline text-xl">LessonLink</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Log Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/portal">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Portal
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-headline font-bold">Book a Lesson</h1>
          <p className="text-muted-foreground">Select an available time slot to book your lesson</p>
          {isNew && (
            <p className="text-sm text-amber-600 mt-2 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              As a new student, your first booking will require teacher approval.
            </p>
          )}
        </div>

        {/* Week Navigation */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">
            {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(addDays(currentDate, -7))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setCurrentDate(new Date())}
            >
              This Week
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(addDays(currentDate, 7))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {slotsByDay.map(({ date, slots }) => (
            <Card key={date.toISOString()} className={slots.length === 0 ? 'opacity-50' : ''}>
              <CardHeader className="pb-2">
                <CardTitle className="text-center text-sm">
                  {format(date, 'EEE')}
                </CardTitle>
                <CardDescription className="text-center text-lg font-semibold">
                  {format(date, 'd')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {slots.length > 0 ? (
                  slots.map(slot => (
                    <Button
                      key={slot.id}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setSelectedSlot(slot)}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      {slot.time}
                    </Button>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No slots
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {futureSlots.length === 0 && (
          <Card className="mt-8">
            <CardContent className="py-8 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No available time slots at the moment.</p>
              <p className="text-sm text-muted-foreground">Please check back later!</p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Booking Dialog */}
      <Dialog open={!!selectedSlot && !bookingResult} onOpenChange={() => closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Book a Lesson</DialogTitle>
            <DialogDescription>
              {selectedSlot && (
                <>
                  {format(parseISO(selectedSlot.date), 'EEEE, MMMM d, yyyy')} at {selectedSlot.time}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Select a Course</label>
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a course..." />
              </SelectTrigger>
              <SelectContent>
                {courses.map(course => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title} ({course.duration} min) - ${course.rate}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {isNew && (
              <p className="text-xs text-amber-600 mt-3 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                This booking will require teacher approval.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button 
              onClick={handleBookLesson} 
              disabled={!selectedCourse || isBooking}
            >
              {isBooking ? 'Booking...' : isNew ? 'Request Booking' : 'Confirm Booking'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Result Dialog */}
      <Dialog open={!!bookingResult} onOpenChange={() => closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {bookingResult?.type === 'success' ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Lesson Booked!
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-blue-500" />
                  Approval Required
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {bookingResult?.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => router.push('/portal')}>
              {bookingResult?.type === 'success' ? 'View My Lessons' : 'Back to Portal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
