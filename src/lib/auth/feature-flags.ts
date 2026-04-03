import { clerkClient } from '@clerk/nextjs/server';
import { requireTenantContext } from '@/lib/auth/tenant';
import { DEFAULT_FEATURE_FLAGS, type FeatureFlags } from '@/types/database';

const FEATURE_FLAGS_KEY = 'featureFlags';

type FeatureFlagsMetadata = Partial<FeatureFlags> | undefined;

export function normalizeFeatureFlags(value: unknown): FeatureFlags {
  const metadata = (value ?? {}) as FeatureFlagsMetadata;

  return {
    voice_input: metadata?.voice_input ?? DEFAULT_FEATURE_FLAGS.voice_input,
    document_import: metadata?.document_import ?? DEFAULT_FEATURE_FLAGS.document_import,
    barcode_scan: metadata?.barcode_scan ?? DEFAULT_FEATURE_FLAGS.barcode_scan,
    multi_store: metadata?.multi_store ?? DEFAULT_FEATURE_FLAGS.multi_store,
  };
}

export async function getOrganizationFeatureFlags(orgId: string) {
  const clerk = await clerkClient();
  const organization = await clerk.organizations.getOrganization({
    organizationId: orgId,
  });

  const publicMetadata = organization.publicMetadata as Record<string, unknown> | undefined;
  return normalizeFeatureFlags(publicMetadata?.[FEATURE_FLAGS_KEY]);
}

export async function getCurrentOrganizationFeatureFlags() {
  const { orgId } = await requireTenantContext();
  return getOrganizationFeatureFlags(orgId);
}

export async function requireFeatureEnabled(
  feature: keyof FeatureFlags,
  label?: string
) {
  const flags = await getCurrentOrganizationFeatureFlags();

  if (!flags[feature]) {
    throw new Error(`Forbidden: funzione ${label ?? feature} disattivata nelle impostazioni del tenant`);
  }

  return flags;
}

export { FEATURE_FLAGS_KEY };
