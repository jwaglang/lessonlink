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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ChevronLeft, ChevronRight, Loader2, Sparkles, CheckCircle, Send } from 'lucide-react';
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
import { updateSessionInstanceStatus, completeSession, createSessionFeedback, getSessionFeedbackByInstance, updateSessionFeedback } from '@/lib/firestore';
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

// Session feedback state
const [feedbackSessionId, setFeedbackSessionId] = useState<string | null>(null);
const [feedbackNotes, setFeedbackNotes] = useState('');
const [feedbackProvider, setFeedbackProvider] = useState<string>('minimax');
const [generatingFeedback, setGeneratingFeedback] = useState(false);
const [feedbackResult, setFeedbackResult] = useState<{ summary: string; progressHighlights: string; suggestedActivities: string } | null>(null);
const [editedFeedback, setEditedFeedback] = useState<{ summary: string; progressHighlights: string; suggestedActivities: string } | null>(null);
const [feedbackLanguage, setFeedbackLanguage] = useState<'en' | 'zh' | 'pt'>('en');
const [translatingFeedback, setTranslatingFeedback] = useState(false);
const [savingFeedback, setSavingFeedback] = useState(false);
const [feedbackSaved, setFeedbackSaved] = useState(false);
const [feedbackDocId, setFeedbackDocId] = useState<string | null>(null);
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

  // === Session Feedback Handlers ===

async function handleGenerateFeedback() {
  if (!selectedSession || !feedbackNotes.trim()) return;
  setGeneratingFeedback(true);
  try {
    const res = await fetch('/api/ai/generate-session-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionTitle: selectedSession.title || 'Untitled Session',
        sessionDate: getSessionDate(selectedSession) || '',
        teacherNotes: feedbackNotes,
        provider: feedbackProvider,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to generate feedback');
    setFeedbackResult(data.feedback);
    setEditedFeedback(data.feedback);
  } catch (err: any) {
    console.error('Feedback generation error:', err);
    toast({ title: 'Error', description: err.message, variant: 'destructive' });
  } finally {
    setGeneratingFeedback(false);
  }
}

async function handleTranslateFeedback(lang: 'zh' | 'pt') {
  if (!editedFeedback) return;
  setTranslatingFeedback(true);
  try {
    const res = await fetch('/api/ai/translate-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentReport: editedFeedback, targetLanguage: lang }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Translation failed');
    setEditedFeedback(data.parentReport);
    setFeedbackLanguage(lang);
  } catch (err: any) {
    console.error('Translation error:', err);
    toast({ title: 'Error', description: err.message, variant: 'destructive' });
  } finally {
    setTranslatingFeedback(false);
  }
}

async function handleSaveAndSendFeedback() {
  if (!selectedSession || !editedFeedback) return;
  setSavingFeedback(true);
  try {
    const feedbackData = {
      sessionInstanceId: selectedSession.id,
      studentId: selectedSession.studentId,
      teacherId: selectedSession.teacherUid || '',
      courseId: selectedSession.courseId || '',
      unitId: selectedSession.unitId || '',
      sessionTitle: selectedSession.title || 'Untitled Session',
      sessionDate: getSessionDate(selectedSession) || '',
      teacherNotes: feedbackNotes,
      parentReport: {
        ...editedFeedback,
        language: feedbackLanguage,
        generatedAt: new Date().toISOString(),
      },
      status: 'sent' as const,
      sentAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (feedbackDocId) {
      await updateSessionFeedback(feedbackDocId, feedbackData);
    } else {
      const docId = await createSessionFeedback(feedbackData);
      setFeedbackDocId(docId);
    }

    setFeedbackSaved(true);
    toast({ title: 'Success', description: 'Feedback saved and ready to send.' });
    
    // Send email to parent
    try {
      const studentEmail = selectedSession.student?.email;
      if (studentEmail) {
        await fetch('/api/email/send-feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: studentEmail,
            learnerName: selectedSession.student?.name || 'Learner',
            sessionTitle: selectedSession.title || 'Session',
            sessionDate: getSessionDate(selectedSession) || '',
            summary: editedFeedback.summary,
            progressHighlights: editedFeedback.progressHighlights,
            suggestedActivities: editedFeedback.suggestedActivities,
          }),
        });
      }
    } catch (emailErr) {
      console.error('Email send failed (non-blocking):', emailErr);
    }
  } catch (err: any) {
    console.error('Save feedback error:', err);
    toast({ title: 'Error', description: err.message, variant: 'destructive' });
  } finally {
    setSavingFeedback(false);
  }
}

