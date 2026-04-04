import { jsonOk, withErrorHandler } from '@/lib/utils/api';
import { rejectProposal } from '@/modules/proposals/application/proposals-service';

export const POST = withErrorHandler(async (
  request: Request,
  context: unknown
) => {
  const { id } = await (context as { params: Promise<{ id: string }> }).params;
  const body = await request.json().catch(() => ({}));
  const proposal = await rejectProposal(id, body.reason);
  return jsonOk({ proposal });
});
