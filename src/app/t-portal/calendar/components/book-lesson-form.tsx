
'use client';

import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { addLesson } from '@/lib/firestore';
import { Loader2 } from 'lucide-react';
import type { Lesson, Student, Course } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { calculateLessonPrice } from '@/lib/types';

const formSchema = z.object({
  studentId: z.string({ required_error: 'Please select a student.' }),
  courseId: z.string({ required_error: 'Please select a course.' }),
  duration: z.coerce.number({ required_error: 'Please select a duration.' }),
});

interface BookLessonFormProps {
  students: Student[];
  courses: Course[];
  onSuccess: (newLesson: Lesson) => void;
  selectedDate: Date;
  selectedTime: string;
}

export default function BookLessonForm({ students, courses, onSuccess, selectedDate, selectedTime }: BookLessonFormProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        duration: 60,
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    startTransition(async () => {
      try {
        const course = courses.find(ct => ct.id === values.courseId);
        if (!course) throw new Error('Selected course not found');

        const startTime = selectedTime;
        const startHour = parseInt(startTime.split(':')[0]);
        const duration = values.duration;
        const endHour = startHour + Math.floor(duration / 60);
        const endMinutes = (duration % 60).toString().padStart(2,'0');
        const endTime = `${endHour.toString().padStart(2, '0')}:${endMinutes}`;

        const lessonPrice = calculateLessonPrice(course.hourlyRate, duration as 30 | 60, course.discount60min);

        const newLessonData = {
          studentId: values.studentId,
          title: course.title,
          rate: lessonPrice,
          date: selectedDate.toISOString(),
          startTime,
          endTime,
        };
        const newLesson = await addLesson(newLessonData);
        toast({
          title: 'Lesson Booked',
          description: `A lesson for ${students.find(s => s.id === values.studentId)?.name} has been scheduled.`,
        });
        onSuccess(newLesson);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to book lesson. Please try again.',
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-6">
        <div className="p-4 bg-muted/50 rounded-lg text-sm">
            <p><strong>Booking for:</strong> {format(selectedDate, 'PPP')} at {selectedTime}</p>
        </div>
        <FormField
          control={form.control}
          name="studentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Student</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
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
        <FormField
          control={form.control}
          name="courseId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Course</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
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
        <FormField
            control={form.control}
            name="duration"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Duration</FormLabel>
                    <FormControl>
                        <RadioGroup
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            defaultValue={String(field.value)}
                            className="flex items-center gap-4 pt-2"
                        >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                    <RadioGroupItem value="30" />
                                </FormControl>
                                <FormLabel className="font-normal">30 minutes</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
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
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? <Loader2 className="animate-spin" /> : 'Book Lesson'}
        </Button>
      </form>
    </Form>
  );
}
