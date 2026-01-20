import PageHeader from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Library } from "lucide-react";

export default function FeedbackPage() {
    return (
        <div className="flex flex-col gap-8 p-4 md:p-8">
            <PageHeader 
                title="Feedback" 
                description="Review feedback on your lessons."
            />
            <Card>
                <CardContent className="py-8 text-center">
                    <Library className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Lesson feedback coming soon!</p>
                </CardContent>
            </Card>
        </div>
    );
}
