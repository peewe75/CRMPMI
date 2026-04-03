import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';

const LINKS = [
  { href: '/dashboard/quick-add', label: 'Quick add' },
  { href: '/dashboard/voice', label: 'Input vocale' },
  { href: '/dashboard/movements', label: 'Movimenti' },
  { href: '/dashboard/variants', label: 'Varianti' },
  { href: '/dashboard/users', label: 'Utenti e ruoli' },
  { href: '/dashboard/settings', label: 'Impostazioni' },
];

export default function MorePage() {
  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold">Altro</h1>
        <p className="text-sm text-muted-foreground">
          Collegamenti secondari utili da mobile senza sovraccaricare la bottom navigation.
        </p>
      </div>

      <div className="space-y-2">
        {LINKS.map((item) => (
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
