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
        description="Your assigned tutor's profile and information"
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
                  <span className="font-bold">{tutor.stats.rating.toFixed(1)}</span>
                  <span className="text-muted-foreground text-sm">Rating</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <span className="font-bold">{tutor.stats.totalStudents}</span>
                  <span className="text-muted-foreground text-sm">Learners</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <span className="font-bold">{tutor.stats.totalLessons.toLocaleString()}</span>
                  <span className="text-muted-foreground text-sm">Lessons</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-bold">{tutor.stats.attendanceRate}%</span>
                  <span className="text-muted-foreground text-sm">Attendance</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 md:items-end flex-shrink-0">
              <Link href="/s-portal/chat">
                <Button>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Message Tutor
                </Button>
              </Link>
              <Link href="/s-portal/calendar">
                <Button variant="outline">
                  <Calendar className="h-4 w-4 mr-2" />
                  Book a Session
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

      {/* Tabbed Content */}
      <Tabs defaultValue="about">
        <TabsList>
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="teaching">Teaching Style</TabsTrigger>
          <TabsTrigger value="credentials">Credentials</TabsTrigger>
          <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
        </TabsList>

        {/* About Tab */}
        <TabsContent value="about" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>About {tutor.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="whitespace-pre-line text-sm leading-relaxed">{tutor.aboutMe}</p>

              {tutor.interests && tutor.interests.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Interests</h4>
                  <div className="flex flex-wrap gap-2">
                    {tutor.interests.map((interest) => (
                      <Badge key={interest} variant="secondary">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Teaching Style Tab */}
        <TabsContent value="teaching" className="mt-6 space-y-4">
          {tutor.teachingPhilosophy && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Me as a Tutor</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-sm leading-relaxed">
                  {tutor.teachingPhilosophy}
                </p>
              </CardContent>
            </Card>
          )}

          {tutor.lessonStyle && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">My Lessons & Teaching Style</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-sm leading-relaxed">
                  {tutor.lessonStyle}
                </p>
              </CardContent>
            </Card>
          )}

          {tutor.teachingMaterials && tutor.teachingMaterials.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Teaching Materials</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {tutor.teachingMaterials.map((material) => (
                    <div key={material} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      {material}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {!tutor.teachingPhilosophy && !tutor.lessonStyle && (!tutor.teachingMaterials || tutor.teachingMaterials.length === 0) && (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Your tutor hasn't added teaching style details yet.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Credentials Tab */}
        <TabsContent value="credentials" className="mt-6 space-y-4">
          {tutor.certificates && tutor.certificates.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Certificates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {tutor.certificates.map((cert, i) => (
                  <div key={i} className="border-b last:border-0 pb-4 last:pb-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{cert.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {cert.issuer} — {cert.year}
                        </p>
                        {cert.description && (
                          <p className="text-sm mt-1">{cert.description}</p>
                        )}
                      </div>
                      {cert.verified && (
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {tutor.experience && tutor.experience.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Experience
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {tutor.experience.map((exp, i) => (
                  <div key={i} className="border-b last:border-0 pb-4 last:pb-0">
                    <h4 className="font-semibold">{exp.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {exp.organization}
                      {exp.location && ` — ${exp.location}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {exp.startYear} – {exp.endYear || 'Present'}
                    </p>
                    {exp.description && (
                      <p className="text-sm mt-1">{exp.description}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {(!tutor.certificates || tutor.certificates.length === 0) &&
            (!tutor.experience || tutor.experience.length === 0) && (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    Your tutor hasn't added credentials yet.
                  </p>
                </CardContent>
              </Card>
            )}
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                {reviews.length} Review{reviews.length !== 1 ? 's' : ''}
              </CardTitle>
              {reviews.length > 0 && (
                <CardDescription>
                  Average rating: {(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)} / 5
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Pinned Reviews */}
              {pinnedReviews.map((review) => (
                <div key={review.id} className="border rounded-lg p-4 bg-primary/5">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={review.studentAvatarUrl} />
                      <AvatarFallback>{review.studentName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{review.studentName}</span>
                        <Badge variant="secondary" className="text-xs">
                          <Pin className="h-3 w-3 mr-1" />
                          Tutor's Pick
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 my-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < review.rating
                                ? 'text-yellow-500 fill-yellow-500'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-sm">{review.comment}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(parseISO(review.createdAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Regular Reviews */}
              {regularReviews.map((review) => (
                <div key={review.id} className="border-b last:border-0 pb-4 last:pb-0">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={review.studentAvatarUrl} />
                      <AvatarFallback>{review.studentName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <span className="font-semibold">{review.studentName}</span>
                      <div className="flex items-center gap-1 my-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < review.rating
                                ? 'text-yellow-500 fill-yellow-500'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-sm">{review.comment}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(parseISO(review.createdAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {reviews.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  No reviews yet. Be the first to leave one after a session!
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
