'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import ScheduleTemplateModal from '@/components/schedule-template-modal';
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
import { Button } from '@/components/ui/button';
import BookSessionForm from './components/book-session-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AvailabilityCalendar from './components/availability-calendar';
import { useAuth } from '@/components/auth-provider';
import { Calendar, Copy, Check, CalendarPlus } from 'lucide-react';

export default function CalendarPage() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const tabParam = searchParams.get('tab');
    // Map sidebar param to tab value: schedule→sessions, availability→availability
    const defaultTab = tabParam === 'availability' ? 'availability' : 'sessions';

    const [sessionInstances, setSessionInstances] = useState<SessionInstance[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [availability, setAvailability] = useState<Availability[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<{ date: Date; time: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [templateModalOpen, setTemplateModalOpen] = useState(false);

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

    const handleCopyICalLink = async () => {
        if (!user?.uid) return;
        const icalUrl = `${window.location.origin}/api/calendar/ical/tutor?teacherUid=${user.uid}`;
        await navigator.clipboard.writeText(icalUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 500);
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
            <Tabs defaultValue={defaultTab} key={defaultTab}>
                <div className="flex items-center justify-between mb-4">
                    <TabsList>
                        <TabsTrigger value="sessions">Schedule</TabsTrigger>
                        <TabsTrigger value="availability">Availability</TabsTrigger>
                    </TabsList>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTemplateModalOpen(true)}
                        className="gap-2"
                    >
                        <CalendarPlus className="h-4 w-4" />
                        Schedule Template
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyICalLink}
                        className="gap-2"
                    >
                        {copied ? <Check className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
                        {copied ? 'Copied' : 'Calendar Sync'}
                    </Button>
                </div>
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
            {user?.uid && (
                <ScheduleTemplateModal
                    open={templateModalOpen}
                    onOpenChange={setTemplateModalOpen}
                    ownerId={user.uid}
                    ownerType="teacher"
                    onApplied={() => {
                        getAvailability().then(setAvailability);
                    }}
                />
            )}
        </div>
    );
}
