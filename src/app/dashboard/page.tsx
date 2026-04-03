import Link from 'next/link';
import {
  ScanBarcode,
  Plus,
  Mic,
  FileUp,
  Search,
  Package,
  Warehouse,
  FileText,
} from 'lucide-react';
import { Card } from '@/components/ui/card';

const QUICK_ACTIONS = [
  { href: '/dashboard/scan', label: 'Scansiona', icon: ScanBarcode, color: 'bg-blue-500' },
  { href: '/dashboard/quick-add', label: 'Quick Add', icon: Plus, color: 'bg-green-500' },
  { href: '/dashboard/voice', label: 'Voce', icon: Mic, color: 'bg-purple-500' },
  { href: '/dashboard/documents/upload', label: 'Carica Doc', icon: FileUp, color: 'bg-orange-500' },
] as const;

const SECTIONS = [
  { href: '/dashboard/products', label: 'Prodotti', icon: Package, desc: 'Gestisci catalogo' },
  { href: '/dashboard/inventory', label: 'Magazzino', icon: Warehouse, desc: 'Scorte e movimenti' },
  { href: '/dashboard/documents', label: 'Documenti', icon: FileText, desc: 'DDT e fatture' },
  { href: '/dashboard/products?search=true', label: 'Cerca', icon: Search, desc: 'Cerca articolo' },
] as const;

export default function DashboardHome() {
  return (
    <div className="p-4 space-y-6">
      {/* Quick Actions - mobile prominent */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Azioni rapide
        </h2>
        <div className="grid grid-cols-4 gap-3">
          {QUICK_ACTIONS.map(({ href, label, icon: Icon, color }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1.5 rounded-xl bg-white p-3 shadow-sm border border-border transition active:scale-95"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${color} text-white`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-xs font-medium text-center">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Main sections */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Gestione
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {SECTIONS.map(({ href, label, icon: Icon, desc }) => (
            <Link key={href} href={href}>
              <Card className="transition active:scale-[0.98] hover:shadow-md">
                <div className="flex items-center gap-3">
                  <Icon className="h-8 w-8 text-accent" />
                  <div>
                    <p className="font-semibold text-sm">{label}</p>
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
