'use client';

import type { CourseTemplate } from '@/lib/types';
import CourseCard from './course-card';

interface CourseListProps {
    templates: CourseTemplate[];
    onEdit: (template: CourseTemplate) => void;
    onDelete: (id: string) => void;
}

export default function CourseList({ templates, onEdit, onDelete }: CourseListProps) {
    if (templates.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-12 text-center">
                <h3 className="text-xl font-semibold">No Courses Yet</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                    Click "Add Course Template" to create your first course.
                </p>
            </div>
        );
    }

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {templates.map(template => (
                <CourseCard 
                    key={template.id} 
                    template={template} 
                    onEdit={onEdit} 
                    onDelete={onDelete} 
                />
            ))}
        </div>
    );
}
