import PageHeader from "@/components/page-header";
import WeeklyCalendar from "./components/weekly-calendar";
import { getLessons, getStudents } from "@/lib/data";

export default async function CalendarPage() {
    const lessons = await getLessons();
    const students = await getStudents();

    return (
        <div className="flex flex-col gap-8 p-4 md:p-8">
            <PageHeader 
                title="Lesson Calendar"
                description="View and manage your scheduled lessons."
            />
            <WeeklyCalendar lessons={lessons} students={students} />
        </div>
    );
}