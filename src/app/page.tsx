import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/page-header';
import { getStudents, getLessons } from '@/lib/data';
import { BarChart, Clock, Users, DollarSign } from 'lucide-react';
import { format, isFuture, parseISO } from 'date-fns';
import RevenueChart from './reports/components/revenue-chart';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default async function DashboardPage() {
  const students = await getStudents();
  const lessons = await getLessons();

  const upcomingLessons = lessons
    .filter((lesson) => isFuture(parseISO(lesson.date)))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  const atRiskStudents = students.filter(
    (student) => student.status === 'MIA' || (student.prepaidPackage.balance <= 0 && student.status === 'currently enrolled')
  );

  const totalRevenue = lessons
    .filter((l) => l.status === 'paid')
    .reduce((sum, l) => {
        const student = students.find(s => s.id === l.studentId);
        if (student) {
            return sum + (student.prepaidPackage.initialValue / 20); // Assuming 20 lessons per package
        }
        return sum;
    }, 0);


  return (
    <div className="flex flex-col gap-8 p-4 md:p-8">
      <PageHeader title="Dashboard" />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">+20.1% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">
              {students.filter(s => s.status === 'currently enrolled').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Total of {students.length} students
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lessons This Month</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">
              {lessons.length}
            </div>
            <p className="text-xs text-muted-foreground">+10 from last month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="font-headline">Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart />
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="font-headline">Upcoming Lessons</CardTitle>
            <CardDescription>
              Your next 5 scheduled lessons.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingLessons.length > 0 ? (
              upcomingLessons.map((lesson) => {
                const student = students.find((s) => s.id === lesson.studentId);
                const studentImage = PlaceHolderImages.find(img => img.id === `student${student?.id}`);
                return (
                  <div key={lesson.id} className="flex items-center space-x-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={studentImage?.imageUrl} alt={student?.name} data-ai-hint={studentImage?.imageHint} />
                      <AvatarFallback>
                        {student?.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium leading-none">{student?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {lesson.title}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {format(parseISO(lesson.date), 'MMM d')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {lesson.startTime}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">
                No upcoming lessons.
              </p>
            )}
          </CardContent>
        </Card>
        
      </div>
      <Card>
          <CardHeader>
            <CardTitle className="font-headline">At-Risk Students</CardTitle>
            <CardDescription>
              Students who might need your attention.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {atRiskStudents.length > 0 ? (
              atRiskStudents.map((student) => {
                 const studentImage = PlaceHolderImages.find(img => img.id === `student${student?.id}`);
                return (
                  <div key={student.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-10 w-10">
                         <AvatarImage src={studentImage?.imageUrl} alt={student.name} data-ai-hint={studentImage?.imageHint} />
                        <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{student.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {student.email}
                        </p>
                      </div>
                    </div>
                    <Badge variant={student.status === 'MIA' ? 'destructive' : 'secondary'}>
                      {student.status === 'MIA' ? 'MIA' : 'Low Balance'}
                    </Badge>
                  </div>
                )
              })
            ) : (
              <p className="text-sm text-muted-foreground">
                All students are in good standing!
              </p>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
