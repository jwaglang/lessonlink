'use client';

import PageHeader from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PawPrint } from 'lucide-react';

export default function RefineCompositePage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <PageHeader
        title="Refine Accessory Composite"
        description="Fix AI-generated pet composites by providing correction instructions."
        icon={PawPrint}
      />

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            This feature allows you to select a learner, view their generated pet composites, and refine any that have errors.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You'll be able to provide specific instructions to improve the composite, and the refined version will replace the original in the learner's profile.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
