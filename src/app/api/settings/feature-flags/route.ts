import { normalizeFeatureFlags } from '@/lib/auth/feature-flags';
import { updateTenantFeatureFlags } from '@/modules/organizations/application/settings-service';
import { jsonOk, withErrorHandler } from '@/lib/utils/api';

export const PATCH = withErrorHandler(async (request: Request) => {
  const body = await request.json();
  const featureFlags = normalizeFeatureFlags(body);
  const savedFlags = await updateTenantFeatureFlags(featureFlags);

  return jsonOk({ feature_flags: savedFlags });
});
