import { jsonOk, withErrorHandler } from '@/lib/utils/api';
import { getProposal } from '@/modules/proposals/application/proposals-service';

export const GET = withErrorHandler(async (
  _request: Request,
  context: unknown
) => {
  const { id } = await (context as { params: Promise<{ id: string }> }).params;
  const proposal = await getProposal(id);
  return jsonOk(proposal);
});
