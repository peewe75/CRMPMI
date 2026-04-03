import Link from 'next/link';
import { Layers, Package } from 'lucide-react';
import { listProducts } from '@/modules/products/application/products-service';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default async function VariantsPage() {
  const { products } = await listProducts({ limit: 50 });
  const productsWithVariants = products.filter(
    (product) => ((product.product_variants as unknown as { count: number }[])?.[0]?.count ?? 0) > 0
  );

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold">Varianti</h1>
        <p className="text-sm text-muted-foreground">
          Punto di accesso rapido alle varianti già collegate ai prodotti.
        </p>
      </div>

      {productsWithVariants.length === 0 ? (
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
          {productsWithVariants.map((product) => (
            <li key={product.id}>
              <Link
                href={`/dashboard/products/${product.id}`}
                className="flex items-center justify-between rounded-lg border border-border bg-white p-3 transition hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-accent" />
                  <div>
                    <p className="text-sm font-semibold">{product.brand} {product.model_name}</p>
                    <p className="text-xs text-muted-foreground">{product.category}</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {((product.product_variants as unknown as { count: number }[])?.[0]?.count ?? 0)} varianti
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
