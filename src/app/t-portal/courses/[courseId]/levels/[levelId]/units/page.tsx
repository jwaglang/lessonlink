'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, ArrowLeft, Edit, Trash2, MoreVertical, ListOrdered, UserPlus } from 'lucide-react';
import type { StudentCredit } from '@/lib/types';
import Link from 'next/link';
import { 
  onUnitsUpdate, 
  getLevelById, 
  deleteUnit, 
  getSessionsByUnitId, 
  reserveCredit, 
  getStudentCredit,
  getStudents,
  createMessage
} from '@/lib/firestore';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import UnitForm from './components/unit-form';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function UnitsPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const courseId = params.courseId as string;
    const levelId = params.levelId as string;
    const [units, setUnits] = useState<any[]>([]);
    const [levelName, setLevelName] = useState('Loading...');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedUnit, setSelectedUnit] = useState<any>(null);
    const [viewingUnit, setViewingUnit] = useState<any>(null);
    const [unitSessions, setUnitSessions] = useState<any[]>([]);
    const [loadingSessions, setLoadingSessions] = useState(false);
    const [students, setStudents] = useState<any[]>([]);
    const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
    const [assigningUnit, setAssigningUnit] = useState<any>(null);
    const [selectedStudent, setSelectedStudent] = useState<string>('');
    const [isAssigning, setIsAssigning] = useState(false);
    const [studentCreditInfo, setStudentCreditInfo] = useState<StudentCredit | null>(null);

    useEffect(() => {
        // Fetch level name
        getLevelById(levelId).then(level => {
            if (level) {
                setLevelName(level.title);
            }
        });

        // Fetch students
        getStudents().then(studentList => {
            setStudents(studentList);
        });

        // Set up real-time listener for units
        const unsubscribe = onUnitsUpdate(levelId, (data) => {
            setUnits(data);
        });

        return () => unsubscribe();
    }, [levelId]);

    const handleAddClick = () => {
        setSelectedUnit(null);
        setIsDialogOpen(true);
    };

    const handleEditClick = (unit: any) => {
        setSelectedUnit(unit);
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this unit? This action cannot be undone.')) {
            try {
                await deleteUnit(id);
                toast({ title: 'Success', description: 'Unit deleted successfully.' });
            } catch (error) {
                toast({ title: 'Error', description: 'Failed to delete unit.', variant: 'destructive' });
            }
        }
    };

    const handleFormSuccess = () => {
        setIsDialogOpen(false);
        setTimeout(() => {
            document.body.style.pointerEvents = '';
        }, 500);
    };

    const handleCardClick = async (unit: any) => {
        setViewingUnit(unit);
        setLoadingSessions(true);
        try {
            const sessions = await getSessionsByUnitId(unit.id);
            setUnitSessions(sessions);
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to load sessions.', variant: 'destructive' });
        } finally {
            setLoadingSessions(false);
        }
    };

    const handleSessionClick = (unitId: string) => {
        router.push(`/t-portal/courses/${courseId}/levels/${levelId}/units/${unitId}/sessions`);
    };

    const handleCloseModal = () => {
        setViewingUnit(null);
        setUnitSessions([]);
    };

    const handleAssignClick = (unit: any) => {
        setAssigningUnit(unit);
        setSelectedStudent('');
        setStudentCreditInfo(null);
        setIsAssignDialogOpen(true);
    };

    const handleAssignUnit = async () => {
        if (!selectedStudent || !assigningUnit || !studentCreditInfo) return;
        
        setIsAssigning(true);
        try {
            const student = students.find(s => s.id === selectedStudent);
            
            // Reserve credit
            const result = await reserveCredit(
                selectedStudent, 
                courseId, 
                assigningUnit.estimatedHours
            );
            
            if (!result.success) {
                toast({ 
                    title: 'Cannot Assign', 
                    description: result.message, 
                    variant: 'destructive' 
                });
                setIsAssigning(false);
                return;
            }
            
            // TODO: Create studentProgress entry
            
            // ✅ NEW: Send notification to student
            await createMessage({
                type: 'notification',
                from: 'system',
                to: selectedStudent,
                content: `Your teacher assigned the unit "${assigningUnit.title}" to you! Start learning by exploring the Big Question: ${assigningUnit.bigQuestion}`,
                timestamp: new Date().toISOString(),
                read: false,
                relatedEntity: {
                    type: 'unit',
                    id: assigningUnit.id
                },
                actionLink: '/s-portal/units'
            });
            
            toast({ 
                title: 'Success', 
                description: `Unit "${assigningUnit.title}" assigned to ${student.name}! ${assigningUnit.estimatedHours}h reserved. Notification sent.` 
            });
            
            setIsAssignDialogOpen(false);
            setAssigningUnit(null);
            setSelectedStudent('');
            setStudentCreditInfo(null);
            
            // CRITICAL FIX: Force cleanup of body pointer-events
            setTimeout(() => {
                document.body.style.pointerEvents = '';
            }, 500);
        } catch (error) {
            toast({ 
                title: 'Error', 
                description: 'Failed to assign unit.', 
                variant: 'destructive' 
            });
        } finally {
            setIsAssigning(false);
        }
    };

    const handleStudentSelect = async (studentId: string) => {
        setSelectedStudent(studentId);
        
        // Fetch student's credit for this course
        const credit = await getStudentCredit(studentId, courseId);
        setStudentCreditInfo(credit || null);
    };

    return (
        <div className="flex flex-col gap-8 p-4 md:p-8">
            <div className="flex items-center gap-4">
                <Link href="/t-portal/courses">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <PageHeader
                    title={levelName}
                    description="Manage units for this level. Each unit contains 4-5 sessions."
                >
                    <Button onClick={handleAddClick}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        <span>Add Unit</span>
                    </Button>
                </PageHeader>
            </div>

            {units.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-12 text-center">
                    <h3 className="text-xl font-semibold">No Units Yet</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Click "Add Unit" to create your first unit with a Big Question.
                    </p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {units.map(unit => (
                        <Card 
                            key={unit.id} 
                            className="flex flex-col cursor-pointer hover:shadow-lg transition-shadow"
                            onClick={() => handleCardClick(unit)}
                        >
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <CardTitle className="font-headline text-lg mb-2">{unit.title}</CardTitle>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 -mt-2 -mr-2">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleAssignClick(unit); }}>
                                                <UserPlus className="mr-2 h-4 w-4" />
                                                Assign to Student
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditClick(unit); }}>
                                                <Edit className="mr-2 h-4 w-4" />
                                                Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDelete(unit.id); }} className="text-destructive">
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <p className="text-sm text-primary font-medium mb-4">
                                    🎯 {unit.bigQuestion}
                                </p>
                                <p className="text-sm text-muted-foreground line-clamp-3">
                                    {unit.description}
                                </p>
                            </CardContent>
                            <CardFooter className="text-xs text-muted-foreground bg-muted/50 p-3 mt-auto">
                                Order: {unit.order} &bull; {unit.estimatedHours}h estimated
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
                        <DialogTitle>{selectedUnit ? 'Edit' : 'Add'} Unit</DialogTitle>
                    </DialogHeader>
                    <UnitForm 
                        levelId={levelId}
                        unit={selectedUnit}
                        onSuccess={handleFormSuccess}
                    />
                </DialogContent>
            </Dialog>

            {/* Sessions Preview Modal */}
            <Dialog open={!!viewingUnit} onOpenChange={(open) => {
                if (!open) {
                    handleCloseModal();
                    setTimeout(() => {
                        document.body.style.pointerEvents = '';
                    }, 500);
                }
            }}>
                <DialogContent className="sm:max-w-[800px]">
                    <DialogHeader>
                        <DialogTitle>{viewingUnit?.title} - Sessions</DialogTitle>
                    </DialogHeader>
                    {loadingSessions ? (
                        <div className="flex items-center justify-center p-12">
                            <p className="text-muted-foreground">Loading sessions...</p>
                        </div>
                    ) : unitSessions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center">
                            <p className="text-muted-foreground">No sessions yet for this unit.</p>
                            <Button 
                                onClick={() => handleSessionClick(viewingUnit.id)} 
                                className="mt-4"
                                variant="outline"
                            >
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Sessions
                            </Button>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 max-h-[500px] overflow-y-auto p-2">
                            {unitSessions.map(session => (
                                <Card 
                                    key={session.id}
                                    className="cursor-pointer hover:shadow-md transition-shadow"
                                    onClick={() => handleSessionClick(viewingUnit.id)}
                                >
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base font-headline">{session.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {session.thumbnailUrl && (
                                            <img 
                                                src={session.thumbnailUrl} 
                                                alt={session.title}
                                                className="w-full h-32 object-cover rounded-md mb-3"
                                            />
                                        )}
                                        <p className="text-xs text-primary font-medium">
                                            🤔 {session.littleQuestion}
                                        </p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Assign Unit Dialog */}
            <Dialog open={isAssignDialogOpen} onOpenChange={(open) => {
                setIsAssignDialogOpen(open);
                if (!open) {
                    setAssigningUnit(null);
                    setSelectedStudent('');
                    setTimeout(() => {
                        document.body.style.pointerEvents = '';
                    }, 500);
                }
            }}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Assign Unit to Student</DialogTitle>
                    </DialogHeader>
                    
                    {assigningUnit && (
                        <div className="space-y-6">
                            {/* Unit Preview */}
                            <div className="rounded-lg border bg-muted/50 p-4">
                                <h4 className="font-semibold mb-2">{assigningUnit.title}</h4>
                                <p className="text-sm text-primary font-medium mb-2">
                                    🎯 {assigningUnit.bigQuestion}
                                </p>
                                <div className="flex gap-4 text-xs text-muted-foreground">
                                    <span>{assigningUnit.estimatedHours} hours</span>
                                    <span>&bull;</span>
                                    <span>Order: {assigningUnit.order}</span>
                                </div>
                            </div>

                            {/* Student Selection */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Select Student</label>
                                <Select value={selectedStudent} onValueChange={handleStudentSelect}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose a student..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {students.map(student => (
                                            <SelectItem key={student.id} value={student.id}>
                                                {student.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {selectedStudent && studentCreditInfo && (
                                    <div className="rounded-lg border bg-muted/50 p-3 space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Uncommitted:</span>
                                            <span className="font-semibold">{studentCreditInfo.uncommittedHours}h</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Required:</span>
                                            <span className="font-semibold">{assigningUnit.estimatedHours}h</span>
                                        </div>
                                        {studentCreditInfo.uncommittedHours < assigningUnit.estimatedHours && (
                                            <p className="text-xs text-destructive mt-2">
                                                ⚠️ Insufficient credit to assign this unit
                                            </p>
                                        )}
                                    </div>
                                )}
                                {selectedStudent && !studentCreditInfo && (
                                    <p className="text-xs text-amber-600">
                                        ⚠️ No credit found for this student in this course
                                    </p>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-2">
                                <Button 
                                    variant="outline" 
                                    onClick={() => setIsAssignDialogOpen(false)}
                                    disabled={isAssigning}
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    onClick={handleAssignUnit}
                                    disabled={!selectedStudent || !studentCreditInfo || 
                                              studentCreditInfo.uncommittedHours < assigningUnit.estimatedHours || 
                                              isAssigning}
                                >
                                    {isAssigning ? 'Assigning...' : 'Assign Unit'}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
