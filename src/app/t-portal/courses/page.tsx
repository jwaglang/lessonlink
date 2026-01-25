
'use client';

import { useState, useEffect } from 'react';
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from 'lucide-react';
import { onCoursesUpdate, deleteCourse } from '@/lib/firestore';
import type { Course } from '@/lib/types';
import CourseList from './components/course-list';
import CourseForm from './components/course-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

export default function CoursesPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        let unsubscribe: () => void;
        let timeoutId: NodeJS.Timeout;

        if (!isDialogOpen) {
            // Wait 500ms AFTER dialog closes before re-attaching listener
            timeoutId = setTimeout(() => {
                unsubscribe = onCoursesUpdate((data) => {
                    setCourses(data);
                });
            }, 500);
        }

        return () => {
            clearTimeout(timeoutId);
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [isDialogOpen]);

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
            toast({ title: 'Success', description: 'Course deleted.' });
        } catch (error) {
            toast({ title: 'Error', description: 'Could not delete course.', variant: 'destructive' });
        }
    };
    
    const handleFormSuccess = (savedCourse: Course) => {
        setIsDialogOpen(false);
        
        // CRITICAL FIX: Force cleanup of body pointer-events
        // Radix Dialog sets pointer-events: none on body but fails to cleanup
        setTimeout(() => {
            document.body.style.pointerEvents = '';
        }, 500);
    };

    return (
        <div className="flex flex-col gap-8 p-4 md:p-8">
            <PageHeader
                title="Courses & Packages"
                description="Create and manage your course templates. Packages are automatically generated."
            >
                <Button onClick={handleAddClick}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    <span>Add Course</span>
                </Button>
            </PageHeader>
            
            <CourseList 
                courses={courses} 
                onEdit={handleEditClick}
                onDelete={handleDelete}
            />

            <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) {
                    setTimeout(() => {
                        document.body.style.pointerEvents = '';
                    }, 500);
                }
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
