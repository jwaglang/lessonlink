'use client';

import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import StudentAppSidebar from '@/components/s-app-sidebar';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { Loader } from 'lucide-react';

const ADMIN_EMAIL = 'jwag.lang@gmail.com';

export default function StudentPortalLayout({
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

    // Check if the user is a student (NOT a teacher or admin)
    async function checkAuthorization() {
      try {
        const isAdmin = user!.email === ADMIN_EMAIL;
        
        if (isAdmin) {
          // Admin should use teacher portal
          router.push('/t-portal');
          return;
        }
        
        // Check if this email is the known teacher email
        const knownTeacherEmails = ['jwag.lang@gmail.com']; // Add more as needed
        
        if (knownTeacherEmails.includes(user!.email!)) {
          // This is a teacher, redirect them
          router.push('/t-portal');
          return;
        }
        
        // Anyone else is a student
        setIsAuthorized(true);
        
      } catch (error) {
        console.error("Authorization check failed:", error);
        // Fail open for students
        setIsAuthorized(true);
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
          <span className="text-lg font-semibold text-muted-foreground">Loading student portal...</span>
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
        <StudentAppSidebar />
      </Sidebar>
      <SidebarInset>
        <main>{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
