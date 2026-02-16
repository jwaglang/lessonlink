'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  getTeacherProfileByUsername,
  getReviewsByTeacher,
  getCourses,
} from '@/lib/firestore';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  GraduationCap,
  MapPin,
  Globe,
  Star,
  Users,
  BookOpen,
  Clock,
  MessageSquare,
  Play,
  CheckCircle,
  Calendar,
  Award,
  Briefcase,
  Pin,
  Mail,
  Loader2,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { TeacherProfile, Review, Course } from '@/lib/types';
import type { PackageType, Duration } from '@/lib/pricing';
import Link from 'next/link';

// Package display config
const PACKAGES: { type: PackageType; label: string; icon: string; discount: string; description: string }[] = [
  { type: 'single', label: 'Single Session', icon: '🎯', discount: '', description: 'Perfect for trying out a lesson' },
  { type: '10-pack', label: '10-Pack', icon: '📦', discount: 'Save 10%', description: 'Great for short-term goals' },
  { type: 'full-course', label: 'Full Course', icon: '🎓', discount: 'Save 20%', description: 'Complete one proficiency level (60 hours)' },
];

// Price display helper (duplicates pricing.ts logic for client display only)
function getDisplayPrice(packageType: PackageType, duration: Duration): { perLesson: number; total: number; sessions: number } {
  const baseRates = { 30: 15.84, 60: 31.68 };
  const discounts = { single: 0, '10-pack': 0.10, 'full-course': 0.20 };
  const sessionCounts = { single: { 30: 1, 60: 1 }, '10-pack': { 30: 10, 60: 10 }, 'full-course': { 30: 120, 60: 60 } };

  const base = baseRates[duration];
  const discount = discounts[packageType];
  const sessions = sessionCounts[packageType][duration];
  const perLesson = +(base * (1 - discount)).toFixed(2);
  const total = +(perLesson * sessions).toFixed(2);

  return { perLesson, total, sessions };
}

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { user, loading: authLoading } = useAuth();

  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Purchase dialog state
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<Duration>(60);
  const [purchaseLoading, setPurchaseLoading] = useState<PackageType | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const teacherProfile = await getTeacherProfileByUsername(slug);

      if (!teacherProfile || !teacherProfile.isPublished) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setProfile(teacherProfile);

      const [teacherReviews, courseList] = await Promise.all([
        getReviewsByTeacher(teacherProfile.id),
        getCourses(),
      ]);

      setReviews(teacherReviews);
      setCourses(courseList);
      setLoading(false);
    }

    fetchData();
  }, [slug]);

  // Safe stats with defaults
  const stats = {
    rating: profile?.stats?.rating ?? 0,
    totalStudents: profile?.stats?.totalStudents ?? 0,
    totalLessons: profile?.stats?.totalLessons ?? 0,
    attendanceRate: profile?.stats?.attendanceRate ?? 0,
  };

  function openPurchaseDialog(course: Course) {
    setSelectedCourse(course);
    setSelectedDuration(60);
    setPurchaseLoading(null);
    setLinkLoading(false);
    setLinkSent(false);
  }

  function closePurchaseDialog() {
    setSelectedCourse(null);
    setPurchaseLoading(null);
    setLinkLoading(false);
    setLinkSent(false);
  }

  async function handlePurchase(packageType: PackageType) {
    if (!user || !user.email || !selectedCourse) return;
    setPurchaseLoading(packageType);

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageType,
          duration: selectedDuration,
          studentId: user.uid,
          studentEmail: user.email,
          courseId: selectedCourse.id,
          courseTitle: selectedCourse.title,
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('No checkout URL returned:', data);
        setPurchaseLoading(null);
      }
    } catch (err) {
      console.error('Purchase error:', err);
      setPurchaseLoading(null);
    }
  }

  async function handleSendLink(packageType: PackageType) {
    if (!user || !user.email || !selectedCourse) return;
    setLinkLoading(true);

    try {
      const res = await fetch('/api/stripe/send-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageType,
          duration: selectedDuration,
          studentId: user.uid,
          studentEmail: user.email,
          courseId: selectedCourse.id,
          courseTitle: selectedCourse.title,
        }),
      });

      const data = await res.json();
      if (data.url) {
        // For MVP: copy to clipboard
        await navigator.clipboard.writeText(data.url);
        setLinkSent(true);
      }
    } catch (err) {
      console.error('Send link error:', err);
    } finally {
      setLinkLoading(false);
    }
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <GraduationCap className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Tutor not found</h1>
        <p className="text-muted-foreground">This profile doesn&apos;t exist or is not public.</p>
        <Link href="/">
          <Button>Go Home</Button>
        </Link>
      </div>
    );
  }

  if (!profile) return null;

  const isLoggedIn = !!user;
  const pinnedReviews = reviews.filter(r => r.pinned);
  const regularReviews = reviews.filter(r => !r.pinned);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="font-headline text-xl primary-gradient-text">LessonLink</span>
          </Link>
          {isLoggedIn ? (
            <Link href="/s-portal">
              <Button variant="outline">My Portal</Button>
            </Link>
          ) : (
            <Link href="/">
              <Button>Sign In</Button>
            </Link>
          )}
        </div>
      </header>

      {/* Cover Image */}
      {profile.coverImageUrl && (
        <div className="h-48 md:h-64 bg-gradient-to-r from-primary/20 to-primary/5 overflow-hidden">
          <img
            src={profile.coverImageUrl}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Profile Header */}
      <div className="container mx-auto px-4">
        <div className={`flex flex-col md:flex-row gap-6 ${profile.coverImageUrl ? '-mt-16' : 'mt-8'}`}>
          {/* Avatar */}
          <div className="flex-shrink-0">
            <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
              <AvatarImage src={profile.avatarUrl} alt={profile.name} />
              <AvatarFallback className="text-3xl">{profile.name.charAt(0)}</AvatarFallback>
            </Avatar>
          </div>

          {/* Basic Info */}
          <div className="flex-1 pt-4 md:pt-8">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-3xl font-headline font-bold primary-gradient-text">{profile.name}</h1>
              {profile.isOnline && (
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  Online
                </Badge>
              )}
            </div>
            <p className="text-lg text-muted-foreground mb-2">{profile.headline}</p>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
              <span className="flex items-center gap-1">
                <Globe className="h-4 w-4" />
                {profile.nativeLanguage} (Native)
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {profile.cityLiving}, {profile.countryFrom}
              </span>
              {profile.teachingSince && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Teaching since {profile.teachingSince}
                </span>
              )}
            </div>

            {/* Specialties */}
            {profile.specialties && profile.specialties.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {profile.specialties.map(specialty => (
                  <Badge key={specialty} variant="outline">{specialty}</Badge>
                ))}
              </div>
            )}

            {/* Stats */}
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                <span className="font-bold">{stats.rating.toFixed(1)}</span>
                <span className="text-muted-foreground">Rating</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="font-bold">{stats.totalStudents}</span>
                <span className="text-muted-foreground">Learners</span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <span className="font-bold">{stats.totalLessons.toLocaleString()}</span>
                <span className="text-muted-foreground">Lessons</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-bold">{stats.attendanceRate}%</span>
                <span className="text-muted-foreground">Attendance</span>
              </div>
            </div>
          </div>

          {/* Quick Book Card (Desktop) */}
          <div className="hidden lg:block">
            <Card className="w-72">
              <CardHeader>
                <CardTitle className="text-lg">
                  {isLoggedIn ? 'Purchase a Package' : 'Book a Lesson'}
                </CardTitle>
                <CardDescription>
                  {isLoggedIn ? 'Select a course below' : 'Sign in to get started'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {courses.slice(0, 2).map(course => (
                  <Button
                    key={course.id}
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => isLoggedIn ? openPurchaseDialog(course) : router.push('/')}
                  >
                    <span className="truncate">{course.title}</span>
                    <span className="text-primary font-bold">€{getDisplayPrice('single', 60).perLesson}</span>
                  </Button>
                ))}
                <Button
                  className="w-full"
                  onClick={() => document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  View All Courses
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - About */}
          <div className="lg:col-span-2 space-y-8">
            {/* Video */}
            {profile.videoUrl && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Play className="h-5 w-5" />
                    Introduction Video
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                    <iframe
                      src={profile.videoUrl.replace('watch?v=', 'embed/')}
                      className="w-full h-full"
                      allowFullScreen
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tabs */}
            <Tabs defaultValue="about">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="about">About Me</TabsTrigger>
                <TabsTrigger value="teaching">Teaching Style</TabsTrigger>
                <TabsTrigger value="credentials">Credentials</TabsTrigger>
                <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="about" className="mt-6">
                <Card>
                  <CardContent className="pt-6 prose prose-sm max-w-none">
                    <p className="whitespace-pre-line">{profile.aboutMe}</p>

                    {profile.interests && profile.interests.length > 0 && (
                      <div className="mt-6">
                        <h4 className="font-semibold mb-2">Interests</h4>
                        <div className="flex flex-wrap gap-2">
                          {profile.interests.map(interest => (
                            <Badge key={interest} variant="secondary">{interest}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="teaching" className="mt-6 space-y-4">
                {profile.teachingPhilosophy && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Me as a Tutor</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-line">{profile.teachingPhilosophy}</p>
                    </CardContent>
                  </Card>
                )}

                {profile.lessonStyle && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">My Lessons &amp; Teaching Style</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-line">{profile.lessonStyle}</p>
                    </CardContent>
                  </Card>
                )}

                {profile.teachingMaterials && profile.teachingMaterials.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Teaching Materials</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2">
                        {profile.teachingMaterials.map(material => (
                          <div key={material} className="flex items-center gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            {material}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="credentials" className="mt-6 space-y-4">
                {profile.certificates && profile.certificates.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Award className="h-5 w-5" />
                        Certificates
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {profile.certificates.map((cert, i) => (
                        <div key={i} className="border-b last:border-0 pb-4 last:pb-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold">{cert.title}</h4>
                              <p className="text-sm text-muted-foreground">{cert.issuer} - {cert.year}</p>
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

                {profile.experience && profile.experience.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Briefcase className="h-5 w-5" />
                        Experience
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {profile.experience.map((exp, i) => (
                        <div key={i} className="border-b last:border-0 pb-4 last:pb-0">
                          <h4 className="font-semibold">{exp.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {exp.organization} {exp.location && `- ${exp.location}`}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {exp.startYear} - {exp.endYear || 'Present'}
                          </p>
                          {exp.description && (
                            <p className="text-sm mt-1">{exp.description}</p>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="reviews" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      {reviews.length} Reviews
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Pinned Reviews */}
                    {pinnedReviews.map(review => (
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
                                Tutor&apos;s Pick
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 my-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${i < review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
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
                    {regularReviews.map(review => (
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
                                  className={`h-4 w-4 ${i < review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
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
                      <p className="text-muted-foreground text-center py-4">No reviews yet.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Courses */}
          <div className="space-y-6" id="courses">
            <h2 className="text-2xl font-headline font-bold primary-gradient-text">Courses</h2>

            {courses.map(course => {
              const singlePrice = getDisplayPrice('single', 60);
              const fullCoursePrice = getDisplayPrice('full-course', 60);

              return (
                <Card key={course.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{course.title}</CardTitle>
                    <CardDescription>{course.pitch}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoggedIn ? (
                      /* Logged-in S — show pricing tiers + purchase button */
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>From €{fullCoursePrice.perLesson}/lesson</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            30 or 60 min
                          </span>
                        </div>
                        <Button className="w-full" onClick={() => openPurchaseDialog(course)}>
                          View Packages &amp; Purchase
                        </Button>
                      </div>
                    ) : (
                      /* Visitor — show starting price + sign up CTA */
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            30 or 60 min
                          </div>
                          <div className="text-right">
                            <span className="text-2xl font-bold text-primary">€{fullCoursePrice.perLesson}</span>
                            <p className="text-xs text-muted-foreground">from / lesson</p>
                          </div>
                        </div>
                        <Link href="/">
                          <Button className="w-full">Sign Up to Book</Button>
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {courses.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">No courses available yet.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Book Button */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
        <Button
          className="w-full"
          size="lg"
          onClick={() => document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' })}
        >
          {isLoggedIn ? 'View Packages & Purchase' : 'View Courses & Book'}
        </Button>
      </div>

      {/* Purchase Dialog (logged-in S only) */}
      <Dialog open={!!selectedCourse && isLoggedIn} onOpenChange={() => closePurchaseDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedCourse?.title}</DialogTitle>
            <DialogDescription>Choose your lesson duration and package</DialogDescription>
          </DialogHeader>

          {selectedCourse && (
            <div className="py-4 space-y-6">
              {/* Duration Toggle */}
              <div>
                <label className="text-sm font-medium mb-2 block">Lesson Duration</label>
                <div className="flex gap-2">
                  <Button
                    variant={selectedDuration === 30 ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setSelectedDuration(30)}
                  >
                    30 min
                  </Button>
                  <Button
                    variant={selectedDuration === 60 ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setSelectedDuration(60)}
                  >
                    60 min
                  </Button>
                </div>
              </div>

              {/* Package Options */}
              <div className="space-y-3">
                {PACKAGES.map(pkg => {
                  const price = getDisplayPrice(pkg.type, selectedDuration);
                  const isLoading = purchaseLoading === pkg.type;

                  return (
                    <div key={pkg.type} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span>{pkg.icon}</span>
                            <span className="font-semibold">{pkg.label}</span>
                            {pkg.discount && (
                              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                                {pkg.discount}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{pkg.description}</p>
                        </div>
                        <div className="text-right ml-4">
                          <div className="font-bold text-primary">€{price.perLesson}</div>
                          <div className="text-xs text-muted-foreground">/ lesson</div>
                          {price.sessions > 1 && (
                            <div className="text-xs text-muted-foreground">€{price.total.toLocaleString()} total</div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          className="flex-1"
                          size="sm"
                          disabled={!!purchaseLoading}
                          onClick={() => handlePurchase(pkg.type)}
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              Redirecting...
                            </>
                          ) : (
                            'Purchase'
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Processing fee note */}
              <p className="text-xs text-muted-foreground text-center">
                + 3% processing fee · Prices shown before fee
              </p>

              {/* Email payment link option */}
              <div className="border-t pt-4">
                {linkSent ? (
                  <p className="text-sm text-green-600 text-center flex items-center justify-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    Payment link copied to clipboard!
                  </p>
                ) : (
                  <Button
                    variant="ghost"
                    className="w-full text-sm"
                    disabled={linkLoading}
                    onClick={() => handleSendLink('single')}
                  >
                    {linkLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Generating link...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-1" />
                        Can&apos;t pay now? Get a payment link
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closePurchaseDialog}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
