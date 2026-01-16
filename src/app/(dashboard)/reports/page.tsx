import PageHeader from "@/components/page-header";
import RevenueChart from "./components/revenue-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReportsPage() {
    return (
        <div className="flex flex-col gap-8 p-4 md:p-8">
            <PageHeader 
                title="Reports" 
                description="View your business performance and student analytics."
            />
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Revenue Overview</CardTitle>
                </CardHeader>
                <CardContent>
                    <RevenueChart />
                </CardContent>
            </Card>
        </div>
    );
}
