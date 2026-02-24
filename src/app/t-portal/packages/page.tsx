'use client';

import { useState, useEffect } from 'react';
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

import { getAllStudentCredits, getStudents, getCourses, deleteStudentCredit } from '@/lib/firestore';
import type { StudentCredit, Student, Course } from '@/lib/types';
import PackageForm from './components/package-form';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function PackagesPage() {
    const [credits, setCredits] = useState<StudentCredit[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedCredit, setSelectedCredit] = useState<StudentCredit | null>(null);
    const [creditToDelete, setCreditToDelete] = useState<StudentCredit | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setLoading(true);
        try {
            const [creditData, studentData, courseData] = await Promise.all([
                getAllStudentCredits(),
                getStudents(),
                getCourses(),
            ]);
            setCredits(creditData.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
            setStudents(studentData);
            setCourses(courseData);
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to load data.', variant: 'destructive'});
        } finally {
            setLoading(false);
        }
    }

    const handleAddClick = () => {
        setSelectedCredit(null);
        setIsDialogOpen(true);
    };
    
    const handleEditClick = (credit: StudentCredit) => {
        setSelectedCredit(credit);
        setIsDialogOpen(true);
    };
    
    const handleDeleteClick = (credit: StudentCredit) => {
        setCreditToDelete(credit);
    };

    const handleConfirmDelete = async () => {
        if (!creditToDelete) return;
        try {
            await deleteStudentCredit(creditToDelete.id);
            toast({ title: 'Success', description: 'Credit package deleted.' });
            fetchData(); // Refresh list
        } catch (error) {
            toast({ title: 'Error', description: 'Could not delete package.', variant: 'destructive' });
        } finally {
            setCreditToDelete(null);
        }
    };

    const handleFormSuccess = () => {
        setIsDialogOpen(false);
        fetchData(); // Refresh list
        setTimeout(() => {
            document.body.style.pointerEvents = '';
        }, 500);
    };

    const getStudentName = (id: string) => students.find(s => s.id === id)?.name || 'Unknown';
    const getCourseTitle = (id: string) => courses.find(c => c.id === id)?.title || 'Unknown';

    if (loading) {
        return <div className="p-8">Loading packages...</div>
    }

    return (
        <div className="flex flex-col gap-8 p-4 md:p-8">
            <PageHeader
                title="Student Packages"
                description="Manage credit packages for your students."
            >
                <Button onClick={handleAddClick}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    <span>Create Package</span>
                </Button>
            </PageHeader>

            <div className="rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Student</TableHead>
                            <TableHead>Course</TableHead>
                            <TableHead>Total Hours</TableHead>
                            <TableHead>Uncommitted</TableHead>
                            <TableHead>Committed</TableHead>
                            <TableHead>Completed</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead className="text-right"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {credits.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center">
                                    No packages found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            credits.map(credit => (
                                <TableRow key={credit.id}>
                                    <TableCell className="font-medium">{getStudentName(credit.studentId)}</TableCell>
                                    <TableCell>{getCourseTitle(credit.courseId ?? '')}</TableCell>
                                    <TableCell><Badge variant="secondary">{credit.totalHours}h</Badge></TableCell>
                                    <TableCell><Badge variant="default">{credit.uncommittedHours}h</Badge></TableCell>
                                    <TableCell>{credit.committedHours}h</TableCell>
                                    <TableCell>{credit.completedHours}h</TableCell>
                                    <TableCell>{format(new Date(credit.createdAt), 'MMM d, yyyy')}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleEditClick(credit)}>
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleDeleteClick(credit)} className="text-destructive">
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>


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
                        <DialogTitle>{selectedCredit ? 'Edit' : 'Create'} Student Package</DialogTitle>
                    </DialogHeader>
                    <PackageForm
                        students={students}
                        courses={courses}
                        credit={selectedCredit}
                        onSuccess={handleFormSuccess}
                    />
                </DialogContent>
            </Dialog>
            
            <AlertDialog open={!!creditToDelete} onOpenChange={() => setCreditToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Credit Package?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this credit package. This might prevent you from assigning units to this student if they have no other credit. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
