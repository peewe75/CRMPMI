import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getProduct } from '@/modules/products/application/products-service';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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

  return (
    <div className="p-4 space-y-4">
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

        <div className="mt-4">
          <Badge variant={variant.active ? 'success' : 'outline'}>
            {variant.active ? 'Attiva' : 'Inattiva'}
          </Badge>
        </div>
      </Card>
    </div>
  );
}
