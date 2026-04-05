import Link from 'next/link';
import { getCurrentOrganizationFeatureFlags } from '@/lib/auth/feature-flags';
import { Card } from '@/components/ui/card';
import { DashboardKPIs } from '@/components/dashboard/dashboard-kpis';
import {
  getVisibleDashboardQuickActions,
  getVisibleDashboardSections,
} from '@/lib/navigation/dashboard-navigation';

export default async function DashboardHome() {
  const featureFlags = await getCurrentOrganizationFeatureFlags();
  const quickActions = getVisibleDashboardQuickActions(featureFlags);
  const sections = getVisibleDashboardSections(featureFlags);

  return (
    <div className="space-y-6 p-4">
      <DashboardKPIs />

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Azioni rapide
        </h2>
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map(({ href, label, icon: Icon, color }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-white p-3 shadow-sm transition active:scale-95"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${color} text-white`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-center text-xs font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Gestione
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {sections.map(({ href, label, icon: Icon, desc }) => (
            <Link key={href} href={href}>
              <Card className="transition active:scale-[0.98] hover:shadow-md">
                <div className="flex items-center gap-3">
                  <Icon className="h-8 w-8 text-accent" />
                  <div>
                    <p className="text-sm font-semibold">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
