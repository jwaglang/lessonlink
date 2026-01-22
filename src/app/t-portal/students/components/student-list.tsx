
'use client';

import { useState } from 'react';
import type { Student } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { StatusBadge } from '@/components/status-badge';
import AIStatusSuggester from './ai-status-suggester';
import { MoreHorizontal, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import EditStudentForm from './edit-student-form';
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
import { deleteStudent } from '@/lib/firestore';
import { useToast } from '@/hooks/use-toast';


const currencySymbols: { [key: string]: string } = {
    'EUR': '€',
    'USD': '$',
    'GBP': '£',
    'JPY': '¥',
    'RUB': '₽',
    'CNY': '¥'
}

export default function StudentList({ students, setStudents }: { students: Student[], setStudents: React.Dispatch<React.SetStateAction<Student[]>> }) {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleStatusUpdate = (studentId: string, updatedStudent: Student) => {
    setStudents(prevStudents =>
      prevStudents.map(s => (s.id === studentId ? { ...s, ...updatedStudent } : s))
    );
  };

  const handleEditClick = (student: Student) => {
    setSelectedStudent(student);
    setIsSheetOpen(true);
  }

  const handleFormSuccess = (updatedStudent: Student) => {
    handleStatusUpdate(updatedStudent.id, updatedStudent);
    setIsSheetOpen(false);
  }

  const handleDeleteClick = (student: Student) => {
    setStudentToDelete(student);
  };

  const handleConfirmDelete = async () => {
    if (!studentToDelete) return;

    setIsDeleting(true);
    const studentIdToDelete = studentToDelete.id;
    const studentNameToDelete = studentToDelete.name;

    try {
      await deleteStudent(studentIdToDelete);
      
      // Close the dialog first to prevent animation race conditions
      setStudentToDelete(null);
      
      // Then update the student list
      setStudents(prev => prev.filter(s => s.id !== studentIdToDelete));
      
      toast({
        title: 'Student Deleted',
        description: `${studentNameToDelete} has been removed from your roster.`,
      });
    } catch (error) {
      console.error('Error deleting student:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete student.',
        variant: 'destructive',
      });
      // Also close dialog on error
      setStudentToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[350px]">Student</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Package Balance</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students && students.map((student) => {
              const packagePercentage = (student.prepaidPackage.balance / student.prepaidPackage.initialValue) * 100;
              const studentImage = PlaceHolderImages.find(img => img.id === `student${student.id}`);
              const symbol = currencySymbols[student.prepaidPackage.currency] || '$';
              return (
                <TableRow key={student.id}>
                  <TableCell>
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage src={studentImage?.imageUrl} alt={student.name} data-ai-hint={studentImage?.imageHint} />
                        <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{student.name}</p>
                        <p className="text-sm text-muted-foreground">{student.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={student.status} />
                  </TableCell>
                  <TableCell>
                      {student.prepaidPackage.initialValue > 0 ? (
                          <div>
                              <p className="font-mono text-sm">{symbol}{student.prepaidPackage.balance.toFixed(2)}</p>
                              <Progress value={packagePercentage} className="h-2 w-[150px] mt-1"/>
                          </div>
                      ) : (
                          <p className="text-sm text-muted-foreground">N/A</p>
                      )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <AIStatusSuggester student={student} onStatusUpdate={handleStatusUpdate} />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditClick(student)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem>View Details</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDeleteClick(student)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              )
          })}
          </TableBody>
        </Table>
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetContent>
              <SheetHeader>
                  <SheetTitle>Edit Student</SheetTitle>
              </SheetHeader>
              {selectedStudent && <EditStudentForm student={selectedStudent} onSuccess={handleFormSuccess} />}
          </SheetContent>
        </Sheet>
      </div>

      <AlertDialog open={!!studentToDelete} onOpenChange={() => setStudentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this student?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {studentToDelete?.name} and all associated data, including lessons. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
