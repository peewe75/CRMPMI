'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sparkles, PackagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const CATEGORIES = ['general', 'scarpe', 'abbigliamento', 'accessori', 'borse'] as const;

function QuickAddPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [brand, setBrand] = useState(searchParams.get('brand') ?? '');
  const [modelName, setModelName] = useState(searchParams.get('model_name') ?? '');
  const [category, setCategory] = useState(searchParams.get('category') ?? 'general');
  const [size, setSize] = useState(searchParams.get('size') ?? '');
  const [color, setColor] = useState(searchParams.get('color') ?? '');
  const [material, setMaterial] = useState(searchParams.get('material') ?? '');
  const [barcode, setBarcode] = useState(searchParams.get('barcode') ?? '');
  const [quantity, setQuantity] = useState(searchParams.get('quantity') ?? '1');
  const [costPrice, setCostPrice] = useState(searchParams.get('cost_price') ?? '');
  const [salePrice, setSalePrice] = useState(searchParams.get('sale_price') ?? '');
  const [supplierName, setSupplierName] = useState(searchParams.get('supplier_name') ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/products/quick-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand,
          model_name: modelName,
          category,
          size,
          color,
          material,
          barcode,
          supplier_name: supplierName,
          quantity,
          cost_price: costPrice,
          sale_price: salePrice,
          notes: 'Inserimento rapido da dashboard mobile',
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? 'Salvataggio non riuscito');
      }

      router.push(`/dashboard/products/${payload.product_id}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Salvataggio non riuscito');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Sparkles className="h-5 w-5" /> Quick Add
        </h1>
        <p className="text-sm text-muted-foreground">
          Inserimento compatto per creare prodotto, variante e carico iniziale in un solo passaggio.
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Brand</label>
              <Input value={brand} onChange={(event) => setBrand(event.target.value)} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Modello</label>
              <Input value={modelName} onChange={(event) => setModelName(event.target.value)} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Categoria</label>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="flex h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
              >
                {CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item.charAt(0).toUpperCase() + item.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Fornitore</label>
              <Input value={supplierName} onChange={(event) => setSupplierName(event.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Colore / Variante</label>
              <Input value={color} onChange={(event) => setColor(event.target.value)} placeholder="Es: Crema" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Materiale</label>
              <Input value={material} onChange={(event) => setMaterial(event.target.value)} placeholder="Es: Pelle" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Taglia</label>
              <Input value={size} onChange={(event) => setSize(event.target.value)} placeholder="Es: 43 o U" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Barcode</label>
              <Input value={barcode} onChange={(event) => setBarcode(event.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Quantità iniziale</label>
              <Input type="number" min="0" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Costo</label>
              <Input type="number" step="0.01" min="0" value={costPrice} onChange={(event) => setCostPrice(event.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Prezzo vendita</label>
              <Input type="number" step="0.01" min="0" value={salePrice} onChange={(event) => setSalePrice(event.target.value)} />
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            <PackagePlus className="h-4 w-4" />
            {isSubmitting ? 'Salvataggio...' : 'Crea e carica a magazzino'}
          </Button>
        </form>
      </Card>
    </div>
  );
}

export default function QuickAddPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Caricamento quick add...</div>}>
      <QuickAddPageContent />
    </Suspense>
  );
}
