'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarFooter,
  SidebarContent,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Users,
  Calendar,
  BarChart2,
  Settings,
  BookOpenCheck,
  Library,
  ClipboardCheck,
  Shield,
  LogOut,
  BookOpen,
  MessageSquare,
  CreditCard,
  Bell,
  Clock,
  CalendarClock,
} from 'lucide-react';
import { GradientIcon } from './gradient-icon';
import { logOut } from '@/lib/auth';
import { ThemeToggle } from './theme-toggle';
import { Badge } from '@/components/ui/badge';
import {
  getApprovalRequests,
  onCoursesUpdate,
  getLevelsByCourseId,
  getUnitsByLevelId,
  Course,
  Level,
  Unit,
} from '@/lib/firestore';
import { Button } from './ui/button';
import { useAuth } from './auth-provider';

interface CourseWithDetails extends Course {
  levels?: LevelWithDetails[];
}

interface LevelWithDetails extends Level {
  units?: Unit[];
}

/* ── Delay constants (ms) ── */
const OPEN_DELAY = 500;       // main menu hover → open
const SUB_OPEN_DELAY = 300;   // submenu hover → cascade open
const CLOSE_DELAY = 300;      // mouse-leave → close

const AppSidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [courses, setCourses] = useState<CourseWithDetails[]>([]);

  // Hover state: which menu/submenu sections are open
  const [openMenus, setOpenMenus] = useState<Set<string>>(new Set());

  // Timers for delayed open/close
  const openTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const closeTimers = useRef<Record<string, NodeJS.Timeout>>({});

  // Lazy-load state for courses
  const [loadingCourses, setLoadingCourses] = useState<Set<string>>(new Set());
  const [loadingLevels, setLoadingLevels] = useState<Set<string>>(new Set());

  const adminEmail = useMemo(() => user?.email === 'jwag.lang@gmail.com', [user]);

  useEffect(() => { setIsAdmin(adminEmail); }, [adminEmail]);

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      Object.values(openTimers.current).forEach(clearTimeout);
      Object.values(closeTimers.current).forEach(clearTimeout);
    };
  }, []);

  /* ── Hover helpers ── */

  const scheduleOpen = useCallback((key: string, delay: number) => {
    // Cancel any pending close for this key
    if (closeTimers.current[key]) {
      clearTimeout(closeTimers.current[key]);
      delete closeTimers.current[key];
    }
    // If already open, nothing to do
    if (openTimers.current[key]) return;

    openTimers.current[key] = setTimeout(() => {
      setOpenMenus((prev) => new Set(prev).add(key));
      delete openTimers.current[key];
    }, delay);
  }, []);

  const scheduleClose = useCallback((key: string) => {
    // Cancel any pending open for this key
    if (openTimers.current[key]) {
      clearTimeout(openTimers.current[key]);
      delete openTimers.current[key];
    }
    if (closeTimers.current[key]) return;

    closeTimers.current[key] = setTimeout(() => {
      setOpenMenus((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      delete closeTimers.current[key];
    }, CLOSE_DELAY);
  }, []);

  const cancelClose = useCallback((key: string) => {
    if (closeTimers.current[key]) {
      clearTimeout(closeTimers.current[key]);
      delete closeTimers.current[key];
    }
  }, []);

  const isOpen = useCallback((key: string) => openMenus.has(key), [openMenus]);

  /* ── Data fetching ── */

  useEffect(() => {
    async function fetchPendingCount() {
      try {
        const pending = await getApprovalRequests('pending');
        setPendingCount(pending.length);
      } catch (error) {
        console.error('Error fetching pending approvals:', error);
      }
    }
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let isSubscribed = true;
    const unsubscribe = onCoursesUpdate((templates) => {
      if (!isSubscribed) return;
      setCourses(templates);
    });
    return () => { isSubscribed = false; unsubscribe(); };
  }, []);

  /* ── Lazy-load course hierarchy ── */

  const ensureLevelsLoaded = useCallback(async (courseId: string) => {
    if (courses.find((c) => c.id === courseId)?.levels) return;
    setLoadingCourses((prev) => new Set(prev).add(courseId));
    const levels = await getLevelsByCourseId(courseId);
    setCourses((prev) =>
      prev.map((c) => (c.id === courseId ? { ...c, levels } : c))
    );
    setLoadingCourses((prev) => {
      const next = new Set(prev);
      next.delete(courseId);
      return next;
    });
  }, [courses]);

  const ensureUnitsLoaded = useCallback(async (courseId: string, levelId: string) => {
    const course = courses.find((c) => c.id === courseId);
    const level = course?.levels?.find((l) => l.id === levelId);
    if (level?.units) return;
    setLoadingLevels((prev) => new Set(prev).add(levelId));
    const units = await getUnitsByLevelId(levelId);
    setCourses((prev) =>
      prev.map((c) =>
        c.id === courseId
          ? { ...c, levels: c.levels?.map((l) => (l.id === levelId ? { ...l, units } : l)) }
          : c
      )
    );
    setLoadingLevels((prev) => {
      const next = new Set(prev);
      next.delete(levelId);
      return next;
    });
  }, [courses]);

  const handleLogout = useCallback(async () => {
    try { await logOut(); router.push('/'); } catch (e) { console.error('Logout error:', e); }
  }, [router]);

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2 p-2">
          <GradientIcon icon={BookOpenCheck} id="logo" className="w-8 h-8" />
          <h1 className="text-xl font-headline font-bold primary-gradient-text">
            LessonLink
          </h1>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          {/* ── Dashboard (no subs) ── */}
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === '/t-portal'} tooltip="Dashboard">
              <Link href="/t-portal" className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* ── Calendar (hover → Schedule / Availability) ── */}
          <div
            onMouseEnter={() => scheduleOpen('calendar', OPEN_DELAY)}
            onMouseLeave={() => scheduleClose('calendar')}
          >
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith('/t-portal/calendar')}
                tooltip="Calendar"
              >
                <Link href="/t-portal/calendar" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Calendar</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {isOpen('calendar') && (
              <SidebarMenuSub>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton
                    asChild
                    isActive={pathname === '/t-portal/calendar' && !pathname.includes('tab=availability')}
                  >
                    <Link href="/t-portal/calendar?tab=schedule" className="flex items-center gap-2">
                      <CalendarClock className="h-3.5 w-3.5" />
                      Schedule
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton asChild>
                    <Link href="/t-portal/calendar?tab=availability" className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5" />
                      Availability
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            )}
          </div>

          {/* ── Chat (hover → Notifications / Communications) ── */}
          <div
            onMouseEnter={() => scheduleOpen('chat', OPEN_DELAY)}
            onMouseLeave={() => scheduleClose('chat')}
          >
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith('/t-portal/chat')}
                tooltip="Chat"
              >
                <Link href="/t-portal/chat" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span>Chat</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {isOpen('chat') && (
              <SidebarMenuSub>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton asChild>
                    <Link href="/t-portal/chat?tab=notifications" className="flex items-center gap-2">
                      <Bell className="h-3.5 w-3.5" />
                      Notifications
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton asChild>
                    <Link href="/t-portal/chat?tab=communications" className="flex items-center gap-2">
                      <MessageSquare className="h-3.5 w-3.5" />
                      Communications
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            )}
          </div>

          {/* ── Courses (hover → All Courses + individual courses cascade) ── */}
          <div
            onMouseEnter={() => scheduleOpen('courses', OPEN_DELAY)}
            onMouseLeave={() => scheduleClose('courses')}
          >
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith('/t-portal/courses')}
                tooltip="Courses"
              >
                <Link href="/t-portal/courses" className="flex items-center gap-2">
                  <Library className="h-4 w-4" />
                  <span>Courses</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {isOpen('courses') && (
              <SidebarMenuSub>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton asChild isActive={pathname === '/t-portal/courses'}>
                    <Link href="/t-portal/courses">All Courses</Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>

                {courses.map((course) => (
                  <div
                    key={course.id}
                    onMouseEnter={() => {
                      cancelClose('courses');
                      scheduleOpen(`course-${course.id}`, SUB_OPEN_DELAY);
                      ensureLevelsLoaded(course.id);
                    }}
                    onMouseLeave={() => {
                      scheduleClose(`course-${course.id}`);
                    }}
                  >
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname.includes(`/courses/${course.id}/`)}
                      >
                        <Link
                          href={`/t-portal/courses/${course.id}/levels`}
                          className="flex items-center justify-between w-full"
                        >
                          <span className="truncate">{course.title}</span>
                          {loadingCourses.has(course.id) && (
                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent ml-1 flex-shrink-0" />
                          )}
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>

                    {/* Cascade: levels */}
                    {isOpen(`course-${course.id}`) && course.levels && course.levels.length > 0 && (
                      <SidebarMenuSub>
                        {course.levels.map((level) => (
                          <div
                            key={level.id}
                            onMouseEnter={() => {
                              cancelClose(`course-${course.id}`);
                              cancelClose('courses');
                              scheduleOpen(`level-${level.id}`, SUB_OPEN_DELAY);
                              ensureUnitsLoaded(course.id, level.id);
                            }}
                            onMouseLeave={() => {
                              scheduleClose(`level-${level.id}`);
                            }}
                          >
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton
                                asChild
                                isActive={pathname.includes(`/levels/${level.id}/`)}
                              >
                                <Link
                                  href={`/t-portal/courses/${course.id}/levels/${level.id}/units`}
                                  className="flex items-center justify-between w-full text-xs"
                                >
                                  <span className="truncate">{level.title}</span>
                                  {loadingLevels.has(level.id) && (
                                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent ml-1 flex-shrink-0" />
                                  )}
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>

                            {/* Cascade: units */}
                            {isOpen(`level-${level.id}`) && level.units && level.units.length > 0 && (
                              <SidebarMenuSub>
                                {level.units.map((unit) => (
                                  <SidebarMenuSubItem key={unit.id}>
                                    <SidebarMenuSubButton
                                      asChild
                                      isActive={pathname.includes(`/units/${unit.id}/`)}
                                    >
                                      <Link
                                        href={`/t-portal/courses/${course.id}/levels/${level.id}/units/${unit.id}/sessions`}
                                        className="text-xs"
                                      >
                                        {unit.title}
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                ))}
                              </SidebarMenuSub>
                            )}
                          </div>
                        ))}
                      </SidebarMenuSub>
                    )}
                  </div>
                ))}

                {courses.length === 0 && (
                  <div className="px-3 py-1.5 text-xs text-muted-foreground">
                    No courses available
                  </div>
                )}
              </SidebarMenuSub>
            )}
          </div>

          {/* ── Learners (hover → Roster, Packages, Approvals, Reports) ── */}
          <div
            onMouseEnter={() => scheduleOpen('learners', OPEN_DELAY)}
            onMouseLeave={() => scheduleClose('learners')}
          >
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={
                  pathname.startsWith('/t-portal/students') ||
                  pathname === '/t-portal/packages' ||
                  pathname === '/t-portal/approvals' ||
                  pathname === '/t-portal/reports'
                }
                tooltip="Learners"
              >
                <Link href="/t-portal/students" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>Learners</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {isOpen('learners') && (
              <SidebarMenuSub>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton asChild isActive={pathname.startsWith('/t-portal/students')}>
                    <Link href="/t-portal/students" className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5" />
                      Learner Roster
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton asChild isActive={pathname === '/t-portal/packages'}>
                    <Link href="/t-portal/packages" className="flex items-center gap-2">
                      <CreditCard className="h-3.5 w-3.5" />
                      Learner Packages
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton asChild isActive={pathname === '/t-portal/approvals'}>
                    <Link href="/t-portal/approvals" className="flex items-center justify-between w-full">
                      <span className="flex items-center gap-2">
                        <ClipboardCheck className="h-3.5 w-3.5" />
                        Approvals
                      </span>
                      {pendingCount > 0 && (
                        <Badge
                          variant="destructive"
                          className="h-5 w-5 p-0 flex items-center justify-center text-xs min-w-5"
                          aria-label={`${pendingCount} pending approvals`}
                        >
                          {pendingCount}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton asChild isActive={pathname === '/t-portal/reports'}>
                    <Link href="/t-portal/reports" className="flex items-center gap-2">
                      <BarChart2 className="h-3.5 w-3.5" />
                      Reports
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            )}
          </div>
        </SidebarMenu>
      </SidebarContent>

      {/* ── Footer ── */}
      <SidebarFooter className="p-0 gap-0">
        <div className="p-2">
          <ThemeToggle />
        </div>
        {user && !loading && (
          <div
            className="border-t border-sidebar-border"
            onMouseEnter={() => scheduleOpen('tutor', OPEN_DELAY)}
            onMouseLeave={() => scheduleClose('tutor')}
          >
            <div className="p-4 pb-2 cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center flex-shrink-0">
                  <BookOpen className="h-4 w-4 text-sidebar-accent-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">Tutor</p>
                  <p className="text-xs text-muted-foreground truncate" title={user.email ?? ''}>
                    {user.email}
                  </p>
                </div>
              </div>
            </div>

            {isOpen('tutor') && (
              <div className="px-4 pb-2 space-y-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => router.push('/t-portal/settings')}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => router.push('/admin')}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Admin
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Log Out
                </Button>
              </div>
            )}
          </div>
        )}
      </SidebarFooter>
    </>
  );
};

export default AppSidebar;
