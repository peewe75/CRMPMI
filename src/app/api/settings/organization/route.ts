import { updateTenantOrganizationProfile } from '@/modules/organizations/application/settings-service';
import { jsonError, jsonOk, withErrorHandler } from '@/lib/utils/api';

export const PATCH = withErrorHandler(async (request: Request) => {
  const body = await request.json();
  const name = typeof body.name === 'string' ? body.name : '';

  if (!name.trim()) {
    return jsonError('Nome organizzazione obbligatorio');
  }

  const organization = await updateTenantOrganizationProfile({ name });
  return jsonOk({ organization });
});
