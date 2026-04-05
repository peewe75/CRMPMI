import Link from 'next/link';
import { Package } from 'lucide-react';
import { getStockLevels, listStores } from '@/modules/inventory/application/inventory-service';
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

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string }>;
}) {
  const params = await searchParams;
  const [stores, stockData] = await Promise.all([
    listStores(),
    getStockLevels({ store_id: params.store }),
  ]);

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Magazzino</h1>
          <p className="text-sm text-muted-foreground">Stock attuale per negozio, variante commerciale e taglia.</p>
        </div>

        {stores.length > 1 ? (
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
        ) : null}
      </div>

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
    </div>
  );
}
