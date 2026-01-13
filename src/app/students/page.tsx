import PageHeader from "@/components/page-header";
import { getStudents } from "@/lib/data";
import StudentList from "./components/student-list";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export default async function StudentsPage() {
    const students = await getStudents();

    return (
        <div className="flex flex-col gap-8 p-4 md:p-8">
            <PageHeader 
                title="Student Roster" 
                description="Manage your student profiles, track their progress, and update their status."
            >
                <Button>
                    <PlusCircle />
                    <span>Add Student</span>
                </Button>
            </PageHeader>
            <StudentList initialStudents={students} />
        </div>
    );
}
