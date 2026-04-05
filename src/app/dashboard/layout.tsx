import { auth } from '@clerk/nextjs/server';
import { DesktopSidebar } from '@/components/layout/desktop-sidebar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { OrganizationOnboarding } from '@/components/layout/organization-onboarding';
import { TopBar } from '@/components/layout/top-bar';
import { getCurrentOrganizationFeatureFlags } from '@/lib/auth/feature-flags';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session.orgId) {
    return <OrganizationOnboarding />;
  }

  const featureFlags = await getCurrentOrganizationFeatureFlags();

  return (
    <div className="flex h-screen overflow-hidden">
      <DesktopSidebar featureFlags={featureFlags} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />

        <main className="flex-1 overflow-y-auto pb-20 md:pb-0" style={{ animation: 'page-enter 0.25s ease-out' }}>
          {children}
        </main>

        <MobileNav featureFlags={featureFlags} />
      </div>
    </div>
  );
}
