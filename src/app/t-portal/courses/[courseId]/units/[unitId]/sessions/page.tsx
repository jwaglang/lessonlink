'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { onSessionsUpdate, getUnitById, deleteSession } from '@/lib/firestore';

import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import SessionForm from './components/session-form';
import { PlusCircle, ArrowLeft, Edit, Trash2, MoreVertical, Clock } from 'lucide-react';
import Link from 'next/link';

export default function SessionsPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const courseId = params.courseId as string;
    const unitId = params.unitId as string;
    
    const [sessions, setSessions] = useState<any[]>([]);
    const [unit, setUnit] = useState<any>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState<any>(null);

    useEffect(() => {
        if (!unitId) return;

        // Safety: Force cleanup of any stuck pointer-events
        document.body.style.pointerEvents = '';

        // Fetch parent unit details
        getUnitById(unitId).then(unitData => {
            if (unitData) {
                setUnit(unitData);
            }
        });

        // Set up real-time listener for sessions
        const unsubscribe = onSessionsUpdate(unitId, (data) => {
            setSessions(data);
        });

        return () => unsubscribe();
    }, [unitId]);

    const handleAddClick = () => {
        setSelectedSession(null);
        setIsDialogOpen(true);
    };

    const handleEditClick = (session: any) => {
        setSelectedSession(session);
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
            try {
                await deleteSession(id);
                toast({ title: 'Success', description: 'Session deleted successfully.' });
            } catch (error) {
                toast({ title: 'Error', description: 'Failed to delete session.', variant: 'destructive' });
            }
        }
    };

    const handleFormSuccess = () => {
        setIsDialogOpen(false);
        // This timeout is a workaround for a potential issue with Radix dialogs
        // not cleaning up pointer-events on the body tag quickly enough.
        setTimeout(() => {
            document.body.style.pointerEvents = '';
        }, 500);
    };

    if (!unit) {
        return <div className="p-8">Loading unit details...</div>;
    }

    return (
        <div className="flex flex-col gap-8 p-4 md:p-8">
            <div className="flex items-start gap-4">
                <Link href={`/t-portal/courses/${courseId}/units`}>
                    <Button variant="ghost" size="icon" className="mt-2">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <PageHeader
                        title={`Sessions: ${unit.title}`}
                        description={`🎯 ${unit.bigQuestion}`}
                    >
                        <Button onClick={handleAddClick}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            <span>Add Session</span>
                        </Button>
                    </PageHeader>
                </div>
            </div>

            {sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-12 text-center">
                    <h3 className="text-xl font-semibold">No Sessions Yet</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Click "Add Session" to create your first session for this unit.
                    </p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {sessions.map(session => (
                        <Card key={session.id} className="flex flex-col">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <CardTitle className="font-headline text-lg mb-2">{session.title}</CardTitle>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 -mt-2 -mr-2">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleEditClick(session)}>
                                                <Edit className="mr-2 h-4 w-4" />
                                                Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleDelete(session.id)} className="text-destructive">
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <p className="text-sm text-primary font-medium mb-4">
                                    🤔 {session.littleQuestion}
                                </p>
                                <p className="text-sm text-muted-foreground line-clamp-3">
                                    {session.description}
                                </p>
                            </CardContent>
                            <CardFooter className="text-xs text-muted-foreground bg-muted/50 p-3 mt-auto flex justify-between">
                                <span>Order: {session.order}</span>
                                <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> {session.duration} min
                                </span>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}

                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) {
                        setTimeout(() => {
                            document.body.style.pointerEvents = '';
                        }, 500);
                    }
                }}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{selectedSession ? 'Edit' : 'Add'} Session</DialogTitle>
                    </DialogHeader>
                    <SessionForm 
                        courseId={courseId}
                        unitId={unitId}
                        session={selectedSession}
                        onSuccess={handleFormSuccess}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
