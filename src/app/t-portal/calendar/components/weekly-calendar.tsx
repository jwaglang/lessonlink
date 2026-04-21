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
import { ChevronLeft, ChevronRight, Loader2, Sparkles, CheckCircle, Send, XCircle, AlertTriangle, BookOpen } from 'lucide-react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { completeSession, cancelSessionInstance, createSessionFeedback, getSessionFeedbackByInstance, updateSessionFeedback } from '@/lib/firestore';
import { useToast } from '@/hooks/use-toast';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import AssignHomeworkForm from '@/components/assign-homework-form';

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
const [generatingFeedback, setGeneratingFeedback] = useState(false);
const [feedbackResult, setFeedbackResult] = useState<{ summary: string; progressHighlights: string; suggestedActivities: string } | null>(null);
const [editedFeedback, setEditedFeedback] = useState<{ summary: string; progressHighlights: string; suggestedActivities: string } | null>(null);
const [englishFeedback, setEnglishFeedback] = useState<{ summary: string; progressHighlights: string; suggestedActivities: string } | null>(null);
const [feedbackLanguage, setFeedbackLanguage] = useState<'en' | 'zh' | 'pt'>('en');
const [translatingFeedback, setTranslatingFeedback] = useState(false);
const [savingFeedback, setSavingFeedback] = useState(false);
const [feedbackSaved, setFeedbackSaved] = useState(false);
const [feedbackDocId, setFeedbackDocId] = useState<string | null>(null);
const [cancelTarget, setCancelTarget] = useState<SessionInstanceWithStudent | null>(null);
const [cancellingSessionId, setCancellingSessionId] = useState<string | null>(null);
const [showHomeworkForm, setShowHomeworkForm] = useState(false);
const [homeworkAssigned, setHomeworkAssigned] = useState(false);
const { toast } = useToast();

const weekStart = startOfWeek(currentDate);
const weekEnd = endOfWeek(currentDate);
const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

