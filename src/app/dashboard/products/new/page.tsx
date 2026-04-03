import { createProduct } from '@/modules/products/application/products-service';
import { ProductForm } from '@/components/products/product-form';

async function handleCreate(formData: FormData) {
  'use server';
  try {
    const product = await createProduct({
      brand: formData.get('brand') as string,
      model_name: formData.get('model_name') as string,
      category: formData.get('category') as string,
      supplier_name: (formData.get('supplier_name') as string) || undefined,
      season: (formData.get('season') as string) || undefined,
      gender: (formData.get('gender') as 'M' | 'F' | 'U') || undefined,
      notes: (formData.get('notes') as string) || undefined,
    });
    return { id: product.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Errore nella creazione' };
  }
}

export default function NewProductPage() {
  return (
    <div className="p-4">
      <h1 className="mb-4 text-xl font-bold">Nuovo Prodotto</h1>
      <ProductForm onSubmit={handleCreate} />
    </div>
  );
}
