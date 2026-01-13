'use client';

import { useState } from "react";
import type { Student } from "@/lib/types";
import StudentList from "./student-list";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import AddStudentForm from "./add-student-form";
import PageHeader from "@/components/page-header";

export default function StudentListWrapper({ initialStudents }: { initialStudents: Student[] }) {
    const [students, setStudents] = useState<Student[]>(initialStudents);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const handleFormSuccess = (newStudent: Student) => {
        setStudents(prevStudents => [newStudent, ...prevStudents]);
        setIsSheetOpen(false);
    }

    return (
        <>
            <div className="flex justify-end">
                <Button onClick={() => setIsSheetOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    <span>Add Student</span>
                </Button>
            </div>
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
