'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import type { Product } from '@/types/database';

interface ProductFormProps {
  product?: Product;
  onSubmit: (data: FormData) => Promise<{ id: string } | { error: string }>;
}

const CATEGORIES = [
  'scarpe',
  'abbigliamento',
  'accessori',
  'borse',
  'general',
] as const;

const GENDERS = [
  { value: '', label: 'Non specificato' },
  { value: 'M', label: 'Uomo' },
  { value: 'F', label: 'Donna' },
  { value: 'U', label: 'Unisex' },
] as const;

export function ProductForm({ product, onSubmit }: ProductFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await onSubmit(formData);
      if ('error' in result) {
        setError(result.error);
      } else {
        router.push(`/dashboard/products/${result.id}`);
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Brand *</label>
          <Input name="brand" required defaultValue={product?.brand} placeholder="Es: Adidas" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Modello *</label>
          <Input name="model_name" required defaultValue={product?.model_name} placeholder="Es: Samba" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Categoria *</label>
          <Select
            name="category"
            defaultValue={product?.category ?? 'general'}
            options={CATEGORIES.map((cat) => ({
              value: cat,
              label: cat.charAt(0).toUpperCase() + cat.slice(1),
            }))}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Genere</label>
          <Select
            name="gender"
            defaultValue={product?.gender ?? ''}
            options={GENDERS.map(({ value, label }) => ({ value, label }))}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Fornitore</label>
          <Input name="supplier_name" defaultValue={product?.supplier_name ?? ''} placeholder="Es: Distributore XYZ" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Stagione</label>
          <Input name="season" defaultValue={product?.season ?? ''} placeholder="Es: FW25" />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Note</label>
        <Textarea name="notes" defaultValue={product?.notes ?? ''} rows={3} />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending && <Spinner className="h-4 w-4" />}
          {product ? 'Salva modifiche' : 'Crea prodotto'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Annulla
        </Button>
      </div>
    </form>
  );
}
