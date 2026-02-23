
'use client';

import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import AppSidebar from '@/components/t-app-sidebar';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { getTeacherProfileByEmail } from '@/lib/firestore';
import { Loader } from 'lucide-react';

const ADMIN_EMAIL = 'jwag.lang@gmail.com';

export default function TeacherPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (authLoading) {
      return; // Wait for Firebase auth to initialize
    }

    if (!user || !user.email) {
      router.push('/');
      return;
    }

    // Check if the user is a teacher or admin
    async function checkAuthorization() {
      try {
        const teacherProfile = await getTeacherProfileByEmail(user!.email!);
        const isAdmin = user!.email === ADMIN_EMAIL;

        if (teacherProfile || isAdmin) {
          setIsAuthorized(true);
        } else {
          // Not a teacher or admin, boot them
          router.push('/');
        }
      } catch (error) {
        console.error("Authorization check failed:", error);
        router.push('/');
      } finally {
        setIsChecking(false);
      }
    }

    checkAuthorization();

  }, [user, authLoading, router]);

  if (isChecking || authLoading) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <div className="flex items-center gap-2">
                <Loader className="h-8 w-8 animate-spin primary-gradient-text" />
                <span className="text-lg font-semibold text-muted-foreground">Verifying access...</span>
            </div>
        </div>
    );
  }

  if (!isAuthorized) {
    // Should have been redirected, but as a fallback, show nothing
    return null;
  }
  
  return (
    <SidebarProvider>
      <Sidebar variant="sidebar" collapsible="icon">
        <AppSidebar />
      </Sidebar>
      <SidebarInset>
        <main>{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
