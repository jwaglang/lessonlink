'use client';

import React, { useState } from 'react';
import type { SessionInstance, Student } from '@/lib/types';
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
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateSessionInstanceStatus, completeSession } from '@/lib/firestore';
import { useToast } from '@/hooks/use-toast';
import { PlaceHolderImages } from '@/lib/placeholder-images';

type SessionInstanceWithStudent = SessionInstance & { student?: Student };

// Helper to get lessonDate from SessionInstance (handles legacy `date` field)
function getSessionDate(instance: SessionInstance): string {
  return (instance as any).lessonDate || (instance as any).date || '';
}

export default function WeeklyCalendar({
  sessionInstances,
  setSessionInstances,
  students,
}: {
  sessionInstances: SessionInstance[];
  setSessionInstances: React.Dispatch<React.SetStateAction<SessionInstance[]>>;
  students: Student[];
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedSession, setSelectedSession] = useState<SessionInstanceWithStudent | null>(null);
  const [completingSessionId, setCompletingSessionId] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const { toast } = useToast();

  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const sessionsWithStudents: SessionInstanceWithStudent[] = sessionInstances.map((instance) => ({
    ...instance,
    student: students.find((s) => s.id === instance.studentId),
  }));

  const handleStatusChange = async (newStatus: SessionInstance['status']) => {
    if (!selectedSession) return;
    
    setUpdatingStatus(true);
    try {
      await updateSessionInstanceStatus(selectedSession.id, newStatus);
      
      const updatedData = { 
        status: newStatus,
        ...(newStatus === 'completed' ? { completedAt: new Date().toISOString() } : {})
      };
      
      setSessionInstances(prev => 
        prev.map(s => s.id === selectedSession.id ? { ...s, ...updatedData } : s)
      );
      setSelectedSession(prev => prev ? { ...prev, ...updatedData } : null);
      
      toast({ title: 'Success', description: 'Session status updated.' });
    } catch (e: any) {
      console.error('Status update error:', e);
      toast({ 
        title: 'Error', 
        description: e.message || 'Could not update status.', 
        variant: 'destructive' 
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  async function handleMarkComplete(sessionId: string) {
    if (!sessionId) return;
    setCompletingSessionId(sessionId);
    
    try {
      await completeSession(sessionId);

      const updatedState = { 
        status: 'completed' as const, 
        completedAt: new Date().toISOString() 
      };
      
      setSessionInstances(prev => 
        prev.map(s => s.id === sessionId ? { ...s, ...updatedState } : s)
      );
      setSelectedSession(prev => 
        prev?.id === sessionId ? { ...prev, ...updatedState } : prev
      );
      
      toast({ title: 'Success', description: 'Session marked as complete.' });
    } catch (err: any) {
      console.error('[handleMarkComplete]', err);
      toast({
        title: 'Error Completing Session',
        description: err.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setCompletingSessionId(null);
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
                {sessionsWithStudents
                  .filter((instance) => {
                    const dateStr = getSessionDate(instance);
                    if (!dateStr) return false;
                    try {
                      return isSameDay(parseISO(dateStr), day);
                    } catch {
                      return false;
                    }
                  })
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .map((instance) => (
                    <motion.div
                      key={instance.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={`p-2 rounded-lg text-xs cursor-pointer hover:shadow-md transition-shadow ${
                        instance.status === 'completed'
                          ? 'opacity-60 border border-dashed'
                          : 'bg-white dark:bg-card-foreground/5'
                      }`}
                      onClick={() => setSelectedSession(instance)}
                    >
                      <p className="font-bold truncate">{instance.student?.name}</p>
                      <p className="text-muted-foreground truncate">{instance.title}</p>
                      <p className="text-muted-foreground">{instance.startTime}</p>
                      {instance.status === 'completed' && (
                        <p className="text-[10px] mt-1 font-semibold text-muted-foreground">Completed</p>
                      )}
                      {instance.status === 'cancelled' && (
                        <p className="text-[10px] mt-1 font-semibold text-red-500">Cancelled</p>
                      )}
                    </motion.div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <Dialog open={!!selectedSession} onOpenChange={(isOpen) => !isOpen && setSelectedSession(null)}>
        <DialogContent>
          {selectedSession && (
            <>
              <DialogHeader>
                <DialogTitle className="font-headline text-2xl">
                  {selectedSession.title || 'Session'}
                </DialogTitle>
                <DialogDescription>
                  {(() => {
                    const dateStr = getSessionDate(selectedSession);
                    if (!dateStr) return `${selectedSession.startTime} to ${selectedSession.endTime}`;
                    try {
                      return `${format(parseISO(dateStr), 'eeee, MMMM d, yyyy')} from ${selectedSession.startTime} to ${selectedSession.endTime}`;
                    } catch {
                      return `${selectedSession.startTime} to ${selectedSession.endTime}`;
                    }
                  })()}
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-4 space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage 
                      src={PlaceHolderImages.find(i => i.id === `student${selectedSession.student?.id}`)?.imageUrl} 
                      data-ai-hint={PlaceHolderImages.find(i => i.id === `student${selectedSession.student?.id}`)?.imageHint}
                    />
                    <AvatarFallback>
                      {selectedSession.student?.name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold text-lg">{selectedSession.student?.name || 'Unknown Student'}</p>
                    <p className="text-muted-foreground">{selectedSession.student?.email}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Duration</p>
                    <p className="font-medium">{selectedSession.durationHours} hour(s)</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Billing</p>
                    <p className="font-medium capitalize">{selectedSession.billingType}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Session Status</h4>
                  <Select 
                    value={selectedSession.status} 
                    onValueChange={handleStatusChange}
                    disabled={updatingStatus}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Set status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="rescheduled">Rescheduled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="default"
                  disabled={selectedSession.status === 'completed' || !!completingSessionId}
                  onClick={() => handleMarkComplete(selectedSession.id)}
                >
                  {completingSessionId === selectedSession.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Completing...
                    </>
                  ) : (
                    'Mark Complete'
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
