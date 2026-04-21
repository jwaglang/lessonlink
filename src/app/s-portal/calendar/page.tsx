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
  getAvailabilityByTeacherUid,
} from '@/lib/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LearnerAvailabilityCalendar from './components/learner-availability-calendar';
import LearnerWeeklyCalendar from './components/learner-weekly-calendar';
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
import { GraduationCap, ChevronLeft, ChevronRight, Clock, ArrowLeft, AlertCircle, CheckCircle, Users, Calendar, Check, CalendarPlus } from 'lucide-react';
import { format, parseISO, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isFuture, startOfDay } from 'date-fns';
import type { Availability, Course, Student } from '@/lib/types';
import { calculateLessonPrice } from '@/lib/types';
import Link from 'next/link';
import PageHeader from '@/components/page-header';
import { isProfileComplete } from '@/lib/profile-completeness';
import Loading from '@/app/loading';
import ScheduleTemplateModal from '@/components/schedule-template-modal';


function BookingPageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const courseIdFromQuery = searchParams.get('courseId');
  const unitIdFromQuery = searchParams.get('unitId');
  const sessionIdFromQuery = searchParams.get('sessionId');



  const [student, setStudent] = useState<Student | null>(null);
  const [availableSlots, setAvailableSlots] = useState<Availability[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isNew, setIsNew] = useState(false);
  const [learnerAvailability, setLearnerAvailability] = useState<LearnerAvailability[]>([]);
  const [teacherAvailability, setTeacherAvailability] = useState<Availability[]>([]);
  const [sessionInstances, setSessionInstances] = useState<SessionInstance[]>([]);
  const [copied, setCopied] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);

  // Booking dialog state
  const [selectedSlot, setSelectedSlot] = useState<Availability | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedDuration, setSelectedDuration] = useState<30 | 60>(60);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingResult, setBookingResult] = useState<{
    type: 'success' | 'pending_approval' | 'error';
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
        
        const primaryTeacherUid = studentRecord.assignedTeacherIds?.[0] ?? studentRecord.assignedTeacherId;

        const [slots, courseList, availData, instanceData, teacherAvailData] = await Promise.all([
          getAvailableSlots(),
          getCourses(),
          getLearnerAvailability(studentRecord.id),
          getSessionInstancesByStudentId(studentRecord.id),
          primaryTeacherUid ? getAvailabilityByTeacherUid(primaryTeacherUid) : Promise.resolve([]),
        ]);
        setAvailableSlots(slots);
        setCourses(courseList);
        setLearnerAvailability(availData);
        setSessionInstances(instanceData);
        setTeacherAvailability(teacherAvailData);
        
        setLoadingData(false);
      }
    }
    fetchData();
  }, [user]);

  async function handleBookLesson() {
    if (!selectedSlot || !selectedCourse || !student || !user?.uid) return;
    const teacherUid = student.assignedTeacherIds?.[0] ?? student.assignedTeacherId ?? '';

    // Block booking if profile is incomplete
    if (!isProfileComplete(student)) {
      setBookingResult({
        type: 'pending_approval',
        message: 'Please complete your profile before booking. Go to Settings to fill in your birthday and contact information.',
      });
      return;
    }

    // Require unit/session linkage for Phase 3D completion workflow
    const unitId = unitIdFromQuery;
    const sessionId = sessionIdFromQuery;

    // unitId and sessionId are optional — L can book without unit assignment
    if (!unitId || !sessionId) {
      console.warn('No unitId/sessionId in URL — booking without unit assignment');
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
          billingType: 'trial',

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
          unitId: unitId ?? undefined,
          sessionId: sessionId ?? undefined,
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
      setBookingResult({
        type: 'pending_approval',
        message: error instanceof Error ? error.message : 'Booking failed. Please try again.',
      });
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

  async function handleCopyICalLink() {
    if (!student?.id) return;
    const icalUrl = `${window.location.origin}/api/calendar/ical/learner?studentId=${student.id}`;
    await navigator.clipboard.writeText(icalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 500);
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
          <div className="flex items-center justify-between mb-6">
            <TabsList>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="availability">Booking</TabsTrigger>
            </TabsList>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTemplateModalOpen(true)}
              className="gap-2"
            >
              <CalendarPlus className="h-4 w-4" />
              Schedule Template
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyICalLink}
              className="gap-2"
            >
              {copied ? <Check className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
              {copied ? 'Copied' : 'Calendar Sync'}
            </Button>
          </div>

          <TabsContent value="schedule">
            {isNew && (
              <p className="text-sm text-amber-600 mb-4 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                As a new student, your first booking will require teacher approval.
              </p>
            )}
            {student && (
              <LearnerWeeklyCalendar
                sessionInstances={sessionInstances}
                setSessionInstances={setSessionInstances}
                studentId={student.id}
              />
            )}
          </TabsContent>

          <TabsContent value="availability">
            {student && (
              <LearnerAvailabilityCalendar
                studentId={student.id}
                initialAvailability={learnerAvailability}
                sessionInstances={sessionInstances}
                teacherAvailability={teacherAvailability}
                onSlotDoubleClick={(date, time) => {
                  const slot = teacherAvailability.find(
                    a => startOfDay(new Date(a.date)).getTime() === startOfDay(date).getTime() && a.time === time
                  );
                  if (slot) setSelectedSlot(slot);
                }}
              />
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={!!selectedSlot && !bookingResult} onOpenChange={() => closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isNew ? 'Book Free Trial Lesson' : 'Book a Lesson'}</DialogTitle>
            <DialogDescription>
              {selectedSlot && (
                <>
                  {format(parseISO(selectedSlot.date), 'EEEE, MMMM d, yyyy')} at {selectedSlot.time}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {isNew && (
              <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-sm text-blue-700">
                Your first lesson is a <strong>free trial</strong>. Your teacher will review and confirm the booking.
              </div>
            )}
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
                    return (
                      <Button
                        key={duration}
                        variant={selectedDuration === duration ? 'default' : 'outline'}
                        className="h-auto py-3"
                        onClick={() => setSelectedDuration(duration as 30 | 60)}
                      >
                        <span className="font-semibold">{duration} minutes</span>
                      </Button>
                    );
                  })}
                </div>
              </div>
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
              ) : bookingResult?.type === 'error' ? (
                <>
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  Booking Failed
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
            <Button
              variant={bookingResult?.type === 'error' ? 'outline' : 'default'}
              onClick={() => bookingResult?.type === 'error' ? setBookingResult(null) : router.push('/s-portal')}
            >
              {bookingResult?.type === 'success' ? 'View My Lessons' : bookingResult?.type === 'error' ? 'Try Again' : 'Back to Portal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {student && (
        <ScheduleTemplateModal
          open={templateModalOpen}
          onOpenChange={setTemplateModalOpen}
          ownerId={student.id}
          ownerType="learner"
          onApplied={() => {
            getLearnerAvailability(student.id).then(setLearnerAvailability);
          }}
        />
      )}
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
