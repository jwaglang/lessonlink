'use client';

import { useState } from 'react';
import type { Lesson, Student } from '@/lib/types';
import {
  addDays,
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  parseISO,
  startOfWeek,
  subDays,
} from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Edit, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { AnimatePresence, motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateLessonStatus } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { PlaceHolderImages } from '@/lib/placeholder-images';

type LessonWithStudent = Lesson & { student?: Student };

export default function WeeklyCalendar({
  lessons: initialLessons,
  students,
}: {
  lessons: Lesson[];
  students: Student[];
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [lessons, setLessons] = useState(initialLessons);
  const [selectedLesson, setSelectedLesson] = useState<LessonWithStudent | null>(null);
  const { toast } = useToast();

  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const lessonsWithStudents = lessons.map((lesson) => ({
    ...lesson,
    student: students.find((s) => s.id === lesson.studentId),
  }));

  const handleLessonStatusChange = async (newStatus: Lesson['status']) => {
    if (!selectedLesson) return;
    try {
        const updatedLesson = await updateLessonStatus(selectedLesson.id, newStatus);
        setLessons(prev => prev.map(l => l.id === updatedLesson.id ? updatedLesson : l));
        setSelectedLesson(l => l ? {...l, status: newStatus} : null);
        toast({ title: 'Success', description: 'Lesson status updated.' });
    } catch(e) {
        toast({ title: 'Error', description: 'Could not update status.', variant: 'destructive' });
    }
  }


  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-headline font-semibold">
            {format(weekStart, 'MMM yyyy')}
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(subDays(currentDate, 7))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setCurrentDate(new Date())}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(addDays(currentDate, 7))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-t border-l">
          {days.map((day) => (
            <div key={day.toString()} className="border-b border-r p-2 h-48 overflow-y-auto">
              <p className="font-semibold text-center text-sm mb-2">{format(day, 'EEE d')}</p>
              <div className="space-y-2">
                {lessonsWithStudents
                  .filter((lesson) => isSameDay(parseISO(lesson.date), day))
                  .sort((a,b) => a.startTime.localeCompare(b.startTime))
                  .map((lesson) => (
                    <motion.div
                      key={lesson.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-2 rounded-lg text-xs cursor-pointer bg-white dark:bg-card-foreground/5 hover:shadow-md transition-shadow"
                      onClick={() => setSelectedLesson(lesson)}
                    >
                      <p className="font-bold truncate">{lesson.student?.name}</p>
                      <p className="text-muted-foreground truncate">{lesson.title}</p>
                      <p className="text-muted-foreground">{lesson.startTime}</p>
                    </motion.div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <Dialog open={!!selectedLesson} onOpenChange={(isOpen) => !isOpen && setSelectedLesson(null)}>
        <DialogContent>
            {selectedLesson && (
                <>
                <DialogHeader>
                    <DialogTitle className="font-headline text-2xl">{selectedLesson.title}</DialogTitle>
                    <DialogDescription>
                        {format(parseISO(selectedLesson.date), 'eeee, MMMM d, yyyy')} from {selectedLesson.startTime} to {selectedLesson.endTime}
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                            <AvatarImage src={PlaceHolderImages.find(i => i.id === `student${selectedLesson.student?.id}`)?.imageUrl} data-ai-hint={PlaceHolderImages.find(i => i.id === `student${selectedLesson.student?.id}`)?.imageHint}/>
                            <AvatarFallback>{selectedLesson.student?.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-bold text-lg">{selectedLesson.student?.name}</p>
                            <p className="text-muted-foreground">{selectedLesson.student?.email}</p>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2">Payment Status</h4>
                        <Select value={selectedLesson.status} onValueChange={handleLessonStatusChange}>
                            <SelectTrigger>
                                <SelectValue placeholder="Set status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="scheduled">Scheduled</SelectItem>
                                <SelectItem value="paid">Paid</SelectItem>
                                <SelectItem value="unpaid">Unpaid</