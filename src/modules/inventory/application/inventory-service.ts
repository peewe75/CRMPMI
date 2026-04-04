'use server';

import { createServiceClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/supabase/audit';
import { requireTenantContext } from '@/lib/auth/tenant';
import type { InventoryMovement, StockLevel, Store } from '@/types/database';

export interface StockLevelWithVariant extends StockLevel {
  product_variants: {
    id: string;
    size: string;
    color: string;
    barcode: string | null;
    sku_supplier: string | null;
    products: {
      id: string;
      brand: string;
      model_name: string;
      category: string;
    };
  };
}

export interface MovementWithVariant extends InventoryMovement {
  product_variants: {
    size: string;
    color: string;
    products: {
      brand: string;
      model_name: string;
    };
  };
}

// ---------- Stores ----------

export async function listStores() {
  const { orgId } = await requireTenantContext();
  const db = createServiceClient();

  const { data, error } = await db
    .from('stores')
    .select('*')
    .eq('org_id', orgId)
    .order('is_default', { ascending: false });

  if (error) throw new Error(error.message);
  return data as Store[];
}

export async function getOrCreateDefaultStore() {
  const { orgId, userId } = await requireTenantContext();
  const db = createServiceClient();

  const { data: existing } = await db
    .from('stores')
    .select('*')
    .eq('org_id', orgId)
    .eq('is_default', true)
    .single();

  if (existing) return existing as Store;

  const { data, error } = await db
    .from('stores')
    .insert({
      org_id: orgId,
      name: 'Negozio Principale',
      is_default: true,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await writeAuditLog({
    orgId,
    actorUserId: userId,
    entityType: 'store',
    entityId: data.id,
    action: 'create',
    payload: { name: 'Negozio Principale', auto_created: true },
  });

  return data as Store;
}

export async function createStore(input: { name: string; address?: string; phone?: string }) {
  const { orgId, userId } = await requireTenantContext();
  const db = createServiceClient();

  const { data, error } = await db
    .from('stores')
    .insert({
      org_id: orgId,
      name: input.name.trim(),
      address: input.address?.trim() || null,
      phone: input.phone?.trim() || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await writeAuditLog({
    orgId,
    actorUserId: userId,
    entityType: 'store',
    entityId: data.id,
    action: 'create',
    payload: input,
  });

  return data as Store;
}

// ---------- Movements ----------

export async function createMovement(input: {
  store_id: string;
  variant_id: string;
  movement_type: 'inbound' | 'outbound' | 'adjustment' | 'transfer';
  quantity: number;
  notes?: string;
  source_document_type?: string;
  source_document_id?: string;
  source_proposal_id?: string;
}) {
  const { orgId, userId } = await requireTenantContext();
  const db = createServiceClient();

  const { data, error } = await db
    .from('inventory_movements')
    .insert({
      org_id: orgId,
      store_id: input.store_id,
      variant_id: input.variant_id,
      movement_type: input.movement_type,
      quantity: input.quantity,
      notes: input.notes?.trim() || null,
      source_document_type: input.source_document_type || null,
      source_document_id: input.source_document_id || null,
      source_proposal_id: input.source_proposal_id || null,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await writeAuditLog({
    orgId,
    actorUserId: userId,
    entityType: 'movement',
    entityId: data.id,
    action: 'movement',
    payload: input,
  });

  return data as InventoryMovement;
}

export async function listMovements(filters?: {
  store_id?: string;
  variant_id?: string;
  movement_type?: string;
  limit?: number;
  offset?: number;
}) {
  const { orgId } = await requireTenantContext();
  const db = createServiceClient();

  let query = db
    .from('inventory_movements')
    .select('*, product_variants(size, color, products:product_id(brand, model_name))', { count: 'exact' })
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .range(filters?.offset ?? 0, (filters?.offset ?? 0) + (filters?.limit ?? 50) - 1);

  if (filters?.store_id) query = query.eq('store_id', filters.store_id);
  if (filters?.variant_id) query = query.eq('variant_id', filters.variant_id);
  if (filters?.movement_type) query = query.eq('movement_type', filters.movement_type);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return { movements: data as MovementWithVariant[], total: count ?? 0 };
}

// ---------- Stock Levels ----------

export async function getStockLevels(filters?: {
  store_id?: string;
  variant_id?: string;
}) {
  const { orgId } = await requireTenantContext();
  const db = createServiceClient();

  let query = db
    .from('stock_levels')
    .select('*, product_variants(*, products:product_id(id, brand, model_name, category))')
    .eq('org_id', orgId)
    .gt('quantity', 0);

  if (filters?.store_id) query = query.eq('store_id', filters.store_id);
  if (filters?.variant_id) query = query.eq('variant_id', filters.variant_id);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return data as StockLevelWithVariant[];
}

export async function getVariantStockByStores(variantId: string) {
  const levels = await getStockLevels({ variant_id: variantId });
  return levels;
}
