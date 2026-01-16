'use client';

import { useState, useEffect } from 'react';
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from 'lucide-react';
import { getCourseTemplates, addCourseTemplate, updateCourseTemplate, deleteCourseTemplate } from '@/lib/firestore';
import type { CourseTemplate } from '@/lib/types';
import CourseList from './components/course-list';
import CourseForm from './components/course-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

export default function CoursesPage() {
    const [templates, setTemplates] = useState<CourseTemplate[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<CourseTemplate | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        const fetchTemplates = async () => {
            const data = await getCourseTemplates();
            setTemplates(data);
        };
        fetchTemplates();
    }, []);

    const handleAddClick = () => {
        setSelectedTemplate(null);
        setIsDialogOpen(true);
    };

    const handleEditClick = (template: CourseTemplate) => {
        setSelectedTemplate(template);
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteCourseTemplate(id);
            setTemplates(prev => prev.filter(t => t.id !== id));
            toast({ title: 'Success', description: 'Course template deleted.' });
        } catch (error) {
            toast({ title: 'Error', description: 'Could not delete template.', variant: 'destructive' });
        }
    };
    
    const handleFormSuccess = (template: CourseTemplate) => {
        if (selectedTemplate) {
            // Update
            setTemplates(prev => prev.map(t => t.id === template.id ? template : t));
        } else {
            // Add
            setTemplates(prev => [template, ...prev]);
        }
        setIsDialogOpen(false);
    };

    return (
        <div className="flex flex-col gap-8 p-4 md:p-8">
            <PageHeader
                title="Courses & Packages"
                description="Create and manage your course templates. Packages are automatically generated."
            >
                <Button onClick={handleAddClick}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    <span>Add Course Template</span>
                </Button>
            </PageHeader>
            
            <CourseList 
                templates={templates} 
                onEdit={handleEditClick}
                onDelete={handleDelete}
            />

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{selectedTemplate ? 'Edit' : 'Add'} Course Template</DialogTitle>
                    </DialogHeader>
                    <CourseForm 
                        courseTemplate={selectedTemplate}
                        onSuccess={handleFormSuccess}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
