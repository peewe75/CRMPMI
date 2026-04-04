import { jsonOk, withErrorHandler } from '@/lib/utils/api';
import { updateProposalItem } from '@/modules/proposals/application/proposals-service';

export const PATCH = withErrorHandler(async (
  request: Request,
  context: unknown
) => {
  const { id, itemId } = await (context as { params: Promise<{ id: string; itemId: string }> }).params;
  const body = await request.json();

  const item = await updateProposalItem(id, itemId, {
    matched_variant_id: body.matched_variant_id ?? undefined,
    quantity: body.quantity ?? undefined,
    size_raw: body.size_raw ?? undefined,
    color_raw: body.color_raw ?? undefined,
    raw_description: body.raw_description ?? undefined,
    status: body.status ?? undefined,
  });

  return jsonOk({ item });
});
