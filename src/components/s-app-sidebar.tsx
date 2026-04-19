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
  useSidebar,
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
  Bell,
  Clock,
  CalendarClock,
  CreditCard,
  Wallet,
  PawPrint,
  BookUser,
  Gamepad2,
  ShoppingBag,
  Map as MapIcon,
} from 'lucide-react';
import { GradientIcon } from './gradient-icon';
import { LLButton } from './ll-button';
import { logOut } from '@/lib/auth';
import { useAuth } from './auth-provider';
import { Button } from './ui/button';

const ADMIN_EMAIL = 'jwag.lang@gmail.com';

/* ── Delay constants (ms) ── */
const OPEN_DELAY = 200;
const CLOSE_DELAY = 300;

/* ── Helper: Generate cascading delays with quadratic acceleration ── */
const generateCascadeDelays = (numItems: number): number[] => {
  const delays: number[] = [];
  for (let i = 0; i < numItems; i++) {
    // Quadratic formula: creates aggressive acceleration (ultra-fast)
    const delay = Math.round(5 * i * i + 12 * i + 5);
    delays.push(delay);
  }
  return delays;
};

const StudentAppSidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  // Hover state: which menu sections are open
  const [openMenus, setOpenMenus] = useState<Set<string>>(new Set());

  // Timers for delayed open/close
  const openTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const closeTimers = useRef<Record<string, NodeJS.Timeout>>({});

  // Cascading state for all submenu items
  const [calendarVisibleItems, setCalendarVisibleItems] = useState(0);
  const [chatVisibleItems, setChatVisibleItems] = useState(0);
  const [coursesVisibleItems, setCoursesVisibleItems] = useState(0);
  const [tutorsVisibleItems, setTutorsVisibleItems] = useState(0);
  const [petlandVisibleItems, setPetlandVisibleItems] = useState(0);
  const cascadeTimersRef = useRef<NodeJS.Timeout[]>([]);

  // Nav unfurl state (driven by sidebar open state)
  const { open, setOpen } = useSidebar();
  const [navVisibleItems, setNavVisibleItems] = useState(0);
  const navOpenTimer  = useRef<NodeJS.Timeout | null>(null);
  const navCloseTimer = useRef<NodeJS.Timeout | null>(null);
  const navCascadeTimers = useRef<NodeJS.Timeout[]>([]);

  const isAdmin = user?.email === ADMIN_EMAIL;

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      Object.values(openTimers.current).forEach(clearTimeout);
      Object.values(closeTimers.current).forEach(clearTimeout);
      cascadeTimersRef.current.forEach(clearTimeout);
      navCascadeTimers.current.forEach(clearTimeout);
      if (navOpenTimer.current)  clearTimeout(navOpenTimer.current);
      if (navCloseTimer.current) clearTimeout(navCloseTimer.current);
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

  const scheduleNavOpen = useCallback(() => {
    if (navCloseTimer.current) { clearTimeout(navCloseTimer.current); navCloseTimer.current = null; }
    if (navOpenTimer.current) return;
    navOpenTimer.current = setTimeout(() => { setOpen(true); navOpenTimer.current = null; }, OPEN_DELAY);
  }, [setOpen]);

  const scheduleNavClose = useCallback(() => {
    if (navOpenTimer.current) { clearTimeout(navOpenTimer.current); navOpenTimer.current = null; }
    if (navCloseTimer.current) return;
    navCloseTimer.current = setTimeout(() => { setOpen(false); navCloseTimer.current = null; }, CLOSE_DELAY);
  }, [setOpen]);

  const handleLogout = useCallback(async () => {
    try { await logOut(); router.push('/'); } catch (e) { console.error('Logout error:', e); }
  }, [router]);

  // Cascade effect: manage all submenu item visibility
  useEffect(() => {
    // Clear any pending cascade timers
    cascadeTimersRef.current.forEach(clearTimeout);
    cascadeTimersRef.current = [];

    // Calendar (Schedule, Availability) - 2 items
    if (openMenus.has('calendar')) {
      const delays = generateCascadeDelays(2);
      delays.forEach((delay) => {
        const timer = setTimeout(() => {
          setCalendarVisibleItems((prev) => Math.min(prev + 1, 2));
        }, delay);
        cascadeTimersRef.current.push(timer);
      });
    } else {
      setCalendarVisibleItems(0);
    }

    // Chat (Notifications, Communications) - 2 items
    if (openMenus.has('chat')) {
      const delays = generateCascadeDelays(2);
      delays.forEach((delay) => {
        const timer = setTimeout(() => {
          setChatVisibleItems((prev) => Math.min(prev + 1, 2));
        }, delay);
        cascadeTimersRef.current.push(timer);
      });
    } else {
      setChatVisibleItems(0);
    }

    // Courses (My Units, My Packages, My Balance) - 3 items
    if (openMenus.has('courses')) {
      const delays = generateCascadeDelays(3);
      delays.forEach((delay) => {
        const timer = setTimeout(() => {
          setCoursesVisibleItems((prev) => Math.min(prev + 1, 3));
        }, delay);
        cascadeTimersRef.current.push(timer);
      });
    } else {
      setCoursesVisibleItems(0);
    }

    // Tutors (My Tutor, Feedback, Evaluations, Homework) - 4 items
    if (openMenus.has('tutors')) {
      const delays = generateCascadeDelays(4);
      delays.forEach((delay) => {
        const timer = setTimeout(() => {
          setTutorsVisibleItems((prev) => Math.min(prev + 1, 4));
        }, delay);
        cascadeTimersRef.current.push(timer);
      });
    } else {
      setTutorsVisibleItems(0);
    }

    // Petland (Passport, Playground, Pet Shop, Travel Agent) - 4 items
    if (openMenus.has('petland')) {
      const delays = generateCascadeDelays(4);
      delays.forEach((delay) => {
        const timer = setTimeout(() => {
          setPetlandVisibleItems((prev) => Math.min(prev + 1, 4));
        }, delay);
        cascadeTimersRef.current.push(timer);
      });
    } else {
      setPetlandVisibleItems(0);
    }
  }, [openMenus]);

  // Nav unfurl cascade — fires when sidebar expands/collapses
  useEffect(() => {
    navCascadeTimers.current.forEach(clearTimeout);
    navCascadeTimers.current = [];
    if (open) {
      generateCascadeDelays(6).forEach((delay) => {
        const t = setTimeout(() => setNavVisibleItems((p) => Math.min(p + 1, 6)), delay);
        navCascadeTimers.current.push(t);
      });
    } else {
      setNavVisibleItems(0);
    }
  }, [open]);

  return (
    <>
      <SidebarHeader
        onMouseEnter={scheduleNavOpen}
        onMouseLeave={scheduleNavClose}
      >
        <div className="flex items-center gap-2">
          <GradientIcon icon={BookOpenCheck} id="logo" className="w-8 h-8 flex-shrink-0" />
          <h1 className="text-xl font-headline font-bold primary-gradient-text overflow-hidden whitespace-nowrap transition-[width,opacity] duration-200 ease-linear group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0">
            LessonLink
          </h1>
        </div>
      </SidebarHeader>

      <SidebarContent onMouseEnter={scheduleNavOpen} onMouseLeave={scheduleNavClose}>
        <SidebarMenu>
          {/* ── Dashboard (no subs) ── */}
          <div className={`transition-all duration-200 ${navVisibleItems > 0 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === '/s-portal'} tooltip="Dashboard">
              <Link href="/s-portal" className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          </div>

          {/* ── Calendar (hover → Schedule / Availability) ── */}
          <div className={`transition-all duration-200 ${navVisibleItems > 1 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
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
                {calendarVisibleItems > 0 && (
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild>
                      <Link href="/s-portal/calendar?tab=schedule" className="flex items-center gap-2">
                        <CalendarClock className="h-3.5 w-3.5" />
                        Schedule
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                )}
                {calendarVisibleItems > 1 && (
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild>
                      <Link href="/s-portal/calendar?tab=availability" className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5" />
                        Availability
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                )}
              </SidebarMenuSub>
            )}
          </div>
          </div>

          {/* ── Chat (hover → Notifications / Communications) ── */}
          <div className={`transition-all duration-200 ${navVisibleItems > 2 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
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
                {chatVisibleItems > 0 && (
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild>
                      <Link href="/s-portal/chat?tab=notifications" className="flex items-center gap-2">
                        <Bell className="h-3.5 w-3.5" />
                        Notifications
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                )}
                {chatVisibleItems > 1 && (
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild>
                      <Link href="/s-portal/chat?tab=communications" className="flex items-center gap-2">
                        <MessageSquare className="h-3.5 w-3.5" />
                        Communications
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                )}
              </SidebarMenuSub>
            )}
          </div>
          </div>

          {/* ── Courses (hover → My Units, My Packages, My Balance) ── */}
          <div className={`transition-all duration-200 ${navVisibleItems > 3 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
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
                  pathname.startsWith('/s-portal/packages') ||
                  pathname.startsWith('/s-portal/balance')
                }
                tooltip="Courses"
              >
                <Link href="/s-portal/courses" className="flex items-center gap-2">
                  <Library className="h-4 w-4" />
                  <span>Courses</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {isOpen('courses') && (
              <SidebarMenuSub>
                {coursesVisibleItems > 0 && (
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild isActive={pathname === '/s-portal/units'}>
                      <Link href="/s-portal/units" className="flex items-center gap-2">
                        <BookOpen className="h-3.5 w-3.5" />
                        My Units
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                )}
                {coursesVisibleItems > 1 && (
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild isActive={pathname === '/s-portal/packages'}>
                      <Link href="/s-portal/packages" className="flex items-center gap-2">
                        <CreditCard className="h-3.5 w-3.5" />
                        My Packages
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                )}
                {coursesVisibleItems > 2 && (
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild isActive={pathname === '/s-portal/balance'}>
                      <Link href="/s-portal/balance" className="flex items-center gap-2">
                        <Wallet className="h-3.5 w-3.5" />
                        My Balance
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                )}
              </SidebarMenuSub>
            )}
          </div>
          </div>

          {/* ── Petland (hover → Passport, Playground, Pet Shop, Travel Agent) ── */}
          <div className={`transition-all duration-200 ${navVisibleItems > 4 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
          <div
            onMouseEnter={() => scheduleOpen('petland', OPEN_DELAY)}
            onMouseLeave={() => scheduleClose('petland')}
          >
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith('/s-portal/petland')} tooltip="Petland">
                <Link href="/s-portal/petland" className="flex items-center gap-2">
                  <PawPrint className="h-4 w-4" />
                  <span>Petland</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {isOpen('petland') && (
              <SidebarMenuSub>
                {petlandVisibleItems > 0 && (
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild isActive={pathname === '/s-portal/petland'}>
                      <Link href="/s-portal/petland" className="flex items-center gap-2">
                        <BookUser className="h-3.5 w-3.5" />
                        Passport
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                )}
                {petlandVisibleItems > 1 && (
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild isActive={false}>
                      <Link href="/s-portal/petland?tab=play" className="flex items-center gap-2">
                        <Gamepad2 className="h-3.5 w-3.5" />
                        Playground
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                )}
                {petlandVisibleItems > 2 && (
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild isActive={false}>
                      <Link href="/s-portal/petland?tab=shop" className="flex items-center gap-2">
                        <ShoppingBag className="h-3.5 w-3.5" />
                        Pet Shop
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                )}
                {petlandVisibleItems > 3 && (
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild isActive={false}>
                      <Link href="/s-portal/petland?tab=brochures" className="flex items-center gap-2">
                        <MapIcon className="h-3.5 w-3.5" />
                        Travel Agent
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                )}
              </SidebarMenuSub>
            )}
          </div>
          </div>

          {/* ── Tutors (hover → My Tutor, Feedback, Evaluations) ── */}
          <div className={`transition-all duration-200 ${navVisibleItems > 5 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
          <div
            onMouseEnter={() => scheduleOpen('tutors', OPEN_DELAY)}
            onMouseLeave={() => scheduleClose('tutors')}
          >
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={
                  pathname.startsWith('/s-portal/tutors') ||
                  pathname.startsWith('/s-portal/t-profiles') ||
                  pathname.startsWith('/s-portal/feedback') ||
                  pathname.startsWith('/s-portal/evaluations') ||
                  pathname.startsWith('/s-portal/homework')
                }
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
                {tutorsVisibleItems > 0 && (
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild isActive={pathname === '/s-portal/tutors/my-tutor'}>
                      <Link href="/s-portal/tutors/my-tutor" className="flex items-center gap-2">
                        <GraduationCap className="h-3.5 w-3.5" />
                        My Tutor
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                )}
                {tutorsVisibleItems > 1 && (
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild isActive={pathname === '/s-portal/feedback'}>
                      <Link href="/s-portal/feedback" className="flex items-center gap-2">
                        <Library className="h-3.5 w-3.5" />
                        Feedback
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                )}
                {tutorsVisibleItems > 2 && (
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild isActive={pathname === '/s-portal/evaluations'}>
                      <Link href="/s-portal/evaluations" className="flex items-center gap-2">
                        <ClipboardCheck className="h-3.5 w-3.5" />
                        Evaluations
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                )}
                {tutorsVisibleItems > 3 && (
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton asChild isActive={pathname === '/s-portal/homework'}>
                      <Link href="/s-portal/homework" className="flex items-center gap-2">
                        <BookOpen className="h-3.5 w-3.5" />
                        Homework
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                )}
              </SidebarMenuSub>
            )}
          </div>
          </div>
        </SidebarMenu>
      </SidebarContent>

      {/* ── Footer ── */}
      <SidebarFooter className="p-0 gap-0" onMouseEnter={scheduleNavOpen} onMouseLeave={scheduleNavClose}>
        <div className="p-2">
          <LLButton />
        </div>
        {user && !loading && (
          <div
            className="border-t border-sidebar-border"
            onMouseEnter={() => scheduleOpen('learner', OPEN_DELAY)}
            onMouseLeave={() => scheduleClose('learner')}
          >
            <div className="p-4 pb-2 cursor-pointer group-data-[collapsible=icon]:px-2">
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
