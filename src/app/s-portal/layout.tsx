import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import StudentAppSidebar from '@/components/student-app-sidebar';

export default function StudentPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
