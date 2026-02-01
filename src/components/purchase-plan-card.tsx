'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Package, ShoppingCart } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';

interface PurchasePlanCardProps {
  totalHours: number;
  uncommittedHours: number;
  committedHours: number;
  completedHours: number;
  currency: string;
}

export default function PurchasePlanCard({
  totalHours,
  uncommittedHours,
  committedHours,
  completedHours,
  currency,
}: PurchasePlanCardProps) {
  
  // Calculate percentages
  const availablePercent = totalHours > 0 ? (uncommittedHours / totalHours) * 100 : 0;
  const committedPercent = totalHours > 0 ? (committedHours / totalHours) * 100 : 0;
  const completedPercent = totalHours > 0 ? (completedHours / totalHours) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <CardTitle>My Purchase Plan</CardTitle>
          </div>
        </div>
        <CardDescription>
          Total Purchased: {totalHours} hours
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Available Hours */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Available</span>
            <span className="text-muted-foreground">
              {uncommittedHours}h ({availablePercent.toFixed(0)}%)
            </span>
          </div>
          <Progress value={availablePercent} className="h-2" />
        </div>

        {/* Committed Hours */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Committed to Units</span>
            <span className="text-muted-foreground">
              {committedHours}h ({committedPercent.toFixed(0)}%)
            </span>
          </div>
          <Progress value={committedPercent} className="h-2" />
        </div>

        {/* Completed Hours */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Completed</span>
            <span className="text-muted-foreground">
              {completedHours}h ({completedPercent.toFixed(0)}%)
            </span>
          </div>
          <Progress value={completedPercent} className="h-2" />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Link href="/s-portal/packages" className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              <Package className="h-4 w-4 mr-2" />
              View Packages
            </Button>
          </Link>
          <Link href="/s-portal/purchase" className="flex-1">
            <Button size="sm" className="w-full">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Purchase More
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
