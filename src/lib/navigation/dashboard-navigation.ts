import {
  Bot,
  Home,
  Menu,
  Package,
  Plus,
  Search,
  Settings,
  Users,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';
import type { FeatureFlags } from '@/types/database';

type FeatureKey = keyof FeatureFlags;

type BaseNavigationItem = {
  href: string;
  label: string;
  feature?: FeatureKey;
};

export type SidebarItem =
  | {
      type: 'link';
      href: string;
      label: string;
      icon: LucideIcon;
      feature?: FeatureKey;
    }
  | {
      type: 'separator';
      label: string;
    };

export type MobileNavItem = BaseNavigationItem & {
  icon: LucideIcon;
};

export type QuickActionItem = BaseNavigationItem & {
  icon: LucideIcon;
  color: string;
};

export type DashboardSectionItem = BaseNavigationItem & {
  icon: LucideIcon;
  desc: string;
};

export const SIDEBAR_ITEMS: SidebarItem[] = [
  { type: 'link', href: '/dashboard', label: 'Dashboard', icon: Home },
  { type: 'link', href: '/dashboard/products', label: 'Prodotti', icon: Package },
  { type: 'link', href: '/dashboard/inventory', label: 'Magazzino', icon: Warehouse },
  { type: 'link', href: '/dashboard/proposals', label: 'Proposte', icon: Search },
  {
    type: 'link',
    href: '/dashboard/assistant',
    label: 'Assistente',
    icon: Bot,
  },
  { type: 'separator', label: 'Impostazioni' },
  { type: 'link', href: '/dashboard/users', label: 'Utenti', icon: Users },
  { type: 'link', href: '/dashboard/settings', label: 'Impostazioni', icon: Settings },
];

export const MOBILE_NAV_ITEMS: MobileNavItem[] = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/dashboard/products', label: 'Prodotti', icon: Package },
  { href: '/dashboard/assistant', label: 'Assistente', icon: Bot },
  { href: '/dashboard/more', label: 'Altro', icon: Menu },
];

export const DASHBOARD_QUICK_ACTIONS: QuickActionItem[] = [
  { href: '/dashboard/quick-add', label: 'Quick Add', icon: Plus, color: 'bg-green-500' },
  { href: '/dashboard/assistant', label: 'Assistente', icon: Bot, color: 'bg-cyan-500' },
];

export const DASHBOARD_SECTIONS: DashboardSectionItem[] = [
  { href: '/dashboard/products', label: 'Prodotti', icon: Package, desc: 'Gestisci catalogo' },
  { href: '/dashboard/inventory', label: 'Magazzino', icon: Warehouse, desc: 'Scorte e movimenti' },
  { href: '/dashboard/assistant', label: 'Assistente', icon: Bot, desc: 'DDT, fatture e supporto AI' },
  { href: '/dashboard/products?search=true', label: 'Cerca', icon: Search, desc: 'Cerca articolo' },
];

export const MORE_PAGE_LINKS: BaseNavigationItem[] = [
  { href: '/dashboard/quick-add', label: 'Quick add' },
  { href: '/dashboard/assistant', label: 'Assistente AI' },
  { href: '/dashboard/inventory', label: 'Magazzino' },
  { href: '/dashboard/proposals', label: 'Proposte' },
  { href: '/dashboard/users', label: 'Utenti e ruoli' },
  { href: '/dashboard/settings', label: 'Impostazioni' },
];

function isFeatureVisible(featureFlags: FeatureFlags, feature?: FeatureKey) {
  return !feature || featureFlags[feature];
}

export function getVisibleSidebarItems(featureFlags: FeatureFlags) {
  const filtered = SIDEBAR_ITEMS.filter((item) => {
    if (item.type === 'separator') {
      return true;
    }

    return isFeatureVisible(featureFlags, item.feature);
  });

  return filtered.filter((item, index) => {
    if (item.type !== 'separator') {
      return true;
    }

    const previous = filtered[index - 1];
    const next = filtered[index + 1];

    return previous?.type === 'link' && next?.type === 'link';
  });
}

export function getVisibleMobileNavItems(featureFlags: FeatureFlags) {
  return MOBILE_NAV_ITEMS.filter((item) => isFeatureVisible(featureFlags, item.feature));
}

export function getVisibleDashboardQuickActions(featureFlags: FeatureFlags) {
  return DASHBOARD_QUICK_ACTIONS.filter((item) => isFeatureVisible(featureFlags, item.feature));
}

export function getVisibleDashboardSections(featureFlags: FeatureFlags) {
  return DASHBOARD_SECTIONS.filter((item) => isFeatureVisible(featureFlags, item.feature));
}

export function getVisibleMorePageLinks(featureFlags: FeatureFlags) {
  return MORE_PAGE_LINKS.filter((item) => isFeatureVisible(featureFlags, item.feature));
}
