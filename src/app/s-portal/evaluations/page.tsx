import PageHeader from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardCheck } from "lucide-react";

export default function EvaluationsPage() {
    return (
        <div className="flex flex-col gap-8 p-4 md:p-8">
            <PageHeader 
                title="Evaluations" 
                description="View your progress and evaluations."
            />
            <Card>
                <CardContent className="py-8 text-center">
                    <ClipboardCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Evaluations and progress reports coming soon!</p>
                </CardContent>
            </Card>
        </div>
    );
}
