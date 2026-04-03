import { updateTenantBillingSettings } from '@/modules/organizations/application/settings-service';
import { jsonError, jsonOk, withErrorHandler } from '@/lib/utils/api';

export const PATCH = withErrorHandler(async (request: Request) => {
  const body = await request.json();

  const plan = body.plan;
  const status = body.status;
  const maxProducts = Number(body.max_products);
  const maxDocumentsMonth = Number(body.max_documents_month);
  const currentPeriodEnd =
    typeof body.current_period_end === 'string' && body.current_period_end.trim()
      ? body.current_period_end
      : null;

  if (!['free', 'starter', 'pro'].includes(plan)) {
    return jsonError('Piano non valido');
  }

  if (!['active', 'trialing', 'past_due', 'canceled'].includes(status)) {
    return jsonError('Status billing non valido');
  }

  if (!Number.isFinite(maxProducts) || maxProducts < 1) {
    return jsonError('max_products deve essere maggiore di zero');
  }

  if (!Number.isFinite(maxDocumentsMonth) || maxDocumentsMonth < 1) {
    return jsonError('max_documents_month deve essere maggiore di zero');
  }

  const billing = await updateTenantBillingSettings({
    plan,
    status,
    max_products: Math.trunc(maxProducts),
    max_documents_month: Math.trunc(maxDocumentsMonth),
    current_period_end: currentPeriodEnd,
  });

  return jsonOk({ billing });
});
