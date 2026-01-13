'use client';

import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { CourseTemplate } from '@/lib/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { addCourseTemplate, updateCourseTemplate } from '@/lib/data';
import { Loader2 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const formSchema = z.object({
  title: z.string().min(2, { message: 'Title must be at least 2 characters.' }),
  pitch: z.string().max(100, { message: 'Pitch must be 100 characters or less.' }).optional(),
  description: z.string().optional(),
  rate: z.coerce.number().positive({ message: 'Rate must be a positive number.' }),
  duration: z.enum(['30', '60']),
});

interface CourseFormProps {
    courseTemplate: CourseTemplate | null;
    onSuccess: (template: CourseTemplate) => void;
}

export default function CourseForm({ courseTemplate, onSuccess }: CourseFormProps) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: courseTemplate?.title || '',
            pitch: courseTemplate?.pitch || '',
            description: courseTemplate?.description || '',
            rate: courseTemplate?.rate || 0,
            duration: courseTemplate?.duration?.toString() as '30' | '60' || '60',
        },
    });

    const onSubmit = (values: z.infer<typeof formSchema>) => {
        startTransition(async () => {
            try {
                const newIdNumber = Math.floor(Math.random() * 100);
                const templateData = {
                    ...values,
                    duration: parseInt(values.duration, 10) as 30 | 60,
                    thumbnailUrl: `course-thumb${newIdNumber}`, // Placeholder
                    imageUrl: `course-hero${newIdNumber}`, // Placeholder
                };

                let savedTemplate;
                if (courseTemplate) {
                    savedTemplate = await updateCourseTemplate(courseTemplate.id, templateData);
                } else {
                    savedTemplate = await addCourseTemplate(templateData);
                }
                
                toast({
                    title: `Course Template ${courseTemplate ? 'Updated' : 'Created'}`,
                    description: `"${savedTemplate.title}" has been saved.`,
                });
                onSuccess(savedTemplate);
            } catch (error) {
                toast({
                    title: 'Error',
                    description: `Failed to ${courseTemplate ? 'update' : 'create'} template.`,
                    variant: 'destructive',
                });
            }
        });
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
                <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g. Advanced Mathematics" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="pitch"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Pitch (Short Description)</FormLabel>
                            <FormControl>
                                <Input placeholder="A brief, catchy summary." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Full Description</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Describe the course in detail." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="rate"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Rate (per lesson)</FormLabel>
                            <FormControl>
                                <Input type="number" step="0.01" placeholder="25.00" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                        <FormLabel>Duration (in minutes)</FormLabel>
                        <FormControl>
                            <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex items-center space-x-4"
                            >
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="30" />
                                </FormControl>
                                <Label className="font-normal">30</Label>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="60" />
                                </FormControl>
                                <Label className="font-normal">60</Label>
                            </FormItem>
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit" disabled={isPending} className="w-full mt-4">
                    {isPending ? <Loader2 className="animate-spin" /> : 'Save Template'}
                </Button>
            </form>
        </Form>
    );
}
