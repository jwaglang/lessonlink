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
import type { Lesson, Student, CourseTemplate } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  studentId: z.string({ required_error: 'Please select a student.' }),
  courseTemplateId: z.string({ required_error: 'Please select a course.' }),
});

interface BookLessonFormProps {
  students: Student[];
  courseTemplates: CourseTemplate[];
  onSuccess: (newLesson: Lesson) => void;
  selectedDate: Date;
  selectedTime: string;
}

export default function BookLessonForm({ students, courseTemplates, onSuccess, selectedDate, selectedTime }: BookLessonFormProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    startTransition(async () => {
      try {
        const courseTemplate = courseTemplates.find(ct => ct.id === values.courseTemplateId);
        if (!courseTemplate) throw new Error('Selected course not found');

        const startTime = selectedTime;
        const startHour = parseInt(startTime.split(':')[0]);
        // Duration is now from the course template
        const endHour = startHour + Math.floor(courseTemplate.duration / 60);
        const endMinutes = (courseTemplate.duration % 60).toString().padStart(2,'0');
        const endTime = `${endHour.toString().padStart(2, '0')}:${endMinutes}`;

        const newLessonData = {
          studentId: values.studentId,
          title: courseTemplate.title,
          rate: courseTemplate.rate,
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
          name="courseTemplateId"
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
                  {courseTemplates.map(course => (
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
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? <Loader2 className="animate-spin" /> : 'Book Lesson'}
        </Button>
      </form>
    </Form>
  );
}
