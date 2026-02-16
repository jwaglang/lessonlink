'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useCallback, useRef, useState } from 'react';
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
  Calendar,
  Settings,
  BookOpenCheck,
  Library,
  ClipboardCheck,
  LogOut,
  GraduationCap,
  MessageSquare,
  BookOpen,
  Shield,
  Users,
  Search,
  Bell,
  Clock,
  CalendarClock,
  CreditCard,
} from 'lucide-react';
import { GradientIcon } from './gradient-icon';
import { ThemeToggle } from './theme-toggle';
import { logOut } from '@/lib/auth';
import { useAuth } from './auth-provider';
import { Button } from './ui/button';

const ADMIN_EMAIL = 'jwag.lang@gmail.com';

/* ── Delay constants (ms) ── */
const OPEN_DELAY = 500;
const CLOSE_DELAY = 300;

const StudentAppSidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  // Hover state: which menu sections are open
  const [openMenus, setOpenMenus] = useState<Set<string>>(new Set());

  // Timers for delayed open/close
  const openTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const closeTimers = useRef<Record<string, NodeJS.Timeout>>({});

  const isAdmin = user?.email === ADMIN_EMAIL;

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      Object.values(openTimers.current).forEach(clearTimeout);
      Object.values(closeTimers.current).forEach(clearTimeout);
    };
  }, []);

  /* ── Hover helpers ── */

  const scheduleOpen = useCallback((key: string, delay: number) => {
    if (closeTimers.current[key]) {
      clearTimeout(closeTimers.current[key]);
      delete closeTimers.current[key];
    }
    if (openTimers.current[key]) return;

    openTimers.current[key] = setTimeout(() => {
      setOpenMenus((prev) => new Set(prev).add(key));
      delete openTimers.current[key];
    }, delay);
  }, []);

  const scheduleClose = useCallback((key: string) => {
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

  const isOpen = useCallback((key: string) => openMenus.has(key), [openMenus]);

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
            <SidebarMenuButton asChild isActive={pathname === '/s-portal'} tooltip="Dashboard">
              <Link href="/s-portal" className="flex items-center gap-2">
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
                isActive={pathname.startsWith('/s-portal/calendar')}
                tooltip="Calendar"
              >
                <Link href="/s-portal/calendar" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Calendar</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {isOpen('calendar') && (
              <SidebarMenuSub>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton asChild>
                    <Link href="/s-portal/calendar?tab=schedule" className="flex items-center gap-2">
                      <CalendarClock className="h-3.5 w-3.5" />
                      Schedule
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton asChild>
                    <Link href="/s-portal/calendar?tab=availability" className="flex items-center gap-2">
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
                isActive={pathname.startsWith('/s-portal/chat')}
                tooltip="Chat"
              >
                <Link href="/s-portal/chat" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span>Chat</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {isOpen('chat') && (
              <SidebarMenuSub>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton asChild>
                    <Link href="/s-portal/chat?tab=notifications" className="flex items-center gap-2">
                      <Bell className="h-3.5 w-3.5" />
                      Notifications
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton asChild>
                    <Link href="/s-portal/chat?tab=communications" className="flex items-center gap-2">
                      <MessageSquare className="h-3.5 w-3.5" />
                      Communications
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            )}
          </div>

          {/* ── Courses (hover → My Units, Browse, Feedback, Evaluations) ── */}
          <div
            onMouseEnter={() => scheduleOpen('courses', OPEN_DELAY)}
            onMouseLeave={() => scheduleClose('courses')}
          >
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={
                  pathname.startsWith('/s-portal/courses') ||
                  pathname.startsWith('/s-portal/units') ||
                  pathname.startsWith('/s-portal/browse') ||
                  pathname.startsWith('/s-portal/feedback') ||
                  pathname.startsWith('/s-portal/evaluations') ||
                  pathname.startsWith('/s-portal/packages')
                }
                tooltip="Courses"
              >
                <Link href="/s-portal/units" className="flex items-center gap-2">
                  <Library className="h-4 w-4" />
                  <span>Courses</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {isOpen('courses') && (
              <SidebarMenuSub>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton asChild isActive={pathname === '/s-portal/units'}>
                    <Link href="/s-portal/units" className="flex items-center gap-2">
                      <BookOpen className="h-3.5 w-3.5" />
                      My Units
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton asChild isActive={pathname === '/s-portal/browse'}>
                    <Link href="/s-portal/browse" className="flex items-center gap-2">
                      <Search className="h-3.5 w-3.5" />
                      Browse Units
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton asChild isActive={pathname === '/s-portal/feedback'}>
                    <Link href="/s-portal/feedback" className="flex items-center gap-2">
                      <Library className="h-3.5 w-3.5" />
                      Feedback
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton asChild isActive={pathname === '/s-portal/evaluations'}>
                    <Link href="/s-portal/evaluations" className="flex items-center gap-2">
                      <ClipboardCheck className="h-3.5 w-3.5" />
                      Evaluations
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton asChild isActive={pathname === '/s-portal/packages'}>
                    <Link href="/s-portal/packages" className="flex items-center gap-2">
                      <CreditCard className="h-3.5 w-3.5" />
                      My Packages
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            )}
          </div>

          {/* ── Tutors (hover → My Tutor, Find a Tutor) ── */}
          <div
            onMouseEnter={() => scheduleOpen('tutors', OPEN_DELAY)}
            onMouseLeave={() => scheduleClose('tutors')}
          >
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith('/s-portal/tutors') || pathname.startsWith('/s-portal/t-profiles')}
                tooltip="Tutors"
              >
                <Link href="/s-portal/t-profiles" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>Tutors</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {isOpen('tutors') && (
              <SidebarMenuSub>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton asChild isActive={pathname === '/s-portal/tutors/my-tutor'}>
                    <Link href="/s-portal/tutors/my-tutor" className="flex items-center gap-2">
                      <GraduationCap className="h-3.5 w-3.5" />
                      My Tutor
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton
                    asChild
                    isActive={pathname.startsWith('/s-portal/t-profiles')}
                  >
                    <Link href="/s-portal/t-profiles" className="flex items-center gap-2">
                      <Search className="h-3.5 w-3.5" />
                      Find a Tutor
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
            onMouseEnter={() => scheduleOpen('learner', OPEN_DELAY)}
            onMouseLeave={() => scheduleClose('learner')}
          >
            <div className="p-4 pb-2 cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="h-4 w-4 text-sidebar-accent-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">Learner</p>
                  <p className="text-xs text-muted-foreground truncate" title={user.email ?? ''}>
                    {user.email}
                  </p>
                </div>
              </div>
            </div>

            {isOpen('learner') && (
              <div className="px-4 pb-2 space-y-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => router.push('/s-portal/settings')}
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

export default StudentAppSidebar;
