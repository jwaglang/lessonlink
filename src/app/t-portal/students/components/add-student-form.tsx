'use client';

import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Student } from '@/lib/types';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth-provider';
import { getStudentByEmail, updateStudent } from '@/lib/firestore';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
});

interface AddStudentFormProps {
  onSuccess: (student: Student) => void;
}

export default function AddStudentForm({ onSuccess }: AddStudentFormProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    startTransition(async () => {
      try {
        const student = await getStudentByEmail(values.email);
        if (student) {
          await updateStudent(student.id, { assignedTeacherId: user!.uid });
          toast({
            title: 'Student Found',
            description: `${student.name} has been added to your roster.`,
          });
          onSuccess(student);
        } else {
          toast({
            title: 'Student Not Found',
            description: 'No account found for that email. Ask the student to sign in first.',
            variant: 'destructive',
          });
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to look up student. Please try again.',
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Student Email</FormLabel>
              <FormControl>
                <Input placeholder="student@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? <Loader2 className="animate-spin" /> : 'Find Student'}
        </Button>
      </form>
    </Form>
  );
}