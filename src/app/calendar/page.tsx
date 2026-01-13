'use client';

import { useState, useEffect } from 'react';
import PageHeader from "@/components/page-header";
import WeeklyCalendar from "./components/weekly-calendar";
import { getLessons, getStudents } from "@/lib/data";
import type { Lesson, Student } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import BookLessonForm from './components/book-lesson-form';

export default function CalendarPage() {
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            const lessonData = await getLessons();
            const studentData = await getStudents();
            setLessons(lessonData);
            setStudents(studentData);
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
                title="Lesson Calendar"
                description="View and manage your scheduled lessons."
            >
                <Button onClick={() => setIsSheetOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    <span>Book Lesson</span>
                </Button>
            </PageHeader>
            <WeeklyCalendar lessons={lessons} setLessons={setLessons} students={students} />
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
