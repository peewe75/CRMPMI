'use server';

import { requireTenantContext } from '@/lib/auth/tenant';
import { writeAuditLog } from '@/lib/supabase/audit';
import { createServiceClient } from '@/lib/supabase/server';
import { getOrCreateDefaultStore, createMovement } from '@/modules/inventory/application/inventory-service';
import { createProduct, createVariant } from '@/modules/products/application/products-service';

export interface QuickAddInput {
  product_id?: string;
  brand?: string;
  model_name?: string;
  category?: string;
  supplier_name?: string;
  size?: string;
  color?: string;
  material?: string;
  barcode?: string;
  sku_supplier?: string;
  sku_internal?: string;
  cost_price?: number;
  sale_price?: number;
  quantity?: number;
  notes?: string;
  store_id?: string;
}

export interface QuickAddResult {
  product_id: string;
  variant_id: string;
  movement_id: string | null;
  created_product: boolean;
  created_variant: boolean;
}

export async function quickAddCatalogEntry(input: QuickAddInput): Promise<QuickAddResult> {
  const { orgId, userId } = await requireTenantContext();
  const db = createServiceClient();

  let productId = input.product_id;
  let createdProduct = false;

  if (productId) {
    const { data: existingProduct, error } = await db
      .from('products')
      .select('id')
      .eq('id', productId)
      .eq('org_id', orgId)
      .single();

    if (error || !existingProduct) {
      throw new Error('Product not found');
    }
  } else {
    if (!input.brand?.trim() || !input.model_name?.trim()) {
      throw new Error('brand and model_name are required when product_id is not provided');
    }

    const product = await createProduct({
      brand: input.brand.trim(),
      model_name: input.model_name.trim(),
      category: input.category?.trim() || 'general',
      supplier_name: input.supplier_name?.trim() || undefined,
    });
    productId = product.id;
    createdProduct = true;
  }

  const variant = await createVariant({
    product_id: productId,
    size: input.size?.trim() || undefined,
    color: input.color?.trim() || undefined,
    material: input.material?.trim() || undefined,
    barcode: input.barcode?.trim() || undefined,
    sku_supplier: input.sku_supplier?.trim() || undefined,
    sku_internal: input.sku_internal?.trim() || undefined,
    cost_price: input.cost_price,
    sale_price: input.sale_price,
  });

  let movementId: string | null = null;
  const quantity = input.quantity ?? 0;

  if (quantity > 0) {
    const defaultStore = input.store_id ? null : await getOrCreateDefaultStore();
    const movement = await createMovement({
      store_id: input.store_id || defaultStore!.id,
      variant_id: variant.id,
      movement_type: 'inbound',
      quantity,
      notes: input.notes?.trim() || 'Caricamento rapido da mobile',
    });
    movementId = movement.id;
  }

  await writeAuditLog({
    orgId,
    actorUserId: userId,
    entityType: 'quick_add',
    entityId: variant.id,
    action: 'create',
    payload: {
      product_id: productId,
      variant_id: variant.id,
      movement_id: movementId,
      quantity,
      source: 'mobile_quick_add',
    },
  });

  return {
    product_id: productId,
    variant_id: variant.id,
    movement_id: movementId,
    created_product: createdProduct,
    created_variant: true,
  };
}
