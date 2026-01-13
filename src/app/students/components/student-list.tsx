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
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import EditStudentForm from './edit-student-form';

export default function StudentList({ initialStudents, setStudents }: { initialStudents: Student[], setStudents: React.Dispatch<React.SetStateAction<Student[]>> }) {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

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

  return (
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
          {initialStudents && initialStudents.map((student) => {
            const packagePercentage = (student.prepaidPackage.balance / student.prepaidPackage.initialValue) * 100;
            const studentImage = PlaceHolderImages.find(img => img.id === `student${student.id}`);
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
                            <p className="font-mono text-sm">${student.prepaidPackage.balance.toFixed(2)}</p>
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
                        <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
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
  );
}
