import Link from 'next/link';
import { getStockLevels, listStores } from '@/modules/inventory/application/inventory-service';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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
          <p className="text-sm text-muted-foreground">Stock attuale per negozio e variante.</p>
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
        <p className="text-sm text-muted-foreground">
          Nessun punto vendita configurato. Verra creato automaticamente al primo movimento.
        </p>
      ) : (
        stores.map((store) => {
          const storeStock = stockData.filter((item) => item.store_id === store.id);
          const totalUnits = storeStock.reduce((sum, item) => sum + Number(item.quantity), 0);

          return (
            <Card key={store.id}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold">{store.name}</h2>
                <div className="flex gap-2">
                  <Badge variant="outline">{storeStock.length} articoli</Badge>
                  <Badge variant="outline">{totalUnits} unita</Badge>
                </div>
              </div>

              {storeStock.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessun articolo in stock.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {storeStock.slice(0, 30).map((item) => {
                    const variant = item.product_variants;

                    return (
                      <li key={`${item.store_id}-${item.variant_id}`} className="flex items-center justify-between py-2 text-sm">
                        <div>
                          <Link
                            href={`/dashboard/products/${variant.products.id}/variants/${variant.id}`}
                            className="font-medium hover:underline"
                          >
                            {variant.products.brand} {variant.products.model_name}
                          </Link>
                          <span className="ml-2 text-muted-foreground">
                            Tg. {variant.size} {variant.color}
                          </span>
                        </div>
                        <Badge variant={Number(item.quantity) > 0 ? 'success' : 'destructive'}>
                          {item.quantity}
                        </Badge>
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
