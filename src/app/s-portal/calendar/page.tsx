'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import {
  getStudentById,
  getAvailableSlots,
  getCourses,
  bookLesson,
  isNewStudent,
  createApprovalRequest,
  getStudentProgressByStudentId,
  getSessionsByUnitId,
  getLevelsByCourseId,
  getUnitsByLevelId,
  getLearnerAvailability,
  getSessionInstancesByStudentId,
} from '@/lib/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LearnerAvailabilityCalendar from './components/learner-availability-calendar';
import type { LearnerAvailability, SessionInstance } from '@/lib/types';
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
import { GraduationCap, ChevronLeft, ChevronRight, Clock, ArrowLeft, AlertCircle, CheckCircle, Users } from 'lucide-react';
import { format, parseISO, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isFuture, startOfDay } from 'date-fns';
import type { Availability, Course, Student } from '@/lib/types';
import { calculateLessonPrice } from '@/lib/types';
import Link from 'next/link';
import PageHeader from '@/components/page-header';
import Loading from '@/app/loading';


function BookingPageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const courseIdFromQuery = searchParams.get('courseId');
  const unitIdFromQuery = searchParams.get('unitId');
  const sessionIdFromQuery = searchParams.get('sessionId');

  // TODO: replace with real teacher auth uid if/when you store it.
  // For now, we keep it consistent and non-empty.
  const teacherUid = 'jwag.lang@gmail.com';


  const [student, setStudent] = useState<Student | null>(null);
  const [availableSlots, setAvailableSlots] = useState<Availability[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isNew, setIsNew] = useState(false);
  const [learnerAvailability, setLearnerAvailability] = useState<LearnerAvailability[]>([]);
  const [sessionInstances, setSessionInstances] = useState<SessionInstance[]>([]);
  
  // Booking dialog state
  const [selectedSlot, setSelectedSlot] = useState<Availability | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedDuration, setSelectedDuration] = useState<30 | 60>(60);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingResult, setBookingResult] = useState<{
    type: 'success' | 'pending_approval';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const courseIdFromQuery = searchParams.get('courseId');
    if (courseIdFromQuery) {
        setSelectedCourse(courseIdFromQuery);
    }
  }, [searchParams]);

  useEffect(() => {
    async function ensureUnitAndSessionInUrl() {
      if (!student) return;

      const courseId = searchParams.get('courseId') || selectedCourse;
      const unitId = searchParams.get('unitId');
      const sessionId = searchParams.get('sessionId');

      // Only run when course exists but unit/session are missing
      if (!courseId || (unitId && sessionId)) return;

      try {
        // 1) Prefer the student's currently assigned unit for this course
        const progressList = await getStudentProgressByStudentId(student.id);
        const assigned = progressList.find(
          (p: any) => p.courseId === courseId && p.status === 'assigned'
        );

        let resolvedUnitId: string | undefined = assigned?.unitId;

        // 2) Fallback: first unit in first level of the course
        if (!resolvedUnitId) {
          const levels = await getLevelsByCourseId(courseId);
          const firstLevel = levels?.[0];
          if (!firstLevel) return;

          const units = await getUnitsByLevelId(firstLevel.id);
          const firstUnit = units?.[0];
          if (!firstUnit) return;

          resolvedUnitId = firstUnit.id;
        }

        // 3) Resolve first session in that unit
        const sessions = await getSessionsByUnitId(resolvedUnitId);
        const firstSession = sessions?.[0];
        if (!firstSession) return;

        // 4) Rewrite URL with unitId + sessionId so booking can proceed
        const params = new URLSearchParams(searchParams.toString());
        params.set('courseId', courseId);
        params.set('unitId', resolvedUnitId);
        params.set('sessionId', firstSession.id);

        router.replace(`/s-portal/calendar?${params.toString()}`);
      } catch (e) {
        console.error('[ensureUnitAndSessionInUrl]', e);
      }
    }

    ensureUnitAndSessionInUrl();
  }, [student, selectedCourse, searchParams, router]);

  useEffect(() => {
    async function fetchData() {
      if (user?.email && user.uid) {
        const studentRecord = await getStudentById(user.uid);
        if (!studentRecord) {
          console.error('No student record found for uid:', user.uid);
          setLoadingData(false);
          return;
        }
        setStudent(studentRecord);
        
        const newStudent = await isNewStudent(studentRecord.id);
        setIsNew(newStudent);
        
        const [slots, courseList, availData, instanceData] = await Promise.all([
          getAvailableSlots(),
          getCourses(),
          getLearnerAvailability(studentRecord.id),
          getSessionInstancesByStudentId(studentRecord.id),
        ]);
        setAvailableSlots(slots);
        setCourses(courseList);
        setLearnerAvailability(availData);
        setSessionInstances(instanceData);
        
        setLoadingData(false);
      }
    }
    fetchData();
  }, [user]);

  async function handleBookLesson() {
    if (!selectedSlot || !selectedCourse || !student || !user?.uid) return;

    // Require unit/session linkage for Phase 3D completion workflow
    const unitId = unitIdFromQuery;
    const sessionId = sessionIdFromQuery;

    if (!unitId || !sessionId) {
      console.error('Missing unitId/sessionId in booking URL');
      return;
    }

    setIsBooking(true);

    const course = courses.find((c) => c.id === selectedCourse);
    if (!course) {
      setIsBooking(false);
      return;
    }

    const lessonPrice = calculateLessonPrice(
      course.hourlyRate,
      selectedDuration,
      course.discount60min
    );

    const endHour = parseInt(selectedSlot.time.split(':')[0]) + selectedDuration / 60;
    const endTime = `${endHour.toString().padStart(2, '0')}:00`;

    try {
      if (isNew) {
        const unitId = unitIdFromQuery;
        const sessionId = sessionIdFromQuery;
        
        if (!unitId || !sessionId) {
          console.error('Missing unitId/sessionId in booking URL (cannot request approval)');
          return;
        }
        
        await createApprovalRequest({
          type: 'new_student_booking',
          studentId: student.id,
          studentName: student.name,
          studentEmail: student.email,
          lessonTitle: course.title,
          lessonDate: selectedSlot.date,
          lessonTime: selectedSlot.time,
          reason: 'First-time booking requires teacher approval.',
          status: 'pending',
          createdAt: new Date().toISOString(),
        
          // NEW: required linkage for creating a valid lesson on approval
          courseId: selectedCourse,
          unitId,
          sessionId,
          durationHours: selectedDuration / 60,
          teacherUid,
        });

        setBookingResult({
          type: 'pending_approval',
          message:
            'As a new student, your booking request has been sent to the teacher for approval. You will be notified once it is reviewed.',
        });
      } else {
        await bookLesson({
          studentId: student.id,
          title: course.title,
          lessonDate: selectedSlot.date,
          startTime: selectedSlot.time,
          endTime: endTime,
          rate: lessonPrice,
          billingType: 'credit',

          courseId: selectedCourse,
          unitId,
          sessionId,
          durationHours: selectedDuration / 60,
          teacherUid,
        });

        setAvailableSlots((prev) => prev.filter((s) => s.id !== selectedSlot.id));

        setBookingResult({
          type: 'success',
          message: 'Your lesson has been successfully scheduled!',
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
    if (!searchParams.get('courseId')) {
        setSelectedCourse('');
    }
    setSelectedDuration(60);
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

  const futureSlots = availableSlots.filter(slot => {
    const slotDate = parseISO(slot.date);
    return isFuture(slotDate) || startOfDay(slotDate).getTime() === startOfDay(new Date()).getTime();
  });

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

  const tabParam = searchParams.get('tab');
  const defaultTab = tabParam === 'availability' ? 'availability' : 'schedule';

  return (
    <div className="min-h-screen bg-background">
      <main className="p-4 md:p-8">
        <PageHeader
            title="Calendar"
            description="Book sessions and set your availability."
        />

        <Tabs defaultValue={defaultTab} key={defaultTab} className="mt-6">
          <TabsList className="mb-6">
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="availability">My Availability</TabsTrigger>
          </TabsList>

          <TabsContent value="availability">
            {student && (
              <LearnerAvailabilityCalendar
                studentId={student.id}
                initialAvailability={learnerAvailability}
                sessionInstances={sessionInstances}
              />
            )}
          </TabsContent>

          <TabsContent value="schedule">
        {isNew && (
            <p className="text-sm text-amber-600 mt-2 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            As a new student, your first booking will require teacher approval.
            </p>
        )}

        <div className="flex items-center justify-between my-8">
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
              <GraduationCap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No available time slots at the moment.</p>
              <p className="text-sm text-muted-foreground">Please check back later!</p>
            </CardContent>
          </Card>
        )}
          </TabsContent>
        </Tabs>
      </main>

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
          
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select a Course</label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a course..." />
                </SelectTrigger>
                <SelectContent>
                  {courses.map(course => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedCourse && (
              <div>
                <label className="text-sm font-medium mb-2 block">Select Duration</label>
                <div className="grid grid-cols-2 gap-3">
                  {[30, 60].map(duration => {
                    const course = courses.find(c => c.id === selectedCourse);
                    if (!course) return null;
                    
                    const price = calculateLessonPrice(
                      course.hourlyRate, 
                      duration as 30 | 60, 
                      course.discount60min
                    );
                    const hasDiscount = duration === 60 && course.discount60min && course.discount60min > 0;
                    
                    return (
                      <Button
                        key={duration}
                        variant={selectedDuration === duration ? 'default' : 'outline'}
                        className="h-auto py-3 flex flex-col items-start"
                        onClick={() => setSelectedDuration(duration as 30 | 60)}
                      >
                        <span className="font-semibold">{duration} minutes</span>
                        <span className="text-sm">
                          ${price.toFixed(2)}
                          {hasDiscount && (
                            <span className="text-xs ml-1">
                              ({course.discount60min}% off! ðŸ¥³)
                            </span>
                          )}
                        </span>
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
            
            {isNew && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
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
            <Button onClick={() => router.push('/s-portal')}>
              {bookingResult?.type === 'success' ? 'View My Lessons' : 'Back to Portal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<Loading />}>
      <BookingPageContent />
    </Suspense>
  )
}
