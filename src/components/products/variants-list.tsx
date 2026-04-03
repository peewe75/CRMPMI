'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import type { ProductVariant } from '@/types/database';

interface VariantsListProps {
  variants: ProductVariant[];
  productId: string;
}

export function VariantsList({ variants, productId }: VariantsListProps) {
  if (variants.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Nessuna variante. Aggiungi taglie e colori.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {variants.map((v) => (
        <li key={v.id}>
          <Link
            href={`/dashboard/products/${productId}/variants/${v.id}`}
            className="flex items-center justify-between rounded-lg border border-border bg-white p-3 transition active:scale-[0.99]"
          >
            <div>
              <p className="text-sm font-medium">
                Tg. {v.size} — {v.color}
              </p>
              <p className="text-xs text-muted-foreground">
                {v.barcode && `Barcode: ${v.barcode} · `}
                {v.sku_supplier && `SKU: ${v.sku_supplier}`}
              </p>
            </div>
            <div className="text-right">
              {v.sale_price != null && (
                <p className="text-sm font-semibold">€{v.sale_price.toFixed(2)}</p>
              )}
              <Badge variant={v.active ? 'success' : 'outline'}>
                {v.active ? 'Attiva' : 'Inattiva'}
              </Badge>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
