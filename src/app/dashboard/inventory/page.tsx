import { getStockLevels } from '@/modules/inventory/application/inventory-service';
import { listStores } from '@/modules/inventory/application/inventory-service';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function InventoryPage() {
  const [stores, stockData] = await Promise.all([
    listStores(),
    getStockLevels(),
  ]);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Magazzino</h1>

      {stores.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Nessun punto vendita configurato. Verrà creato automaticamente al primo movimento.
        </p>
      ) : (
        stores.map((store) => {
          const storeStock = stockData.filter((s) => s.store_id === store.id);
          return (
            <Card key={store.id}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">{store.name}</h2>
                <Badge variant="outline">{storeStock.length} articoli</Badge>
              </div>

              {storeStock.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessun articolo in stock.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {storeStock.slice(0, 20).map((item) => {
                    const variant = item.product_variants as unknown as {
                      size: string;
                      color: string;
                      products: { brand: string; model_name: string; category: string };
                    };
                    return (
                      <li key={`${item.store_id}-${item.variant_id}`} className="flex items-center justify-between py-2 text-sm">
                        <div>
                          <span className="font-medium">{variant.products?.brand} {variant.products?.model_name}</span>
                          <span className="text-muted-foreground ml-2">
                            Tg.{variant.size} {variant.color}
                          </span>
                        </div>
                        <Badge variant={item.quantity > 0 ? 'success' : 'destructive'}>
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
