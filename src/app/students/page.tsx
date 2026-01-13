'use client';

import { useState } from "react";
import PageHeader from "@/components/page-header";
import type { Student } from "@/lib/types";
import StudentList from "./components/student-list";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import AddStudentForm from "./components/add-student-form";

export default function StudentsPage({ initialStudents }: { initialStudents: Student[] }) {
    const [students, setStudents] = useState<Student[]>(initialStudents);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const handleFormSuccess = (newStudent: Student) => {
        setStudents(prevStudents => [newStudent, ...prevStudents]);
        setIsSheetOpen(false);
    }

    return (
        <div className="flex flex-col gap-8 p-4 md:p-8">
            <PageHeader 
                title="Student Roster" 
                description="Manage your student profiles, track their progress, and update their status."
            >
                <Button onClick={() => setIsSheetOpen(true)}>
                    <PlusCircle />
                    <span>Add Student</span>
                </Button>
            </PageHeader>
            <StudentList initialStudents={students} setStudents={setStudents} />
             <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>Add a New Student</SheetTitle>
                    </SheetHeader>
                    <AddStudentForm onSuccess={handleFormSuccess} />
                </SheetContent>
            </Sheet>
        </div>
    );
}
