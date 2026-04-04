'use server';

import { createServiceClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/supabase/audit';
import { requireTenantContext } from '@/lib/auth/tenant';
import { assertCanCreateProduct } from '@/modules/billing/application/billing-service';
import { normalizeVariantColor, normalizeVariantMaterial, normalizeVariantSize } from '@/modules/products/domain/variant-display';
import type { Product, ProductImage, ProductVariant } from '@/types/database';

export interface VariantListItem extends ProductVariant {
  products: Pick<Product, 'id' | 'brand' | 'model_name' | 'category'>;
  stock_levels: Array<{
    quantity: number;
    store_id: string;
  }>;
}

export interface VariantMatchCandidate {
  id: string;
  product_id: string;
  brand: string;
  model_name: string;
  size: string | null;
  color: string;
  material: string | null;
  barcode: string | null;
  sku_supplier: string | null;
  active: boolean;
  total_stock: number;
}

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
    .select('*, product_variants(id, color, material)', { count: 'exact' })
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

  return {
    products: data as (Product & { product_variants: Pick<ProductVariant, 'id' | 'color' | 'material'>[] })[],
    total: count ?? 0,
  };
}

export async function getProduct(productId: string) {
  const { orgId } = await requireTenantContext();
  const db = createServiceClient();

  const { data, error } = await db
    .from('products')
    .select('*, product_variants(*), product_images(*)')
    .eq('id', productId)
    .eq('org_id', orgId)
    .single();

  if (error) throw new Error('Product not found');
  return data as Product & { product_variants: ProductVariant[]; product_images: ProductImage[] };
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

export async function listVariants(filters?: {
  search?: string;
  active?: boolean;
  limit?: number;
  offset?: number;
}) {
  const { orgId } = await requireTenantContext();
  const db = createServiceClient();

  let query = db
    .from('product_variants')
    .select('*, products:product_id(id, brand, model_name, category), stock_levels(quantity, store_id)', {
      count: 'exact',
    })
    .eq('org_id', orgId)
    .order('updated_at', { ascending: false })
    .range(filters?.offset ?? 0, (filters?.offset ?? 0) + (filters?.limit ?? 50) - 1);

  if (filters?.active != null) {
    query = query.eq('active', filters.active);
  }

  if (filters?.search) {
    query = query.or(
      [
        `size.ilike.%${filters.search}%`,
        `color.ilike.%${filters.search}%`,
        `material.ilike.%${filters.search}%`,
        `barcode.ilike.%${filters.search}%`,
        `sku_supplier.ilike.%${filters.search}%`,
        `sku_internal.ilike.%${filters.search}%`,
      ].join(',')
    );
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return { variants: (data ?? []) as VariantListItem[], total: count ?? 0 };
}

export async function createVariant(input: {
  product_id: string;
  size?: string | null;
  color?: string | null;
  material?: string | null;
  sku_internal?: string;
  sku_supplier?: string;
  barcode?: string;
  cost_price?: number;
  sale_price?: number;
}) {
  const { orgId, userId } = await requireTenantContext();
  const db = createServiceClient();
  const normalizedSize = normalizeVariantSize(input.size);
  const normalizedColor = normalizeVariantColor(input.color);
  const normalizedMaterial = normalizeVariantMaterial(input.material);

  const { data, error } = await db
    .from('product_variants')
    .insert({
      org_id: orgId,
      product_id: input.product_id,
      size: normalizedSize,
      color: normalizedColor,
      material: normalizedMaterial,
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
    size: string | null;
    color: string | null;
    material: string | null;
    cost_price: number | null;
    sale_price: number | null;
    active: boolean;
  }>
) {
  const { orgId, userId } = await requireTenantContext();
  const db = createServiceClient();
  const patch = {
    ...input,
    ...(input.size !== undefined ? { size: normalizeVariantSize(input.size) } : {}),
    ...(input.color !== undefined ? { color: normalizeVariantColor(input.color) } : {}),
    ...(input.material !== undefined ? { material: normalizeVariantMaterial(input.material) } : {}),
  };

  const { data, error } = await db
    .from('product_variants')
    .update(patch)
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
    payload: patch,
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

export async function searchVariantsForMatching(input: {
  q?: string;
  size?: string | null;
  color?: string | null;
  material?: string | null;
  product_id?: string | null;
  limit?: number;
}) {
  const { orgId } = await requireTenantContext();
  const db = createServiceClient();

  let query = db
    .from('product_variants')
    .select('id, product_id, size, color, material, barcode, sku_supplier, active, products:product_id(id, brand, model_name), stock_levels(quantity)')
    .eq('org_id', orgId)
    .limit(input.limit ?? 40);

  if (input.product_id) {
    query = query.eq('product_id', input.product_id);
  }

  if (input.size?.trim()) {
    query = query.eq('size', input.size.trim());
  }

  if (input.color?.trim()) {
    query = query.ilike('color', `%${input.color.trim()}%`);
  }

  if (input.material?.trim()) {
    query = query.ilike('material', `%${input.material.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const normalizedQuery = input.q?.trim().toLowerCase() ?? '';

  return (data ?? [])
    .map((variant) => {
      const product = Array.isArray(variant.products) ? variant.products[0] : variant.products;
      const stockLevels = Array.isArray(variant.stock_levels) ? variant.stock_levels : [];
      const totalStock = stockLevels.reduce((sum, level) => sum + Number(level.quantity ?? 0), 0);

      return {
        id: variant.id,
        product_id: variant.product_id,
        brand: product?.brand ?? '',
        model_name: product?.model_name ?? '',
        size: variant.size ?? null,
        color: variant.color,
        material: variant.material ?? null,
        barcode: variant.barcode,
        sku_supplier: variant.sku_supplier,
        active: variant.active,
        total_stock: totalStock,
      } satisfies VariantMatchCandidate;
    })
    .filter((candidate) => {
      if (!normalizedQuery) return true;

      const haystack = [
        candidate.brand,
        candidate.model_name,
        candidate.size ?? '',
        candidate.color,
        candidate.material ?? '',
        candidate.barcode ?? '',
        candidate.sku_supplier ?? '',
      ].join(' ').toLowerCase();

      return haystack.includes(normalizedQuery);
    })
    .sort((left, right) => right.total_stock - left.total_stock)
    .slice(0, input.limit ?? 40);
}
