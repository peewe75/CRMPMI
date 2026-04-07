import Link from 'next/link';
import { ArrowRightLeft, Package } from 'lucide-react';
import { getStockLevels, listMovements, listStores } from '@/modules/inventory/application/inventory-service';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  getVariantCommercialLabel,
  getVariantGroupKey,
  getVariantSizeLabel,
} from '@/modules/products/domain/variant-display';

export const dynamic = 'force-dynamic';

const TYPE_LABELS: Record<string, string> = {
  inbound: 'Entrata',
  outbound: 'Uscita',
  adjustment: 'Rettifica',
  transfer: 'Trasferimento',
};

const TYPE_COLORS: Record<string, 'success' | 'destructive' | 'warning' | 'default'> = {
  inbound: 'success',
  outbound: 'destructive',
  adjustment: 'warning',
  transfer: 'default',
};

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string; view?: string; type?: string }>;
}) {
  const params = await searchParams;
  const activeView = params.view === 'storico' ? 'storico' : 'stock';

  const [stores, stockData] = await Promise.all([
    listStores(),
    getStockLevels({ store_id: params.store }),
  ]);

  // Load movements only when the storico tab is active
  const movementsData =
    activeView === 'storico'
      ? await listMovements({
          limit: 50,
          movement_type:
            params.type && params.type in TYPE_LABELS ? params.type : undefined,
        })
      : null;

  const selectedType =
    params.type && params.type in TYPE_LABELS ? params.type : undefined;

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Magazzino</h1>
          <p className="text-sm text-muted-foreground">
            {activeView === 'stock'
              ? 'Stock attuale per negozio, variante commerciale e taglia.'
              : 'Storico carichi, scarichi e rettifiche.'}
          </p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 rounded-lg border border-border bg-muted/50 p-1">
        <Button
          asChild
          size="sm"
          variant={activeView === 'stock' ? 'default' : 'ghost'}
          className="flex-1"
        >
          <Link href="/dashboard/inventory">
            <Package className="mr-1.5 h-4 w-4" />
            Stock
          </Link>
        </Button>
        <Button
          asChild
          size="sm"
          variant={activeView === 'storico' ? 'default' : 'ghost'}
          className="flex-1"
        >
          <Link href="/dashboard/inventory?view=storico">
            <ArrowRightLeft className="mr-1.5 h-4 w-4" />
            Storico
          </Link>
        </Button>
      </div>

      {/* ── STOCK VIEW ── */}
      {activeView === 'stock' && (
        <>
          {/* Store filter */}
          {stores.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              <Button asChild size="sm" variant={!params.store ? 'default' : 'outline'}>
                <Link href="/dashboard/inventory">Tutti</Link>
              </Button>
              {stores.map((store) => (
                <Button
                  key={store.id}
                  asChild
                  size="sm"
                  variant={params.store === store.id ? 'default' : 'outline'}
                >
                  <Link href={`/dashboard/inventory?store=${store.id}`}>{store.name}</Link>
                </Button>
              ))}
            </div>
          )}

          {stores.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Nessun punto vendita configurato"
              description="Verrà creato automaticamente al primo movimento."
            />
          ) : (
            stores.map((store) => {
              const storeStock = stockData.filter((item) => item.store_id === store.id);
              const totalUnits = storeStock.reduce((sum, item) => sum + Number(item.quantity), 0);
              const groupedStock = storeStock.reduce<Record<string, typeof storeStock>>((accumulator, item) => {
                const key = `${item.product_variants.products.id}::${getVariantGroupKey(item.product_variants)}`;
                accumulator[key] = accumulator[key] ? [...accumulator[key], item] : [item];
                return accumulator;
              }, {});

              return (
                <Card key={store.id}>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="font-semibold">{store.name}</h2>
                    <div className="flex gap-2">
                      <Badge variant="outline">{Object.keys(groupedStock).length} varianti</Badge>
                      <Badge variant="outline">{totalUnits} unità</Badge>
                    </div>
                  </div>

                  {storeStock.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nessun articolo in stock.</p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {Object.values(groupedStock).slice(0, 30).map((group) => {
                        const firstItem = group[0];
                        const variant = firstItem.product_variants;
                        const groupQuantity = group.reduce((sum, item) => sum + Number(item.quantity), 0);

                        return (
                          <li key={`${store.id}-${variant.products.id}-${getVariantGroupKey(variant)}`} className="py-2 text-sm">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <Link
                                  href={`/dashboard/products/${variant.products.id}`}
                                  className="font-medium hover:underline"
                                >
                                  {variant.products.brand} {variant.products.model_name}
                                </Link>
                                <span className="ml-2 text-muted-foreground">
                                  {getVariantCommercialLabel(variant)}
                                </span>
                              </div>
                              <Badge variant={groupQuantity > 0 ? 'success' : 'destructive'}>{groupQuantity}</Badge>
                            </div>

                            <div className="mt-2 flex flex-wrap gap-2">
                              {group.map((item) => {
                                const itemVariant = item.product_variants;

                                return (
                                  <Link
                                    key={`${item.store_id}-${item.variant_id}`}
                                    href={`/dashboard/products/${itemVariant.products.id}/variants/${itemVariant.id}`}
                                    className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
                                  >
                                    {getVariantSizeLabel(itemVariant)}: {item.quantity}
                                  </Link>
                                );
                              })}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Card>
              );
            })
          )}
        </>
      )}

      {/* ── STORICO (MOVEMENTS) VIEW ── */}
      {activeView === 'storico' && (
        <>
          {/* Type filter */}
          <div className="flex gap-2 overflow-x-auto">
            <Button asChild size="sm" variant={!selectedType ? 'default' : 'outline'}>
              <Link href="/dashboard/inventory?view=storico">Tutti</Link>
            </Button>
            {Object.entries(TYPE_LABELS).map(([type, label]) => (
              <Button key={type} asChild size="sm" variant={selectedType === type ? 'default' : 'outline'}>
                <Link href={`/dashboard/inventory?view=storico&type=${type}`}>{label}</Link>
              </Button>
            ))}
          </div>

          {!movementsData || movementsData.movements.length === 0 ? (
            <EmptyState
              icon={ArrowRightLeft}
              title="Nessun movimento registrato"
              description="I movimenti di carico, scarico e rettifica appariranno qui."
            />
          ) : (
            <ul className="space-y-2">
              {movementsData.movements.map((movement) => {
                const variant = movement.product_variants;
                return (
                  <li key={movement.id} className="flex items-center justify-between rounded-lg border border-border bg-white p-3">
                    <div>
                      <p className="text-sm font-medium">
                        {variant?.products?.brand} {variant?.products?.model_name}
                        <span className="ml-1 text-muted-foreground">
                          {variant ? `${getVariantCommercialLabel(variant)} - ${getVariantSizeLabel(variant)}` : '-'}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(movement.created_at).toLocaleDateString('it-IT', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {movement.notes ? ` - ${movement.notes}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-right">
                      <span className="text-sm font-semibold">
                        {movement.movement_type === 'outbound' ? '-' : '+'}
                        {movement.quantity}
                      </span>
                      <Badge variant={TYPE_COLORS[movement.movement_type]}>
                        {TYPE_LABELS[movement.movement_type]}
                      </Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
