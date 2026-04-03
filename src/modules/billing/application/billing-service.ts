'use server';

import { createServiceClient } from '@/lib/supabase/server';
import type { TenantBilling } from '@/types/database';

interface TenantUsageSnapshot {
  productsCount: number;
  documentsThisMonth: number;
}

function getCurrentMonthStartIso() {
  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return startOfMonth.toISOString();
}

async function countProductsForOrg(orgId: string) {
  const db = createServiceClient();
  const { count, error } = await db
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('archived', false);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

async function countDocumentsForOrgThisMonth(orgId: string) {
  const db = createServiceClient();
  const { count, error } = await db
    .from('uploaded_documents')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .gte('created_at', getCurrentMonthStartIso());

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function getOrCreateTenantBilling(orgId: string) {
  const db = createServiceClient();

  const { data: existing, error } = await db
    .from('tenant_billing')
    .select('*')
    .eq('org_id', orgId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (existing) {
    return existing as TenantBilling;
  }

  const { data, error: insertError } = await db
    .from('tenant_billing')
    .insert({
      org_id: orgId,
      plan: 'free',
      status: 'trialing',
      max_products: 50,
      max_documents_month: 5,
    })
    .select()
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  return data as TenantBilling;
}

export async function getTenantUsageSnapshot(orgId: string): Promise<TenantUsageSnapshot> {
  const [productsCount, documentsThisMonth] = await Promise.all([
    countProductsForOrg(orgId),
    countDocumentsForOrgThisMonth(orgId),
  ]);

  return {
    productsCount,
    documentsThisMonth,
  };
}

export async function assertCanCreateProduct(orgId: string) {
  const [billing, usage] = await Promise.all([
    getOrCreateTenantBilling(orgId),
    getTenantUsageSnapshot(orgId),
  ]);

  if (usage.productsCount >= billing.max_products) {
    throw new Error(`Forbidden: limite piano raggiunto (${billing.max_products} prodotti massimi)`);
  }
}

export async function assertCanUploadDocument(orgId: string) {
  const [billing, usage] = await Promise.all([
    getOrCreateTenantBilling(orgId),
    getTenantUsageSnapshot(orgId),
  ]);

  if (usage.documentsThisMonth >= billing.max_documents_month) {
    throw new Error(
      `Forbidden: limite documenti mensili raggiunto (${billing.max_documents_month} documenti al mese)`
    );
  }
}
