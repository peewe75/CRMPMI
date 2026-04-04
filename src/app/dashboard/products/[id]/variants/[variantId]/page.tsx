import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ProductImageManager } from '@/components/products/product-image-manager';
import { getProduct } from '@/modules/products/application/products-service';
import { listProductImagesWithSignedUrls } from '@/modules/products/application/product-images-service';
import { getVariantStockByStores, listMovements, listStores } from '@/modules/inventory/application/inventory-service';
import { MovementQuickForm } from '@/components/inventory/movement-quick-form';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default async function VariantDetailPage({
  params,
}: {
  params: Promise<{ id: string; variantId: string }>;
}) {
  const { id, variantId } = await params;
  const product = await getProduct(id).catch(() => null);

  if (!product) {
    notFound();
  }

  const variant = product.product_variants.find((item) => item.id === variantId);
  if (!variant) {
    notFound();
  }

  const [stockLevels, recentMovements, stores] = await Promise.all([
    getVariantStockByStores(variantId),
    listMovements({ variant_id: variantId, limit: 10 }),
    listStores(),
  ]);
  const variantImages = await listProductImagesWithSignedUrls({
    product_id: id,
    variant_id: variantId,
  }).catch(() => []);

  const defaultStoreId = stores.find((store) => store.is_default)?.id ?? stores[0]?.id;
  const totalStock = stockLevels.reduce((sum, level) => sum + Number(level.quantity), 0);

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/dashboard/products/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold">Variante</h1>
          <p className="text-sm text-muted-foreground">
            {product.brand} {product.model_name}
          </p>
        </div>
      </div>

      <Card>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">Taglia</p>
            <p className="font-medium">{variant.size}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Colore</p>
            <p className="font-medium">{variant.color}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Barcode</p>
            <p className="font-medium">{variant.barcode ?? '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">SKU fornitore</p>
            <p className="font-medium">{variant.sku_supplier ?? '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Costo</p>
            <p className="font-medium">{variant.cost_price != null ? `EUR ${variant.cost_price.toFixed(2)}` : '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Prezzo vendita</p>
            <p className="font-medium">{variant.sale_price != null ? `EUR ${variant.sale_price.toFixed(2)}` : '-'}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant={variant.active ? 'success' : 'outline'}>
            {variant.active ? 'Attiva' : 'Inattiva'}
          </Badge>
          <Badge variant={totalStock > 0 ? 'success' : 'outline'}>
            Stock totale {totalStock}
          </Badge>
        </div>
      </Card>

      <ProductImageManager
        productId={id}
        variants={[{ id: variant.id, size: variant.size, color: variant.color }]}
        initialImages={variantImages}
        scopeVariantId={variant.id}
        title="Immagini variante"
        description="Gestisci le foto dedicate a questa variante mantenendo separata la gallery generale del prodotto."
      />

      <Card>
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Movimento rapido</h2>
            <p className="text-sm text-muted-foreground">
              Registra carico, scarico o rettifica direttamente dalla variante.
            </p>
          </div>
          <MovementQuickForm variantId={variant.id} defaultStoreId={defaultStoreId} />
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Stock per negozio</h2>
          <Badge variant="outline">{stockLevels.length}</Badge>
        </div>

        {stockLevels.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Nessuna giacenza disponibile per questa variante.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {stockLevels.map((level) => {
              const store = stores.find((item) => item.id === level.store_id);

              return (
                <li key={`${level.store_id}-${level.variant_id}`} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium">{store?.name ?? 'Negozio'}</p>
                    <p className="text-xs text-muted-foreground">{store?.address ?? 'Nessun indirizzo'}</p>
                  </div>
                  <Badge variant={Number(level.quantity) > 0 ? 'success' : 'outline'}>{level.quantity}</Badge>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Ultimi movimenti</h2>
          <Badge variant="outline">{recentMovements.movements.length}</Badge>
        </div>

        {recentMovements.movements.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Ancora nessun movimento per questa variante.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {recentMovements.movements.map((movement) => (
              <li key={movement.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{movement.movement_type}</p>
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
                  <Badge
                    variant={movement.movement_type === 'outbound' ? 'destructive' : movement.movement_type === 'adjustment' ? 'warning' : 'success'}
                  >
                    {movement.movement_type === 'outbound' ? '-' : '+'}
                    {movement.quantity}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
