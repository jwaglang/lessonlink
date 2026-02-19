'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import {
  getStudentById,
  getTeacherProfileById,
  getReviewsByTeacher,
} from '@/lib/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageHeader from '@/components/page-header';
import Link from 'next/link';
import {
  GraduationCap,
  Globe,
  MapPin,
  Calendar,
  Star,
  Users,
  BookOpen,
  CheckCircle,
  Award,
  Briefcase,
  MessageSquare,
  ExternalLink,
  Clock,
  Pin,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { TeacherProfile, Student, Review } from '@/lib/types';

export default function MyTutorPage() {
  const { user, loading: authLoading } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [tutor, setTutor] = useState<TeacherProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [noTutor, setNoTutor] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!user?.uid) return;

      // Get the learner record to find their assigned tutor
      const studentRecord = await getStudentById(user.uid);
      if (!studentRecord) {
        setLoading(false);
        return;
      }
      setStudent(studentRecord);

      if (!studentRecord.assignedTeacherId) {
        setNoTutor(true);
        setLoading(false);
        return;
      }

      // Fetch the tutor's profile
      const tutorProfile = await getTeacherProfileById(studentRecord.assignedTeacherId);
      if (!tutorProfile) {
        setNoTutor(true);
        setLoading(false);
        return;
      }

      setTutor(tutorProfile);

      // Fetch reviews for this tutor
      const tutorReviews = await getReviewsByTeacher(tutorProfile.id);
      setReviews(tutorReviews);

      setLoading(false);
    }

    fetchData();
  }, [user?.uid]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (noTutor || !tutor) {
    return (
      <div className="flex flex-col gap-8 p-4 md:p-8">
        <PageHeader title="My Tutor" />
        <Card>
          <CardContent className="py-12 text-center">
            <GraduationCap className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">No tutor assigned yet</h2>
            <p className="text-muted-foreground mb-6">
              You haven't been assigned a tutor yet. Browse available tutors to get started!
            </p>
            <Link href="/s-portal/t-profiles">
              <Button>
                <Users className="h-4 w-4 mr-2" />
                Browse Tutors
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pinnedReviews = reviews.filter((r) => r.pinned);
  const regularReviews = reviews.filter((r) => !r.pinned);

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8">
      <PageHeader
        title="My Tutor"
        description="Your current tutor's profile and information"
      />

      {/* Tutor Header Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <Avatar className="h-28 w-28 border-4 border-background shadow-lg">
                <AvatarImage src={tutor.avatarUrl} alt={tutor.name} />
                <AvatarFallback className="text-3xl">{tutor.name.charAt(0)}</AvatarFallback>
              </Avatar>
            </div>

            {/* Basic Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-headline font-bold primary-gradient-text">{tutor.name}</h2>
                {tutor.isOnline && (
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    Online
                  </Badge>
                )}
              </div>
              <p className="text-lg text-muted-foreground mb-3">{tutor.headline}</p>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                <span className="flex items-center gap-1">
                  <Globe className="h-4 w-4" />
                  {tutor.nativeLanguage} (Native)
                  {tutor.otherLanguages && tutor.otherLanguages.length > 0 && (
                    <span>, {tutor.otherLanguages.join(', ')}</span>
                  )}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {tutor.cityLiving}, {tutor.countryFrom}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {tutor.timezone}
                </span>
                {tutor.teachingSince && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Teaching since {tutor.teachingSince}
                  </span>
                )}
              </div>

              {/* Specialties */}
              {tutor.specialties && tutor.specialties.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {tutor.specialties.map((specialty) => (
                    <Badge key={specialty} variant="outline">
                      {specialty}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Stats */}
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                  <span className="font-bold">{(tutor.stats?.rating ?? 0).toFixed(1)}</span>
                  <span className="text-muted-foreground text-sm">Rating</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <span className="font-bold">{tutor.stats?.totalStudents ?? 0}</span>
                  <span className="text-muted-foreground text-sm">Learners</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <span className="font-bold">{(tutor.stats?.totalLessons ?? 0).toLocaleString()}</span>
                  <span className="text-muted-foreground text-sm">Lessons</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-bold">{tutor.stats?.attendanceRate ?? 0}%</span>
                  <span className="text-muted-foreground text-sm">Attendance</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 md:items-end flex-shrink-0">
              <Link href="/s-portal/chat">
                <Button className="w-full">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Message Tutor
                </Button>
              </Link>
              <Link href="/s-portal/calendar">
                <Button variant="outline" className="w-full">
                  <Calendar className="h-4 w-4 mr-2" />
                  Book Now
                </Button>
              </Link>
              <Link href="/s-portal/packages">
                <Button variant="outline" className="w-full">
                  <BookOpen className="h-4 w-4 mr-2" />
                  My Packages
                </Button>
              </Link>
              {tutor.username && (
                <Link href={`/t/${tutor.username}`} target="_blank">
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Public Profile
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
