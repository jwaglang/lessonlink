'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { logOut } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Star,
  Users,
  Calendar,
  Package,
  Settings,
  LogOut,
  Shield,
  Menu,
  X,
  BookOpenCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { GradientIcon } from '@/components/gradient-icon';

// Admin email - in production, check against a list or role
const ADMIN_EMAIL = 'jwag.lang@gmail.com';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/reviews', label: 'Reviews', icon: Star },
  // Future sections:
  // { href: '/admin/students', label: 'Students', icon: Users },
  // { href: '/admin/lessons', label: 'Lessons', icon: Calendar },
  // { href: '/admin/packages', label: 'Packages', icon: Package },
  // { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (!loading && user && user.email !== ADMIN_EMAIL) {
      // Not an admin
      router.push('/');
    }
  }, [user, loading, router]);

  async function handleLogout() {
    await logOut();
    router.push('/login');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user || user.email !== ADMIN_EMAIL) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <header className="lg:hidden border-b sticky top-0 bg-background z-50">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <GradientIcon icon={BookOpenCheck} id="logo-admin-mobile" className="w-8 h-8"/>
            <h1 className="text-xl font-headline font-bold primary-gradient-text">
                LessonLink
            </h1>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-40 w-64 bg-card border-r transform transition-transform lg:translate-x-0 lg:static',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="hidden lg:flex items-center gap-2 p-6 border-b">
              <GradientIcon icon={BookOpenCheck} id="logo-admin-desktop" className="w-8 h-8"/>
              <h1 className="text-xl font-headline font-bold primary-gradient-text">
                  LessonLink
              </h1>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* User section */}
            <div className="p-4 border-t">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">Admin</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
              <Button size="sm" className="w-full" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Log Out
              </Button>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 min-h-screen lg:min-h-0">
          {children}
        </main>
      </div>
    </div>
  );
}
