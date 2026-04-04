import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Pencil, Plus } from 'lucide-react';
import { ProductImageManager } from '@/components/products/product-image-manager';
import { VariantsList } from '@/components/products/variants-list';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { listProductImagesWithSignedUrls } from '@/modules/products/application/product-images-service';
import { getProduct } from '@/modules/products/application/products-service';

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProduct(id).catch(() => null);

  if (!product) {
    notFound();
  }

  const images = await listProductImagesWithSignedUrls({ product_id: id }).catch(() => []);
  const primaryImage = images.find((image) => image.is_primary) ?? images[0] ?? null;

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon">
          <Link href="/dashboard/products">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="flex-1 truncate text-xl font-bold">
          {product.brand} {product.model_name}
        </h1>
        <Button asChild variant="outline" size="sm">
          <Link href={`/dashboard/products/${id}/edit`}>
            <Pencil className="h-4 w-4" />
            <span className="ml-1 hidden sm:inline">Modifica</span>
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
            <div className="overflow-hidden rounded-xl border border-border bg-gray-100">
              {primaryImage?.signed_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={primaryImage.signed_url}
                  alt={`${product.brand} ${product.model_name}`}
                  className="h-44 w-full object-cover"
                />
              ) : (
                <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">
                  Nessuna immagine
                </div>
              )}
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Categoria</dt>
              <dd>{product.category}</dd>
              <dt className="text-muted-foreground">Genere</dt>
              <dd>{product.gender ?? '-'}</dd>
              <dt className="text-muted-foreground">Fornitore</dt>
              <dd>{product.supplier_name ?? '-'}</dd>
              <dt className="text-muted-foreground">Stagione</dt>
              <dd>{product.season ?? '-'}</dd>
              <dt className="text-muted-foreground">Immagini</dt>
              <dd>{images.length}</dd>
              {product.notes ? (
                <>
                  <dt className="text-muted-foreground">Note</dt>
                  <dd>{product.notes}</dd>
                </>
              ) : null}
            </dl>
          </div>
        </CardContent>
      </Card>

      <ProductImageManager
        productId={id}
        variants={product.product_variants.map((variant) => ({
          id: variant.id,
          size: variant.size,
          color: variant.color,
        }))}
        initialImages={images}
      />

      <div className="flex items-center justify-between">
        <CardTitle>Varianti ({product.product_variants.length})</CardTitle>
        <Button asChild size="sm">
          <Link href={`/dashboard/products/${id}/variants/new`}>
            <Plus className="h-4 w-4" />
            Aggiungi
          </Link>
        </Button>
      </div>

      <VariantsList variants={product.product_variants} productId={id} />
    </div>
  );
}
