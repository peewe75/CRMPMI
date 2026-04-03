import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { getCurrentOrganizationFeatureFlags } from '@/lib/auth/feature-flags';
import { Card } from '@/components/ui/card';
import { getVisibleMorePageLinks } from '@/lib/navigation/dashboard-navigation';

export default async function MorePage() {
  const featureFlags = await getCurrentOrganizationFeatureFlags();
  const links = getVisibleMorePageLinks(featureFlags);

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-xl font-bold">Altro</h1>
        <p className="text-sm text-muted-foreground">
          Collegamenti secondari utili da mobile senza sovraccaricare la bottom navigation.
        </p>
      </div>

      <div className="space-y-2">
        {links.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="flex items-center justify-between transition hover:shadow-sm">
              <span className="text-sm font-medium">{item.label}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
