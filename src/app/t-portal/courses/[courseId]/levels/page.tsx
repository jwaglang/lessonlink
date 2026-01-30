'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, ArrowLeft, Edit, Trash2, MoreVertical } from 'lucide-react';
import Link from 'next/link';
import { onLevelsUpdate, getCourseById, deleteLevel } from '@/lib/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import LevelForm from './components/level-form';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

export default function LevelsPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const courseId = params.courseId as string;
    
    const [levels, setLevels] = useState<any[]>([]);
    const [courseName, setCourseName] = useState('Loading...');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedLevel, setSelectedLevel] = useState<any>(null);

    useEffect(() => {
        // Fetch course name
        getCourseById(courseId).then(course => {
            if (course) {
                setCourseName(course.title);
            }
        });

        // Set up real-time listener for levels
        const unsubscribe = onLevelsUpdate(courseId, (data) => {
            setLevels(data);
        });

        return () => unsubscribe();
    }, [courseId]);

    const handleAddClick = () => {
        setSelectedLevel(null);
        setIsDialogOpen(true);
    };

    const handleEditClick = (level: any) => {
        setSelectedLevel(level);
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this level? This will also delete all units and sessions within it. This action cannot be undone.')) {
            try {
                await deleteLevel(id);
                toast({ title: 'Success', description: 'Level deleted successfully.' });
            } catch (error) {
                toast({ title: 'Error', description: 'Failed to delete level.', variant: 'destructive' });
            }
        }
    };

    const handleFormSuccess = () => {
        setIsDialogOpen(false);
        setTimeout(() => {
            document.body.style.pointerEvents = '';
        }, 500);
    };

    const handleCardClick = (levelId: string) => {
        router.push(`/t-portal/courses/${courseId}/levels/${levelId}/units`);
    };

    return (
        <div className="flex flex-col gap-8 p-4 md:p-8">
            <div className="flex items-center gap-4">
                <Link href="/t-portal/courses">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <PageHeader
                    title={courseName}
                    description="Manage proficiency levels for this course. Each level contains multiple units."
                >
                    <Button onClick={handleAddClick}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        <span>Add Level</span>
                    </Button>
                </PageHeader>
            </div>

            {levels.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-12 text-center">
                    <h3 className="text-xl font-semibold">No Levels Yet</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Click "Add Level" to create your first proficiency level (e.g., A1, A2, B1).
                    </p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {levels.map(level => (
                        <Card 
                            key={level.id} 
                            className="flex flex-col cursor-pointer hover:shadow-lg transition-shadow"
                            onClick={() => handleCardClick(level.id)}
                        >
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <CardTitle className="font-headline text-lg mb-2">{level.title}</CardTitle>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 -mt-2 -mr-2">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditClick(level); }}>
                                                <Edit className="mr-2 h-4 w-4" />
                                                Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDelete(level.id); }} className="text-destructive">
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <p className="text-sm text-muted-foreground line-clamp-3">
                                    {level.description}
                                </p>
                            </CardContent>
                            <CardFooter className="text-xs text-muted-foreground bg-muted/50 p-3 mt-auto">
                                Order: {level.order} • Target: {level.targetHours || 60}h
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) {
                    setTimeout(() => {
                        document.body.style.pointerEvents = '';
                    }, 500);
                }
            }}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{selectedLevel ? 'Edit' : 'Add'} Level</DialogTitle>
                    </DialogHeader>
                    <LevelForm 
                        courseId={courseId}
                        level={selectedLevel}
                        onSuccess={handleFormSuccess}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}