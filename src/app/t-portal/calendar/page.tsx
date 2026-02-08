'use client';

import { useState, useEffect } from 'react';
import PageHeader from "@/components/page-header";
import WeeklyCalendar from "./components/weekly-calendar";
import { 
  getSessionInstancesByTeacherUid, 
  getStudents, 
  getAvailability, 
  getCourses 
} from "@/lib/firestore";
import type { SessionInstance, Student, Availability, Course } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import BookSessionForm from './components/book-session-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AvailabilityCalendar from './components/availability-calendar';
import { useAuth } from '@/components/auth-provider';

export default function CalendarPage() {
    const { user } = useAuth();
    const [sessionInstances, setSessionInstances] = useState<SessionInstance[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [availability, setAvailability] = useState<Availability[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<{ date: Date; time: string } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!user?.uid) return;
            
            try {
                const [instanceData, studentData, availabilityData, courseData] = await Promise.all([
                    getSessionInstancesByTeacherUid(user.uid),
                    getStudents(),
                    getAvailability(),
                    getCourses(),
                ]);
                
                setSessionInstances(instanceData);
                setStudents(studentData);
                setAvailability(availabilityData);
                setCourses(courseData);
            } catch (error) {
                console.error('Error fetching calendar data:', error);
            } finally {
                setLoading(false);
            }
        };
        
        fetchData();
    }, [user?.uid]);

    const handleSessionBooked = (newSession: SessionInstance) => {
        setSessionInstances(prev => [...prev, newSession]);
        setIsDialogOpen(false);
    };

    const handleSlotDoubleClick = (date: Date, time: string) => {
        setSelectedSlot({ date, time });
        setIsDialogOpen(true);
    };

    if (loading) {
        return (
            <div className="flex flex-col gap-8 p-4 md:p-8">
                <PageHeader 
                    title="Calendar"
                    description="Manage your sessions and set your availability."
                />
                <div className="flex items-center justify-center h-64">
                    <p className="text-muted-foreground">Loading calendar...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8 p-4 md:p-8">
            <PageHeader 
                title="Calendar"
                description="Manage your sessions and set your availability."
            />
            <Tabs defaultValue="sessions">
                <TabsList className='mb-4'>
                    <TabsTrigger value="sessions">Session Calendar</TabsTrigger>
                    <TabsTrigger value="availability">Set Availability</TabsTrigger>
                </TabsList>
                <TabsContent value="sessions">
                    <WeeklyCalendar 
                        sessionInstances={sessionInstances} 
                        setSessionInstances={setSessionInstances} 
                        students={students} 
                    />
                </TabsContent>
                <TabsContent value="availability">
                    <AvailabilityCalendar 
                        initialAvailability={availability}
                        sessionInstances={sessionInstances}
                        onSlotDoubleClick={handleSlotDoubleClick}
                    />
                </TabsContent>
            </Tabs>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Book a New Session</DialogTitle>
                    </DialogHeader>
                    {selectedSlot && user?.uid && (
                        <BookSessionForm 
                            students={students}
                            courses={courses}
                            teacherUid={user.uid}
                            onSuccess={handleSessionBooked} 
                            selectedDate={selectedSlot.date}
                            selectedTime={selectedSlot.time}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
