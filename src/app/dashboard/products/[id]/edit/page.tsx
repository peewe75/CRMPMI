import { notFound } from 'next/navigation';
import { getProduct, updateProduct } from '@/modules/products/application/products-service';
import { ProductForm } from '@/components/products/product-form';

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let product;

  try {
    product = await getProduct(id);
  } catch {
    notFound();
  }

  async function handleUpdate(formData: FormData) {
    'use server';
    try {
      await updateProduct(id, {
        brand: formData.get('brand') as string,
        model_name: formData.get('model_name') as string,
        category: formData.get('category') as string,
        supplier_name: (formData.get('supplier_name') as string) || null,
        season: (formData.get('season') as string) || null,
        gender: (formData.get('gender') as 'M' | 'F' | 'U') || null,
        notes: (formData.get('notes') as string) || null,
      });
      return { id };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Errore nel salvataggio' };
    }
  }

  return (
    <div className="p-4">
      <h1 className="mb-4 text-xl font-bold">Modifica Prodotto</h1>
      <ProductForm product={product} onSubmit={handleUpdate} />
    </div>
  );
}
