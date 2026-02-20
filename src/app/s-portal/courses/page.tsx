'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Star,
  BookOpen,
  Search,
  Library,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import {
  getCourses,
  getStudentById,
  updateStudent,
  getStudentProgressByStudentId,
} from '@/lib/firestore';
import type { Course, Student, StudentProgress } from '@/lib/types';
import Loading from '@/app/loading';
import { useAuth } from '@/components/auth-provider';

// ── Course card ──────────────────────────────────────────────────────────────

function CourseCard({
  course,
  isStarred,
  progress,
  onToggleStar,
}: {
  course: Course;
  isStarred: boolean;
  progress?: StudentProgress | null;
  onToggleStar: (id: string) => void;
}) {
  const pct = progress ? Math.round(progress.percentComplete) : null;

  return (
    <Card className="flex flex-col">
      {/* Thumbnail */}
      {course.thumbnailUrl && (
        <div className="relative h-36 w-full overflow-hidden rounded-t-lg bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-headline primary-gradient-text leading-tight">
            {course.title}
          </CardTitle>
          <button
            onClick={() => onToggleStar(course.id)}
            className="flex-shrink-0 text-muted-foreground hover:text-yellow-500 transition-colors"
            aria-label={isStarred ? 'Remove from starred' : 'Star this course'}
          >
            <Star
              className={`h-4 w-4 ${isStarred ? 'fill-yellow-400 text-yellow-400' : ''}`}
            />
          </button>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">{course.pitch}</p>
      </CardHeader>

      <CardContent className="flex-grow space-y-3 pt-0">
        {/* Progress bar (only if enrolled) */}
        {pct !== null && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                {pct >= 100 ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Clock className="h-3.5 w-3.5" />
                )}
                {pct >= 100 ? 'Completed' : 'In progress'}
              </span>
              <span>{pct}%</span>
            </div>
            <Progress value={pct} className="h-1.5" />
          </div>
        )}

        {/* Enrolled badge */}
        {progress && (
          <Badge variant="secondary" className="text-xs">
            {progress.sessionsCompleted}/{progress.sessionsTotal} sessions
          </Badge>
        )}
      </CardContent>

      {/* Actions */}
      <div className="p-4 pt-0">
        <Button asChild size="sm" className="w-full">
          <Link href={`/s-portal/units?courseId=${course.id}`}>
            <Library className="h-3.5 w-3.5 mr-1.5" />
            {progress ? 'Continue' : 'View Units'}
          </Link>
        </Button>
      </div>
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CoursesPage() {
  const { user } = useAuth();

  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [student, setStudent] = useState<Student | null>(null);
  const [progressList, setProgressList] = useState<StudentProgress[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchData() {
      const [courses, studentData] = await Promise.all([
        getCourses(),
        user ? getStudentById(user.uid) : Promise.resolve(null),
      ]);
      setAllCourses(courses);
      setStudent(studentData);

      if (studentData) {
        const prog = await getStudentProgressByStudentId(studentData.id);
        setProgressList(prog);
      }

      setLoading(false);
    }
    fetchData();
  }, [user]);

  // Toggle star
  const handleToggleStar = async (courseId: string) => {
    if (!student || !user) return;
    const current = student.starredCourseIds ?? [];
    const updated = current.includes(courseId)
      ? current.filter((id) => id !== courseId)
      : [...current, courseId];
    setStudent({ ...student, starredCourseIds: updated });
    await updateStudent(user.uid, { starredCourseIds: updated });
  };

  const starredIds = student?.starredCourseIds ?? [];

  // Map courseId → most recent StudentProgress entry
  const progressByCourse = useMemo(() => {
    const map = new Map<string, StudentProgress>();
    progressList.forEach((p) => {
      if (!map.has(p.courseId)) {
        map.set(p.courseId, p);
      }
    });
    return map;
  }, [progressList]);

  // Courses the student is enrolled in (has at least one progress entry)
  const enrolledCourseIds = useMemo(
    () => new Set(progressList.map((p) => p.courseId)),
    [progressList]
  );

  const myCourses = useMemo(
    () => allCourses.filter((c) => enrolledCourseIds.has(c.id)),
    [allCourses, enrolledCourseIds]
  );

  const starredCourses = useMemo(
    () => allCourses.filter((c) => starredIds.includes(c.id)),
    [allCourses, starredIds]
  );

  // Filtered browse results
  const filteredCourses = useMemo(() => {
    if (!searchQuery) return allCourses;
    const q = searchQuery.toLowerCase();
    return allCourses.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.pitch?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)
    );
  }, [allCourses, searchQuery]);

  if (loading) return <Loading />;

  return (
    <div className="flex flex-col gap-10 p-4 md:p-8">
      <PageHeader
        title="Courses"
        description="Browse all courses, save your favourites, and track your progress."
      />

      {/* ── Section 1: Browse All Courses ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Browse Courses</h2>
        </div>
        <p className="text-sm text-muted-foreground -mt-2">
          Search by title or description.
        </p>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search courses…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {filteredCourses.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                isStarred={starredIds.includes(course.id)}
                progress={progressByCourse.get(course.id) ?? null}
                onToggleStar={handleToggleStar}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-10 text-center">
              <BookOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">No courses match your search.</p>
              <p className="text-sm text-muted-foreground mt-1">Try a different keyword.</p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* ── Section 2: Starred Courses ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500 fill-yellow-400" />
          <h2 className="text-lg font-semibold">Starred</h2>
        </div>
        <p className="text-sm text-muted-foreground -mt-2">
          Courses you've saved for later.
        </p>
        {starredCourses.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {starredCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                isStarred={true}
                progress={progressByCourse.get(course.id) ?? null}
                onToggleStar={handleToggleStar}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-3xl mb-3">🦗</p>
              <p className="text-muted-foreground font-medium">It's a little quiet right now…</p>
              <p className="text-sm text-muted-foreground mt-1">
                Star a course from the browse list to save it here.
              </p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* ── Section 3: My Courses (enrolled) ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Library className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">My Courses</h2>
        </div>
        <p className="text-sm text-muted-foreground -mt-2">
          Courses you are currently enrolled in.
        </p>
        {myCourses.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {myCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                isStarred={starredIds.includes(course.id)}
                progress={progressByCourse.get(course.id) ?? null}
                onToggleStar={handleToggleStar}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-3xl mb-3">🦗</p>
              <p className="text-muted-foreground font-medium">It's a little quiet right now…</p>
              <p className="text-sm text-muted-foreground mt-1">
                You haven't been enrolled in any courses yet.
              </p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
