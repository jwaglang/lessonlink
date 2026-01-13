'use client';

import { useState, useTransition } from 'react';
import { suggestStudentStatus, type SuggestStudentStatusOutput } from '@/ai/flows/suggest-student-status';
import type { Student } from '@/lib/types';
import { Button } from '@/components/ui/button';
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
import { Wand2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateStudentStatus } from '@/lib/data';

interface AIStatusSuggesterProps {
  student: Student;
  onStatusUpdate: (studentId: string, updatedStudent: Student) => void;
}

export default function AIStatusSuggester({ student, onStatusUpdate }: AIStatusSuggesterProps) {
  const [isPending, startTransition] = useTransition();
  const [suggestion, setSuggestion] = useState<SuggestStudentStatusOutput | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleSuggestStatus = () => {
    startTransition(async () => {
      try {
        const result = await suggestStudentStatus({
          studentName: student.name,
          enrollmentStatus: student.enrollmentStatus,
          paymentStatus: student.paymentStatus,
          packageBalance: student.prepaidPackage.balance,
          lessonsAttended: student.lessons.length,
          goalMet: student.goalMet,
        });
        setSuggestion(result);
        setIsDialogOpen(true);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to get AI suggestion. Please try again.',
          variant: 'destructive',
        });
        console.error(error);
      }
    });
  };

  const handleApplySuggestion = () => {
    if (!suggestion) return;
    
    startTransition(async () => {
      try {
        // @ts-ignore
        const updatedStudent = await updateStudentStatus(student.id, suggestion.suggestedStatus);
        onStatusUpdate(student.id, updatedStudent);
        toast({
          title: 'Status Updated',
          description: `${student.name}'s status has been updated to "${suggestion.suggestedStatus}".`,
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to apply suggestion. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsDialogOpen(false);
        setSuggestion(null);
      }
    });
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleSuggestStatus} disabled={isPending}>
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Wand2 className="mr-2 h-4 w-4" />
        )}
        Suggest
      </Button>

      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 font-headline">
              <Wand2 className="primary-gradient-text" /> AI Status Suggestion
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-4">
              <p className="font-semibold text-foreground">
                Based on {student.name}'s profile, we suggest the status:
              </p>
              <p className="text-lg font-bold primary-gradient-text my-2 capitalize">
                {suggestion?.suggestedStatus}
              </p>
              <p className="text-sm text-muted-foreground italic">
                "{suggestion?.reason}"
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending} onClick={() => setSuggestion(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={isPending} onClick={handleApplySuggestion}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Apply Suggestion
            </AlertDialogAction>
          </AlertDialogFooter>