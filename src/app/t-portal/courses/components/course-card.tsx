
'use client';

import { useState } from 'react';
import type { Course } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Edit, Trash2, ChevronDown, ChevronUp, ListOrdered } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { calculateLessonPrice } from '@/lib/types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface CourseCardProps {
    course: Course;
    onEdit: (course: Course) => void;
    onDelete: (id: string) => void;
}

export default function CourseCard({ course, onEdit, onDelete }: CourseCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const thumbnailUrl = PlaceHolderImages.find(p => p.id === course.thumbnailUrl)?.imageUrl || 'https://placehold.co/400x225';
    
    const currencySymbol = '$';

    const price30min = calculateLessonPrice(course.hourlyRate, 30);
    const price60min = calculateLessonPrice(course.hourlyRate, 60, course.discount60min);

    // Split description into first paragraph and the rest
    const description = course.description || '';
    const paraBreak = description.indexOf('\n\n');
    const firstParagraph = paraBreak === -1 ? description : description.substring(0, paraBreak);
    const restOfDescription = paraBreak === -1 ? null : description.substring(paraBreak).trim();


    return (
        <Card className="flex flex-col overflow-hidden">
            <CardHeader className="p-0">
                <div className="relative h-40 w-full">
                    <Image src={thumbnailUrl} alt={course.title} layout="fill" objectFit="cover" />
                    <div className="absolute top-2 right-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="secondary" size="icon" className="h-8 w-8 bg-white/80 hover:bg-white dark:bg-black/80 dark:hover:bg-black">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onEdit(course)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onDelete(course.id)} className="text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                <div className="p-6 pb-2">
                    <CardTitle className="font-headline text-xl mb-2">{course.title}</CardTitle>
                    <CardDescription>{course.pitch}</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="flex-grow p-6 pt-2">
                 <div className="mt-4 text-sm text-muted-foreground whitespace-pre-line">
                    <p>{firstParagraph}</p>
                    
                    {restOfDescription && (
                        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                            <CollapsibleContent>
                                <p className="mt-4">{restOfDescription}</p>
                            </CollapsibleContent>
                            <CollapsibleTrigger asChild>
                                <Button variant="link" className="p-0 h-auto text-sm mt-2 flex items-center">
                                    <span>{isExpanded ? 'Read less' : 'Read more'}</span>
                                    {isExpanded ? <ChevronUp className="ml-1" /> : <ChevronDown className="ml-1" />}
                                </Button>
                            </CollapsibleTrigger>
                        </Collapsible>
                    )}
                </div>
            </CardContent>
            <CardFooter className="flex-col items-start bg-muted/50 p-4 space-y-2">
                <div className="flex justify-between w-full items-center">
                    <p className='font-medium'>30 min lesson</p>
                    <p className="text-lg font-bold font-headline">{currencySymbol}{price30min.toFixed(2)}</p>
                </div>
                <Separator/>
                <div className="flex justify-between w-full items-center">
                    <div>
                        <p className='font-medium'>60 min lesson</p>
                        {course.discount60min && course.discount60min > 0 && (
                             <Badge variant="secondary" className="text-xs">{course.discount60min}% off!</Badge>
                        )}
                    </div>
                    <p className="text-lg font-bold font-headline">{currencySymbol}{price60min.toFixed(2)}</p>
                </div>
            </CardFooter>
        </Card>
    );
}
