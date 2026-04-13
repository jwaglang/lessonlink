'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/components/auth-provider';
import { Toaster } from '@/components/ui/toaster';

export default function SessionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No sidebar for session pages - full screen only
  return (
    <div>
      {children}
      <Toaster />
    </div>
  );
}
