
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, BookOpen, Clock, Library } from 'lucide-react';
import { getTeacherProfileByUsername, getCourseTemplates } from '@/lib/firestore';
import type { TeacherProfile, CourseTemplate } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Loading from '@/app/loading';
import { calculateLessonPrice } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

function TeacherCoursesPageContent() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [courses, setCourses] = useState<CourseTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;

    async function fetchData() {
      const [teacherProfile, courseList] = await Promise.all([
        getTeacherProfileByUsername(username),
        getCourseTemplates() // Currently all courses are for Teacher Jon
      ]);

      if (!teacherProfile) {
        // Handle teacher not found, maybe redirect
        router.push('/s-portal/t-profiles');
        return;
      }

      setProfile(teacherProfile);
      setCourses(courseList);
      setLoading(false);
    }
    fetchData();
  }, [username, router]);

  if (loading || !profile) {
    return <Loading />;
  }

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8">
      <div className="mb-6">
          <Link href="/s-portal/t-profiles">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Teachers
            </Button>
          </Link>
        </div>

      <PageHeader
        title={`Courses by ${profile.name}`}
        description={`Browse and select a course to book`}
      />

      {courses.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => {
            const thumbnailUrl = PlaceHolderImages.find(p => p.id === course.thumbnailUrl)?.imageUrl || 'https://placehold.co/400x225';
            return (
              <Card key={course.id} className="flex flex-col">
                <CardHeader className="p-0">
                  <div className="relative h-40 w-full">
                    <Image src={thumbnailUrl} alt={course.title} fill style={{ objectFit: 'cover' }} className="rounded-t-lg" />
                  </div>
                  <div className="p-6 pb-2">
                    <CardTitle className="font-headline text-xl mb-2">{course.title}</CardTitle>
                    <CardDescription>{course.pitch}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow p-6 pt-2 space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">30 min - ${calculateLessonPrice(course.hourlyRate, 30).toFixed(2)}</Badge>
                    <Badge variant="outline">60 min - ${calculateLessonPrice(course.hourlyRate, 60, course.discount60min).toFixed(2)}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3">{course.description}</p>
                </CardContent>
                <div className="p-6 pt-0">
                   <Link href={`/s-portal/calendar?courseId=${course.id}`}>
                      <Button className="w-full">
                          <BookOpen className="h-4 w-4 mr-2" />
                          Book This Course
                      </Button>
                  </Link>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
            <CardContent className="py-8 text-center">
                <Library className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">{profile.name} has not added any courses yet.</p>
            </CardContent>
        </Card>
      )}

    </div>
  );
}

export default function TeacherCoursesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <TeacherCoursesPageContent />
    </Suspense>
  )
}
