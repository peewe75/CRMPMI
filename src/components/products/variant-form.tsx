'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import type { ProductVariant } from '@/types/database';

interface VariantFormProps {
  productId: string;
  variant?: ProductVariant;
  onSubmit: (data: FormData) => Promise<{ success?: boolean; error?: string }>;
}

export function VariantForm({ productId, variant, onSubmit }: VariantFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await onSubmit(formData);
      if (result.error) {
        setError(result.error);
      } else {
        router.push(`/dashboard/products/${productId}`);
        router.refresh();
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Colore / Variante</label>
          <Input name="color" defaultValue={variant?.color} placeholder="Es: Crema" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Materiale</label>
          <Input name="material" defaultValue={variant?.material ?? ''} placeholder="Es: Pelle" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Taglia</label>
          <Input name="size" defaultValue={variant?.size ?? ''} placeholder="Es: 43 o U" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Barcode</label>
          <Input name="barcode" defaultValue={variant?.barcode ?? ''} placeholder="EAN/UPC" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">SKU Fornitore</label>
          <Input name="sku_supplier" defaultValue={variant?.sku_supplier ?? ''} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">SKU Interno</label>
          <Input name="sku_internal" defaultValue={variant?.sku_internal ?? ''} />
        </div>
        <div />
        <div>
          <label className="mb-1 block text-sm font-medium">Prezzo Costo</label>
          <Input name="cost_price" type="number" step="0.01" min="0" defaultValue={variant?.cost_price ?? ''} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Prezzo Vendita</label>
          <Input name="sale_price" type="number" step="0.01" min="0" defaultValue={variant?.sale_price ?? ''} />
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending && <Spinner className="h-4 w-4" />}
          {variant ? 'Salva modifiche' : 'Crea variante'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Annulla
        </Button>
      </div>
    </form>
  );
}
