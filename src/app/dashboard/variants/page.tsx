import Link from 'next/link';
import { Layers, Package, Search } from 'lucide-react';
import { listVariants } from '@/modules/products/application/products-service';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default async function VariantsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page ?? '1', 10);
  const limit = 40;
  const offset = (page - 1) * limit;
  const { variants, total } = await listVariants({
    search: params.search,
    limit,
    offset,
  });

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-xl font-bold">Varianti</h1>
        <p className="text-sm text-muted-foreground">
          Vista operativa di taglie, colori, barcode e stock per ogni articolo.
        </p>
      </div>

      <form className="flex gap-2">
        <input
          type="search"
          name="search"
          defaultValue={params.search ?? ''}
          placeholder="Cerca barcode, taglia, colore o SKU..."
          className="h-10 flex-1 rounded-lg border border-border bg-white px-3 text-sm"
        />
        <Button type="submit" variant="outline">
          <Search className="h-4 w-4" />
          Cerca
        </Button>
      </form>

      {variants.length === 0 ? (
        <Card className="flex flex-col items-center py-10 text-center">
          <Layers className="mb-3 h-12 w-12 text-muted-foreground" />
          <p className="font-medium">Nessuna variante disponibile</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Crea un prodotto e aggiungi almeno una variante per iniziare.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/dashboard/products/new">Nuovo prodotto</Link>
          </Button>
        </Card>
      ) : (
        <ul className="space-y-2">
          {variants.map((variant) => {
            const totalStock = variant.stock_levels.reduce((sum, level) => sum + Number(level.quantity), 0);

            return (
              <li key={variant.id}>
                <Link
                  href={`/dashboard/products/${variant.products.id}/variants/${variant.id}`}
                  className="flex items-center justify-between rounded-lg border border-border bg-white p-3 transition hover:shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-accent" />
                    <div>
                      <p className="text-sm font-semibold">
                        {variant.products.brand} {variant.products.model_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Tg. {variant.size} - {variant.color}
                        {variant.barcode ? ` - Barcode ${variant.barcode}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={variant.active ? 'success' : 'outline'}>
                      {variant.active ? 'Attiva' : 'Inattiva'}
                    </Badge>
                    <Badge variant={totalStock > 0 ? 'success' : 'outline'}>
                      Stock {totalStock}
                    </Badge>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {total > limit ? (
        <div className="flex justify-center gap-2 pt-2">
          {page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/variants?page=${page - 1}&search=${params.search ?? ''}`}>Precedente</Link>
            </Button>
          ) : null}
          {offset + limit < total ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/variants?page=${page + 1}&search=${params.search ?? ''}`}>Successivo</Link>
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
