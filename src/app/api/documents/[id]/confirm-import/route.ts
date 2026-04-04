import { requireFeatureEnabled } from '@/lib/auth/feature-flags';
import { jsonError, jsonOk, withErrorHandler } from '@/lib/utils/api';
import {
  createDocumentImportProposal,
  type DocumentImportLineDecision,
} from '@/modules/documents/application/document-proposal-service';

export const POST = withErrorHandler(async (
  request: Request,
  context: unknown
) => {
  await requireFeatureEnabled('document_import', 'import documenti');
  const { id } = await (context as { params: Promise<{ id: string }> }).params;

  const rawBody = await request.text();
  const body = rawBody ? JSON.parse(rawBody) : {};
  const { decisions, store_id } = body as {
    decisions?: DocumentImportLineDecision[];
    store_id?: string;
  };

  const result = await createDocumentImportProposal({
    uploaded_document_id: id,
    store_id: store_id ?? null,
    decisions,
  });

  if (!result.proposal) {
    return jsonError('Impossibile creare la proposta di inventario dal documento');
  }

  return jsonOk({
    proposal: {
      id: result.proposal.id,
      status: result.proposal.status,
      proposal_type: result.proposal.proposal_type,
      source_type: result.proposal.source_type,
    },
    already_exists: result.already_exists,
    summary: result.summary,
  });
});
