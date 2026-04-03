'use server';

import { createServiceClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/supabase/audit';
import { requireTenantContext } from '@/lib/auth/tenant';
import { assertCanCreateProduct } from '@/modules/billing/application/billing-service';
import type { Product, ProductVariant } from '@/types/database';

// ---------- Products ----------

export async function listProducts(filters?: {
  search?: string;
  category?: string;
  brand?: string;
  archived?: boolean;
  limit?: number;
  offset?: number;
}) {
  const { orgId } = await requireTenantContext();
  const db = createServiceClient();

  let query = db
    .from('products')
    .select('*, product_variants(count)', { count: 'exact' })
    .eq('org_id', orgId)
    .eq('archived', filters?.archived ?? false)
    .order('updated_at', { ascending: false })
    .range(filters?.offset ?? 0, (filters?.offset ?? 0) + (filters?.limit ?? 50) - 1);

  if (filters?.search) {
    query = query.or(
      `brand.ilike.%${filters.search}%,model_name.ilike.%${filters.search}%`
    );
  }
  if (filters?.category) query = query.eq('category', filters.category);
  if (filters?.brand) query = query.eq('brand', filters.brand);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return { products: data as (Product & { product_variants: [{ count: number }] })[], total: count ?? 0 };
}

export async function getProduct(productId: string) {
  const { orgId } = await requireTenantContext();
  const db = createServiceClient();

  const { data, error } = await db
    .from('products')
    .select('*, product_variants(*)')
    .eq('id', productId)
    .eq('org_id', orgId)
    .single();

  if (error) throw new Error('Product not found');
  return data as Product & { product_variants: ProductVariant[] };
}

export async function createProduct(input: {
  brand: string;
  model_name: string;
  category: string;
  supplier_name?: string;
  season?: string;
  gender?: 'M' | 'F' | 'U';
  notes?: string;
}) {
  const { orgId, userId } = await requireTenantContext();
  await assertCanCreateProduct(orgId);
  const db = createServiceClient();

  const { data, error } = await db
    .from('products')
    .insert({
      org_id: orgId,
      brand: input.brand.trim(),
      model_name: input.model_name.trim(),
      category: input.category,
      supplier_name: input.supplier_name?.trim() || null,
      season: input.season?.trim() || null,
      gender: input.gender || null,
      notes: input.notes?.trim() || null,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await writeAuditLog({
    orgId,
    actorUserId: userId,
    entityType: 'product',
    entityId: data.id,
    action: 'create',
    payload: input,
  });

  return data as Product;
}

export async function updateProduct(
  productId: string,
  input: Partial<{
    brand: string;
    model_name: string;
    category: string;
    supplier_name: string | null;
    season: string | null;
    gender: 'M' | 'F' | 'U' | null;
    notes: string | null;
    archived: boolean;
  }>
) {
  const { orgId, userId } = await requireTenantContext();
  const db = createServiceClient();

  const { data, error } = await db
    .from('products')
    .update(input)
    .eq('id', productId)
    .eq('org_id', orgId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await writeAuditLog({
    orgId,
    actorUserId: userId,
    entityType: 'product',
    entityId: productId,
    action: input.archived ? 'archive' : 'update',
    payload: input,
  });

  return data as Product;
}

export async function searchProducts(query: string) {
  const { orgId } = await requireTenantContext();
  const db = createServiceClient();

  const { data, error } = await db
    .from('products')
    .select('id, brand, model_name, category')
    .eq('org_id', orgId)
    .eq('archived', false)
    .or(`brand.ilike.%${query}%,model_name.ilike.%${query}%`)
    .limit(20);

  if (error) throw new Error(error.message);
  return data;
}

// ---------- Variants ----------

export async function createVariant(input: {
  product_id: string;
  size: string;
  color: string;
  sku_internal?: string;
  sku_supplier?: string;
  barcode?: string;
  cost_price?: number;
  sale_price?: number;
}) {
  const { orgId, userId } = await requireTenantContext();
  const db = createServiceClient();

  const { data, error } = await db
    .from('product_variants')
    .insert({
      org_id: orgId,
      product_id: input.product_id,
      size: input.size.trim(),
      color: input.color.trim(),
      sku_internal: input.sku_internal?.trim() || null,
      sku_supplier: input.sku_supplier?.trim() || null,
      barcode: input.barcode?.trim() || null,
      cost_price: input.cost_price ?? null,
      sale_price: input.sale_price ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await writeAuditLog({
    orgId,
    actorUserId: userId,
    entityType: 'variant',
    entityId: data.id,
    action: 'create',
    payload: input,
  });

  return data as ProductVariant;
}

export async function updateVariant(
  variantId: string,
  input: Partial<{
    sku_internal: string | null;
    sku_supplier: string | null;
    barcode: string | null;
    size: string;
    color: string;
    cost_price: number | null;
    sale_price: number | null;
    active: boolean;
  }>
) {
  const { orgId, userId } = await requireTenantContext();
  const db = createServiceClient();

  const { data, error } = await db
    .from('product_variants')
    .update(input)
    .eq('id', variantId)
    .eq('org_id', orgId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await writeAuditLog({
    orgId,
    actorUserId: userId,
    entityType: 'variant',
    entityId: variantId,
    action: 'update',
    payload: input,
  });

  return data as ProductVariant;
}

export async function resolveBarcode(barcode: string) {
  const { orgId } = await requireTenantContext();
  const db = createServiceClient();

  const { data, error } = await db
    .from('product_variants')
    .select('*, products:product_id(*)')
    .eq('org_id', orgId)
    .eq('barcode', barcode)
    .single();

  if (error) return null;
  return data;
}
