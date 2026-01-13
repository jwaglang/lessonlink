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

interface CourseCardProps {
    template: CourseTemplate;
    onEdit: (template: CourseTemplate) => void;
    onDelete: (id: string) => void;
}

export default function CourseCard({ template, onEdit, onDelete }: CourseCardProps) {
    const thumbnailUrl = PlaceHolderImages.find(p => p.id === template.thumbnailUrl)?.imageUrl || 'https://placehold.co/400x225';
    
    // In a real app, this would come from user settings
    const currencySymbol = '$';

    const package5Price = template.rate * 5 * 0.9; // 10% discount
    const package10Price = template.rate * 10 * 0.85; // 15% discount

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
                <div className="flex items-center gap-2">
                    <Badge variant="outline">{template.duration} min</Badge>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">{template.description}</p>
            </CardContent>
            <CardFooter className="flex-col items-start bg-muted/50 p-4">
                <div className="flex justify-between w-full items-center">
                    <p className='font-semibold'>Single Lesson</p>
                    <p className="text-lg font-bold font-headline">{currencySymbol}{template.rate.toFixed(2)}</p>
                </div>
                <Separator className="my-2" />
                 <div className="w-full space-y-1 text-sm">
                    <p className="font-semibold text-muted-foreground">Packages:</p>
                    <div className="flex justify-between w-full items-center">
                        <div>
                            <p>5 Lessons <Badge variant="secondary" className='ml-1'>10% off</Badge></p>
                        </div>
                        <p className="font-semibold">{currencySymbol}{package5Price.toFixed(2)}</p>
                    </div>
                    <div className="flex justify-between w-full items-center">
                        <div>
                             <p>10 Lessons <Badge variant="secondary" className='ml-1'>15% off</Badge></p>
                        </div>
                        <p className="font-semibold">{currencySymbol}{package10Price.toFixed(2)}</p>
                    </div>
                 </div>
            </CardFooter>
        </Card>
    );
}
