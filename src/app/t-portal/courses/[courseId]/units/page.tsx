'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, ArrowLeft, Edit, Trash2, MoreVertical, ListOrdered } from 'lucide-react';
import Link from 'next/link';
import { onUnitsUpdate, getCourseTemplateById, deleteUnit } from '@/lib/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import UnitForm from './components/unit-form';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

export default function UnitsPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const courseId = params.courseId as string;
    
    const [units, setUnits] = useState<any[]>([]);
    const [courseName, setCourseName] = useState('Loading...');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedUnit, setSelectedUnit] = useState<any>(null);

    useEffect(() => {
        // Fetch course name
        getCourseTemplateById(courseId).then(course => {
            if (course) {
                setCourseName(course.title);
            }
        });

        // Set up real-time listener for units
        const unsubscribe = onUnitsUpdate(courseId, (data) => {
            setUnits(data);
        });

        return () => unsubscribe();
    }, [courseId]);

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

    return (
        <div className="flex flex-col gap-8 p-4 md:p-8">
            <div className="flex items-center gap-4">
                <Link href="/t-portal/courses">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <PageHeader
                    title={`Units: ${courseName}`}
                    description="Manage units for this course. Each unit contains 4-5 sessions."
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
                        <Card key={unit.id} className="flex flex-col">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <CardTitle className="font-headline text-lg mb-2">{unit.title}</CardTitle>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 -mt-2 -mr-2">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleEditClick(unit)}>
                                                <Edit className="mr-2 h-4 w-4" />
                                                Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => router.push(`/t-portal/courses/${courseId}/units/${unit.id}/sessions`)}>
                                                <ListOrdered className="mr-2 h-4 w-4" />
                                                Manage Sessions
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleDelete(unit.id)} className="text-destructive">
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

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{selectedUnit ? 'Edit' : 'Add'} Unit</DialogTitle>
                    </DialogHeader>
                    <UnitForm 
                        courseId={courseId}
                        unit={selectedUnit}
                        onSuccess={handleFormSuccess}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
