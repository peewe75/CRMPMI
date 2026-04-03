import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { listProducts } from '@/modules/products/application/products-service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProductSearch } from '@/components/products/product-search';

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; category?: string; brand?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page ?? '1', 10);
  const limit = 30;
  const offset = (page - 1) * limit;

  const { products, total } = await listProducts({
    search: params.search,
    category: params.category,
    brand: params.brand,
    limit,
    offset,
  });

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Prodotti</h1>
        <Button asChild size="sm">
          <Link href="/dashboard/products/new">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nuovo</span>
          </Link>
        </Button>
      </div>

      <ProductSearch />

      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Search className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nessun prodotto trovato</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/dashboard/products/new">Crea il primo prodotto</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {products.map((product) => (
            <li key={product.id}>
              <Link
                href={`/dashboard/products/${product.id}`}
                className="flex items-center justify-between rounded-lg border border-border bg-white p-3 transition active:scale-[0.99] hover:shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">
                    {product.brand} {product.model_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {product.category}
                    {product.supplier_name && ` · ${product.supplier_name}`}
                  </p>
                </div>
                <Badge variant="outline" className="ml-2 shrink-0">
                  {(product.product_variants as unknown as { count: number }[])?.[0]?.count ?? 0} var.
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {total > limit && (
        <div className="flex justify-center gap-2 pt-4">
          {page > 1 && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/products?page=${page - 1}&search=${params.search ?? ''}`}>
                Precedente
              </Link>
            </Button>
          )}
          {offset + limit < total && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/products?page=${page + 1}&search=${params.search ?? ''}`}>
                Successivo
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