const sessionsWithStudents: SessionInstanceWithStudent[] = sessionInstances.map((instance) => ({
  ...instance,
  student: students.find((s) => s.id === instance.studentId),
}));

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
    // Capture the T's English before it gets replaced by the translation
    if (feedbackLanguage === 'en') setEnglishFeedback(editedFeedback);
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
    // englishFeedback = T's edited English captured before any translation
    // editedFeedback = T's English if no translation happened
    const englishSource = englishFeedback ?? (feedbackLanguage === 'en' ? editedFeedback : null);
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
      englishReport: englishSource ? {
        summary: englishSource.summary,
        progressHighlights: englishSource.progressHighlights,
        suggestedActivities: englishSource.suggestedActivities,
        savedAt: new Date().toISOString(),
      } : null,
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
    
    // Send email to parent (retry once on network failure)
    try {
      const studentEmail = selectedSession.student?.email;
      if (studentEmail) {
        const emailPayload = {
          to: studentEmail,
          learnerName: selectedSession.student?.name || 'Learner',
          sessionTitle: selectedSession.title || 'Session',
          sessionDate: getSessionDate(selectedSession) || '',
          summary: editedFeedback.summary,
          progressHighlights: editedFeedback.progressHighlights,
          suggestedActivities: editedFeedback.suggestedActivities,
        };
        const sendEmail = () => fetch('/api/email/send-feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(emailPayload),
        });
        try {
          await sendEmail();
        } catch {
          await new Promise(r => setTimeout(r, 2000));
          await sendEmail();
        }
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
  setEnglishFeedback(null);
  setFeedbackLanguage('en');
  setFeedbackSaved(false);
  setFeedbackDocId(null);
  setShowHomeworkForm(false);
  setHomeworkAssigned(false);
}
// Load existing feedback when opening a completed session
React.useEffect(() => {
  if (!selectedSession || selectedSession.status !== 'completed') return;
  
  let cancelled = false;
  
  async function loadExistingFeedback() {
    try {
      const existing = await getSessionFeedbackByInstance(selectedSession!.id);
      if (cancelled || !existing) return;
      
      setFeedbackDocId(existing.id);
      setFeedbackNotes(existing.teacherNotes || '');
      setFeedbackLanguage(existing.parentReport?.language || 'en');
      setEditedFeedback({
        summary: existing.parentReport?.summary || '',
        progressHighlights: existing.parentReport?.progressHighlights || '',
        suggestedActivities: existing.parentReport?.suggestedActivities || '',
      });
      setFeedbackResult({
        summary: existing.parentReport?.summary || '',
        progressHighlights: existing.parentReport?.progressHighlights || '',
        suggestedActivities: existing.parentReport?.suggestedActivities || '',
      });
      if (existing.status === 'sent') {
        setFeedbackSaved(true);
      }
    } catch (err) {
      console.error('Failed to load existing feedback:', err);
    }
  }
  
  loadExistingFeedback();
  return () => { cancelled = true; };
}, [selectedSession]);

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

  async function handleConfirmCancel() {
    if (!cancelTarget) return;
    setCancellingSessionId(cancelTarget.id);
    try {
      const result = await cancelSessionInstance(cancelTarget.id, cancelTarget.studentId);
      if (result.approvalRequired) {
        toast({
          title: 'Approval Required',
          description: 'This session is within 24 hours. A cancellation request has been sent for approval.',
        });
      } else {
        setSessionInstances(prev =>
          prev.map(s => s.id === cancelTarget.id ? { ...s, status: 'cancelled' as const } : s)
        );
        setSelectedSession(prev =>
          prev?.id === cancelTarget.id ? { ...prev, status: 'cancelled' as const } : prev
        );
        toast({ title: 'Session Cancelled', description: 'The session has been cancelled and credit returned.' });
      }
    } catch (err: any) {
      console.error('[handleConfirmCancel]', err);
      toast({ title: 'Error', description: err.message || 'Could not cancel session.', variant: 'destructive' });
    } finally {
      setCancellingSessionId(null);
      setCancelTarget(null);
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
                  <div className="grid grid-cols-3 gap-2">
                    {selectedSession.status === 'scheduled' ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled
                          className="w-full"
                        >
                          Scheduled
                        </Button>
                        <Button
                          size="sm"
                          className="w-full"
                          disabled={!!completingSessionId}
                          onClick={() => handleMarkComplete(selectedSession.id)}
                        >
                          {completingSessionId === selectedSession.id ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-2" />
                          )}
                          Complete
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="w-full"
                          disabled={!!cancellingSessionId}
                          onClick={() => setCancelTarget(selectedSession)}
                        >
                          {cancellingSessionId === selectedSession.id ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <XCircle className="h-4 w-4 mr-2" />
                          )}
                          Cancel
                        </Button>
                      </>
                    ) : selectedSession.status === 'completed' ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled
                          className="w-full bg-green-50 text-green-700 border-green-200"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Completed
                        </Button>
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => { setFeedbackSessionId(selectedSession.id); setFeedbackSaved(false); }}
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          Write Feedback
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled
                          className="w-full opacity-50"
                        >
                          Cancel
                        </Button>
                      </>
                    ) : selectedSession.status === 'cancelled' ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled
                          className="w-full bg-red-50 text-red-700 border-red-200"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Cancelled
                        </Button>
                        <Button size="sm" variant="outline" disabled className="w-full opacity-50">Complete</Button>
                        <Button size="sm" variant="outline" disabled className="w-full opacity-50">Cancel</Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled
                          className="w-full bg-amber-50 text-amber-700 border-amber-200"
                        >
                          Rescheduled
                        </Button>
                        <Button size="sm" variant="outline" disabled className="w-full opacity-50">Complete</Button>
                        <Button size="sm" variant="outline" disabled className="w-full opacity-50">Cancel</Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <DialogFooter className="flex-col items-stretch gap-4 sm:flex-col">

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
            <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-800 text-sm flex items-center justify-between gap-2">
              <span>✅ Feedback saved and ready to send.</span>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 border-green-300 text-green-800 hover:bg-green-100"
                onClick={async () => {
                  if (!selectedSession || !editedFeedback) return;
                  try {
                    const studentEmail = selectedSession.student?.email;
                    if (!studentEmail) return;
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
                    toast({ title: 'Email sent', description: 'Feedback sent to parent.' });
                  } catch (err: any) {
                    toast({ title: 'Email failed', description: err.message, variant: 'destructive' });
                  }
                }}
              >
                <Send className="h-3 w-3 mr-1" />
                Resend Email
              </Button>
            </div>
          )}

          {/* Assign Homework Section — appears for any completed session */}
          {selectedSession.status === 'completed' && !homeworkAssigned && (
            <div className="w-full border-t pt-4">
              {!showHomeworkForm ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowHomeworkForm(true)}
                >
                  <BookOpen className="mr-2 h-4 w-4" />
                  Assign Homework
                </Button>
              ) : (
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Assign Homework
                  </h4>
                  <AssignHomeworkForm
                    studentId={selectedSession.studentId}
                    teacherId={selectedSession.teacherUid || ''}
                    courseId={selectedSession.courseId || ''}
                    unitId={selectedSession.unitId || ''}
                    sessionId={selectedSession.sessionId || undefined}
                    sessionInstanceId={selectedSession.id}
                    sessionTitle={selectedSession.title || ''}
                    parentEmail={selectedSession.student?.primaryContact?.email}
                    learnerName={selectedSession.student?.name}
                    unitTitle={undefined}
                    teacherName={undefined}
                    onAssigned={() => setHomeworkAssigned(true)}
                    onCancel={() => setShowHomeworkForm(false)}
                  />
                </div>
              )}
            </div>
          )}

          {/* Homework assigned confirmation */}
          {homeworkAssigned && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-md text-purple-800 text-sm">
              ✅ Homework assigned.
            </div>
          )}
        </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!cancelTarget} onOpenChange={() => setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this session?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelTarget && (() => {
                const scheduledAt = new Date(`${getSessionDate(cancelTarget)}T${cancelTarget.startTime}:00`);
                const hoursUntil = (scheduledAt.getTime() - Date.now()) / (1000 * 60 * 60);
                return hoursUntil < 24 ? (
                  <span className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <span>
                      This session is within 24 hours. Cancellation will require approval and will not
                      take effect immediately.
                    </span>
                  </span>
                ) : (
                  <>This will cancel the session and return the credit to the learner. This action cannot be undone.</>
                );
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!cancellingSessionId}>Keep Session</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              disabled={!!cancellingSessionId}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancellingSessionId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Cancel Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
