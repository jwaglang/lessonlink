'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Star,
  Users,
  BookOpen,
  GraduationCap,
  Eye,
  Library,
  Search,
  Globe,
  UserCheck,
} from 'lucide-react';
import { getAllTeacherProfiles, getStudentById, updateStudent, getTeacherProfileById } from '@/lib/firestore';
import type { TeacherProfile, Student } from '@/lib/types';
import Loading from '@/app/loading';
import { useAuth } from '@/components/auth-provider';

// ── Tutor card ──────────────────────────────────────────────────────────────

function TutorCard({
  profile,
  isStarred,
  onToggleStar,
}: {
  profile: TeacherProfile;
  isStarred: boolean;
  onToggleStar: (id: string) => void;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16 border flex-shrink-0">
            <AvatarImage src={profile.avatarUrl} alt={profile.name} />
            <AvatarFallback>{profile.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base font-headline primary-gradient-text leading-tight">
                {profile.name}
              </CardTitle>
              <button
                onClick={() => onToggleStar(profile.id)}
                className="flex-shrink-0 text-muted-foreground hover:text-yellow-500 transition-colors"
                aria-label={isStarred ? 'Remove from starred' : 'Star this tutor'}
              >
                <Star
                  className={`h-4 w-4 ${isStarred ? 'fill-yellow-400 text-yellow-400' : ''}`}
                />
              </button>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{profile.headline}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-3 pt-0">
        {/* Languages */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Globe className="h-3.5 w-3.5 flex-shrink-0" />
          <span>
            {[profile.nativeLanguage, ...(profile.otherLanguages ?? [])].join(', ')}
          </span>
        </div>

        {/* Specialties */}
        {profile.specialties && profile.specialties.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {profile.specialties.slice(0, 3).map((s) => (
              <Badge key={s} variant="secondary" className="text-xs">
                {s}
              </Badge>
            ))}
          </div>
        )}

        {/* Stats */}
        {profile.stats && (
          <div className="flex gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 text-yellow-500" />
              <span>{(profile.stats.rating ?? 0).toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              <span>{profile.stats.totalStudents ?? 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5" />
              <span>{(profile.stats.totalLessons ?? 0).toLocaleString()}</span>
            </div>
          </div>
        )}
      </CardContent>

      {/* Actions */}
      <div className="p-4 pt-0 grid grid-cols-2 gap-2">
        <Button asChild variant="outline" size="sm" className="w-full">
          <Link href={`/t/${profile.username}`} target="_blank">
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            Profile
          </Link>
        </Button>
        <Button asChild size="sm" className="w-full">
          <Link href={`/s-portal/t-profiles/${profile.username}/courses`}>
            <Library className="h-3.5 w-3.5 mr-1.5" />
            Courses
          </Link>
        </Button>
      </div>
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function TProfilesPage() {
  const { user } = useAuth();

  const [allProfiles, setAllProfiles] = useState<TeacherProfile[]>([]);
  const [student, setStudent] = useState<Student | null>(null);
  const [assignedTutor, setAssignedTutor] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');

  useEffect(() => {
    async function fetchData() {
      const [profiles, studentData] = await Promise.all([
        getAllTeacherProfiles(true),
        user ? getStudentById(user.uid) : Promise.resolve(null),
      ]);
      setAllProfiles(profiles);
      setStudent(studentData);

      // Fetch assigned tutor profile if exists
      if (studentData?.assignedTeacherId) {
        const assigned = await getTeacherProfileById(studentData.assignedTeacherId);
        setAssignedTutor(assigned);
      }

      setLoading(false);
    }
    fetchData();
  }, [user]);

  // Toggle star
  const handleToggleStar = async (tutorId: string) => {
    if (!student || !user) return;
    const current = student.starredTutorIds ?? [];
    const updated = current.includes(tutorId)
      ? current.filter((id) => id !== tutorId)
      : [...current, tutorId];
    const updatedStudent = { ...student, starredTutorIds: updated };
    setStudent(updatedStudent);
    await updateStudent(user.uid, { starredTutorIds: updated });
  };

  const starredIds = student?.starredTutorIds ?? [];

  // Collect all unique languages across all profiles for the filter dropdown
  const allLanguages = useMemo(() => {
    const langs = new Set<string>();
    allProfiles.forEach((p) => {
      langs.add(p.nativeLanguage);
      p.otherLanguages?.forEach((l) => langs.add(l));
    });
    return Array.from(langs).sort();
  }, [allProfiles]);

  // Filtered browse results
  const filteredProfiles = useMemo(() => {
    return allProfiles.filter((p) => {
      const matchesSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.headline?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.specialties?.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesLanguage =
        !languageFilter ||
        p.nativeLanguage === languageFilter ||
        p.otherLanguages?.includes(languageFilter);

      return matchesSearch && matchesLanguage;
    });
  }, [allProfiles, searchQuery, languageFilter]);

  const starredProfiles = useMemo(
    () => allProfiles.filter((p) => starredIds.includes(p.id)),
    [allProfiles, starredIds]
  );

  if (loading) return <Loading />;

  return (
    <div className="flex flex-col gap-10 p-4 md:p-8">
      <PageHeader
        title="Tutors"
        description="Find the perfect tutor, save your favourites, and see who you're working with."
      />

      {/* ── Section 1: Browse All Tutors ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Browse Tutors</h2>
        </div>
        <p className="text-sm text-muted-foreground -mt-2">
          Search by name, specialty, or filter by language.
        </p>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or specialty…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 min-w-[160px]"
          >
            <option value="">All Languages</option>
            {allLanguages.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </div>

        {/* Results */}
        {filteredProfiles.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProfiles.map((profile) => (
              <TutorCard
                key={profile.id}
                profile={profile}
                isStarred={starredIds.includes(profile.id)}
                onToggleStar={handleToggleStar}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-10 text-center">
              <GraduationCap className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">No tutors match your search.</p>
              <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters.</p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* ── Section 2: Starred Tutors ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500 fill-yellow-400" />
          <h2 className="text-lg font-semibold">Starred</h2>
        </div>
        <p className="text-sm text-muted-foreground -mt-2">
          Tutors you've saved for later.
        </p>
        {starredProfiles.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {starredProfiles.map((profile) => (
              <TutorCard
                key={profile.id}
                profile={profile}
                isStarred={true}
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
                Star a tutor from the browse list to save them here.
              </p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* ── Section 3: My Tutors (currently working with) ── */}
      {assignedTutor && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">My Tutors</h2>
          </div>
          <p className="text-sm text-muted-foreground -mt-2">
            Tutors you are currently taking classes with.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <TutorCard
              profile={assignedTutor}
              isStarred={starredIds.includes(assignedTutor.id)}
              onToggleStar={handleToggleStar}
            />
          </div>
        </section>
      )}
    </div>
  );
}
