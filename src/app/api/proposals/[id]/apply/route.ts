import { jsonOk, withErrorHandler } from '@/lib/utils/api';
import { applyProposal } from '@/modules/proposals/application/proposals-service';

export const POST = withErrorHandler(async (
  _request: Request,
  context: unknown
) => {
  const { id } = await (context as { params: Promise<{ id: string }> }).params;
  const result = await applyProposal(id);
  return jsonOk(result);
});
