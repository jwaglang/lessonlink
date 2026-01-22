
'use client';

import type { CourseTemplate } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Edit, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { calculateLessonPrice } from '@/lib/types';

interface CourseCardProps {
    template: CourseTemplate;
    onEdit: (template: CourseTemplate) => void;
    onDelete: (id: string) => void;
}

export default function CourseCard({ template, onEdit, onDelete }: CourseCardProps) {
    const thumbnailUrl = PlaceHolderImages.find(p => p.id === template.thumbnailUrl)?.imageUrl || 'https://placehold.co/400x225';
    
    const currencySymbol = '$';

    const price30min = calculateLessonPrice(template.hourlyRate, 30);
    const price60min = calculateLessonPrice(template.hourlyRate, 60, template.discount60min);

    return (
        <Card className="flex flex-col overflow-hidden">
            <CardHeader className="p-0">
                <div className="relative h-40 w-full">
                    <Image src={thumbnailUrl} alt={template.title} layout="fill" objectFit="cover" />
                    <div className="absolute top-2 right-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="secondary" size="icon" className="h-8 w-8 bg-white/80 hover:bg-white dark:bg-black/80 dark:hover:bg-black">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onEdit(template)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onDelete(template.id)} className="text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                <div className="p-6 pb-2">
                    <CardTitle className="font-headline text-xl mb-2">{template.title}</CardTitle>
                    <CardDescription>{template.pitch}</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="flex-grow p-6 pt-2">
                <p className="mt-4 text-sm text-muted-foreground whitespace-pre-line">{template.description}</p>
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
                        {template.discount60min && template.discount60min > 0 && (
                             <Badge variant="secondary" className="text-xs">{template.discount60min}% off!</Badge>
                        )}
                    </div>
                    <p className="text-lg font-bold font-headline">{currencySymbol}{price60min.toFixed(2)}</p>
                </div>
            </CardFooter>
        </Card>
    );
}
