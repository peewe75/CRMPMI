'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Package,
  ScanBarcode,
  FileText,
  Menu,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { FeatureFlags } from '@/types/database';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/dashboard/products', label: 'Prodotti', icon: Package },
  { href: '/dashboard/scan', label: 'Scan', icon: ScanBarcode, feature: 'barcode_scan' as const },
  { href: '/dashboard/documents', label: 'Documenti', icon: FileText, feature: 'document_import' as const },
  { href: '/dashboard/more', label: 'Altro', icon: Menu },
] as const;

export function MobileNav({
  featureFlags,
}: {
  featureFlags: FeatureFlags;
}) {
  const pathname = usePathname();
  const visibleItems = NAV_ITEMS.filter((item) => !('feature' in item) || !item.feature || featureFlags[item.feature]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-white pb-safe md:hidden">
      <div className="flex items-center justify-around">
        {visibleItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors',
                isActive
                  ? 'text-accent font-semibold'
                  : 'text-muted-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
