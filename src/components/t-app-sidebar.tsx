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
  ChevronRight,
} from 'lucide-react';
import { GradientIcon } from './gradient-icon';
import { logOut } from '@/lib/auth';
import { ThemeToggle } from './theme-toggle';
import { Badge } from '@/components/ui/badge';
import { getApprovalRequests, onCoursesUpdate, getLevelsByCourseId, getUnitsByLevelId, getSessionsByUnitId } from '@/lib/firestore';
import { Button } from './ui/button';
import { useAuth } from './auth-provider';
import { cn } from '@/lib/utils';

const AppSidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);

  // State for 4-level hierarchy
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set());
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());
  const [courseLevels, setCourseLevels] = useState<{ [key: string]: any[] }>({});
  const [levelUnits, setLevelUnits] = useState<{ [key: string]: any[] }>({});
  const [unitSessions, setUnitSessions] = useState<{ [key: string]: any[] }>({});

  const toggleCourse = async (courseId: string) => {
    const newExpanded = new Set(expandedCourses);
    if (newExpanded.has(courseId)) {
      newExpanded.delete(courseId);
    } else {
      newExpanded.add(courseId);
      // Fetch levels if not already loaded
      if (!courseLevels[courseId]) {
        const levels = await getLevelsByCourseId(courseId);
        setCourseLevels(prev => ({ ...prev, [courseId]: levels }));
      }
    }
    setExpandedCourses(newExpanded);
  };

  const toggleLevel = async (levelId: string) => {
    const newExpanded = new Set(expandedLevels);
    if (newExpanded.has(levelId)) {
      newExpanded.delete(levelId);
    } else {
      newExpanded.add(levelId);
      // Fetch units if not already loaded
      if (!levelUnits[levelId]) {
        const units = await getUnitsByLevelId(levelId);
        setLevelUnits(prev => ({ ...prev, [levelId]: units }));
      }
    }
    setExpandedLevels(newExpanded);
  };

  const toggleUnit = async (unitId: string) => {
    const newExpanded = new Set(expandedUnits);
    if (newExpanded.has(unitId)) {
      newExpanded.delete(unitId);
    } else {
      newExpanded.add(unitId);
      // Fetch sessions if not already loaded
      if (!unitSessions[unitId]) {
        const sessions = await getSessionsByUnitId(unitId);
        setUnitSessions(prev => ({ ...prev, [unitId]: sessions }));
      }
    }
    setExpandedUnits(newExpanded);
  };

  useEffect(() => {
    async function fetchPendingCount() {
      const pending = await getApprovalRequests('pending');
      setPendingCount(pending.length);
    }
    fetchPendingCount();
    
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

  useEffect(() => {
    console.log('🔵 SIDEBAR: Setting up courses listener');
    let callCount = 0;
    const unsubscribe = onCoursesUpdate((templates) => {
      callCount++;
      console.log(`🟢 SIDEBAR: Courses updated (#${callCount}):`, templates.length, 'courses');
      if (callCount > 10) {
        console.error('🔴 SIDEBAR: INFINITE LOOP DETECTED! Stopping updates.');
        return;
      }
      setCourses(templates);
    });
    return () => {
      console.log('🔴 SIDEBAR: Cleaning up courses listener');
      unsubscribe();
    };
  }, []);

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

          {/* Courses Hierarchy */}
          <SidebarMenuItem>
            <div 
              className='flex items-center w-full' 
              onMouseEnter={() => setExpandedCourses(new Set(courses.map(c => c.id)))}
            >
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 shrink-0" 
                onClick={() => setExpandedCourses(new Set())}
              >
                <ChevronRight className={cn("h-4 w-4 transition-transform", expandedCourses.size > 0 && "rotate-90")} />
              </Button>
              <SidebarMenuButton asChild href="/t-portal/courses" isActive={pathname.startsWith('/t-portal/courses')} className="w-full justify-start">
                <a href="/t-portal/courses" className="flex items-center gap-2">
                  <Library className="h-4 w-4" />
                  <span>Courses</span>
                </a>
              </SidebarMenuButton>
            </div>
          </SidebarMenuItem>

{expandedCourses.size > 0 && courses.map(course => (
            <SidebarMenuItem key={course.id} className='flex flex-col'>
                <div className='flex items-center w-full'>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => toggleCourse(course.id)}>
                        <ChevronRight className={cn("h-4 w-4 transition-transform", expandedCourses.has(course.id) && "rotate-90")} />
                    </Button>
                    <SidebarMenuButton asChild href="/t-portal/courses" isActive={false} className="w-full justify-start">
                        <a href="/t-portal/courses" className="truncate flex-1">{course.title}</a>
                    </SidebarMenuButton>
                </div>
                {expandedCourses.has(course.id) && courseLevels[course.id] && (
                    <div className='w-full pl-8'>
                        {courseLevels[course.id].map(level => (
                            <div key={level.id}>
                                <div className='flex items-center w-full'>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => toggleLevel(level.id)}>
                                        <ChevronRight className={cn("h-4 w-4 transition-transform", expandedLevels.has(level.id) && "rotate-90")} />
                                    </Button>
                                    <SidebarMenuButton asChild href={`/t-portal/courses/${course.id}/levels/${level.id}/units`} isActive={false} className="w-full justify-start text-sm">
                                        <a href={`/t-portal/courses/${course.id}/levels/${level.id}/units`} className="truncate flex-1">{level.title}</a>
                                    </SidebarMenuButton>
                                </div>
                                {expandedLevels.has(level.id) && levelUnits[level.id] && (
                                    <div className='w-full pl-4'>
                                        {levelUnits[level.id].map(unit => (
                                            <SidebarMenuItem key={unit.id}>
                                                <SidebarMenuButton asChild href={`/t-portal/courses/${course.id}/levels/${level.id}/units/${unit.id}/sessions`} isActive={false} className="w-full justify-start text-xs pl-4">
                                                    <a href={`/t-portal/courses/${course.id}/levels/${level.id}/units/${unit.id}/sessions`} className="truncate flex-1">{unit.title}</a>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </SidebarMenuItem>
          ))}
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
