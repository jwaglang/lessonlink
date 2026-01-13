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
  BarChart2,
  Settings,
  BookOpenCheck,
} from 'lucide-react';
import { GradientIcon } from './gradient-icon';

const AppSidebar = () => {
  const pathname = usePathname();

  const menuItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/students', label: 'Students', icon: Users },
    { href: '/calendar', label: 'Calendar', icon: Calendar },
    { href: '/reports', label: 'Reports', icon: BarChart2 },
    { href: '/settings', label: 'Settings', icon: Settings },
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
                isActive={pathname === item.href}
                tooltip={item.label}
              >
                <>
                  <item.icon />
                  <span>{item.label}</span>
                </>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
      </SidebarFooter>
    </>
  );
};

export default AppSidebar;
