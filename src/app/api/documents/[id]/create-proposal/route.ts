import { requireFeatureEnabled } from '@/lib/auth/feature-flags';
import { jsonError, jsonOk, withErrorHandler } from '@/lib/utils/api';
import { createProposalFromDocument } from '@/modules/documents/application/document-proposal-service';

export const POST = withErrorHandler(async (
  request: Request,
  context: unknown
) => {
  await requireFeatureEnabled('document_import', 'import documenti');
  const { id } = await (context as { params: Promise<{ id: string }> }).params;
  const body = await request.json().catch(() => ({}));
  const proposalType = body.proposal_type as 'inbound' | 'outbound' | 'adjustment' | undefined;

  if (!proposalType) {
    return jsonError('proposal_type is required');
  }

  const result = await createProposalFromDocument({
    uploaded_document_id: id,
    proposal_type: proposalType,
    target_store_id: body.target_store_id ?? null,
  });

  return jsonOk(result, 201);
});
