import PageHeader from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function SettingsPage() {
    return (
        <div className="flex flex-col gap-8 p-4 md:p-8">
            <PageHeader 
                title="Settings" 
                description="Manage your account settings."
            />
            <Card>
                <CardContent className="py-8 text-center">
                    <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Account settings coming soon!</p>
                </CardContent>
            </Card>
        </div>
    );
}
