import { jsonError, jsonOk, withErrorHandler } from '@/lib/utils/api';
import { createProposal, listProposals } from '@/modules/proposals/application/proposals-service';
import { PROPOSAL_SOURCE_TYPES, PROPOSAL_TYPES } from '@/modules/proposals/domain/proposal-types';
import type { CreateProposalInput } from '@/modules/proposals/domain/proposal-types';

export const GET = withErrorHandler(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || undefined;
  const proposal_type = searchParams.get('proposal_type') || undefined;
  const source_type = searchParams.get('source_type') || undefined;
  const limit = searchParams.get('limit');
  const offset = searchParams.get('offset');

  const result = await listProposals({
    status: status as never,
    proposal_type: proposal_type as never,
    source_type,
    limit: limit ? Number(limit) : undefined,
    offset: offset ? Number(offset) : undefined,
  });

  return jsonOk(result);
});

export const POST = withErrorHandler(async (request: Request) => {
  const body = (await request.json()) as CreateProposalInput;

  if (!PROPOSAL_SOURCE_TYPES.includes(body.source_type)) {
    return jsonError('source_type is invalid');
  }

  if (!PROPOSAL_TYPES.includes(body.proposal_type)) {
    return jsonError('proposal_type is invalid');
  }

  const result = await createProposal(body);
  return jsonOk(result, 201);
});
