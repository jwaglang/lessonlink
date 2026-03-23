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
import { createHomeworkAssignment } from '@/lib/firestore';

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

      await createHomeworkAssignment(homeworkData);

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
