'use client';

import { useEffect, useState } from 'react';
import {
  getApprovalRequests,
  resolveApprovalRequest,
} from '@/lib/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageHeader from '@/components/page-header';
import { Check, X, UserPlus, CalendarClock, CalendarX, Clock, Package } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { ApprovalRequest, ApprovalRequestType } from '@/lib/types';

const requestTypeLabels: Record<ApprovalRequestType, string> = {
  new_student_booking: 'New Student',
  late_reschedule: 'Late Reschedule',
  late_cancel: 'Late Cancel',
  package_extension: 'Package Extension',
  pause_request: 'Pause Request',
};

const requestTypeIcons: Record<ApprovalRequestType, React.ReactNode> = {
  new_student_booking: <UserPlus className="h-4 w-4" />,
  late_reschedule: <CalendarClock className="h-4 w-4" />,
  late_cancel: <CalendarX className="h-4 w-4" />,
  package_extension: <Clock className="h-4 w-4" />,
  pause_request: <Package className="h-4 w-4" />,
};

export default function ApprovalsPage() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    request: ApprovalRequest;
    action: 'approved' | 'denied';
  } | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    setLoading(true);
    const allRequests = await getApprovalRequests();
    // Sort by date, newest first
    allRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setRequests(allRequests);
    setLoading(false);
  }

  async function handleResolve(requestId: string, resolution: 'approved' | 'denied') {
    setProcessingId(requestId);
    try {
      await resolveApprovalRequest(requestId, resolution);
      // Update local state
      setRequests(prev => prev.map(r => 
        r.id === requestId 
          ? { ...r, status: resolution, resolvedAt: new Date().toISOString() }
          : r
      ));
    } catch (error) {
      console.error('Failed to resolve request:', error);
    } finally {
      setProcessingId(null);
      setConfirmAction(null);
    }
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const resolvedRequests = requests.filter(r => r.status !== 'pending');

  function RequestCard({ request }: { request: ApprovalRequest }) {
    const isPending = request.status === 'pending';
    
    return (
      <Card className={!isPending ? 'opacity-70' : ''}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {requestTypeIcons[request.type]}
              <Badge variant={isPending ? 'default' : request.status === 'approved' ? 'secondary' : 'destructive'}>
                {isPending ? requestTypeLabels[request.type] : request.status}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">
              {format(parseISO(request.createdAt), 'MMM d, h:mm a')}
            </span>
          </div>
          <CardTitle className="text-lg mt-2">{request.studentName}</CardTitle>
          <CardDescription>{request.studentEmail}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {request.lessonTitle && (
              <p><strong>Course:</strong> {request.lessonTitle}</p>
            )}
            {request.lessonDate && request.lessonTime && (
              <p>
                <strong>Original:</strong> {format(parseISO(request.lessonDate), 'EEE, MMM d')} at {request.lessonTime}
              </p>
            )}
            {request.newDate && request.newTime && (
              <p>
                <strong>Requested:</strong> {format(parseISO(request.newDate), 'EEE, MMM d')} at {request.newTime}
              </p>
            )}
            {request.reason && (
              <p className="text-muted-foreground">{request.reason}</p>
            )}
          </div>

          {isPending && (
            <div className="flex gap-2 mt-4">
              <Button
                size="sm"
                onClick={() => setConfirmAction({ request, action: 'approved' })}
                disabled={processingId === request.id}
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmAction({ request, action: 'denied' })}
                disabled={processingId === request.id}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-1" />
                Deny
              </Button>
            </div>
          )}

          {!isPending && request.resolvedAt && (
            <p className="text-xs text-muted-foreground mt-4">
              Resolved {format(parseISO(request.resolvedAt), 'MMM d, h:mm a')}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8">
      <PageHeader
        title="Approvals"
        description="Review and manage booking requests from students."
      />

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              Pending
              {pendingRequests.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {pendingRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6">
            {pendingRequests.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pendingRequests.map(request => (
                  <RequestCard key={request.id} request={request} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <Check className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p className="text-muted-foreground">No pending approvals!</p>
                  <p className="text-sm text-muted-foreground">You're all caught up.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="resolved" className="mt-6">
            {resolvedRequests.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {resolvedRequests.map(request => (
                  <RequestCard key={request.id} request={request} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">No resolved requests yet.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.action === 'approved' ? 'Approve' : 'Deny'} Request?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.action === 'approved' ? (
                <>
                  This will approve {confirmAction.request.studentName}'s request.
                  {confirmAction.request.type === 'new_student_booking' && ' The lesson will be confirmed.'}
                  {confirmAction.request.type === 'late_reschedule' && ' The lesson will be rescheduled.'}
                  {confirmAction.request.type === 'late_cancel' && ' The lesson will be cancelled.'}
                </>
              ) : (
                <>
                  This will deny {confirmAction?.request.studentName}'s request. 
                  {confirmAction?.request.type === 'new_student_booking' && ' The booking will not proceed.'}
                  {confirmAction?.request.type === 'late_reschedule' && ' The lesson will keep its original time.'}
                  {confirmAction?.request.type === 'late_cancel' && ' The lesson will remain scheduled.'}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmAction && handleResolve(confirmAction.request.id, confirmAction.action)}
              className={confirmAction?.action === 'denied' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {confirmAction?.action === 'approved' ? 'Approve' : 'Deny'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
