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
import { addLesson } from '@/lib/data';
import { Loader2 } from 'lucide-react';
import type { Lesson, Student, LessonType } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  studentId: z.string({ required_error: 'Please select a student.' }),
  lessonTypeId: z.string({ required_error: 'Please select a lesson type.' }),
});

interface BookLessonFormProps {
  students: Student[];
  lessonTypes: LessonType[];
  onSuccess: (newLesson: Lesson) => void;
  selectedDate: Date;
  selectedTime: string;
}

export default function BookLessonForm({ students, lessonTypes, onSuccess, selectedDate, selectedTime }: BookLessonFormProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    startTransition(async () => {
      try {
        const startTime = selectedTime;
        const startHour = parseInt(startTime.split(':')[0]);
        const endTime = `${(startHour + 1).toString().padStart(2, '0')}:00`;

        const lessonType = lessonTypes.find(lt => lt.id === values.lessonTypeId);
        if (!lessonType) throw new Error('Selected lesson type not found');

        const newLessonData = {
          studentId: values.studentId,
          title: lessonType.name,
          rate: lessonType.rate,
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
          name="lessonTypeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lesson</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a lesson type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {lessonTypes.map(lessonType => (
                    <SelectItem key={lessonType.id} value={lessonType.id}>
                      {lessonType.name} ({lessonType.rate} {lessonType.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                You will be able to create and manage these lessons later.
              </FormDescription>
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
