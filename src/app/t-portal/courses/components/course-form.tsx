
'use client';

import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { CourseTemplate } from '@/lib/types';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { addCourseTemplate, updateCourseTemplate } from '@/lib/firestore';
import { Loader2 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const formSchema = z.object({
    title: z.string().min(2, { message: 'Title must be at least 2 characters.' }),
    pitch: z.string().max(100, { message: 'Pitch must be 100 characters or less.' }).optional(),
    description: z.string().optional(),
    hourlyRate: z.coerce.number().positive({ message: 'Hourly rate must be a positive number.' }),
    discount60min: z.coerce.number().min(0).max(100).optional(),
    thumbnailUrl: z.string().optional(),
  });

interface CourseFormProps {
    courseTemplate: CourseTemplate | null;
    onSuccess: (template: CourseTemplate) => void;
}

// Get only course thumbnail placeholders
const courseThumbnails = PlaceHolderImages.filter(p => p.id.startsWith('course-thumb'));


export default function CourseForm({ courseTemplate, onSuccess }: CourseFormProps) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: courseTemplate?.title || '',
            pitch: courseTemplate?.pitch || '',
            description: courseTemplate?.description || '',
            hourlyRate: courseTemplate?.hourlyRate || 0,
            discount60min: courseTemplate?.discount60min ?? undefined,
            thumbnailUrl: courseTemplate?.thumbnailUrl || '',
        },
    });

    const onSubmit = (values: z.infer<typeof formSchema>) => {
        startTransition(async () => {
            try {
                // If we are editing, we preserve the original imageUrl (hero image)
                // If we are creating a new one, we derive it from the selected thumbnail.
                const newHeroUrl = courseTemplate?.imageUrl || values.thumbnailUrl?.replace('thumb', 'hero') || 'course-hero1';
                
                const templateData = {
                    ...values,
                    thumbnailUrl: values.thumbnailUrl || 'course-thumb1', // default if none selected
                    imageUrl: newHeroUrl,
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
                            <FormDescription className={cn((field.value?.length || 0) > 100 && "text-destructive")}>
                                {`${field.value?.length || 0} / 100 characters`}
                            </FormDescription>
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
                    name="hourlyRate"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Hourly Rate</FormLabel>
                            <FormControl>
                                <Input type="number" step="0.01" placeholder="50.00" {...field} />
                            </FormControl>
                            <FormDescription>
                                30-min lessons will be half this rate. 60-min lessons will use this rate (or discounted rate if set below).
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="discount60min"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>60-Min Discount (Optional)</FormLabel>
                            <FormControl>
                                <Input 
                                    type="number" 
                                    step="1" 
                                    min="0" 
                                    max="100" 
                                    placeholder="e.g., 10 for 10% off" 
                                    {...field} 
                                    value={field.value || ''}
                                />
                            </FormControl>
                            <FormDescription>
                                Optional percentage discount for 60-minute lessons only (0-100%). Leave blank for no discount.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="thumbnailUrl"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Course Thumbnail</FormLabel>
                             <FormDescription>Select an image for your course card.</FormDescription>
                            <FormControl>
                                <RadioGroup
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    className="grid grid-cols-3 gap-4 pt-2"
                                >
                                    {courseThumbnails.map((thumb) => (
                                        <FormItem key={thumb.id} className="space-y-0">
                                            <FormControl>
                                                <RadioGroupItem value={thumb.id} className="sr-only" />
                                            </FormControl>
                                            <Label className={cn(
                                                "cursor-pointer rounded-md overflow-hidden border-2 border-transparent transition-all",
                                                "ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                                                field.value === thumb.id && "border-primary"
                                            )}>
                                                <Image 
                                                    src={thumb.imageUrl} 
                                                    alt={thumb.description} 
                                                    width={200} height={112} 
                                                    className="aspect-video object-cover w-full" 
                                                    data-ai-hint={thumb.imageHint}
                                                />
                                            </Label>
                                        </FormItem>
                                    ))}
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
