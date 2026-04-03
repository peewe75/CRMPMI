import { createStoreFromSettings } from '@/modules/organizations/application/settings-service';
import { jsonError, jsonOk, withErrorHandler } from '@/lib/utils/api';

export const POST = withErrorHandler(async (request: Request) => {
  const body = await request.json();
  const name = typeof body.name === 'string' ? body.name : '';
  const address = typeof body.address === 'string' ? body.address : '';
  const phone = typeof body.phone === 'string' ? body.phone : '';

  if (!name.trim()) {
    return jsonError('Nome negozio obbligatorio');
  }

  const store = await createStoreFromSettings({
    name,
    address: address || undefined,
    phone: phone || undefined,
  });

  return jsonOk({ store }, 201);
});
