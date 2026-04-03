import { DesktopSidebar } from '@/components/layout/desktop-sidebar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { TopBar } from '@/components/layout/top-bar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <DesktopSidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />

        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {children}
        </main>

        <MobileNav />
      </div>
    </div>
  );
}
