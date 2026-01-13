'use client';

import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, parse, addHours } from 'date-fns';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { addLesson } from '@/lib/data';
import { Loader2 } from 'lucide-react';
import type { Lesson, Student } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  studentId: z.string({ required_error: 'Please select a student.' }),
  title: z.string().min(2, { message: 'Title must be at least 2 characters.' }),
  rate: z.coerce.number().min(0, { message: 'Rate must be a positive number.' }),
});

interface BookLessonFormProps {
  students: Student[];
  onSuccess: (newLesson: Lesson) => void;
  selectedDate: Date;
  selectedTime: string;
}

export default function BookLessonForm({ students, onSuccess, selectedDate, selectedTime }: BookLessonFormProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      rate: 25,
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    startTransition(async () => {
      try {
        const startTime = selectedTime;
        const startHour = parseInt(startTime.split(':')[0]);
        const endTime = `${(startHour + 1).toString().padStart(2, '0')}:00`;

        const newLessonData = {
          ...values,
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
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lesson Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Algebra II" {...field} />
              </FormControl>
              <FormDescription>
                We will later replace this with a pre-defined lesson selector.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="rate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rate</FormLabel>
              <FormControl>
                <Input type="number" placeholder="25" {...field} />
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
