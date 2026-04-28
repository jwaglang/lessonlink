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

import { getAllStudentPackages, getStudents, deleteStudentCredit } from '@/lib/firestore';
import type { StudentPackage, Student } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';

function toDate(value: any): Date {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (typeof value === 'string') return parseISO(value);
  if (typeof value.toDate === 'function') return value.toDate();
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  return new Date(value);
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, string> = {
    active:    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    expired:   'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    paused:    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  };
  return (
    <Badge variant="secondary" className={config[status] ?? ''}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export default function PackagesPage() {
    const [packages, setPackages] = useState<StudentPackage[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [pkgToDelete, setPkgToDelete] = useState<StudentPackage | null>(null);
    const { toast } = useToast();

    useEffect(() => { fetchData(); }, []);

    async function fetchData() {
        setLoading(true);
        try {
            const [pkgData, studentData] = await Promise.all([
                getAllStudentPackages(),
                getStudents(),
            ]);
            setPackages(pkgData);
            setStudents(studentData);
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to load packages.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }

    const getStudentName = (id: string) => students.find(s => s.id === id)?.name ?? 'Unknown';

    // Assign package numbers per student (oldest = 1)
    const packageNumMap = new Map<string, number>();
    const byStudent = new Map<string, StudentPackage[]>();
    for (const pkg of packages) {
        if (!byStudent.has(pkg.studentId)) byStudent.set(pkg.studentId, []);
        byStudent.get(pkg.studentId)!.push(pkg);
    }
    for (const [, pkgs] of byStudent) {
        const sorted = [...pkgs].sort((a, b) => a.purchaseDate.localeCompare(b.purchaseDate));
        sorted.forEach((pkg, i) => packageNumMap.set(pkg.id, i + 1));
    }

    if (loading) return <div className="p-8">Loading packages...</div>;

    return (
        <div className="flex flex-col gap-8 p-4 md:p-8">
            <PageHeader
                title="Packages"
                description="All learner packages and their credit status."
            />

            <div className="rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Learner</TableHead>
                            <TableHead>#</TableHead>
                            <TableHead>Course</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Total Hours</TableHead>
                            <TableHead>Remaining</TableHead>
                            <TableHead>Purchased</TableHead>
                            <TableHead>Expires</TableHead>
                            <TableHead className="text-right"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {packages.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} className="h-24 text-center">
                                    No packages found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            packages.map(pkg => (
                                <TableRow key={pkg.id}>
                                    <TableCell className="font-medium">{getStudentName(pkg.studentId)}</TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        P{packageNumMap.get(pkg.id) ?? '—'}
                                    </TableCell>
                                    <TableCell>{pkg.courseTitle}</TableCell>
                                    <TableCell><StatusBadge status={pkg.status} /></TableCell>
                                    <TableCell><Badge variant="secondary">{pkg.totalHours}h</Badge></TableCell>
                                    <TableCell>{pkg.hoursRemaining}h</TableCell>
                                    <TableCell>{format(toDate(pkg.purchaseDate), 'MMM d, yyyy')}</TableCell>
                                    <TableCell>{format(toDate(pkg.expiresAt), 'MMM d, yyyy')}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => setPkgToDelete(pkg)} className="text-destructive">
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

            <AlertDialog open={!!pkgToDelete} onOpenChange={() => setPkgToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this package?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This permanently deletes the package record. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={async () => {
                                if (!pkgToDelete) return;
                                try {
                                    // TODO: add deleteStudentPackage to firestore.ts
                                    toast({ title: 'Deleted', description: 'Package removed.' });
                                    setPackages(prev => prev.filter(p => p.id !== pkgToDelete.id));
                                } catch {
                                    toast({ title: 'Error', description: 'Could not delete.', variant: 'destructive' });
                                } finally {
                                    setPkgToDelete(null);
                                }
                            }}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
