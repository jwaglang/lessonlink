'use client';

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
import { useAuth } from '@/components/auth-provider';
import { getStudents, getSessionInstancesByTeacherUid } from '@/lib/firestore';
import { BarChart, Users, DollarSign } from 'lucide-react';
import { format, isFuture, parseISO } from 'date-fns';
import RevenueChart from './reports/components/revenue-chart';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useEffect, useState } from 'react';
import type { Student, SessionInstance } from '@/lib/types';

type ConversionRate = {
  from: string;
  to: string;
  rate: number;
};

function instanceDateIso(instance: SessionInstance): string {
  const anyInst = instance as any;
  return anyInst.lessonDate || anyInst.date || '';
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [sessionInstances, setSessionInstances] = useState<SessionInstance[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [defaultCurrency, setDefaultCurrency] = useState('EUR');

  useEffect(() => {
    async function fetchData() {
      const studentData = await getStudents();
      setStudents(studentData);

      // Variant-1: no global dashboard fetch helper is exposed yet.
      // Keep dashboard stable with 0 sessions until we add e.g. getSessionInstancesByTeacherUid().
      const instanceData: SessionInstance[] = [];
      setSessionInstances(instanceData);

      const savedSettings = localStorage.getItem('lessonLinkSettings');
      let rates: ConversionRate[] = [
        { from: 'USD', to: 'EUR', rate: 0.92 },
        { from: 'RUB', to: 'EUR', rate: 0.01 },
        { from: 'CNY', to: 'EUR', rate: 0.13 },
      ];
      let currency = 'EUR';

      if (savedSettings) {
        const { currencySettings } = JSON.parse(savedSettings);
        if (currencySettings) {
          rates = currencySettings.conversionRates;
          currency = currencySettings.defaultCurrency;
          setDefaultCurrency(currency);
        }
      }

      const revenue = instanceData
        .filter((l: any) => l.status === 'paid' && l.paymentAmount && l.paymentCurrency)
        .reduce((sum: number, l: any) => {
          if (l.paymentCurrency === currency) return sum + l.paymentAmount!;
          const conversion = rates.find(r => r.from === l.paymentCurrency && r.to === currency);
          return conversion ? sum + (l.paymentAmount! * conversion.rate) : sum;
        }, 0);

      setTotalRevenue(revenue);
    }

    fetchData();
  }, []);

  const upcomingSessions = sessionInstances
    .filter((instance) => {
      const d = instanceDateIso(instance);
      return d ? isFuture(parseISO(d)) : false;
    })
    .sort((a, b) => new Date(instanceDateIso(a)).getTime() - new Date(instanceDateIso(b)).getTime())
    .slice(0, 5);

  const atRiskStudents = students.filter(
    (student) => student.status === 'MIA' || (student.prepaidPackage.balance <= 0 && student.status === 'currently enrolled')
  );

  const currencySymbols: { [key: string]: string } = {
    EUR: '€',
    USD: '$',
    GBP: '£',
    JPY: '¥',
  };

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8">
      <PageHeader title="Tutor Dashboard" />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">
              {currencySymbols[defaultCurrency] || '$'}{totalRevenue.toFixed(2)}
            </div>
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
            <CardTitle className="text-sm font-medium">Sessions This Month</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">
              {sessionInstances.length}
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
            <CardTitle className="font-headline">Upcoming Sessions</CardTitle>
            <CardDescription>
              Your next 5 scheduled sessions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingSessions.length > 0 ? (
              upcomingSessions.map((session: any) => {
                const student = students.find((st) => st.id === session.studentId);
                const studentImage = PlaceHolderImages.find(img => img.id === `student${student?.id}`);
                const dateIso = instanceDateIso(session);

                return (
                  <div key={session.id} className="flex items-center space-x-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={studentImage?.imageUrl} alt={student?.name} data-ai-hint={studentImage?.imageHint} />
                      <AvatarFallback>{student?.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium leading-none">{student?.name}</p>
                      <p className="text-sm text-muted-foreground">{session.title}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{dateIso ? format(parseISO(dateIso), 'MMM d') : ''}</p>
                      <p className="text-xs text-muted-foreground">{session.startTime}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming sessions.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">At-Risk Students</CardTitle>
          <CardDescription>Students who might need your attention.</CardDescription>
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
                      <p className="text-sm text-muted-foreground">{student.email}</p>
                    </div>
                  </div>
                  <Badge variant={student.status === 'MIA' ? 'destructive' : 'secondary'}>
                    {student.status === 'MIA' ? 'MIA' : 'Low Balance'}
                  </Badge>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">All students are in good standing!</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
