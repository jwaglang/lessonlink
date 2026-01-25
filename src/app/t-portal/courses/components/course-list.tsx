
'use client';

import type { Course } from '@/lib/types';
import CourseCard from './course-card';

interface CourseListProps {
    courses: Course[];
    onEdit: (course: Course) => void;
    onDelete: (id: string) => void;
}

export default function CourseList({ courses, onEdit, onDelete }: CourseListProps) {
    if (courses.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-12 text-center">
                <h3 className="text-xl font-semibold">No Courses Yet</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                    Click "Add Course" to create your first course.
                </p>
            </div>
        );
    }

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courses.map(course => (
                <CourseCard 
                    key={course.id} 
                    course={course} 
                    onEdit={onEdit} 
                    onDelete={onDelete} 
                />
            ))}
        </div>
    );
}
