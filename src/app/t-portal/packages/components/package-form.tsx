'use client';

import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createStudentCredit, updateStudentCredit } from '@/lib/firestore';
import type { StudentCredit, Student, Course } from '@/lib/types';

const formSchema = z.object({
  studentId: z.string({ required_error: 'Please select a student.' }),
  courseId: z.string({ required_error: 'Please select a course.' }),
  totalHours: z.coerce.number().min(0.5, { message: 'Must be at least 0.5 hours.' }),
  uncommittedHours: z.coerce.number().min(0),
  committedHours: z.coerce.number().min(0),
  completedHours: z.coerce.number().min(0),
  currency: z.string().min(3, { message: 'Currency code must be 3 letters.'}).max(3),
});

interface PackageFormProps {
  students: Student[];
  courses: Course[];
  credit: StudentCredit | null;
  onSuccess: () => void;
}

export default function PackageForm({ students, courses, credit, onSuccess }: PackageFormProps) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            studentId: credit?.studentId || '',
            courseId: credit?.courseId || '',
            totalHours: credit?.totalHours || 10,
            uncommittedHours: credit?.uncommittedHours || credit?.totalHours || 10,
            committedHours: credit?.committedHours || 0,
            completedHours: credit?.completedHours || 0,
            currency: credit?.currency || 'USD',
        },
    });
    
    // When totalHours changes, update uncommittedHours if it's a new package
    const totalHours = form.watch('totalHours');
    const studentId = form.watch('studentId');

    React.useEffect(() => {
        if (!credit) { // Only for new packages
            form.setValue('uncommittedHours', totalHours);
        }
    }, [totalHours, credit, form]);
    
    React.useEffect(() => {
        if (studentId) {
            const student = students.find(s => s.id === studentId);
            if (student && student.prepaidPackage.currency) {
                form.setValue('currency', student.prepaidPackage.currency);
            }
        }
    }, [studentId, students, form]);

    const onSubmit = (values: z.infer<typeof formSchema>) => {
        startTransition(async () => {
            try {
                let savedCredit;
                if (credit) {
                    const { id, createdAt, packageId, ...rest } = credit;
                    savedCredit = await updateStudentCredit(credit.id, values);
                    toast({ title: 'Success', description: 'Package updated.'});
                } else {
                    const newCreditData = {
                      ...values,
                      packageId: `manual-${Date.now()}`,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    };
                    savedCredit = await createStudentCredit(newCreditData);
                    toast({ title: 'Success', description: 'Package created.'});
                }
                onSuccess();
            } catch (error) {
                toast({ title: 'Error', description: 'Failed to save package.', variant: 'destructive' });
            }
        });
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1 pr-4">
                <FormField
                    control={form.control}
                    name="studentId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Student</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!credit}>
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
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!credit}>
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

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="totalHours"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Total Hours</FormLabel>
                                <FormControl>
                                    <Input type="number" step="0.5" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="currency"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Currency</FormLabel>
                                <FormControl>
                                    <Input placeholder="USD" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                
                {credit && (
                    <div className="grid grid-cols-3 gap-4 border-t pt-4">
                         <FormField
                            control={form.control}
                            name="uncommittedHours"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Uncommitted</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.5" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="committedHours"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Committed</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.5" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="completedHours"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Completed</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.5" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                )}
                
                <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={isPending}>
                        {isPending ? <Loader2 className="animate-spin" /> : 'Save Package'}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
