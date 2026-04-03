'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import type { FeatureFlags } from '@/types/database';
import { getVisibleSidebarItems } from '@/lib/navigation/dashboard-navigation';

export function DesktopSidebar({
  featureFlags,
}: {
  featureFlags: FeatureFlags;
}) {
  const pathname = usePathname();
  const visibleItems = getVisibleSidebarItems(featureFlags);

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:border-r md:border-border md:bg-white">
      <div className="flex h-14 items-center border-b border-border px-4">
        <Link href="/dashboard" className="text-lg font-bold text-primary">
          CRM Negozi
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-0.5">
          {visibleItems.map((item, i) => {
            if (item.type === 'separator') {
              return (
                <li key={i} className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {item.label}
                </li>
              );
            }

            const navItem = item;
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
