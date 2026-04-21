
'use client';

import { useTransition, useRef, useEffect, useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Course } from '@/lib/types';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { addCourse, updateCourse } from '@/lib/firestore';
import { Loader2 } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const formSchema = z.object({
    title: z.string().min(2, { message: 'Title must be at least 2 characters.' }),
    pitch: z.string().max(100, { message: 'Pitch must be 100 characters or less.' }).optional(),
    description: z.string().optional(),
    hourlyRate: z.coerce.number().min(0, { message: 'Hourly rate must be 0 or a positive number.' }),
    discount60min: z.coerce.number().min(0).max(100).optional(),
    thumbnailUrl: z.string().optional(),
    imagePosition: z.string().optional(),
  });

interface CourseFormProps {
    course: Course | null;
    onSuccess: (course: Course) => void;
}

const courseThumbnails = PlaceHolderImages.filter(p => p.id.startsWith('course-thumb'));

function parsePos(v: string) {
    const [x = '50', y = '50'] = (v || '50% 50%').split(' ');
    return { x: parseFloat(x), y: parseFloat(y) };
}

function ImagePositionPicker({ src, value, onChange }: {
    src: string;
    value: string;
    onChange: (val: string) => void;
}) {
    const posRef = useRef(parsePos(value));
    const dragRef = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
    const [displayPos, setDisplayPos] = useState(posRef.current);

    const commit = useCallback((x: number, y: number) => {
        const cx = Math.max(0, Math.min(100, x));
        const cy = Math.max(0, Math.min(100, y));
        posRef.current = { x: cx, y: cy };
        setDisplayPos({ x: cx, y: cy });
        onChange(`${Math.round(cx)}% ${Math.round(cy)}%`);
    }, [onChange]);

    useEffect(() => {
        posRef.current = { x: 50, y: 50 };
        setDisplayPos({ x: 50, y: 50 });
        onChange('50% 50%');
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [src]);

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!dragRef.current) return;
            const dx = (e.clientX - dragRef.current.mx) * 0.4;
            const dy = (e.clientY - dragRef.current.my) * 0.4;
            commit(dragRef.current.px + dx, dragRef.current.py + dy);
        };
        const onUp = () => { dragRef.current = null; };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [commit]);

    return (
        <div
            className="relative h-40 w-full rounded-md overflow-hidden cursor-grab active:cursor-grabbing select-none border"
            onMouseDown={(e) => {
                e.preventDefault();
                dragRef.current = { mx: e.clientX, my: e.clientY, px: posRef.current.x, py: posRef.current.y };
            }}
        >
            <Image
                src={src}
                alt="Reframe preview"
                fill
                style={{ objectFit: 'cover', objectPosition: `${displayPos.x}% ${displayPos.y}%` }}
            />
            <div className="absolute bottom-2 left-2 text-white text-xs bg-black/50 rounded px-2 py-0.5 pointer-events-none">
                Drag to reframe
            </div>
        </div>
    );
}


export default function CourseForm({ course, onSuccess }: CourseFormProps) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: course?.title || '',
            pitch: course?.pitch || '',
            description: course?.description || '',
            hourlyRate: course?.hourlyRate ?? 0,
            discount60min: course?.discount60min ?? undefined,
            thumbnailUrl: course?.thumbnailUrl || '',
            imagePosition: course?.imagePosition ?? 'center',
        },
    });

    const onSubmit = (values: z.infer<typeof formSchema>) => {
        startTransition(async () => {
            try {
                // If we are editing, we preserve the original imageUrl (hero image)
                // If we are creating a new one, we derive it from the selected thumbnail.
                const newHeroUrl = course?.imageUrl || values.thumbnailUrl?.replace('thumb', 'hero') || 'course-hero1';
                
                const courseData = {
                    ...values,
                    thumbnailUrl: values.thumbnailUrl || 'course-thumb1',
                    imageUrl: newHeroUrl,
                    description: values.description ?? '',
                    pitch: values.pitch ?? '',
                    imagePosition: values.imagePosition ?? 'center',
                };

                let savedCourse;
                if (course) {
                    savedCourse = await updateCourse(course.id, courseData);
                } else {
                    savedCourse = await addCourse(courseData);
                }
                
                toast({
                    title: `Course ${course ? 'Updated' : 'Created'}`,
                    description: `"${savedCourse.title}" has been saved.`,
                });
                
                onSuccess(savedCourse);

            } catch (error) {
                toast({
                    title: 'Error',
                    description: `Failed to ${course ? 'update' : 'create'} course.`,
                    variant: 'destructive',
                });
            }
        });
    };
    
    const pitchValue = form.watch('pitch') || '';

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
                            <FormDescription className={cn(pitchValue.length > 100 && "text-destructive")}>
                                {`${pitchValue.length} / 100 characters`}
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
                                    placeholder="e.g., 10 for 10%" 
                                    {...field} 
                                    value={field.value ?? ''}
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
                            <div className="grid grid-cols-3 gap-4 pt-2">
                                {courseThumbnails.map((thumb) => (
                                    <div
                                        key={thumb.id}
                                        onClick={() => field.onChange(thumb.id)}
                                        className={cn(
                                            "cursor-pointer rounded-md overflow-hidden border-2 border-transparent transition-all",
                                            field.value === thumb.id && "border-primary ring-2 ring-primary ring-offset-2"
                                        )}
                                    >
                                        <Image
                                            src={thumb.imageUrl}
                                            alt={thumb.description}
                                            width={200} height={112}
                                            className="aspect-video object-cover w-full"
                                        />
                                    </div>
                                ))}
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {(() => {
                    const thumbId = form.watch('thumbnailUrl');
                    const imageUrl = thumbId?.startsWith('/')
                        ? thumbId
                        : courseThumbnails.find(t => t.id === thumbId)?.imageUrl;
                    if (!imageUrl) return null;
                    return (
                        <FormField
                            control={form.control}
                            name="imagePosition"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Reframe Image</FormLabel>
                                    <FormDescription>Drag to adjust what's visible in the card.</FormDescription>
                                    <ImagePositionPicker
                                        src={imageUrl}
                                        value={field.value || '50% 50%'}
                                        onChange={field.onChange}
                                    />
                                </FormItem>
                            )}
                        />
                    );
                })()}

                <Button type="submit" disabled={isPending} className="w-full mt-4">
                    {isPending ? <Loader2 className="animate-spin" /> : 'Save Course'}
                </Button>
            </form>
        </Form>
    );
}
