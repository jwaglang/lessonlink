'use client';

import { usePathname } from 'next/navigation';
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
} from 'lucide-react';
import { GradientIcon } from './gradient-icon';
import { ThemeToggle } from './theme-toggle';

const StudentAppSidebar = () => {
  const pathname = usePathname();

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
      <SidebarFooter>
        <ThemeToggle />
      </SidebarFooter>
    </>
  );
};

export default StudentAppSidebar;
