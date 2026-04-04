import type {
  InventoryProposal,
  InventoryProposalItem,
  ProposalItemStatus,
  ProposalSourceType,
  ProposalStatus,
  ProposalType,
} from '@/types/database';

export const PROPOSAL_SOURCE_TYPES: ProposalSourceType[] = [
  'voice',
  'document',
  'handwritten_photo',
  'gmail_attachment',
  'manual',
];

export const PROPOSAL_TYPES: ProposalType[] = ['inbound', 'outbound', 'adjustment', 'lookup'];

export const PROPOSAL_STATUSES: ProposalStatus[] = ['pending_review', 'approved', 'rejected', 'applied'];

export const PROPOSAL_ITEM_STATUSES: ProposalItemStatus[] = [
  'pending',
  'matched',
  'unmatched',
  'applied',
  'rejected',
  'skipped',
];

export interface CreateProposalItemInput {
  line_index: number;
  raw_description?: string | null;
  matched_product_id?: string | null;
  matched_variant_id?: string | null;
  interpreted_action?: ProposalType | null;
  quantity?: number | null;
  size_raw?: string | null;
  color_raw?: string | null;
  match_score?: number | null;
  confidence?: number | null;
  status?: ProposalItemStatus;
  payload?: Record<string, unknown> | null;
}

export interface CreateProposalInput {
  source_type: ProposalSourceType;
  proposal_type: ProposalType;
  target_store_id?: string | null;
  raw_input?: string | null;
  parsed_json?: Record<string, unknown> | null;
  confidence?: number | null;
  source_metadata?: Record<string, unknown>;
  source_document_id?: string | null;
  source_uploaded_document_id?: string | null;
  source_email_ingestion_id?: string | null;
  items?: CreateProposalItemInput[];
}

export interface ProposalWithItems {
  proposal: InventoryProposal;
  items: InventoryProposalItem[];
}
