'use client';

import { useState } from 'react';
import type { Student } from '@/lib/types';
import { getStudents } from "@/lib/data";
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import AddStudentForm from "./components/add-student-form";
import { useEffect } from 'react';
import StudentList from './components/student-list';

export default function StudentsPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    useEffect(() => {
        const fetchStudents = async () => {
            const initialStudents = await getStudents();
            setStudents(initialStudents);
        }
        fetchStudents();
    }, []);

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
                    <PlusCircle className="mr-2 h-4 w-4" />
                    <span>Add Student</span>
                </Button>
            </PageHeader>
            <StudentList students={students} setStudents={setStudents} />
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
