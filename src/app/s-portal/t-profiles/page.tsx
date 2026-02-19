'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Star, Users, BookOpen, GraduationCap, Eye, Library } from 'lucide-react';
import { getAllTeacherProfiles } from '@/lib/firestore';
import type { TeacherProfile } from '@/lib/types';
import Loading from '@/app/loading';

export default function TProfilesPage() {
  const [profiles, setProfiles] = useState<TeacherProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfiles() {
      const teacherProfiles = await getAllTeacherProfiles(true); // only published
      setProfiles(teacherProfiles);
      setLoading(false);
    }
    fetchProfiles();
  }, []);

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8">
      <PageHeader
        title="Browse Tutors"
        description="Find the perfect tutor for your personal goals."
      />

      {profiles.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
            <Card key={profile.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <Avatar className="h-20 w-20 border">
                    <AvatarImage src={profile.avatarUrl} alt={profile.name} />
                    <AvatarFallback>{profile.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <CardTitle className="text-xl font-headline primary-gradient-text">{profile.name}</CardTitle>
                    <CardDescription className="line-clamp-2">{profile.headline}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-grow space-y-4">
                <div className="flex flex-wrap gap-2">
                  {profile.specialties?.slice(0, 3).map((specialty) => (
                    <Badge key={specialty} variant="secondary">{specialty}</Badge>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span>{profile.stats.rating.toFixed(1)} Rating</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{profile.stats.totalStudents} Students</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    <span>{profile.stats.totalLessons.toLocaleString()} Lessons</span>
                  </div>
                </div>
              </CardContent>
              <div className="p-6 pt-0 grid grid-cols-2 gap-2">
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/t/${profile.username}`} target="_blank">
                    <Eye className="h-4 w-4 mr-2" />
                    View Profile
                  </Link>
                </Button>
                <Button asChild className="w-full">
                  <Link href={`/s-portal/t-profiles/${profile.username}/courses`}>
                    <Library className="h-4 w-4 mr-2" />
                    View Courses
                  </Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <GraduationCap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No teachers are available right now.</p>
            <p className="text-sm text-muted-foreground">Please check back later.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
