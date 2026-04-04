'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import {
  getVariantCommercialLabel,
  getVariantGroupKey,
  getVariantSizeLabel,
} from '@/modules/products/domain/variant-display';
import type { ProductVariant } from '@/types/database';

interface VariantsListProps {
  variants: ProductVariant[];
  productId: string;
}

export function VariantsList({ variants, productId }: VariantsListProps) {
  if (variants.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Nessuna variante. Aggiungi colori, materiali o eventuali taglie.
      </p>
    );
  }

  const groups = variants.reduce<Record<string, ProductVariant[]>>((accumulator, variant) => {
    const key = getVariantGroupKey(variant);
    accumulator[key] = accumulator[key] ? [...accumulator[key], variant] : [variant];
    return accumulator;
  }, {});

  return (
    <div className="space-y-3">
      {Object.values(groups).map((group) => {
        const representative = group[0];

        return (
          <div key={getVariantGroupKey(representative)} className="rounded-lg border border-border bg-white p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{getVariantCommercialLabel(representative)}</p>
                <p className="text-xs text-muted-foreground">
                  {group.length} {group.length === 1 ? 'taglia/SKU' : 'taglie/SKU'}
                </p>
              </div>
              <Badge variant={group.some((variant) => variant.active) ? 'success' : 'outline'}>
                {group.some((variant) => variant.active) ? 'Attiva' : 'Inattiva'}
              </Badge>
            </div>

            <ul className="space-y-2">
              {group.map((variant) => (
                <li key={variant.id}>
                  <Link
                    href={`/dashboard/products/${productId}/variants/${variant.id}`}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3 transition active:scale-[0.99]"
                  >
                    <div>
                      <p className="text-sm font-medium">{getVariantSizeLabel(variant)}</p>
                      <p className="text-xs text-muted-foreground">
                        {variant.barcode ? `Barcode: ${variant.barcode}` : 'Nessun barcode'}
                        {variant.sku_supplier ? ` · SKU: ${variant.sku_supplier}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      {variant.sale_price != null ? (
                        <p className="text-sm font-semibold">EUR {variant.sale_price.toFixed(2)}</p>
                      ) : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
