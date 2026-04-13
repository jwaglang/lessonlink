'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function RefineAccessoryTabContent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Refine Accessory Composite</CardTitle>
        <CardDescription>
          Fix AI-generated pet composites by providing correction instructions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          This feature allows you to select a learner, view their generated pet composites, and refine any that have errors. You'll be able to provide specific instructions to improve the composite, and the refined version will replace the original in the learner's profile.
        </p>
      </CardContent>
    </Card>
  );
}
