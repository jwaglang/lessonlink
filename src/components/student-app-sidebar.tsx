'use client';

import { usePathname, useRouter } from 'next/navigation';
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
  Settings,
  BookOpenCheck,
  Library,
  ClipboardCheck,
  LogOut,
  GraduationCap,
} from 'lucide-react';
import { GradientIcon } from './gradient-icon';
import { ThemeToggle } from './theme-toggle';
import { logOut } from '@/lib/auth';
import { useAuth } from './auth-provider';
import { Button } from './ui/button';

const StudentAppSidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  async function handleLogout() {
    await logOut();
    router.push('/login');
  }

  const menuItems = [
    { href: '/s-portal', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/s-portal/tutors', label: 'Tutors', icon: Users },
    { href: '/s-portal/book', label: 'Calendar', icon: Calendar },
    { href: '/s-portal/feedback', label: 'Feedback', icon: Library },
    { href: '/s-portal/evaluations', label: 'Evaluations', icon: ClipboardCheck },
    { href: '/s-portal/settings', label: 'Settings', icon: Settings },
  ];

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
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                // @ts-ignore
                href={item.href}
                isActive={pathname.startsWith(item.href) && (item.href !== '/s-portal' || pathname === '/s-portal')}
                tooltip={item.label}
              >
                <a href={item.href} className="flex items-center justify-between w-full">
                  <span className="flex items-center gap-2">
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </span>
                </a>
              </SidebarMenuButton>
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
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <GraduationCap className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Learner</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Log Out
            </Button>
          </div>
        )}
      </SidebarFooter>
    </>
  );
};

export default StudentAppSidebar;
