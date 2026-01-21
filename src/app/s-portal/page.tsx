'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { logOut } from '@/lib/auth';
import {
  getOrCreateStudentByEmail,
  getLessonsByStudentId,
  getAvailableSlots,
  rescheduleLesson,
  cancelLesson,
  createReview,
  getReviewedLessonIds,
  getTeacherProfileByEmail,
} from '@/lib/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { LogOut, Calendar, GraduationCap, Clock, Plus, CalendarClock, X, AlertCircle, CheckCircle, Star, MessageSquare } from 'lucide-react';
import { format, parseISO, isFuture, isPast, startOfDay } from 'date-fns';
import type { Lesson, Student, Availability } from '@/lib/types';
import Link from 'next/link';
import TimezonePrompt from '@/components/timezone-prompt';
import PageHeader from '@/components/page-header';

export default function StudentPortalPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [timezone, setTimezone] = useState<string>('');

  // Reschedule state
  const [rescheduleLesson_, setRescheduleLesson] = useState<Lesson | null>(null);
  const [availableSlots, setAvailableSlots] = useState<Availability[]>([]);
  const [selectedNewSlot, setSelectedNewSlot] = useState<string>('');
  const [isRescheduling, setIsRescheduling] = useState(false);

  // Cancel state
  const [cancelLesson_, setCancelLesson] = useState<Lesson | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Notification state
  const [notification, setNotification] = useState<{
    type: 'success' | 'info' | 'warning';
    title: string;
    message: string;
  } | null>(null);

  // Review state
  const [reviewLesson, setReviewLesson] = useState<Lesson | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewedLessonIds, setReviewedLessonIds] = useState<string[]>([]);
  const [teacherId, setTeacherId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    async function fetchStudentData() {
      if (user?.email) {
        const studentRecord = await getOrCreateStudentByEmail(user.email);
        setStudent(studentRecord);
        
        const studentLessons = await getLessonsByStudentId(studentRecord.id);
        setLessons(studentLessons);
        
        // Fetch reviewed lesson IDs
        const reviewedIds = await getReviewedLessonIds(studentRecord.id);
        setReviewedLessonIds(reviewedIds);
        
        // Fetch teacher ID (hardcoded teacher email for now)
        const teacherProfile = await getTeacherProfileByEmail('jwag.lang@gmail.com');
        if (teacherProfile) {
          setTeacherId(teacherProfile.id);
        }
        
        setLoadingData(false);
      }
    }
    fetchStudentData();
  }, [user]);

  function handleTimezoneSet(tz: string) {
    setTimezone(tz);
  }

  async function openRescheduleDialog(lesson: Lesson) {
    setRescheduleLesson(lesson);
    const slots = await getAvailableSlots();
    // Filter to only future slots
    const futureSlots = slots.filter(slot => {
      const slotDate = parseISO(slot.date);
      return isFuture(slotDate) || startOfDay(slotDate).getTime() === startOfDay(new Date()).getTime();
    });
    setAvailableSlots(futureSlots);
  }

  async function handleReschedule() {
    if (!rescheduleLesson_ || !selectedNewSlot || !student) return;
    
    setIsRescheduling(true);
    
    const slot = availableSlots.find(s => s.id === selectedNewSlot);
    if (!slot) return;

    // Calculate end time based on lesson duration
    const startHour = parseInt(slot.time.split(':')[0]);
    const originalStart = parseInt(rescheduleLesson_.startTime.split(':')[0]);
    const originalEnd = parseInt(rescheduleLesson_.endTime.split(':')[0]);
    const duration = originalEnd - originalStart;
    const endTime = `${(startHour + duration).toString().padStart(2, '0')}:00`;

    try {
      const result = await rescheduleLesson(
        rescheduleLesson_.id,
        slot.date,
        slot.time,
        endTime,
        student.id
      );
      
      if (result.success && result.lesson) {
        // Update lessons list
        setLessons(prev => prev.map(l => l.id === result.lesson!.id ? result.lesson! : l));
        setNotification({
          type: 'success',
          title: 'Lesson Rescheduled',
          message: `Your lesson has been moved to ${format(parseISO(slot.date), 'EEEE, MMM d')} at ${slot.time}.`
        });
      } else if (result.approvalRequired) {
        // Approval needed
        setNotification({
          type: 'info',
          title: 'Approval Required',
          message: 'Your reschedule request has been sent to the teacher for approval (less than 12 hours notice). You will be notified once it is reviewed.'
        });
      }
      
      // Close dialog
      setRescheduleLesson(null);
      setSelectedNewSlot('');
    } catch (error) {
      console.error('Reschedule failed:', error);
      setNotification({
        type: 'warning',
        title: 'Reschedule Failed',
        message: 'Something went wrong. Please try again.'
      });
    } finally {
      setIsRescheduling(false);
    }
  }

  async function handleCancel() {
    if (!cancelLesson_ || !student) return;
    
    setIsCancelling(true);

    try {
      const result = await cancelLesson(cancelLesson_.id, student.id);
      
      if (result.success) {
        // Remove from lessons list
        setLessons(prev => prev.filter(l => l.id !== cancelLesson_.id));
        setNotification({
          type: 'success',
          title: 'Lesson Cancelled',
          message: 'Your lesson has been cancelled and the time slot is now available.'
        });
      } else if (result.approvalRequired) {
        // Approval needed
        setNotification({
          type: 'info',
          title: 'Approval Required',
          message: 'Your cancellation request has been sent to the teacher for approval (less than 24 hours notice). You will be notified once it is reviewed.'
        });
      }
      
      // Close dialog
      setCancelLesson(null);
    } catch (error) {
      console.error('Cancel failed:', error);
      setNotification({
        type: 'warning',
        title: 'Cancellation Failed',
        message: 'Something went wrong. Please try again.'
      });
    } finally {
      setIsCancelling(false);
    }
  }

  async function handleSubmitReview() {
    if (!reviewLesson || !student || !teacherId) return;
    
    setIsSubmittingReview(true);
    
    try {
      await createReview({
        lessonId: reviewLesson.id,
        studentId: student.id,
        studentName: student.name || user?.email || 'Student',
        teacherId: teacherId,
        rating: reviewRating,
        comment: reviewComment,
      });
      
      // Add to reviewed list
      setReviewedLessonIds(prev => [...prev, reviewLesson.id]);
      
      setNotification({
        type: 'success',
        title: 'Review Submitted',
        message: 'Thank you for your feedback!'
      });
      
      // Reset and close
      setReviewLesson(null);
      setReviewRating(5);
      setReviewComment('');
    } catch (error) {
      console.error('Review submission failed:', error);
      setNotification({
        type: 'warning',
        title: 'Submission Failed',
        message: 'Something went wrong. Please try again.'
      });
    } finally {
      setIsSubmittingReview(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user || loadingData) {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <p>Loading student data...</p>
        </div>
    );
  }

  const upcomingLessons = lessons
    .filter((l) => isFuture(parseISO(l.date)))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const pastLessons = lessons
    .filter((l) => isPast(parseISO(l.date)))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    scheduled: 'default',
    paid: 'secondary',
    unpaid: 'destructive',
    deducted: 'outline',
    pending_approval: 'outline',
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Timezone Prompt */}
      {user.email && (
        <TimezonePrompt 
          userIdOrEmail={user.email} 
          userType="student" 
          onTimezoneSet={handleTimezoneSet} 
        />
      )}

      {/* Main Content */}
      <main className="p-4 md:p-8">
        <PageHeader
          title="Learner Portal"
          description="Here's an overview of your lessons"
        >
            <Link href="/s-portal/calendar">
                <Button>
                <Plus className="h-4 w-4 mr-2" />
                Book a Lesson
                </Button>
            </Link>
        </PageHeader>

        <div className="grid gap-6 md:grid-cols-3 my-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Lessons</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingLessons.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Lessons</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pastLessons.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Lessons</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{lessons.length}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Upcoming Lessons */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Lessons</CardTitle>
              <CardDescription>Your scheduled sessions</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : upcomingLessons.length > 0 ? (
                <div className="space-y-4">
                  {upcomingLessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{lesson.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(parseISO(lesson.date), 'EEEE, MMM d')} at {lesson.startTime}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={statusColors[lesson.status]}>{lesson.status}</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openRescheduleDialog(lesson)}
                          title="Reschedule"
                        >
                          <CalendarClock className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setCancelLesson(lesson)}
                          title="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground mb-4">No upcoming lessons</p>
                  <Link href="/s-portal/calendar">
                    <Button variant="secondary">
                      Book Your First Lesson
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Past Lessons */}
          <Card>
            <CardHeader>
              <CardTitle>Past Lessons</CardTitle>
              <CardDescription>Your lesson history</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : pastLessons.length > 0 ? (
                <div className="space-y-4">
                  {pastLessons.slice(0, 5).map((lesson) => {
                    const hasReviewed = reviewedLessonIds.includes(lesson.id);
                    return (
                      <div
                        key={lesson.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div>
                          <p className="font-medium">{lesson.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(parseISO(lesson.date), 'EEEE, MMM d')} at {lesson.startTime}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {hasReviewed ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-700">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Reviewed
                            </Badge>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setReviewLesson(lesson)}
                            >
                              <Star className="h-4 w-4 mr-1" />
                              Review
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground">No past lessons yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Reschedule Dialog */}
      <Dialog open={!!rescheduleLesson_} onOpenChange={() => {
        setRescheduleLesson(null);
        setSelectedNewSlot('');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Lesson</DialogTitle>
            <DialogDescription>
              {rescheduleLesson_ && (
                <>
                  Current: {format(parseISO(rescheduleLesson_.date), 'EEEE, MMM d')} at {rescheduleLesson_.startTime}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Select New Time</label>
            <Select value={selectedNewSlot} onValueChange={setSelectedNewSlot}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a new time slot..." />
              </SelectTrigger>
              <SelectContent>
                {availableSlots.map(slot => (
                  <SelectItem key={slot.id} value={slot.id}>
                    {format(parseISO(slot.date), 'EEE, MMM d')} at {slot.time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availableSlots.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                No available time slots. Please try again later.
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-3">
              Note: Rescheduling within 12 hours of the lesson requires teacher approval.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setRescheduleLesson(null);
              setSelectedNewSlot('');
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleReschedule} 
              disabled={!selectedNewSlot || isRescheduling}
            >
              {isRescheduling ? 'Rescheduling...' : 'Confirm Reschedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={!!cancelLesson_} onOpenChange={() => setCancelLesson(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Lesson?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelLesson_ && (
                <>
                  Are you sure you want to cancel your {cancelLesson_.title} lesson on{' '}
                  {format(parseISO(cancelLesson_.date), 'EEEE, MMM d')} at {cancelLesson_.startTime}?
                  <br /><br />
                  <span className="text-xs">
                    Note: Cancelling within 24 hours of the lesson requires teacher approval.
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Lesson</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancel}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling ? 'Cancelling...' : 'Yes, Cancel Lesson'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Review Dialog */}
      <Dialog open={!!reviewLesson} onOpenChange={() => {
        setReviewLesson(null);
        setReviewRating(5);
        setReviewComment('');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave a Review</DialogTitle>
            <DialogDescription>
              {reviewLesson && (
                <>
                  How was your {reviewLesson.title} lesson on{' '}
                  {format(parseISO(reviewLesson.date), 'EEEE, MMM d')}?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            {/* Star Rating */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        star <= reviewRating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Comment */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Your Review (optional)</label>
              <Textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Share your experience..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setReviewLesson(null);
              setReviewRating(5);
              setReviewComment('');
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitReview}
              disabled={isSubmittingReview}
            >
              {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notification Dialog */}
      <Dialog open={!!notification} onOpenChange={() => setNotification(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {notification?.type === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
              {notification?.type === 'info' && <AlertCircle className="h-5 w-5 text-blue-500" />}
              {notification?.type === 'warning' && <AlertCircle className="h-5 w-5 text-yellow-500" />}
              {notification?.title}
            </DialogTitle>
            <DialogDescription>
              {notification?.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setNotification(null)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
