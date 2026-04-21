
'use client';

import { useState, useEffect } from 'react';
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2, RotateCcw } from 'lucide-react';
import { onCoursesUpdate, onTrashedCoursesUpdate, deleteCourse, restoreCourse } from '@/lib/firestore';
import type { Course } from '@/lib/types';
import CourseList from './components/course-list';
import CourseForm from './components/course-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';

export default function CoursesPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [trashed, setTrashed] = useState<Course[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [showTrash, setShowTrash] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        let unsubscribe: () => void;
        let timeoutId: NodeJS.Timeout;

        if (!isDialogOpen) {
            timeoutId = setTimeout(() => {
                unsubscribe = onCoursesUpdate((data) => setCourses(data));
            }, 500);
        }

        return () => {
            clearTimeout(timeoutId);
            if (unsubscribe) unsubscribe();
        };
    }, [isDialogOpen]);

    useEffect(() => {
        const unsubscribe = onTrashedCoursesUpdate((data) => setTrashed(data));
        return () => unsubscribe();
    }, []);

    const handleAddClick = () => {
        setSelectedCourse(null);
        setIsDialogOpen(true);
    };

    const handleEditClick = (course: Course) => {
        setSelectedCourse(course);
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteCourse(id);
            toast({ title: 'Moved to Trash', description: 'Course can be restored from trash.' });
        } catch {
            toast({ title: 'Error', description: 'Could not delete course.', variant: 'destructive' });
        }
    };

    const handleRestore = async (id: string, title: string) => {
        try {
            await restoreCourse(id);
            toast({ title: 'Restored', description: `"${title}" has been restored.` });
        } catch {
            toast({ title: 'Error', description: 'Could not restore course.', variant: 'destructive' });
        }
    };

    const handleFormSuccess = () => {
        setIsDialogOpen(false);
        setTimeout(() => { document.body.style.pointerEvents = ''; }, 500);
    };

    return (
        <div className="flex flex-col gap-8 p-4 md:p-8">
            <PageHeader
                title="Courses"
                description="Create and manage your course templates. Packages are automatically generated."
            >
                <div className="flex gap-2">
                    {trashed.length > 0 && (
                        <Button variant="outline" onClick={() => setShowTrash(v => !v)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Trash {showTrash ? '▲' : `(${trashed.length})`}
                        </Button>
                    )}
                    <Button onClick={handleAddClick}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Course
                    </Button>
                </div>
            </PageHeader>

            {showTrash && trashed.length > 0 && (
                <div className="rounded-lg border border-dashed border-destructive/50 bg-destructive/5 p-4 space-y-2">
                    <p className="text-sm font-medium text-destructive mb-3">Trash</p>
                    {trashed.map(c => (
                        <div key={c.id} className="flex items-center justify-between rounded-md bg-background border px-4 py-2">
                            <div>
                                <p className="text-sm font-medium">{c.title}</p>
                                {c.deletedAt && (
                                    <p className="text-xs text-muted-foreground">
                                        Deleted {format(parseISO(c.deletedAt), 'MMM d, yyyy')}
                                    </p>
                                )}
                            </div>
                            <Button size="sm" variant="outline" onClick={() => handleRestore(c.id, c.title)}>
                                <RotateCcw className="mr-2 h-3 w-3" /> Restore
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            <CourseList
                courses={courses}
                onEdit={handleEditClick}
                onDelete={handleDelete}
            />

            <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) setTimeout(() => { document.body.style.pointerEvents = ''; }, 500);
            }}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{selectedCourse ? 'Edit' : 'Add'} Course</DialogTitle>
                    </DialogHeader>
                    <CourseForm
                        course={selectedCourse}
                        onSuccess={handleFormSuccess}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
