'use client';

import { useState, useEffect } from 'react';
import PageHeader from "@/components/page-header";
import WeeklyCalendar from "./components/weekly-calendar";
import { getLessons, getStudents, getAvailability, getCourseTemplates } from "@/lib/firestore";
import type { Lesson, Student, Availability, CourseTemplate } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import BookLessonForm from './components/book-lesson-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AvailabilityCalendar from './components/availability-calendar';

export default function CalendarPage() {
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [availability, setAvailability] = useState<Availability[]>([]);
    const [courseTemplates, setCourseTemplates] = useState<CourseTemplate[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<{ date: Date; time: string } | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            const lessonData = await getLessons();
            const studentData = await getStudents();
            const availabilityData = await getAvailability();
            const courseTemplateData = await getCourseTemplates();
            setLessons(lessonData);
            setStudents(studentData);
            setAvailability(availabilityData);
            setCourseTemplates(courseTemplateData);
        };
        fetchData();
    }, []);

    const handleLessonBooked = (newLesson: Lesson) => {
        setLessons(prev => [...prev, newLesson]);
        setIsDialogOpen(false);
    };

    const handleSlotDoubleClick = (date: Date, time: string) => {
        setSelectedSlot({ date, time });
        setIsDialogOpen(true);
    };

    return (
        <div className="flex flex-col gap-8 p-4 md:p-8">
            <PageHeader 
                title="Calendar"
                description="Manage your lessons and set your availability."
            />
            <Tabs defaultValue="lessons">
                <TabsList className='mb-4'>
                    <TabsTrigger value="lessons">Lesson Calendar</TabsTrigger>
                    <TabsTrigger value="availability">Set Availability</TabsTrigger>
                </TabsList>
                <TabsContent value="lessons">
                    <WeeklyCalendar lessons={lessons} setLessons={setLessons} students={students} />
                </TabsContent>
                <TabsContent value="availability">
                    <AvailabilityCalendar 
                        initialAvailability={availability}
                        lessons={lessons}
                        onSlotDoubleClick={handleSlotDoubleClick}
                    />
                </TabsContent>
            </Tabs>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Book a New Lesson</DialogTitle>
                    </DialogHeader>
                    {selectedSlot && (
                        <BookLessonForm 
                            students={students}
                            courseTemplates={courseTemplates}
                            onSuccess={handleLessonBooked} 
                            selectedDate={selectedSlot.date}
                            selectedTime={selectedSlot.time}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