function resetFeedbackState() {
  setFeedbackSessionId(null);
  setFeedbackNotes('');
  setFeedbackResult(null);
  setEditedFeedback(null);
  setFeedbackLanguage('en');
  setFeedbackSaved(false);
  setFeedbackDocId(null);
}

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
      
      toast({ title: 'Success', description: 'Session marked as complete. Write session notes below.' });
      setFeedbackSessionId(sessionId);
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

      <Dialog open={!!selectedSession} onOpenChange={(isOpen) => { if (!isOpen) { setSelectedSession(null); resetFeedbackState(); } }}>
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
              
              <DialogFooter className="flex-col items-stretch gap-4 sm:flex-col">
          {/* Mark Complete button — hidden once completed */}
          {selectedSession.status !== 'completed' && (
            <Button
              type="button"
              variant="default"
              disabled={!!completingSessionId}
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
          )}

          {/* Session Feedback Section — appears after completion */}
          {(selectedSession.status === 'completed' || feedbackSessionId === selectedSession.id) && !feedbackSaved && (
            <div className="w-full space-y-4 border-t pt-4">
              <h4 className="font-semibold">Session Feedback</h4>

              {/* Step 1: Teacher writes notes */}
              {!editedFeedback && (
                <div className="space-y-3">
                  <Label htmlFor="feedback-notes">Write session notes</Label>
                  <Textarea
                    id="feedback-notes"
                    placeholder="What did the student work on today? Any highlights or areas to improve?"
                    value={feedbackNotes}
                    onChange={(e) => setFeedbackNotes(e.target.value)}
                    rows={4}
                  />
                  <Button
                    onClick={handleGenerateFeedback}
                    disabled={!feedbackNotes.trim() || generatingFeedback}
                    className="w-full"
                  >
                    {generatingFeedback ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate Feedback
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Step 2: Review and edit generated feedback */}
              {editedFeedback && (
                <div className="space-y-3">
                  <div>
                    <Label>Summary</Label>
                    <Textarea
                      value={editedFeedback.summary}
                      onChange={(e) => setEditedFeedback({ ...editedFeedback, summary: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label>Progress Highlights</Label>
                    <Textarea
                      value={editedFeedback.progressHighlights}
                      onChange={(e) => setEditedFeedback({ ...editedFeedback, progressHighlights: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label>Suggested Activities</Label>
                    <Textarea
                      value={editedFeedback.suggestedActivities}
                      onChange={(e) => setEditedFeedback({ ...editedFeedback, suggestedActivities: e.target.value })}
                      rows={2}
                    />
                  </div>

                  {/* Translation buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTranslateFeedback('zh')}
                      disabled={translatingFeedback || feedbackLanguage === 'zh'}
                    >
                      {translatingFeedback ? '...' : '中文'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTranslateFeedback('pt')}
                      disabled={translatingFeedback || feedbackLanguage === 'pt'}
                    >
                      {translatingFeedback ? '...' : 'Português'}
                    </Button>
                    {feedbackLanguage !== 'en' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setEditedFeedback(feedbackResult); setFeedbackLanguage('en'); }}
                      >
                        Back to English
                      </Button>
                    )}
                  </div>

                  {/* Save button */}
                  <Button
                    onClick={handleSaveAndSendFeedback}
                    disabled={savingFeedback}
                    className="w-full"
                  >
                    {savingFeedback ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Save & Send
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Confirmation after save */}
          {feedbackSaved && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-800 text-sm">
              ✅ Feedback saved and ready to send.
            </div>
          )}
        </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
