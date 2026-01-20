import PageHeader from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

export default function ChatPage() {
    return (
        <div className="flex flex-col gap-8 p-4 md:p-8">
            <PageHeader 
                title="Chat" 
                description="Communicate with your students."
            />
            <Card>
                <CardContent className="py-8 text-center">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Chat functionality coming soon!</p>
                </CardContent>
            </Card>
        </div>
    );
}
