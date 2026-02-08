'use client';

import { useTransition, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  bookLesson, 
  getLevelsByCourseId, 
  getUnitsByLevelId, 
  getSessionsByUnitId,
  getStudentById,
} from '@/lib/firestore';
import { Loader2 } from 'lucide-react';
import type { SessionInstance, Student, Course, Level, Unit, Session } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { calculateLessonPrice } from '@/lib/types';

const formSchema = z.object({
  studentId: z.string({ required_error: 'Please select a student.' }),
  courseId: z.string({ required_error: 'Please select a course.' }),
  levelId: z.string({ required_error: 'Please select a level.' }),
  unitId: z.string({ required_error: 'Please select a unit.' }),
  sessionId: z.string({ required_error: 'Please select a session.' }),
  duration: z.coerce.number({ required_error: 'Please select a duration.' }),
  billingType: z.enum(['trial', 'credit', 'one_off'], { required_error: 'Please select a billing type.' }),
});

interface BookSessionFormProps {
  students: Student[];
  courses: Course[];
  teacherUid: string;
  onSuccess: (newSession: SessionInstance) => void;
  selectedDate: Date;
  selectedTime: string;
}

export default function BookSessionForm({ 
  students, 
  courses, 
  teacherUid,
  onSuccess, 
  selectedDate, 
  selectedTime 
}: BookSessionFormProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  
  // Cascading dropdown state
  const [levels, setLevels] = useState<Level[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingLevels, setLoadingLevels] = useState(false);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      duration: 30,
      billingType: 'credit',
    },
  });

  const watchCourseId = form.watch('courseId');
  const watchLevelId = form.watch('levelId');
  const watchUnitId = form.watch('unitId');

  // Load levels when course changes
  useEffect(() => {
    if (!watchCourseId) {
      setLevels([]);
      setUnits([]);
      setSessions([]);
      return;
    }
    
    setLoadingLevels(true);
    form.setValue('levelId', '');
    form.setValue('unitId', '');
    form.setValue('sessionId', '');
    setUnits([]);
    setSessions([]);
    
    getLevelsByCourseId(watchCourseId)
      .then(setLevels)
      .catch(console.error)
      .finally(() => setLoadingLevels(false));
  }, [watchCourseId, form]);

  // Load units when level changes
  useEffect(() => {
    if (!watchLevelId) {
      setUnits([]);
      setSessions([]);
      return;
    }
    
    setLoadingUnits(true);
    form.setValue('unitId', '');
    form.setValue('sessionId', '');
    setSessions([]);
    
    getUnitsByLevelId(watchLevelId)
      .then(setUnits)
      .catch(console.error)
      .finally(() => setLoadingUnits(false));
  }, [watchLevelId, form]);

  // Load sessions when unit changes
  useEffect(() => {
    if (!watchUnitId) {
      setSessions([]);
      return;
    }
    
    setLoadingSessions(true);
    form.setValue('sessionId', '');
    
    getSessionsByUnitId(watchUnitId)
      .then(setSessions)
      .catch(console.error)
      .finally(() => setLoadingSessions(false));
  }, [watchUnitId, form]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    startTransition(async () => {
      try {
        const course = courses.find(c => c.id === values.courseId);
        const session = sessions.find(s => s.id === values.sessionId);
        const student = await getStudentById(values.studentId);
        
        if (!course) throw new Error('Selected course not found');
        if (!session) throw new Error('Selected session not found');
        if (!student) throw new Error('Selected student not found');

        const startTime = selectedTime;
        const startHour = parseInt(startTime.split(':')[0]);
        const duration = values.duration;
        const durationHours = duration / 60; // 0.5 or 1
        const endHour = startHour + Math.floor(duration / 60);
        const endMinutes = (duration % 60).toString().padStart(2, '0');
        const endTime = `${endHour.toString().padStart(2, '0')}:${endMinutes}`;

        const lessonPrice = calculateLessonPrice(course.hourlyRate, duration as 30 | 60, course.discount60min);

        // Format date as YYYY-MM-DD
        const lessonDate = format(selectedDate, 'yyyy-MM-dd');

        const newSessionInstance = await bookLesson({
          studentId: values.studentId,
          studentAuthUid: student.authUid || student.id, // fallback to student doc id if no authUid
          teacherUid,
          courseId: values.courseId,
          unitId: values.unitId,
          sessionId: values.sessionId,
          title: session.title,
          lessonDate,
          startTime,
          endTime,
          durationHours,
          billingType: values.billingType,
          rate: lessonPrice,
        });

        toast({
          title: 'Session Booked',
          description: `A session for ${student.name} has been scheduled.`,
        });
        
        onSuccess(newSessionInstance);
      } catch (error: any) {
        console.error('Booking error:', error);
        toast({
          title: 'Booking Failed',
          description: error.message || 'Failed to book session. Please try again.',
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
        <div className="p-3 bg-muted/50 rounded-lg text-sm">
          <p><strong>Booking for:</strong> {format(selectedDate, 'PPP')} at {selectedTime}</p>
        </div>

        {/* Student Selection */}
        <FormField
          control={form.control}
          name="studentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Student</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a student" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {students.map(student => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Course Selection */}
        <FormField
          control={form.control}
          name="courseId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Course</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {courses.map(course => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Level Selection */}
        <FormField
          control={form.control}
          name="levelId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Level</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                value={field.value}
                disabled={!watchCourseId || loadingLevels}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={
                      loadingLevels ? "Loading levels..." : 
                      !watchCourseId ? "Select a course first" : 
                      "Select a level"
                    } />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {levels.map(level => (
                    <SelectItem key={level.id} value={level.id}>
                      {level.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Unit Selection */}
        <FormField
          control={form.control}
          name="unitId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unit</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                value={field.value}
                disabled={!watchLevelId || loadingUnits}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={
                      loadingUnits ? "Loading units..." : 
                      !watchLevelId ? "Select a level first" : 
                      "Select a unit"
                    } />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {units.map(unit => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Session Selection */}
        <FormField
          control={form.control}
          name="sessionId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Session</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                value={field.value}
                disabled={!watchUnitId || loadingSessions}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={
                      loadingSessions ? "Loading sessions..." : 
                      !watchUnitId ? "Select a unit first" : 
                      "Select a session"
                    } />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {sessions.map(session => (
                    <SelectItem key={session.id} value={session.id}>
                      {session.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Duration Selection */}
        <FormField
          control={form.control}
          name="duration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duration</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={(value) => field.onChange(parseInt(value))}
                  value={String(field.value)}
                  className="flex items-center gap-4 pt-2"
                >
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="30" />
                    </FormControl>
                    <FormLabel className="font-normal">30 minutes</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="60" />
                    </FormControl>
                    <FormLabel className="font-normal">60 minutes</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Billing Type Selection */}
        <FormField
          control={form.control}
          name="billingType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Billing Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select billing type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="trial">Trial (Free)</SelectItem>
                  <SelectItem value="credit">Credit (From Package)</SelectItem>
                  <SelectItem value="one_off">One-Off Payment</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? <Loader2 className="animate-spin mr-2" /> : null}
          {isPending ? 'Booking...' : 'Book Session'}
        </Button>
      </form>
    </Form>
  );
}
