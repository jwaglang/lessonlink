'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Loader2, Zap, PawPrint, Eye, ShoppingBag, Wand2 } from 'lucide-react';
import PageHeader from '@/components/page-header';
import { getSessionInstancesByTeacherUid, getStudentById } from '@/lib/firestore';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import type { SessionInstance, Student } from '@/lib/types';

// Import tab components
import CreateAccessoryTabContent from '@/app/t-portal/petland/_components/create-accessory-content';
import RefineAccessoryTabContent from '@/app/t-portal/petland/_components/refine-accessory-content';
import BrowsePetStatusTabContent from '@/app/t-portal/petland/_components/browse-pet-status-content';
import PetShopTabContent from '@/app/t-portal/petland/_components/pet-shop-content';

export default function PetlandPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('live-sessions');
  const [sessionInstances, setSessionInstances] = useState<SessionInstance[]>([]);
  const [studentsMap, setStudentsMap] = useState<Record<string, Student>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      if (!user?.uid) return;
      try {
        const instances = await getSessionInstancesByTeacherUid(user.uid);
        setSessionInstances(instances);

        const map: Record<string, Student> = {};
        for (const instance of instances) {
          if (!map[instance.studentId]) {
            const student = await getStudentById(instance.studentId);
            if (student) {
              map[instance.studentId] = student;
            }
          }
        }
        setStudentsMap(map);
      } catch (error) {
        console.error('Error fetching sessions:', error);
        toast({ title: 'Error loading sessions', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [user?.uid, toast]);

  const upcomingSessions = sessionInstances
    .filter(instance => {
      // Only show scheduled sessions (not completed or cancelled)
      if (instance.status !== 'scheduled') return false;
      
      if (!instance.lessonDate) return false;
      
      // Parse lessonDate which could be either:
      // - ISO format: "2026-04-13T00:00:00+01:00" or "2026-04-13T00:00:00Z"
      // - Simple format: "2026-04-13"
      let sessionDate: Date;
      try {
        // Try to parse as ISO first
        if (instance.lessonDate.includes('T')) {
          sessionDate = new Date(instance.lessonDate);
        } else {
          // Parse as YYYY-MM-DD
          sessionDate = new Date(instance.lessonDate + 'T00:00:00');
        }
      } catch {
        return false;
      }
      
      if (isNaN(sessionDate.getTime())) return false;
      
      // Get today's date in local timezone
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Extract just the date part of sessionDate (ignore time)
      const sessionDateOnly = new Date(sessionDate);
      sessionDateOnly.setHours(0, 0, 0, 0);
      
      return sessionDateOnly >= today;
    })
    .sort((a, b) => {
      try {
        const dateA = a.lessonDate?.includes('T') 
          ? new Date(a.lessonDate) 
          : new Date(a.lessonDate + 'T00:00:00');
        const dateB = b.lessonDate?.includes('T')
          ? new Date(b.lessonDate)
          : new Date(b.lessonDate + 'T00:00:00');
        return dateA.getTime() - dateB.getTime();
      } catch {
        return 0;
      }
    });

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <PageHeader
        title="Petland Management"
        description="Manage your learners' pets, accessories, and pet shop inventory."
        icon={Zap}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="live-sessions">
            <Zap className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Live Sessions</span>
          </TabsTrigger>
          <TabsTrigger value="create">
            <Wand2 className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Create</span>
          </TabsTrigger>
          <TabsTrigger value="refine">
            <PawPrint className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Refine</span>
          </TabsTrigger>
          <TabsTrigger value="pet-status">
            <Eye className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Pet Status</span>
          </TabsTrigger>
          <TabsTrigger value="pet-shop">
            <ShoppingBag className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Pet Shop</span>
          </TabsTrigger>
        </TabsList>

        {/* Live Sessions */}
        <TabsContent value="live-sessions" className="space-y-4 mt-6">
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">
              {upcomingSessions.length > 0 ? 'Upcoming Live Sessions' : 'No Upcoming Sessions'}
            </h2>
            {loading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="animate-spin h-5 w-5" />
                <span>Loading sessions...</span>
              </div>
            ) : upcomingSessions.length > 0 ? (
              <div className="space-y-2">
                {upcomingSessions.map(instance => {
                  const student = studentsMap[instance.studentId];
                  return (
                    <div key={instance.id} className="flex items-center justify-between gap-4 p-3 bg-white border border-yellow-200 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{student?.name || student?.email || instance.studentId}</div>
                        <div className="text-sm text-muted-foreground">
                          {instance.lessonDate?.split('T')[0]} at {instance.startTime}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          window.location.href = `/t-portal/petland/session/${instance.id}/prepare`;
                        }}
                      >
                        Prepare
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-muted-foreground">
                <p>No upcoming sessions scheduled.</p>
                {sessionInstances.length > 0 && (
                  <details className="mt-4 p-3 bg-yellow-100 rounded text-xs">
                    <summary>Debug: Found {sessionInstances.length} total sessions</summary>
                    <div className="mt-2 space-y-1">
                      {sessionInstances.slice(0, 5).map(s => (
                        <div key={s.id}>
                          {s.title || 'Untitled'} - {s.lessonDate} ({s.status})
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Create Accessory - inline content */}
        <TabsContent value="create">
          <CreateAccessoryTabContent />
        </TabsContent>

        {/* Refine Accessory - inline content */}
        <TabsContent value="refine">
          <RefineAccessoryTabContent />
        </TabsContent>

        {/* Browse Pet Status - inline content */}
        <TabsContent value="pet-status">
          <BrowsePetStatusTabContent />
        </TabsContent>

        {/* Pet Shop - inline content */}
        <TabsContent value="pet-shop">
          <PetShopTabContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}
