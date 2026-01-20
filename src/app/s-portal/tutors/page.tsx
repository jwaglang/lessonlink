import PageHeader from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";

export default function TutorsPage() {
    return (
        <div className="flex flex-col gap-8 p-4 md:p-8">
            <PageHeader 
                title="Tutors" 
                description="Find and connect with your tutors."
            />
            <Card>
                <CardContent className="py-8 text-center">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Tutor directory coming soon!</p>
                </CardContent>
            </Card>
        </div>
    );
}
