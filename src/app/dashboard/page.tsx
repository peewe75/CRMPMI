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
import { getCurrentOrganizationFeatureFlags } from '@/lib/auth/feature-flags';
import { Card } from '@/components/ui/card';

export default async function DashboardHome() {
  const featureFlags = await getCurrentOrganizationFeatureFlags();

  const quickActions = [
    featureFlags.barcode_scan ? { href: '/dashboard/scan', label: 'Scansiona', icon: ScanBarcode, color: 'bg-blue-500' } : null,
    { href: '/dashboard/quick-add', label: 'Quick Add', icon: Plus, color: 'bg-green-500' },
    featureFlags.voice_input ? { href: '/dashboard/voice', label: 'Voce', icon: Mic, color: 'bg-purple-500' } : null,
    featureFlags.document_import ? { href: '/dashboard/documents/upload', label: 'Carica Doc', icon: FileUp, color: 'bg-orange-500' } : null,
  ].filter(Boolean) as Array<{ href: string; label: string; icon: typeof ScanBarcode; color: string }>;

  const sections = [
    { href: '/dashboard/products', label: 'Prodotti', icon: Package, desc: 'Gestisci catalogo' },
    { href: '/dashboard/inventory', label: 'Magazzino', icon: Warehouse, desc: 'Scorte e movimenti' },
    featureFlags.document_import ? { href: '/dashboard/documents', label: 'Documenti', icon: FileText, desc: 'DDT e fatture' } : null,
    { href: '/dashboard/products?search=true', label: 'Cerca', icon: Search, desc: 'Cerca articolo' },
  ].filter(Boolean) as Array<{ href: string; label: string; icon: typeof Package; desc: string }>;

  return (
    <div className="space-y-6 p-4">
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
