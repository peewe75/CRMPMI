import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProduct } from '@/modules/products/application/products-service';
import { Button } from '@/components/ui/button';
import { Card, CardTitle, CardContent } from '@/components/ui/card';
import { VariantsList } from '@/components/products/variants-list';
import { Pencil, Plus, ArrowLeft } from 'lucide-react';

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let product;

  try {
    product = await getProduct(id);
  } catch {
    notFound();
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon">
          <Link href="/dashboard/products"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-xl font-bold flex-1 truncate">
          {product.brand} {product.model_name}
        </h1>
        <Button asChild variant="outline" size="sm">
          <Link href={`/dashboard/products/${id}/edit`}>
            <Pencil className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">Modifica</span>
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Categoria</dt>
            <dd>{product.category}</dd>
            <dt className="text-muted-foreground">Genere</dt>
            <dd>{product.gender ?? '—'}</dd>
            <dt className="text-muted-foreground">Fornitore</dt>
            <dd>{product.supplier_name ?? '—'}</dd>
            <dt className="text-muted-foreground">Stagione</dt>
            <dd>{product.season ?? '—'}</dd>
            {product.notes && (
              <>
                <dt className="text-muted-foreground">Note</dt>
                <dd className="col-span-1">{product.notes}</dd>
              </>
            )}
          </dl>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <CardTitle>Varianti ({product.product_variants.length})</CardTitle>
        <Button asChild size="sm">
          <Link href={`/dashboard/products/${id}/variants/new`}>
            <Plus className="h-4 w-4" /> Aggiungi
          </Link>
        </Button>
      </div>

      <VariantsList variants={product.product_variants} productId={id} />
    </div>
  );
}
