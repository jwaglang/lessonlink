
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/page-header';
import {
  getStudentByEmail,
  getStudentProgressByStudentId,
  getUnitById,
} from '@/lib/firestore';
import type { Student, Unit } from '@/lib/types';
import { BookOpen, Clock, CheckCircle, ArrowRight, Lightbulb } from 'lucide-react';
import Link from 'next/link';

interface UnitWithProgress {
  unit: Unit;
  progress: {
    id: string;
    hoursReserved: number;
    sessionsTotal: number;
    sessionsCompleted: number;
    status: string;
    assignedAt: string;
  };
}

export default function MyUnitsPage() {
  const { user } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [unitsWithProgress, setUnitsWithProgress] = useState<UnitWithProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user?.email) return;

      try {
        const studentData = await getStudentByEmail(user.email);
        if (!studentData) return;
        
        setStudent(studentData);

        // Get student progress (assigned units)
        const progressRecords = await getStudentProgressByStudentId(studentData.id);

        // Fetch unit details for each progress record
        const unitsData: UnitWithProgress[] = [];
        
        for (const progress of progressRecords) {
          const unit = await getUnitById(progress.unitId);
          if (unit) {
            unitsData.push({
              unit,
              progress: {
                id: progress.id ?? '',
                hoursReserved: progress.hoursReserved || 0,
                sessionsTotal: progress.sessionsTotal || 0,
                sessionsCompleted: progress.sessionsCompleted || 0,
                status: progress.status || 'assigned',
                assignedAt: progress.assignedAt || new Date().toISOString(),
              },
            });
          }
        }

        setUnitsWithProgress(unitsData);
      } catch (error) {
        console.error('Failed to load units:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <p>Loading your units...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <PageHeader
        title="My Units"
        description="Units assigned to you by your teacher"
      />

      {unitsWithProgress.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-20" />
              <h3 className="text-lg font-semibold mb-2">No Units Assigned Yet</h3>
              <p className="text-muted-foreground mb-6">
                Your teacher hasn't assigned any units to you yet. Check back soon!
              </p>
              <Link href="/s-portal">
                <Button variant="outline">
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 mt-6">
          {unitsWithProgress.map(({ unit, progress }) => {
            const progressPercent = progress.sessionsTotal > 0
              ? (progress.sessionsCompleted / progress.sessionsTotal) * 100
              : 0;

            return (
              <Card key={unit.id} className="overflow-hidden">
                <div className="flex flex-col md:flex-row">
                  {/* Unit Thumbnail */}
                  {unit.thumbnailUrl && (
                    <div className="md:w-48 h-48 bg-muted flex-shrink-0">
                      <img
                        src={unit.thumbnailUrl}
                        alt={unit.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Unit Content */}
                  <div className="flex-1">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <CardTitle className="text-xl mb-2">{unit.title}</CardTitle>
                          <div className="flex items-start gap-2 text-muted-foreground mb-3">
                            <Lightbulb className="h-5 w-5 flex-shrink-0 mt-0.5 text-primary" />
                            <p className="text-sm font-medium italic">
                              {unit.bigQuestion}
                            </p>
                          </div>
                          {unit.description && (
                            <CardDescription className="text-sm">
                              {unit.description}
                            </CardDescription>
                          )}
                        </div>
                        <Badge
                          variant={progress.status === 'completed' ? 'default' : 'secondary'}
                        >
                          {progress.status}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Progress Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Credit Reserved</p>
                            <p className="text-sm font-semibold">{progress.hoursReserved}h</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Progress</p>
                            <p className="text-sm font-semibold">
                              {progress.sessionsCompleted}/{progress.sessionsTotal} sessions
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Completion</p>
                            <p className="text-sm font-semibold">{progressPercent.toFixed(0)}%</p>
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-2">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Link href={`/s-portal/units/${unit.id}`} className="flex-1">
                          <Button variant="default" className="w-full">
                            <ArrowRight className="h-4 w-4 mr-2" />
                            {progress.sessionsCompleted === 0 ? 'Start Learning' : 'Continue Learning'}
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
