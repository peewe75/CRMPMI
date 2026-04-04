import { jsonOk, withErrorHandler } from '@/lib/utils/api';
import { approveProposal } from '@/modules/proposals/application/proposals-service';

export const POST = withErrorHandler(async (
  _request: Request,
  context: unknown
) => {
  const { id } = await (context as { params: Promise<{ id: string }> }).params;
  const proposal = await approveProposal(id);
  return jsonOk({ proposal });
});
