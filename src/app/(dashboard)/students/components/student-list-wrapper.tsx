'use client';

import { useState } from "react";
import type { Student } from "@/lib/types";
import StudentList from "./student-list";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import AddStudentForm from "./add-student-form";

export default function StudentListWrapper({ initialStudents }: { initialStudents: Student[] }) {
    const [students, setStudents] = useState<Student[]>(initialStudents);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const handleFormSuccess = (newStudent: Student) => {
        setStudents(prevStudents => [newStudent, ...prevStudents]);
        setIsSheetOpen(false);
    }

    return (
        <>
            <StudentList students={students} setStudents={setStudents} />
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>Add a New Student</SheetTitle>
                    </SheetHeader>
                    <AddStudentForm onSuccess={handleFormSuccess} />
                </SheetContent>
            </Sheet>
        </>
    );
}
