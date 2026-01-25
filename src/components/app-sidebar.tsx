'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
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
} from 'lucide-react';
import { GradientIcon } from './gradient-icon';
import { logOut } from '@/lib/auth';
import { ThemeToggle } from './theme-toggle';
import { Badge } from '@/components/ui/badge';
import { getApprovalRequests, onCourseTemplatesUpdate, getUnitsByCourseId, getSessionsByUnitId } from '@/lib/firestore';
import { Button } from './ui/button';
import { useAuth } from './auth-provider';

const AppSidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Nested navigation state
  const [courses, setCourses] = useState<any[]>([]);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);
  const [courseUnits, setCourseUnits] = useState<{ [key: string]: any[] }>({});
  const [unitSessions, setUnitSessions] = useState<{ [key: string]: any[] }>({});
  const [showCourses, setShowCourses] = useState(false);

  useEffect(() => {
    async function fetchPendingCount() {
      const pending = await getApprovalRequests('pending');
      setPendingCount(pending.length);
    }
    fetchPendingCount();
    
    // Refresh count every 30 seconds
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (user) {
      setIsAdmin(user.email === 'jwag.lang@gmail.com');
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  // Load courses on mount
  useEffect(() => {
    const unsubscribe = onCourseTemplatesUpdate((templates) => {
      setCourses(templates);
    });
    return () => unsubscribe();
  }, []);

  // Load units when course is hovered
  async function handleCourseHover(courseId: string) {
    if (expandedCourse === courseId) return; // Already loaded
    setExpandedCourse(courseId);
    
    if (!courseUnits[courseId]) {
      const units = await getUnitsByCourseId(courseId);
      setCourseUnits(prev => ({ ...prev, [courseId]: units }));
    }
  }

  // Load sessions when unit is hovered
  async function handleUnitHover(unitId: string) {
    if (expandedUnit === unitId) return; // Already loaded
    setExpandedUnit(unitId);
    
    if (!unitSessions[unitId]) {
      const sessions = await getSessionsByUnitId(unitId);
      setUnitSessions(prev => ({ ...prev, [unitId]: sessions }));
    }
  }

  async function handleLogout() {
    await logOut();
    router.push('/');
  }

  const staticMenuItems = [
    { href: '/t-portal', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/t-portal/calendar', label: 'Calendar', icon: Calendar },
    { href: '/t-portal/chat', label: 'Chat', icon: MessageSquare },
    { href: '/t-portal/students', label: 'Students', icon: Users },
    { href: '/t-portal/approvals', label: 'Approvals', icon: ClipboardCheck, badge: pendingCount },
    { href: '/t-portal/reports', label: 'Reports', icon: BarChart2 },
    { href: '/t-portal/settings', label: 'Settings', icon: Settings },
  ];

  if (isAdmin) {
    staticMenuItems.push({ href: '/admin', label: 'Admin', icon: Shield });
  }

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2 p-2">
            <GradientIcon icon={BookOpenCheck} id="logo" className="w-8 h-8"/>
            <h1 className="text-xl font-headline font-bold primary-gradient-text">
                LessonLink
            </h1>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {staticMenuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                // @ts-ignore
                href={item.href}
                isActive={pathname === item.href}
                tooltip={item.label}
              >
                <a href={item.href} className="flex items-center justify-between w-full">
                  <span className="flex items-center gap-2">
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </span>
                  {item.badge && item.badge > 0 && (
                    <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {item.badge}
                    </Badge>
                  )}
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}

          {/* Courses with nested Units and Sessions */}
          <SidebarMenuItem>
            <div
              onMouseEnter={() => setShowCourses(true)}
              onMouseLeave={() => {
                setShowCourses(false);
                setExpandedCourse(null);
                setExpandedUnit(null);
              }}
            >
              <SidebarMenuButton
                asChild
                // @ts-ignore
                href="/t-portal/courses"
                isActive={pathname === '/t-portal/courses'}
                tooltip="Courses"
              >
                <a href="/t-portal/courses" className="flex items-center gap-2">
                  <Library className="h-4 w-4" />
                  <span>Courses</span>
                </a>
              </SidebarMenuButton>

              {/* Nested Courses - only show when hovering over Courses */}
              {showCourses && courses.map((course) => (
                <div key={course.id}>
                  <div
                    onMouseEnter={() => handleCourseHover(course.id)}
                    onMouseLeave={() => setExpandedCourse(null)}
                    className="relative"
                  >
                    <SidebarMenuButton
                      asChild
                      // @ts-ignore
                      href={`/t-portal/courses/${course.id}/units`}
                      isActive={pathname.includes(`/courses/${course.id}`)}
                      tooltip={course.title}
                      className="pl-8"
                    >
                      <a href={`/t-portal/courses/${course.id}/units`} className="flex items-center gap-2 text-sm">
                        <span className="truncate">{course.title}</span>
                      </a>
                    </SidebarMenuButton>

                    {/* Nested Units */}
                    {expandedCourse === course.id && courseUnits[course.id] && (
                      <div className="ml-4">
                        {courseUnits[course.id].map((unit) => (
                          <div key={unit.id}>
                            <div
                              onMouseEnter={() => handleUnitHover(unit.id)}
                              onMouseLeave={() => setExpandedUnit(null)}
                            >
                              <SidebarMenuButton
                                asChild
                                // @ts-ignore
                                href={`/t-portal/courses/${course.id}/units/${unit.id}/sessions`}
                                isActive={pathname.includes(`/units/${unit.id}`)}
                                tooltip={unit.title}
                                className="pl-12 text-xs"
                              >
                                <a href={`/t-portal/courses/${course.id}/units/${unit.id}/sessions`} className="truncate">
                                  {unit.title}
                                </a>
                              </SidebarMenuButton>

                              {/* Nested Sessions */}
                              {expandedUnit === unit.id && unitSessions[unit.id] && (
                                <div className="ml-4">
                                  {unitSessions[unit.id].map((session) => (
                                    <SidebarMenuButton
                                      key={session.id}
                                      asChild
                                      // @ts-ignore
                                      href={`/t-portal/courses/${course.id}/units/${unit.id}/sessions`}
                                      isActive={false}
                                      tooltip={session.title}
                                      className="pl-16 text-xs"
                                    >
                                      <a href={`/t-portal/courses/${course.id}/units/${unit.id}/sessions`} className="truncate">
                                        {session.title}
                                      </a>
                                    </SidebarMenuButton>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-0 gap-0">
        <div className="p-2">
          <ThemeToggle />
        </div>
        {user && !loading && (
          <div className="p-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center">
                <BookOpen className="h-4 w-4 text-sidebar-accent-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Tutor</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="w-full dark-mode-solid-button"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Log Out
            </Button>
          </div>
        )}
      </SidebarFooter>
    </>
  );
};

export default AppSidebar;