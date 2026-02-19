'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { logOut } from '@/lib/auth';
import {
  getStudentById,
  getSessionInstancesByStudentId,
  getAvailableSlots,
  rescheduleSessionInstance,
  cancelSessionInstance,
  createReview,
  getReviewedSessionInstanceIds,
  getTeacherProfileById,
  getStudentCredit,
  getStudentProgressByStudentId,
  getStudentRewardsByStudentId,
  getStudentPackages,
  getStudentCreditsByStudentId,
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
import { LogOut, Calendar, GraduationCap, Clock, Plus, CalendarClock, X, AlertCircle, CheckCircle, Star, MessageSquare, ShoppingCart, BookOpen, Trophy, ShieldAlert } from 'lucide-react';
import { format, parseISO, isFuture, isPast, startOfDay } from 'date-fns';
import type { SessionInstance, Student, Availability, StudentCredit, StudentPackage, StudentProgress as SP, StudentRewards } from '@/lib/types';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import TimezonePrompt from '@/components/timezone-prompt';
import PageHeader from '@/components/page-header';
import PurchasePlanCard from '@/components/purchase-plan-card';
import { generateLearnerAlerts, getAlertConfig, type Alert } from '@/lib/alerts';

function instanceDateIso(instance: SessionInstance | Availability): string {
  const anyInst = instance as any;
  return anyInst.lessonDate || anyInst.date || '';
}

export default function StudentPortalPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [sessions, setSessions] = useState<SessionInstance[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [timezone, setTimezone] = useState<string>('');
  const [studentCredit, setStudentCredit] = useState<StudentCredit | null>(null);
  const [progressList, setProgressList] = useState<SP[]>([]);
  const [rewards, setRewards] = useState<StudentRewards | null>(null);

  // Reschedule state
  const [rescheduleSessionInstance_, setRescheduleSession] = useState<SessionInstance | null>(null);
  const [availableSlots, setAvailableSlots] = useState<Availability[]>([]);
  const [selectedNewSlot, setSelectedNewSlot] = useState<string>('');
  const [isRescheduling, setIsRescheduling] = useState(false);

  // Cancel state
  const [cancelSessionInstance_, setCancelSession] = useState<SessionInstance | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Notification state
  const [notification, setNotification] = useState<{
    type: 'success' | 'info' | 'warning';
    title: string;
    message: string;
  } | null>(null);

  // Review state
  const [reviewSession, setReviewSession] = useState<SessionInstance | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewedSessionInstanceIds, setReviewedSessionInstanceIds] = useState<string[]>([]);
  const [teacherId, setTeacherId] = useState<string | null>(null);

  // Star Trek Alert System
  const [learnerAlerts, setLearnerAlerts] = useState<Alert[]>([]);
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    async function fetchStudentData() {
      if (user?.email) {
        console.log('ðŸ” Attempting to get/create student:', { email: user.email, uid: user.uid });
        const studentRecord = await getStudentById(user.uid);
        if (!studentRecord) {
          setLoadingData(false);
          return;
        }
        console.log('âœ… Student record result:', studentRecord);
        setStudent(studentRecord);
        
        const studentSessions = await getSessionInstancesByStudentId(studentRecord.id);
        setSessions(studentSessions);
        
        // Fetch student credit
        const courseId = '45Jkyfg94otjc4d22dZT'; // Hardcoded for now (Kiddoland course)
        const credit = await getStudentCredit(studentRecord.id, courseId);
        setStudentCredit(credit);
        
        // Fetch reviewed lesson IDs
        const reviewedIds = await getReviewedSessionInstanceIds(studentRecord.id);
        setReviewedSessionInstanceIds(reviewedIds);
        
        // Fetch progress, rewards, packages, and credits for alerts
        const [progressData, rewardsData, packagesData, creditsData] = await Promise.all([
          getStudentProgressByStudentId(studentRecord.id),
          getStudentRewardsByStudentId(studentRecord.id),
          getStudentPackages(studentRecord.id),
          getStudentCreditsByStudentId(studentRecord.id),
        ]);
        setProgressList(progressData);
        setRewards(rewardsData);

        // Generate learner alerts
        const generatedAlerts = generateLearnerAlerts(
          packagesData,
          creditsData,
          progressData,
          rewardsData
        );
        setLearnerAlerts(generatedAlerts);

        // Fetch teacher ID (from student assignment)
        if (studentRecord.assignedTeacherId) {
          const teacherProfile = await getTeacherProfileById(studentRecord.assignedTeacherId);
          if (teacherProfile) {
            setTeacherId(teacherProfile.id);
          }
        }
        setLoadingData(false);
      }
    }
    fetchStudentData();
  }, [user]);

  function handleTimezoneSet(tz: string) {
    setTimezone(tz);
  }

  async function openRescheduleDialog(lesson: SessionInstance) {
    setRescheduleSession(lesson);
    const slots = await getAvailableSlots();
    // Filter to only future slots
    const futureSlots = slots.filter(slot => {
      const slotDate = parseISO(instanceDateIso(slot));
      return isFuture(slotDate) || startOfDay(slotDate).getTime() === startOfDay(new Date()).getTime();
    });
    setAvailableSlots(futureSlots);
  }

  async function handleReschedule() {
    if (!rescheduleSessionInstance_ || !selectedNewSlot || !student) return;
    
    setIsRescheduling(true);
    
    const slot = availableSlots.find(s => s.id === selectedNewSlot);
    if (!slot) return;

    // Calculate end time based on lesson duration
    const startHour = parseInt(slot.time.split(':')[0]);
    const originalStart = parseInt(rescheduleSessionInstance_.startTime.split(':')[0]);
    const originalEnd = parseInt(rescheduleSessionInstance_.endTime.split(':')[0]);
    const duration = originalEnd - originalStart;
    const endTime = `${(startHour + duration).toString().padStart(2, '0')}:00`;

    try {
      const result = await rescheduleSessionInstance(
        rescheduleSessionInstance_.id,
        slot.date,
        slot.time,
        endTime,
        student.id
      );
      
      if (result.success && result.session) {
        // Update sessions list
        setSessions(prev => prev.map(x => x.id === result.session!.id ? result.session! : x));
        setNotification({
          type: 'success',
          title: 'Session Rescheduled',
          message: `Your session has been moved to ${format(parseISO(instanceDateIso(slot)), 'EEEE, MMM d')} at ${slot.time}.`
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
      setRescheduleSession(null);
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
    if (!cancelSessionInstance_ || !student) return;
    
    setIsCancelling(true);

    try {
      const result = await cancelSessionInstance(cancelSessionInstance_.id, student.id);
      
      if (result.success) {
        // Remove from sessions list
        setSessions(prev => prev.filter(l => l.id !== cancelSessionInstance_.id));
        setNotification({
          type: 'success',
          title: 'Session Cancelled',
          message: 'Your session has been cancelled and the time slot is now available.'
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
      setCancelSession(null);
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
    if (!reviewSession || !student || !teacherId) return;
    
    setIsSubmittingReview(true);
    
    try {
      await createReview({
        sessionInstanceId: reviewSession.id,
        lessonId: reviewSession.id,
        studentId: student.id,
        studentName: student.name || user?.email || 'Student',
        teacherId: teacherId,
        rating: reviewRating,
        comment: reviewComment,
        createdAt: new Date().toISOString(),
        pinned: false,
        visible: true,
      });
      
      // Add to reviewed list
      setReviewedSessionInstanceIds(prev => [...prev, reviewSession.id]);
      
      setNotification({
        type: 'success',
        title: 'Review Submitted',
        message: 'Thank you for your feedback!'
      });
      
      // Reset and close
      setReviewSession(null);
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

  const upcomingSessions = sessions
    .filter((l) => isFuture(parseISO(instanceDateIso(l))))
    .sort((a, b) => new Date(instanceDateIso(a)).getTime() - new Date(instanceDateIso(b)).getTime());

  const pastSessions = sessions
    .filter((l) => isPast(parseISO(instanceDateIso(l))))
    .sort((a, b) => new Date(instanceDateIso(b)).getTime() - new Date(instanceDateIso(a)).getTime());

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
          title={`${student?.name || 'Learner'}'s Dashboard`}
          description="Here's an overview of your sessions"
        />

        {/* Alerts at top */}
        {learnerAlerts.length > 0 ? (
          <Card className="my-6">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5" />
                  Alerts
                  <Badge variant="secondary" className="ml-1">
                    {learnerAlerts.length}
                  </Badge>
                </CardTitle>
                {learnerAlerts.length > 3 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllAlerts(!showAllAlerts)}
                  >
                    {showAllAlerts ? 'Show less' : `View all (${learnerAlerts.length})`}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {(showAllAlerts ? learnerAlerts : learnerAlerts.slice(0, 3)).map((alert) => {
                const config = getAlertConfig(alert.level);
                return (
                  <div
                    key={alert.id}
                    className={`border-l-4 ${config.borderColor} ${config.bgColor} rounded-md p-3`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${config.badgeClass}`}>
                            {config.label}
                          </span>
                          <span className={`text-sm font-semibold ${config.textColor}`}>
                            {alert.title}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{alert.description}</p>
                      </div>
                      {alert.link && (
                        <Link
                          href={alert.link}
                          className="text-xs text-primary hover:underline whitespace-nowrap"
                        >
                          View
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ) : (
          <Card className="my-6">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5" />
                Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center">All systems nominal.</p>
            </CardContent>
          </Card>
        )}

        {/* Under Alerts: My Course Progress, Upcoming, Completed */}
        <div className="grid gap-6 md:grid-cols-3 my-8">
          {/* My Course Progress */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                My Course Progress
              </CardTitle>
              <CardDescription>Your learning journey so far</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {progressList.length > 0 ? (
                progressList.map((prog) => (
                  <div key={prog.id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">
                        {prog.unitsCompleted}/{prog.unitsTotal} units Â· {prog.sessionsCompleted}/{prog.sessionsTotal} sessions
                      </span>
                      <span className="text-muted-foreground">{prog.percentComplete}%</span>
                    </div>
                    <Progress value={prog.percentComplete} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {prog.totalHoursCompleted.toFixed(1)}h completed of {prog.targetHours}h target
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No course progress yet. Complete sessions to start tracking!</p>
              )}
            </CardContent>
          </Card>

          {/* Upcoming */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingSessions.length}</div>
              <p className="text-xs text-muted-foreground">sessions</p>
            </CardContent>
          </Card>

          {/* Completed */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pastSessions.length}</div>
              <p className="text-xs text-muted-foreground">sessions</p>
            </CardContent>
          </Card>
        </div>

        {/* Rest below: My Course Progress, Petland Rewards, Upcoming Sessions, Past Sessions */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* My Course Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                My Course Progress
              </CardTitle>
              <CardDescription>Your learning journey so far</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {progressList.length > 0 ? (
                progressList.map((prog) => (
                  <div key={prog.id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">
                        {prog.unitsCompleted}/{prog.unitsTotal} units Â· {prog.sessionsCompleted}/{prog.sessionsTotal} sessions
                      </span>
                      <span className="text-muted-foreground">{prog.percentComplete}%</span>
                    </div>
                    <Progress value={prog.percentComplete} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {prog.totalHoursCompleted.toFixed(1)}h completed of {prog.targetHours}h target
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No course progress yet. Complete sessions to start tracking!</p>
              )}
            </CardContent>
          </Card>

          {/* Petland Rewards */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Petland Rewards
              </CardTitle>
              <CardDescription>Your in-game progress</CardDescription>
            </CardHeader>
            <CardContent>
              {rewards ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-md border p-4 text-center">
                    <p className="text-3xl font-bold">{rewards.xp}</p>
                    <p className="text-sm text-muted-foreground">XP earned</p>
                  </div>
                  <div className="rounded-md border p-4 text-center">
                    <p className="text-3xl font-bold">{rewards.hp}</p>
                    <p className="text-sm text-muted-foreground">HP remaining</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No rewards data yet. Complete sessions to earn XP!</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Upcoming Sessions */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Sessions</CardTitle>
              <CardDescription>Your scheduled sessions</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : upcomingSessions.length > 0 ? (
                <div className="space-y-4">
                  {upcomingSessions.map((lesson) => (
                    <div
                      key={lesson.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{lesson.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(parseISO(instanceDateIso(lesson)), 'EEEE, MMM d')} at {lesson.startTime}
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
                          onClick={() => setCancelSession(lesson)}
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
                  <p className="text-muted-foreground mb-4">No upcoming sessions</p>
                  <Link href="/s-portal/calendar">
                    <Button variant="secondary">
                      Book Your First Session
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Past Sessions */}
          <Card>
            <CardHeader>
              <CardTitle>Past Sessions</CardTitle>
              <CardDescription>Your session history</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : pastSessions.length > 0 ? (
                <div className="space-y-4">
                  {pastSessions.slice(0, 5).map((lesson) => {
                    const hasReviewed = reviewedSessionInstanceIds.includes(lesson.id);
                    return (
                      <div
                        key={lesson.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div>
                          <p className="font-medium">{lesson.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(parseISO(instanceDateIso(lesson)), 'EEEE, MMM d')} at {lesson.startTime}
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
                              onClick={() => setReviewSession(lesson)}
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
                <p className="text-muted-foreground">No past sessions yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Reschedule Dialog */}
      <Dialog open={!!rescheduleSessionInstance_} onOpenChange={() => {
        setRescheduleSession(null);
        setSelectedNewSlot('');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Session</DialogTitle>
            <DialogDescription>
              {rescheduleSessionInstance_ && (
                <>
                  Current: {format(parseISO(instanceDateIso(rescheduleSessionInstance_)), 'EEEE, MMM d')} at {rescheduleSessionInstance_.startTime}
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
                    {format(parseISO(instanceDateIso(slot)), 'EEE, MMM d')} at {slot.time}
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
              setRescheduleSession(null);
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
      <AlertDialog open={!!cancelSessionInstance_} onOpenChange={() => setCancelSession(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Session?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelSessionInstance_ && (
                <>
                  Are you sure you want to cancel your {cancelSessionInstance_.title} lesson on{' '}
                  {format(parseISO(instanceDateIso(cancelSessionInstance_)), 'EEEE, MMM d')} at {cancelSessionInstance_.startTime}?
                  <br /><br />
                  <span className="text-xs">
                    Note: Cancelling within 24 hours of the lesson requires teacher approval.
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Session</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancel}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling ? 'Cancelling...' : 'Yes, Cancel Session'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Review Dialog */}
      <Dialog open={!!reviewSession} onOpenChange={() => {
        setReviewSession(null);
        setReviewRating(5);
        setReviewComment('');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave a Review</DialogTitle>
            <DialogDescription>
              {reviewSession && (
                <>
                  How was your {reviewSession.title} lesson on{' '}
                  {format(parseISO(instanceDateIso(reviewSession)), 'EEEE, MMM d')}?
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
              setReviewSession(null);
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
