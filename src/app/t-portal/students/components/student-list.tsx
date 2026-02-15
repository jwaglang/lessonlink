'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Student, StudentStatus, StudentProgress, SessionInstance } from '@/lib/types';
import { getStudentProgressByStudentId, getSessionInstancesByStudentId, getCourseById } from '@/lib/firestore';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/status-badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Trash2, Loader2, Search } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { parseISO, isFuture, format } from 'date-fns';

const STATUS_FILTERS: { label: string; value: StudentStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Trial', value: 'trial' },
  { label: 'Paused', value: 'paused' },
  { label: 'Completed', value: 'completed' },
  { label: 'Churned', value: 'churned' },
];

interface StudentExtra {
  courseName: string | null;
  nextSession: string | null;
  hoursCompleted: number;
  hoursTotal: number;
}

export default function StudentList({ students, setStudents }: { students: Student[]; setStudents: React.Dispatch<React.SetStateAction<Student[]>> }) {
  const router = useRouter();
  const { toast } = useToast();

  const [filter, setFilter] = useState<StudentStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [extras, setExtras] = useState<Record<string, StudentExtra>>({});

  // Edit/Delete state
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch progress + next session per student
  useEffect(() => {
    async function fetchExtras() {
      const result: Record<string, StudentExtra> = {};
      await Promise.all(
        students.map(async (student) => {
          try {
            const [progressList, sessions] = await Promise.all([
              getStudentProgressByStudentId(student.id),
              getSessionInstancesByStudentId(student.id),
            ]);

            // Aggregate hours across all progress entries
            const hoursCompleted = progressList.reduce((sum, p) => sum + (p.totalHoursCompleted || 0), 0);
            const hoursTotal = progressList.reduce((sum, p) => sum + (p.targetHours || 0), 0);

            // Find course name from first progress entry
            let courseName: string | null = null;
            if (progressList.length > 0) {
              const course = await getCourseById(progressList[0].courseId);
              courseName = course?.title || progressList[0].courseId;
            }

            // Find next upcoming session
            const upcoming = sessions
              .filter((s) => s.status === 'scheduled' && s.lessonDate && isFuture(parseISO(s.lessonDate)))
              .sort((a, b) => parseISO(a.lessonDate).getTime() - parseISO(b.lessonDate).getTime());

            const nextSession = upcoming.length > 0
              ? format(parseISO(upcoming[0].lessonDate), 'MMM d') + ', ' + upcoming[0].startTime
              : null;

            result[student.id] = { courseName, nextSession, hoursCompleted, hoursTotal };
          } catch {
            result[student.id] = { courseName: null, nextSession: null, hoursCompleted: 0, hoursTotal: 0 };
          }
        })
      );
      setExtras(result);
    }

    if (students.length > 0) fetchExtras();
  }, [students]);

  // Filter + search
  const filtered = students.filter((s) => {
    if (filter !== 'all' && s.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
    }
    return true;
  });

  // Edit handlers
  const handleEditClick = (e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    setSelectedStudent(student);
    setIsSheetOpen(true);
  };

  const handleFormSuccess = (updatedStudent: Student) => {
    setStudents((prev) => prev.map((s) => (s.id === updatedStudent.id ? { ...s, ...updatedStudent } : s)));
    setIsSheetOpen(false);
  };

  // Delete handlers
  const handleDeleteClick = (e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    setStudentToDelete(student);
  };

  const handleConfirmDelete = async () => {
    if (!studentToDelete) return;
    setIsDeleting(true);
    const id = studentToDelete.id;
    const name = studentToDelete.name;
    try {
      await deleteStudent(id);
      setStudentToDelete(null);
      toast({ title: 'Student Deleted', description: `${name} has been removed from your roster.` });
      setTimeout(() => {
        setStudents((prev) => prev.filter((s) => s.id !== id));
        setIsDeleting(false);
      }, 200);
    } catch {
      toast({ title: 'Error', description: 'Failed to delete student.', variant: 'destructive' });
      setStudentToDelete(null);
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* Filters + Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={filter === f.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Student Cards */}
      <div className="flex flex-col gap-3">
        {filtered.length > 0 ? (
          filtered.map((student) => {
            const extra = extras[student.id];
            return (
              <div
                key={student.id}
                onClick={() => router.push(`/t-portal/students/${student.id}`)}
                className="flex items-center justify-between rounded-lg border bg-card p-4 cursor-pointer transition-all hover:border-primary/30 hover:shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{student.name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{student.name}</p>
                    <p className="text-sm text-muted-foreground">{student.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  {/* Course */}
                  <div className="hidden md:block text-right">
                    <p className="text-xs text-muted-foreground">Course</p>
                    <p className="text-sm">{extra?.courseName || '—'}</p>
                  </div>
                  {/* Next Session */}
                  <div className="hidden lg:block text-right">
                    <p className="text-xs text-muted-foreground">Next Session</p>
                    <p className="text-sm">{extra?.nextSession || '—'}</p>
                  </div>
                  {/* Hours */}
                  <div className="hidden lg:block text-right">
                    <p className="text-xs text-muted-foreground">Hours</p>
                    <p className="text-sm">
                      {extra?.hoursTotal ? `${extra.hoursCompleted}/${extra.hoursTotal} hrs` : '—'}
                    </p>
                  </div>
                  {/* Status */}
                  <StatusBadge status={student.status} />
                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => handleEditClick(e, student)}>Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/t-portal/students/${student.id}`)}>View Profile</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={(e) => handleDeleteClick(e, student)} className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
            No learners found.
          </div>
        )}
      </div>

      {/* Edit Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Edit Student</SheetTitle>
          </SheetHeader>
          {selectedStudent && <EditStudentForm student={selectedStudent} onSuccess={handleFormSuccess} />}
        </SheetContent>
      </Sheet>

      {/* Delete Dialog */}
      <AlertDialog open={!!studentToDelete} onOpenChange={() => setStudentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this student?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {studentToDelete?.name} and all associated data. This action cannot be undone.
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