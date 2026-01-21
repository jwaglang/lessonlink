'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  getTeacherProfileByUsername,
  getReviewsByTeacher,
  getCourseTemplates,
  getAvailableSlots,
} from '@/lib/firestore';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  ChevronLeft,
  ChevronRight,
  Award,
  Briefcase,
  Pin,
} from 'lucide-react';
import { format, parseISO, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isFuture, startOfDay } from 'date-fns';
import type { TeacherProfile, Review, CourseTemplate, Availability } from '@/lib/types';
import Link from 'next/link';

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [courses, setCourses] = useState<CourseTemplate[]>([]);
  const [availableSlots, setAvailableSlots] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Booking dialog state
  const [selectedCourse, setSelectedCourse] = useState<CourseTemplate | null>(null);
  const [bookingStep, setBookingStep] = useState<'type' | 'time'>('type');
  const [selectedType, setSelectedType] = useState<'lesson' | 'package'>('lesson');
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Availability | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    async function fetchData() {
      const teacherProfile = await getTeacherProfileByUsername(slug);
      
      if (!teacherProfile || !teacherProfile.isPublished) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setProfile(teacherProfile);

      const [teacherReviews, courseList, slots] = await Promise.all([
        getReviewsByTeacher(teacherProfile.id),
        getCourseTemplates(),
        getAvailableSlots(),
      ]);

      setReviews(teacherReviews);
      setCourses(courseList);
      setAvailableSlots(slots);
      setLoading(false);
    }

    fetchData();
  }, [slug]);

  function openBookingDialog(course: CourseTemplate) {
    setSelectedCourse(course);
    setBookingStep('type');
    setSelectedType('lesson');
    setSelectedPackage(null);
    setSelectedSlot(null);
  }

  function closeBookingDialog() {
    setSelectedCourse(null);
    setBookingStep('type');
    setSelectedType('lesson');
    setSelectedPackage(null);
    setSelectedSlot(null);
  }

  function proceedToTimeSelection() {
    setBookingStep('time');
  }

  function handleBookNow() {
    // Redirect to login with booking info in query params
    const bookingInfo = {
      course: selectedCourse?.id,
      type: selectedType,
      package: selectedPackage,
      slot: selectedSlot?.id,
      date: selectedSlot?.date,
      time: selectedSlot?.time,
    };
    router.push(`/?redirect=/s-portal/calendar&booking=${encodeURIComponent(JSON.stringify(bookingInfo))}`);
  }

  if (loading) {
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
        <h1 className="text-2xl font-bold">Teacher not found</h1>
        <p className="text-muted-foreground">This profile doesn't exist or is not public.</p>
        <Link href="/">
          <Button>Go Home</Button>
        </Link>
      </div>
    );
  }

  if (!profile) return null;

  const pinnedReviews = reviews.filter(r => r.pinned);
  const regularReviews = reviews.filter(r => !r.pinned);

  // Time slot selection
  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const futureSlots = availableSlots.filter(slot => {
    const slotDate = parseISO(slot.date);
    return isFuture(slotDate) || startOfDay(slotDate).getTime() === startOfDay(new Date()).getTime();
  });

  const slotsByDay = days.map(day => {
    const daySlots = futureSlots.filter(slot => {
      const slotDate = startOfDay(parseISO(slot.date));
      return slotDate.getTime() === startOfDay(day).getTime();
    }).sort((a, b) => a.time.localeCompare(b.time));
    return { date: day, slots: daySlots };
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="font-headline text-xl primary-gradient-text">LessonLink</span>
          </Link>
          <Link href="/">
            <Button>Sign In</Button>
          </Link>
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
                <span className="font-bold">{profile.stats.rating.toFixed(1)}</span>
                <span className="text-muted-foreground">Rating</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="font-bold">{profile.stats.totalStudents}</span>
                <span className="text-muted-foreground">Students</span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <span className="font-bold">{profile.stats.totalLessons.toLocaleString()}</span>
                <span className="text-muted-foreground">Lessons</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-bold">{profile.stats.attendanceRate}%</span>
                <span className="text-muted-foreground">Attendance</span>
              </div>
            </div>
          </div>

          {/* Book Now Card (Desktop) */}
          <div className="hidden lg:block">
            <Card className="w-72">
              <CardHeader>
                <CardTitle className="text-lg">Book a Lesson</CardTitle>
                <CardDescription>Start learning today</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {courses.slice(0, 2).map(course => (
                  <Button
                    key={course.id}
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => openBookingDialog(course)}
                  >
                    <span className="truncate">{course.title}</span>
                    <span className="text-primary font-bold">${course.rate}</span>
                  </Button>
                ))}
                <Button className="w-full" onClick={() => document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' })}>
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
                      <CardTitle className="text-lg">Me as a Teacher</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-line">{profile.teachingPhilosophy}</p>
                    </CardContent>
                  </Card>
                )}

                {profile.lessonStyle && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">My Lessons & Teaching Style</CardTitle>
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
                                Teacher's Pick
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
            
            {courses.map(course => (
              <Card key={course.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{course.title}</CardTitle>
                  <CardDescription>{course.pitch}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {course.duration} min
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-primary">${course.rate}</span>
                      {course.packageOptions && course.packageOptions.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Package with {course.packageOptions[0].discount}% off
                        </p>
                      )}
                    </div>
                  </div>
                  <Button className="w-full" onClick={() => openBookingDialog(course)}>
                    Book Now
                  </Button>
                </CardContent>
              </Card>
            ))}

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
        <Button className="w-full" size="lg" onClick={() => document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' })}>
          View Courses & Book
        </Button>
      </div>

      {/* Booking Dialog */}
      <Dialog open={!!selectedCourse} onOpenChange={() => closeBookingDialog()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Book: {selectedCourse?.title}</DialogTitle>
            <DialogDescription>
              {bookingStep === 'type' ? 'Choose single lesson or package' : 'Select a time slot'}
            </DialogDescription>
          </DialogHeader>

          {bookingStep === 'type' && selectedCourse && (
            <div className="py-4 space-y-4">
              {/* Single Lesson */}
              <div
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${selectedType === 'lesson' ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground'}`}
                onClick={() => { setSelectedType('lesson'); setSelectedPackage(null); }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Single Lesson</h4>
                    <p className="text-sm text-muted-foreground">{selectedCourse.duration} minutes</p>
                  </div>
                  <span className="text-xl font-bold text-primary">${selectedCourse.rate}</span>
                </div>
              </div>

              {/* Package Options */}
              {selectedCourse.packageOptions?.map((pkg, i) => (
                <div
                  key={i}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${selectedType === 'package' && selectedPackage === i ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground'}`}
                  onClick={() => { setSelectedType('package'); setSelectedPackage(i); }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">{pkg.lessons} Lesson Package</h4>
                      <p className="text-sm text-muted-foreground">
                        {pkg.discount}% off · ${(pkg.price / pkg.lessons).toFixed(2)} per lesson
                      </p>
                    </div>
                    <span className="text-xl font-bold text-primary">${pkg.price}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {bookingStep === 'time' && (
            <div className="py-4">
              {/* Week Navigation */}
              <div className="flex items-center justify-between mb-4">
                <span className="font-medium">
                  {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d')}
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => setCurrentDate(addDays(currentDate, -7))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                    This Week
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => setCurrentDate(addDays(currentDate, 7))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Time Slots Grid */}
              <div className="grid grid-cols-7 gap-2">
                {slotsByDay.map(({ date, slots }) => (
                  <div key={date.toISOString()} className="text-center">
                    <p className="text-xs font-medium mb-1">{format(date, 'EEE')}</p>
                    <p className="text-sm font-bold mb-2">{format(date, 'd')}</p>
                    <div className="space-y-1">
                      {slots.slice(0, 4).map(slot => (
                        <Button
                          key={slot.id}
                          variant={selectedSlot?.id === slot.id ? 'default' : 'outline'}
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => setSelectedSlot(slot)}
                        >
                          {slot.time}
                        </Button>
                      ))}
                      {slots.length === 0 && (
                        <p className="text-xs text-muted-foreground">-</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            {bookingStep === 'type' ? (
              <>
                <Button variant="outline" onClick={closeBookingDialog}>Cancel</Button>
                <Button onClick={proceedToTimeSelection}>Next: Choose Time</Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setBookingStep('type')}>Back</Button>
                <Button onClick={handleBookNow} disabled={!selectedSlot}>
                  Continue to Login
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
