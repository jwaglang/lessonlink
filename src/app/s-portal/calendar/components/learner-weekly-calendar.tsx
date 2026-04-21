'use client';

import React, { useState } from 'react';
import type { SessionInstance } from '@/lib/types';
import {
  addDays, eachDayOfInterval, endOfWeek, format, isSameDay, parseISO, startOfWeek, subDays,
} from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cancelSessionInstance } from '@/lib/firestore';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

function getSessionDate(instance: SessionInstance): string {
  return (instance as any).lessonDate || (instance as any).date || '';
}

interface Props {
  sessionInstances: SessionInstance[];
  setSessionInstances: React.Dispatch<React.SetStateAction<SessionInstance[]>>;
  studentId: string;
}

export default function LearnerWeeklyCalendar({ sessionInstances, setSessionInstances, studentId }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedSession, setSelectedSession] = useState<SessionInstance | null>(null);
  const [cancelTarget, setCancelTarget] = useState<SessionInstance | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const { toast } = useToast();

  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  async function handleConfirmCancel() {
    if (!cancelTarget) return;
    setCancellingId(cancelTarget.id);
    try {
      const result = await cancelSessionInstance(cancelTarget.id, studentId);
      if (result.approvalRequired) {
        toast({ title: 'Approval Required', description: 'This session is within 24 hours. A cancellation request has been sent to your teacher.' });
      } else {
        setSessionInstances(prev => prev.map(s => s.id === cancelTarget.id ? { ...s, status: 'cancelled' as const } : s));
        setSelectedSession(prev => prev?.id === cancelTarget.id ? { ...prev, status: 'cancelled' as const } : prev);
        toast({ title: 'Session Cancelled', description: 'The session has been cancelled and your credit returned.' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Could not cancel session.', variant: 'destructive' });
    } finally {
      setCancellingId(null);
      setCancelTarget(null);
    }
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-headline font-semibold">{format(weekStart, 'MMM yyyy')}</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(subDays(currentDate, 7))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setCurrentDate(new Date())}>Today</Button>
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(addDays(currentDate, 7))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-t border-l">
          {days.map((day) => (
            <div key={day.toString()} className="border-b border-r p-2 h-48 overflow-y-auto">
              <p className="font-semibold text-center text-sm mb-2">{format(day, 'EEE d')}</p>
              <div className="space-y-2">
                {sessionInstances
                  .filter((instance) => {
                    const dateStr = getSessionDate(instance);
                    if (!dateStr) return false;
                    try { return isSameDay(parseISO(dateStr), day); } catch { return false; }
                  })
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .map((instance) => (
                    <motion.div
                      key={instance.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-2 rounded-lg text-xs cursor-pointer hover:shadow-md transition-shadow ${
                        instance.status === 'cancelled'
                          ? 'opacity-40 border border-dashed border-red-300'
                          : instance.status === 'completed'
                          ? 'opacity-60 border border-dashed'
                          : 'bg-white dark:bg-card-foreground/5'
                      }`}
                      onClick={() => setSelectedSession(instance)}
                    >
                      <p className="font-bold truncate">{instance.title}</p>
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

      {/* Session detail dialog */}
      <Dialog open={!!selectedSession} onOpenChange={(open) => { if (!open) setSelectedSession(null); }}>
        <DialogContent>
          {selectedSession && (
            <>
              <DialogHeader>
                <DialogTitle className="font-headline text-2xl">{selectedSession.title || 'Session'}</DialogTitle>
                <DialogDescription>
                  {(() => {
                    const dateStr = getSessionDate(selectedSession);
                    if (!dateStr) return `${selectedSession.startTime} – ${selectedSession.endTime}`;
                    try {
                      return `${format(parseISO(dateStr), 'eeee, MMMM d, yyyy')} · ${selectedSession.startTime} – ${selectedSession.endTime}`;
                    } catch {
                      return `${selectedSession.startTime} – ${selectedSession.endTime}`;
                    }
                  })()}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Duration</p>
                    <p className="font-medium">{selectedSession.durationHours} hour(s)</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <p className={`font-medium capitalize ${
                      selectedSession.status === 'completed' ? 'text-green-600' :
                      selectedSession.status === 'cancelled' ? 'text-red-500' : ''
                    }`}>
                      {selectedSession.status}
                    </p>
                  </div>
                </div>

                {selectedSession.status === 'scheduled' && (
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => { setCancelTarget(selectedSession); setSelectedSession(null); }}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel Session
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel confirmation */}
      <AlertDialog open={!!cancelTarget} onOpenChange={(open) => { if (!open) setCancelTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this session?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {cancelTarget && (() => {
                  const scheduledAt = new Date(`${getSessionDate(cancelTarget)}T${cancelTarget.startTime}:00`);
                  const hoursUntil = (scheduledAt.getTime() - Date.now()) / (1000 * 60 * 60);
                  return hoursUntil < 24 ? (
                    <span className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      <span>This session is within 24 hours. Cancellation will require your teacher&apos;s approval and won&apos;t take effect immediately.</span>
                    </span>
                  ) : (
                    <span>This will cancel the session and return the credit to your account. This cannot be undone.</span>
                  );
                })()}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!cancellingId}>Keep Session</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              disabled={!!cancellingId}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancellingId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Cancel Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
