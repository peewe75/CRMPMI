'use server';

import { clerkClient } from '@clerk/nextjs/server';
import { requireRole, requireTenantContext } from '@/lib/auth/tenant';
import {
  FEATURE_FLAGS_KEY,
  getOrganizationFeatureFlags,
} from '@/lib/auth/feature-flags';
import { writeAuditLog } from '@/lib/supabase/audit';
import { createStore, listStores } from '@/modules/inventory/application/inventory-service';
import {
  getOrCreateTenantBilling,
  getTenantUsageSnapshot,
  updateTenantBillingPlaceholder,
} from '@/modules/billing/application/billing-service';
import { PLAN_LIMITS, type FeatureFlags, type Store, type TenantBilling } from '@/types/database';

export interface TenantSettingsOverview {
  organization: {
    id: string;
    name: string;
    slug: string | null;
    imageUrl: string;
    createdAt: string;
  };
  stores: Store[];
  billing: TenantBilling;
  usage: {
    productsCount: number;
    documentsThisMonth: number;
  };
  featureFlags: FeatureFlags;
  canManage: boolean;
}

export async function getTenantSettingsOverview() {
  const ctx = await requireTenantContext();
  const clerk = await clerkClient();

  const [organization, stores, billing, usage, featureFlags] = await Promise.all([
    clerk.organizations.getOrganization({
      organizationId: ctx.orgId,
    }),
    listStores(),
    getOrCreateTenantBilling(ctx.orgId),
    getTenantUsageSnapshot(ctx.orgId),
    getOrganizationFeatureFlags(ctx.orgId),
  ]);

  return {
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      imageUrl: organization.imageUrl,
      createdAt: new Date(organization.createdAt).toISOString(),
    },
    stores,
    billing,
    usage,
    featureFlags,
    canManage: ctx.orgRole === 'org:admin',
  } satisfies TenantSettingsOverview;
}

export async function updateTenantOrganizationProfile(input: {
  name: string;
}) {
  const ctx = await requireRole('org:admin');
  const clerk = await clerkClient();
  const name = input.name.trim();

  if (!name) {
    throw new Error('Nome organizzazione obbligatorio');
  }

  const organization = await clerk.organizations.updateOrganization(ctx.orgId, {
    name,
  });

  await writeAuditLog({
    orgId: ctx.orgId,
    actorUserId: ctx.userId,
    entityType: 'organization',
    entityId: ctx.orgId,
    action: 'update',
    payload: {
      name: organization.name,
    },
  });

  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
  };
}

export async function updateTenantFeatureFlags(flags: FeatureFlags) {
  const ctx = await requireRole('org:admin');
  const clerk = await clerkClient();

  const organization = await clerk.organizations.getOrganization({
    organizationId: ctx.orgId,
  });

  await clerk.organizations.updateOrganizationMetadata(ctx.orgId, {
    publicMetadata: {
      ...(organization.publicMetadata as Record<string, unknown> | undefined),
      [FEATURE_FLAGS_KEY]: flags,
    },
  });

  await writeAuditLog({
    orgId: ctx.orgId,
    actorUserId: ctx.userId,
    entityType: 'organization',
    entityId: ctx.orgId,
    action: 'update',
    payload: {
      feature_flags: flags,
    },
  });

  return flags;
}

export async function createStoreFromSettings(input: {
  name: string;
  address?: string;
  phone?: string;
}) {
  const ctx = await requireRole('org:admin');
  const [stores, flags] = await Promise.all([
    listStores(),
    getOrganizationFeatureFlags(ctx.orgId),
  ]);

  if (!flags.multi_store && stores.length >= 1) {
    throw new Error('Forbidden: multi-store disattivato. Attivalo prima di aggiungere un secondo negozio');
  }

  return createStore(input);
}

export async function updateTenantBillingSettings(input: {
  plan: TenantBilling['plan'];
  status: TenantBilling['status'];
  max_products?: number;
  max_documents_month?: number;
  current_period_end?: string | null;
}) {
  const ctx = await requireRole('org:admin');
  const limits = PLAN_LIMITS[input.plan];

  const billing = await updateTenantBillingPlaceholder(ctx.orgId, {
    plan: input.plan,
    status: input.status,
    max_products: input.max_products ?? limits.max_products,
    max_documents_month: input.max_documents_month ?? limits.max_documents_month,
    current_period_end: input.current_period_end ?? null,
  });

  await writeAuditLog({
    orgId: ctx.orgId,
    actorUserId: ctx.userId,
    entityType: 'tenant_billing',
    entityId: billing.id,
    action: 'update',
    payload: {
      plan: billing.plan,
      status: billing.status,
      max_products: billing.max_products,
      max_documents_month: billing.max_documents_month,
      current_period_end: billing.current_period_end,
    },
  });

  return billing;
}
