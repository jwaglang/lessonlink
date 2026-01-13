'use client';

import { useState, useEffect } from 'react';
import PageHeader from "@/components/page-header";
import WeeklyCalendar from "./components/weekly-calendar";
import { getLessons, getStudents, getAvailability } from "@/lib/data";
import type { Lesson, Student, Availability } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import BookLessonForm from './components/book-lesson-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AvailabilityCalendar from './components/availability-calendar';

export default function CalendarPage() {
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [availability, setAvailability] = useState<Availability[]>([]);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            const lessonData = await getLessons();
            const studentData = await getStudents();
            const availabilityData = await getAvailability();
            setLessons(lessonData);
            setStudents(studentData);
            setAvailability(availabilityData);
        };
        fetchData();
    }, []);

    const handleLessonBooked = (newLesson: Lesson) => {
        setLessons(prev => [...prev, newLesson]);
        setIsSheetOpen(false);
    };

    return (
        <div className="flex flex-col gap-8 p-4 md:p-8">
            <PageHeader 
                title="Calendar"
                description="Manage your lessons and set your availability."
            >
                <Button onClick={() => setIsSheetOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    <span>Book Lesson</span>
                </Button>
            </PageHeader>
            <Tabs defaultValue="lessons">
                <TabsList className='mb-4'>
                    <TabsTrigger value="lessons">Lesson Calendar</TabsTrigger>
                    <TabsTrigger value="availability">Set Availability</TabsTrigger>
                </TabsList>
                <TabsContent value="lessons">
                    <WeeklyCalendar lessons={lessons} setLessons={setLessons} students={students} />
                </TabsContent>
                <TabsContent value="availability">
                    <AvailabilityCalendar initialAvailability={availability} />
                </TabsContent>
            </Tabs>
            
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>Book a New Lesson</SheetTitle>
                    </SheetHeader>
                    <BookLessonForm students={students} onSuccess={handleLessonBooked} />
                </SheetContent>
            </Sheet>
        </div>
    );
}
