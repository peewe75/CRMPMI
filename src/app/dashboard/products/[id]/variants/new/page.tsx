import { notFound } from 'next/navigation';
import { getProduct, createVariant } from '@/modules/products/application/products-service';
import { VariantForm } from '@/components/products/variant-form';

export default async function NewVariantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    await getProduct(id);
  } catch {
    notFound();
  }

  async function handleCreate(formData: FormData) {
    'use server';
    try {
      await createVariant({
        product_id: id,
        size: (formData.get('size') as string) || undefined,
        color: (formData.get('color') as string) || undefined,
        material: (formData.get('material') as string) || undefined,
        sku_internal: (formData.get('sku_internal') as string) || undefined,
        sku_supplier: (formData.get('sku_supplier') as string) || undefined,
        barcode: (formData.get('barcode') as string) || undefined,
        cost_price: formData.get('cost_price') ? Number(formData.get('cost_price')) : undefined,
        sale_price: formData.get('sale_price') ? Number(formData.get('sale_price')) : undefined,
      });
      return { success: true };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Errore' };
    }
  }

  return (
    <div className="p-4">
      <h1 className="mb-4 text-xl font-bold">Nuova Variante</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Usa la variante per colore o materiale. La taglia e opzionale e resta una dimensione di stock.
      </p>
      <VariantForm productId={id} onSubmit={handleCreate} />
    </div>
  );
}
