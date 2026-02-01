'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
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
import { 
  getApprovalRequests, 
  onCoursesUpdate, 
  getLevelsByCourseId, 
  getUnitsByLevelId,
  Course,
  Level,
  Unit
} from '@/lib/firestore';
import { Button } from './ui/button';
import { useAuth } from './auth-provider';
import { cn } from '@/lib/utils';

interface CourseWithDetails extends Course {
  levels?: Level[];
}

interface LevelWithDetails extends Level {
  units?: Unit[];
}

const AppSidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [courses, setCourses] = useState<CourseWithDetails[]>([]);
  
  // State for hover-based expansion
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [hoveredCourseId, setHoveredCourseId] = useState<string | null>(null);
  const [hoveredLevelId, setHoveredLevelId] = useState<string | null>(null);
  const [loadingStates, setLoadingStates] = useState<{
    courses: Set<string>;
    levels: Set<string>;
  }>({
    courses: new Set(),
    levels: new Set()
  });

  // Refs for hover timeouts
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    };
  }, []);

  const handleMouseEnter = useCallback((itemId: string) => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    setHoveredItem(itemId);
  }, []);

  const handleMouseLeave = useCallback(() => {
    leaveTimeoutRef.current = setTimeout(() => {
      setHoveredItem(null);
      setHoveredCourseId(null);
      setHoveredLevelId(null);
    }, 150);
  }, []);

  const handleCourseMouseEnter = useCallback(async (courseId: string) => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    
    setHoveredCourseId(courseId);
    setHoveredLevelId(null);
    
    // Load levels if not already loaded
    if (!courses.find(c => c.id === courseId)?.levels) {
      setLoadingStates(prevState => ({
        ...prevState,
        courses: new Set(prevState.courses).add(courseId)
      }));
      
      const levels = await getLevelsByCourseId(courseId);
      setCourses(prevCourses => 
        prevCourses.map(course => 
          course.id === courseId 
            ? { ...course, levels } 
            : course
        )
      );
      setLoadingStates(prevState => ({
        ...prevState,
        courses: new Set([...prevState.courses].filter(id => id !== courseId))
      }));
    }
  }, [courses]);

  const handleLevelMouseEnter = useCallback(async (levelId: string, courseId: string) => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    
    setHoveredLevelId(levelId);
    
    // Find the course and level to check if units are loaded
    const course = courses.find(c => c.id === courseId);
    const level = course?.levels?.find(l => l.id === levelId);
    
    if (course && level && !(level as LevelWithDetails).units) {
      setLoadingStates(prevState => ({
        ...prevState,
        levels: new Set(prevState.levels).add(levelId)
      }));
      
      const units = await getUnitsByLevelId(levelId);
      setCourses(prevCourses => 
        prevCourses.map(course => 
          course.id === courseId 
            ? { 
                ...course, 
                levels: course.levels?.map(l => 
                  l.id === levelId 
                    ? { ...l, units } 
                    : l
                ) 
              } 
            : course
        )
      );
      setLoadingStates(prevState => ({
        ...prevState,
        levels: new Set([...prevState.levels].filter(id => id !== levelId))
      }));
    }
  }, [courses]);

  const handleCourseClick = useCallback((courseId: string) => {
    router.push(`/t-portal/courses/${courseId}/levels`);
  }, [router]);

  const handleLevelClick = useCallback((courseId: string, levelId: string) => {
    router.push(`/t-portal/courses/${courseId}/levels/${levelId}/units`);
  }, [router]);

  const handleUnitClick = useCallback((courseId: string, levelId: string, unitId: string) => {
    router.push(`/t-portal/courses/${courseId}/levels/${levelId}/units/${unitId}/sessions`);
  }, [router]);

  // Memoize isAdmin check
  const adminEmail = useMemo(() => user?.email === 'jwag.lang@gmail.com', [user]);

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
    setIsAdmin(adminEmail);
  }, [adminEmail]);

  useEffect(() => {
    console.log('🔵 SIDEBAR: Setting up courses listener');
    let isSubscribed = true;
    
    const unsubscribe = onCoursesUpdate((templates) => {
      if (!isSubscribed) return;
      
      console.log('🟢 SIDEBAR: Courses updated:', templates.length, 'courses');
      setCourses(templates);
    });
    
    return () => {
      console.log('🔴 SIDEBAR: Cleaning up courses listener');
      isSubscribed = false;
      unsubscribe();
    };
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await logOut();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [router]);

  // Keyboard event handlers for accessibility
  const handleKeyDown = useCallback((e: React.KeyboardEvent, callback: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      callback();
    }
  }, []);

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
          {/* Top Level Items */}
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === '/t-portal'}
              tooltip="Dashboard"
            >
              <a href="/t-portal" className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === '/t-portal/calendar'}
              tooltip="Calendar"
            >
              <a href="/t-portal/calendar" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Calendar</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === '/t-portal/chat'}
              tooltip="Chat"
            >
              <Link href="/t-portal/chat" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span>Chat</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Courses with hover-based expansion */}
          <div 
            className="relative"
            onMouseEnter={() => handleMouseEnter('courses')}
            onMouseLeave={handleMouseLeave}
          >
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith('/t-portal/courses') && !pathname.includes('/courses/')}
                tooltip="Courses"
                className="w-full"
              >
                <a 
                  href="/t-portal/courses" 
                  className="flex items-center gap-2"
                >
                  <Library className="h-4 w-4" />
                  <span>Courses</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
            
            {/* Courses submenu */}
            {hoveredItem === 'courses' && (
              <div className="pl-4">
                {courses.map(course => (
                  <div 
                    key={course.id} 
                    className="relative"
                    onMouseEnter={() => handleCourseMouseEnter(course.id)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname.includes(`/courses/${course.id}/`)}
                        className="w-full justify-start"
                      >
                        <div
                          className="flex items-center justify-between w-full px-3 py-2 cursor-pointer"
                          onClick={() => handleCourseClick(course.id)}
                          onKeyDown={(e) => handleKeyDown(e, () => handleCourseClick(course.id))}
                          role="button"
                          tabIndex={0}
                        >
                          <span className="truncate">{course.title}</span>
                          {loadingStates.courses.has(course.id) && (
                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent ml-2" />
                          )}
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    
                    {/* Levels submenu for this course */}
                    {hoveredCourseId === course.id && course.levels && course.levels.length > 0 && (
                      <div className="pl-4">
                        {course.levels.map(level => (
                          <div 
                            key={level.id}
                            className="relative"
                            onMouseEnter={() => handleLevelMouseEnter(level.id, course.id)}
                            onMouseLeave={handleMouseLeave}
                          >
                            <SidebarMenuItem>
                              <SidebarMenuButton
                                isActive={pathname.includes(`/levels/${level.id}/`)}
                                className="w-full justify-start text-sm"
                              >
                                <div
                                  className="flex items-center justify-between w-full px-3 py-2 cursor-pointer"
                                  onClick={() => handleLevelClick(course.id, level.id)}
                                  onKeyDown={(e) => handleKeyDown(e, () => handleLevelClick(course.id, level.id))}
                                  role="button"
                                  tabIndex={0}
                                >
                                  <span className="truncate">{level.title}</span>
                                  {loadingStates.levels.has(level.id) && (
                                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent ml-2" />
                                  )}
                                </div>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                            
                            {/* Units submenu for this level */}
                            {hoveredLevelId === level.id && (level as LevelWithDetails).units && (
                              <div className="pl-4">
                                {(level as LevelWithDetails).units!.map(unit => (
                                  <SidebarMenuItem key={unit.id}>
                                    <SidebarMenuButton
                                      isActive={pathname.includes(`/units/${unit.id}/`)}
                                      className="w-full justify-start text-xs"
                                    >
                                      <div
                                        className="w-full px-3 py-2 cursor-pointer"
                                        onClick={() => handleUnitClick(course.id, level.id, unit.id)}
                                        onKeyDown={(e) => handleKeyDown(e, () => handleUnitClick(course.id, level.id, unit.id))}
                                        role="button"
                                        tabIndex={0}
                                      >
                                        <span className="truncate">{unit.title}</span>
                                      </div>
                                    </SidebarMenuButton>
                                  </SidebarMenuItem>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {courses.length === 0 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground pl-4">
                    No courses available
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Learners Section with hover-based expansion */}
          <div 
            className="relative"
            onMouseEnter={() => handleMouseEnter('learners')}
            onMouseLeave={handleMouseLeave}
          >
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith('/t-portal/students')}
                tooltip="Learners"
                className="w-full"
              >
                <a 
                  href="/t-portal/students" 
                  className="flex items-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  <span>Learners</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
            
            {/* Learners submenu */}
            {hoveredItem === 'learners' && (
              <div className="pl-4">
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith('/t-portal/students')}
                    tooltip="Students"
                    className="w-full justify-start"
                  >
                    <a href="/t-portal/students" className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>Students</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === '/t-portal/approvals'}
                    tooltip="Approvals"
                    className="w-full justify-start"
                  >
                    <a href="/t-portal/approvals" className="flex items-center justify-between w-full">
                      <span className="flex items-center gap-2">
                        <ClipboardCheck className="h-4 w-4" />
                        <span>Approvals</span>
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
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === '/t-portal/reports'}
                    tooltip="Reports"
                    className="w-full justify-start"
                  >
                    <a href="/t-portal/reports" className="flex items-center gap-2">
                      <BarChart2 className="h-4 w-4" />
                      <span>Reports</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </div>
            )}
          </div>
        </SidebarMenu>
      </SidebarContent>

      {/* Footer with Tutor Section */}
      <SidebarFooter className="p-0 gap-0">
        <div className="p-2">
          <ThemeToggle />
        </div>
        {user && !loading && (
          <div 
            className="border-t border-sidebar-border relative"
            onMouseEnter={() => handleMouseEnter('tutor')}
            onMouseLeave={handleMouseLeave}
          >
            <div className="p-4 pb-2">
              <div className="flex items-center gap-3 cursor-pointer">
                <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center flex-shrink-0">
                  <BookOpen className="h-4 w-4 text-sidebar-accent-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">Tutor</p>
                  <p className="text-xs text-muted-foreground truncate" title={user.email}>
                    {user.email}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Tutor submenu */}
            {hoveredItem === 'tutor' && (
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
