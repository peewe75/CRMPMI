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
        size: formData.get('size') as string,
        color: formData.get('color') as string,
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
      <VariantForm productId={id} onSubmit={handleCreate} />
    </div>
  );
}
