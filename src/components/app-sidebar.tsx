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
} from 'lucide-react';
import { GradientIcon } from './gradient-icon';
import { auth, logOut } from '@/lib/auth';
import { ThemeToggle } from './theme-toggle';
import { Badge } from '@/components/ui/badge';
import { getApprovalRequests } from '@/lib/firestore';
import { Button } from './ui/button';

const AppSidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingCount, setPendingCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

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
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsAdmin(user?.email === 'jwag.lang@gmail.com');
    });
    return () => unsubscribe();
  }, []);

  async function handleLogout() {
    await logOut();
    router.push('/login');
  }

  const menuItems = [
    { href: '/t-portal', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/t-portal/students', label: 'Students', icon: Users },
    { href: '/t-portal/calendar', label: 'Calendar', icon: Calendar },
    { href: '/t-portal/courses', label: 'Courses', icon: Library },
    { href: '/t-portal/approvals', label: 'Approvals', icon: ClipboardCheck, badge: pendingCount },
    { href: '/t-portal/reports', label: 'Reports', icon: BarChart2 },
    { href: '/t-portal/settings', label: 'Settings', icon: Settings },
  ];

  if (isAdmin) {
    menuItems.push({ href: '/admin', label: 'Admin', icon: Shield });
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
          {menuItems.map((item) => (
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
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <ThemeToggle />
        <SidebarMenuButton
          onClick={handleLogout}
          className="w-full justify-start"
          tooltip="Log Out"
        >
          <LogOut />
          <span>Log Out</span>
        </SidebarMenuButton>
      </SidebarFooter>
    </>
  );
};

export default AppSidebar;
