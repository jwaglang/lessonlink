'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useRef } from 'react';
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
} from 'lucide-react';
import { GradientIcon } from './gradient-icon';
import { ThemeToggle } from './theme-toggle';
import { logOut } from '@/lib/auth';
import { useAuth } from './auth-provider';
import { Button } from './ui/button';

const ADMIN_EMAIL = 'jwag.lang@gmail.com';

const StudentAppSidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  // State for hover-based expansion
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

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
    }, 150);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await logOut();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [router]);

  const isAdmin = user?.email === ADMIN_EMAIL;

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
          {/* Dashboard */}
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === '/s-portal'}
              tooltip="Dashboard"
            >
              <a href="/s-portal" className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Calendar */}
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === '/s-portal/calendar'}
              tooltip="Calendar"
            >
              <a href="/s-portal/calendar" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Calendar</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Chat */}
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === '/s-portal/chat'}
              tooltip="Chat"
            >
              <a href="/s-portal/chat" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span>Chat</span>
              </a>
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
                isActive={pathname.startsWith('/s-portal/courses') || pathname.startsWith('/s-portal/units') || pathname.startsWith('/s-portal/feedback') || pathname.startsWith('/s-portal/evaluations')}
                tooltip="Courses"
                className="w-full"
              >
                <a 
                  href="/s-portal/courses" 
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
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === '/s-portal/units'}
                    tooltip="My Units"
                    className="w-full justify-start"
                  >
                    <a href="/s-portal/units" className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      <span>My Units</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === '/s-portal/browse'}
                    tooltip="Browse Units"
                    className="w-full justify-start"
                  >
                    <a href="/s-portal/browse" className="flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      <span>Browse Units</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === '/s-portal/feedback'}
                    tooltip="Feedback"
                    className="w-full justify-start"
                  >
                    <a href="/s-portal/feedback" className="flex items-center gap-2">
                      <Library className="h-4 w-4" />
                      <span>Feedback</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === '/s-portal/evaluations'}
                    tooltip="Evaluations"
                    className="w-full justify-start"
                  >
                    <a href="/s-portal/evaluations" className="flex items-center gap-2">
                      <ClipboardCheck className="h-4 w-4" />
                      <span>Evaluations</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </div>
            )}
          </div>

          {/* Tutors with hover-based expansion */}
          <div 
            className="relative"
            onMouseEnter={() => handleMouseEnter('tutors')}
            onMouseLeave={handleMouseLeave}
          >
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith('/s-portal/tutors')}
                tooltip="Tutors"
                className="w-full"
              >
                <a 
                  href="/s-portal/tutors" 
                  className="flex items-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  <span>Tutors</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
            
            {/* Tutors submenu */}
            {hoveredItem === 'tutors' && (
              <div className="pl-4">
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === '/s-portal/tutors/my-tutor'}
                    tooltip="My Tutor"
                    className="w-full justify-start"
                  >
                    <a href="/s-portal/tutors/my-tutor" className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      <span>My Tutor</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === '/s-portal/tutors/find'}
                    tooltip="Find a Tutor"
                    className="w-full justify-start"
                  >
                    <a href="/s-portal/tutors/find" className="flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      <span>Find a Tutor</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </div>
            )}
          </div>
        </SidebarMenu>
      </SidebarContent>

      {/* Footer with Learner Section */}
      <SidebarFooter className="p-0 gap-0">
        <div className="p-2">
          <ThemeToggle />
        </div>
        {user && !loading && (
          <div 
            className="border-t border-sidebar-border relative"
            onMouseEnter={() => handleMouseEnter('learner')}
            onMouseLeave={handleMouseLeave}
          >
            <div className="p-4 pb-2">
              <div className="flex items-center gap-3 cursor-pointer">
                <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="h-4 w-4 text-sidebar-accent-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">Learner</p>
                  <p className="text-xs text-muted-foreground truncate" title={user.email}>
                    {user.email}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Learner submenu */}
            {hoveredItem === 'learner' && (
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