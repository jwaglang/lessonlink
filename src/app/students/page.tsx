import { getStudents } from "@/lib/data";
import PageHeader from "@/components/page-header";
import StudentListWrapper from "./components/student-list-wrapper";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export default async function StudentsPage() {
    const initialStudents = await getStudents();

    return (
        <div className="flex flex-col gap-8 p-4 md:p-8">
            <PageHeader 
                title="Student Roster" 
                description="Manage your student profiles, track their progress, and update their status."
            >
                {/* The button to add a student is now part of the wrapper */}
            </PageHeader>
            <StudentListWrapper initialStudents={initialStudents} />
        </div>
    );
}
