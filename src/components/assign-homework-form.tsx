'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, BookOpen, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { HomeworkType, HomeworkDeliveryMethod, HomeworkAssignment } from '@/lib/types';
import { createHomeworkAssignment, updateHomeworkAssignment } from '@/lib/firestore';

interface AssignHomeworkFormProps {
  // Pre-fill data from the session context
  studentId: string;
  teacherId: string;
  courseId: string;
  unitId: string;
  sessionId?: string;
  sessionInstanceId?: string;
  sessionTitle?: string;
  // For email delivery
  parentEmail?: string;
  learnerName?: string;
  unitTitle?: string;
  teacherName?: string;
  // Callbacks
  onAssigned?: () => void;
  onCancel?: () => void;
}

const HOMEWORK_TYPES: { value: HomeworkType; label: string }[] = [
  { value: 'workbook', label: 'Workbook' },
  { value: 'phonics_workbook', label: 'Phonics' },
  { value: 'song_worksheet', label: 'Worksheet' },
  { value: 'sentence_switcher', label: 'Sentence Switcher' },
  { value: 'other', label: 'Other' },
];

export default function AssignHomeworkForm({
  studentId,
  teacherId,
  courseId,
  unitId,
  sessionId,
  sessionInstanceId,
  sessionTitle,
  parentEmail,
  learnerName,
  unitTitle,
  teacherName,
  onAssigned,
  onCancel,
}: AssignHomeworkFormProps) {
  const [title, setTitle] = useState(sessionTitle ? `${sessionTitle} — Homework` : '');
  const [homeworkType, setHomeworkType] = useState<HomeworkType>('workbook');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<HomeworkDeliveryMethod>(parentEmail ? 'email' : 'manual');
  const [teacherInstructions, setTeacherInstructions] = useState('');
  const [attachmentHtml, setAttachmentHtml] = useState<string | null>(null);
  const [attachmentFilename, setAttachmentFilename] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  async function handleAssign() {
    if (!title.trim()) {
      toast({ title: 'Error', description: 'Please enter a title.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const homeworkData: Omit<HomeworkAssignment, 'id'> = {
        studentId,
        teacherId,
        courseId,
        unitId,
        sessionId: sessionId || undefined,
        sessionInstanceId: sessionInstanceId || undefined,
        title: title.trim(),
        description: description.trim() || undefined,
        teacherInstructions: teacherInstructions.trim() || undefined,
        homeworkType,
        deliveryMethod,
        dueDate: dueDate || undefined,
        status: 'assigned',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (deliveryMethod === 'email') {
        // Create the homework document first (client-side, user is logged in)
        const docId = await createHomeworkAssignment(homeworkData);

        // Send email with attachment
        let emailSent = false;
        try {
          const emailRes = await fetch('/api/homework/assign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: title.trim(),
              description: description.trim() || undefined,
              dueDate: dueDate || undefined,
              homeworkType,
              parentEmail,
              learnerName,
              unitTitle,
              teacherName,
              attachmentHtml,
              attachmentFilename,
            }),
          });
          if (emailRes.ok) {
            emailSent = true;
          } else {
            const errData = await emailRes.json().catch(() => ({}));
            console.error('[Homework] Email send failed:', errData);
          }
        } catch (emailErr) {
          console.error('[Homework] Email request failed:', emailErr);
        }

        if (emailSent) {
          // Update status to 'delivered' now that email is confirmed sent
          try {
            await updateHomeworkAssignment(docId, {
              status: 'delivered',
              deliveredAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          } catch (updateErr) {
            console.error('[Homework] Failed to update status to delivered:', updateErr);
          }
        } else {
          toast({
            title: 'Homework assigned, but email failed',
            description: 'The homework was saved but the email could not be sent. Try resending manually.',
            variant: 'destructive',
          });
        }
      } else {
        await createHomeworkAssignment(homeworkData);
      }

      toast({
        title: 'Homework Assigned',
        description: 'Homework assigned successfully.',
      });
      onAssigned?.();
    } catch (err: any) {
      console.error('Assign homework error:', err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="hw-title">Title</Label>
        <Input
          id="hw-title"
          placeholder="e.g. Colors and Shapes Workbook"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Type</Label>
        <Select value={homeworkType} onValueChange={(v) => setHomeworkType(v as HomeworkType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HOMEWORK_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="hw-desc">Instructions (optional)</Label>
        <Textarea
          id="hw-desc"
          placeholder="Any notes or instructions for the learner/parent..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="hw-teacher-instructions">Instructions for this learner (optional)</Label>
        <Textarea
          id="hw-teacher-instructions"
          placeholder="e.g. Focus on the vocabulary section, skip activity 3..."
          value={teacherInstructions}
          onChange={(e) => setTeacherInstructions(e.target.value)}
          rows={2}
        />
        <p className="text-xs text-muted-foreground">
          Custom instructions just for this learner. The description above stays the same for everyone.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="hw-due">Due Date (optional)</Label>
        <Input
          id="hw-due"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Delivery</Label>
        <Select value={deliveryMethod} onValueChange={(v) => setDeliveryMethod(v as HomeworkDeliveryMethod)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="email">Email to Parent</SelectItem>
            <SelectItem value="manual">Manual (send yourself)</SelectItem>
          </SelectContent>
        </Select>
        {deliveryMethod === 'email' && !parentEmail && (
          <p className="text-xs text-amber-600">No parent email on file. Add one in the learner profile, or switch to Manual.</p>
        )}
        {deliveryMethod === 'email' && (
          <div className="space-y-2 mt-4">
            <Label htmlFor="hw-attachment">Attach Workbook (optional)</Label>
            <Input
              id="hw-attachment"
              type="file"
              accept=".html"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 6 * 1024 * 1024) {
                  toast({
                    title: 'File too large',
                    description: 'Attachments must be under 6 MB. Use Manual delivery for larger files.',
                    variant: 'destructive',
                  });
                  e.target.value = '';
                  return;
                }
                const text = await file.text();
                setAttachmentHtml(text);
                setAttachmentFilename(file.name);
              }}
            />
            {attachmentFilename && (
              <p className="text-xs text-muted-foreground">Selected: {attachmentFilename}</p>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <Button onClick={handleAssign} disabled={submitting || !title.trim()} className="flex-1">
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Assigning...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Assign Homework
            </>
          )}
        </Button>
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
