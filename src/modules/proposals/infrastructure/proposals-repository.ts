import { createServiceClient } from '@/lib/supabase/server';
import type { InventoryProposal, InventoryProposalItem, ProposalItemStatus, ProposalStatus } from '@/types/database';
import type { CreateProposalInput, ProposalWithItems } from '@/modules/proposals/domain/proposal-types';

type DbClient = ReturnType<typeof createServiceClient>;

export async function insertProposal(
  db: DbClient,
  orgId: string,
  createdBy: string | null,
  input: CreateProposalInput
) {
  const { data, error } = await db
    .from('inventory_proposals')
    .insert({
      org_id: orgId,
      source_type: input.source_type,
      proposal_type: input.proposal_type,
      target_store_id: input.target_store_id ?? null,
      raw_input: input.raw_input ?? null,
      parsed_json: input.parsed_json ?? null,
      confidence: input.confidence ?? null,
      source_metadata: input.source_metadata ?? {},
      source_document_id: input.source_document_id ?? null,
      source_uploaded_document_id: input.source_uploaded_document_id ?? null,
      source_email_ingestion_id: input.source_email_ingestion_id ?? null,
      created_by: createdBy,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as InventoryProposal;
}

export async function insertProposalItems(
  db: DbClient,
  orgId: string,
  proposalId: string,
  items: CreateProposalInput['items'] = []
) {
  if (!items.length) return [] as InventoryProposalItem[];

  const normalizedItems = items.map((item) => ({
    org_id: orgId,
    proposal_id: proposalId,
    line_index: item.line_index,
    raw_description: item.raw_description ?? null,
    matched_product_id: item.matched_product_id ?? null,
    matched_variant_id: item.matched_variant_id ?? null,
    interpreted_action: item.interpreted_action ?? null,
    quantity: item.quantity ?? null,
    size_raw: item.size_raw ?? null,
    color_raw: item.color_raw ?? null,
    match_score: item.match_score ?? null,
    confidence: item.confidence ?? null,
    status: item.status ?? inferItemStatus(item.matched_variant_id),
    payload: item.payload ?? null,
  }));

  const { data, error } = await db.from('inventory_proposal_items').insert(normalizedItems).select('*');
  if (error) throw new Error(error.message);

  return data as InventoryProposalItem[];
}

export async function listProposalsByOrg(
  db: DbClient,
  orgId: string,
  filters?: {
    status?: ProposalStatus;
    proposal_type?: string;
    source_type?: string;
    limit?: number;
    offset?: number;
  }
) {
  let query = db
    .from('inventory_proposals')
    .select('*', { count: 'exact' })
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .range(filters?.offset ?? 0, (filters?.offset ?? 0) + (filters?.limit ?? 50) - 1);

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.proposal_type) query = query.eq('proposal_type', filters.proposal_type);
  if (filters?.source_type) query = query.eq('source_type', filters.source_type);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return { proposals: (data ?? []) as InventoryProposal[], total: count ?? 0 };
}

export async function getProposalWithItemsById(db: DbClient, orgId: string, proposalId: string): Promise<ProposalWithItems> {
  const [proposalResult, itemsResult] = await Promise.all([
    db.from('inventory_proposals').select('*').eq('org_id', orgId).eq('id', proposalId).single(),
    db
      .from('inventory_proposal_items')
      .select('*')
      .eq('org_id', orgId)
      .eq('proposal_id', proposalId)
      .order('line_index', { ascending: true }),
  ]);

  if (proposalResult.error) throw new Error('Proposal not found');
  if (itemsResult.error) throw new Error(itemsResult.error.message);

  return {
    proposal: proposalResult.data as InventoryProposal,
    items: (itemsResult.data ?? []) as InventoryProposalItem[],
  };
}

export async function updateProposalStatus(
  db: DbClient,
  orgId: string,
  proposalId: string,
  patch: Partial<InventoryProposal>
) {
  const { data, error } = await db
    .from('inventory_proposals')
    .update(patch)
    .eq('org_id', orgId)
    .eq('id', proposalId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as InventoryProposal;
}

export async function updateProposalItemsStatus(
  db: DbClient,
  orgId: string,
  proposalId: string,
  status: ProposalItemStatus
) {
  const { error } = await db
    .from('inventory_proposal_items')
    .update({ status })
    .eq('org_id', orgId)
    .eq('proposal_id', proposalId);

  if (error) throw new Error(error.message);
}

export async function updateProposalItemById(
  db: DbClient,
  orgId: string,
  proposalId: string,
  itemId: string,
  patch: Partial<InventoryProposalItem>
) {
  const { data, error } = await db
    .from('inventory_proposal_items')
    .update(patch)
    .eq('org_id', orgId)
    .eq('proposal_id', proposalId)
    .eq('id', itemId)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as InventoryProposalItem;
}

function inferItemStatus(matchedVariantId?: string | null): ProposalItemStatus {
  return matchedVariantId ? 'matched' : 'pending';
}
