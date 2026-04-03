'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Package,
  Layers,
  Warehouse,
  ArrowRightLeft,
  FileText,
  Users,
  Settings,
  ScanBarcode,
  Mic,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const SIDEBAR_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/dashboard/products', label: 'Prodotti', icon: Package },
  { href: '/dashboard/variants', label: 'Varianti', icon: Layers },
  { href: '/dashboard/inventory', label: 'Magazzino', icon: Warehouse },
  { href: '/dashboard/movements', label: 'Movimenti', icon: ArrowRightLeft },
  { href: '/dashboard/documents', label: 'Documenti', icon: FileText },
  { type: 'separator' as const, label: 'Strumenti' },
  { href: '/dashboard/scan', label: 'Scanner', icon: ScanBarcode },
  { href: '/dashboard/voice', label: 'Input Vocale', icon: Mic },
  { type: 'separator' as const, label: 'Impostazioni' },
  { href: '/dashboard/users', label: 'Utenti', icon: Users },
  { href: '/dashboard/settings', label: 'Impostazioni', icon: Settings },
] as const;

export function DesktopSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:border-r md:border-border md:bg-white">
      <div className="flex h-14 items-center border-b border-border px-4">
        <Link href="/dashboard" className="text-lg font-bold text-primary">
          CRM Negozi
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-0.5">
          {SIDEBAR_ITEMS.map((item, i) => {
            if ('type' in item && item.type === 'separator') {
              return (
                <li key={i} className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {item.label}
                </li>
              );
            }

            const navItem = item as { href: string; label: string; icon: React.ComponentType<{ className?: string }> };
            const isActive =
              navItem.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(navItem.href);

            return (
              <li key={navItem.href}>
                <Link
                  href={navItem.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-accent/10 font-medium text-accent'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <navItem.icon className="h-4 w-4" />
                  {navItem.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
