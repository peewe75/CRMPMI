'use server';

import { writeAuditLog } from '@/lib/supabase/audit';
import { requireTenantContext } from '@/lib/auth/tenant';
import { createServiceClient } from '@/lib/supabase/server';
import { getOrCreateDefaultStore, createMovement, getVariantStockByStores } from '@/modules/inventory/application/inventory-service';
import {
  createImportSession,
  updateDocumentStatus,
  updateLineItem,
} from '@/modules/documents/application/documents-service';
import { createProduct, createVariant } from '@/modules/products/application/products-service';
import type { InventoryProposalItem, ProposalStatus, ProposalType } from '@/types/database';
import type { CreateProposalInput } from '@/modules/proposals/domain/proposal-types';
import {
  getProposalWithItemsById,
  insertProposal,
  insertProposalItems,
  listProposalsByOrg,
  updateProposalItemById,
  updateProposalItemsStatus,
  updateProposalStatus,
} from '@/modules/proposals/infrastructure/proposals-repository';

export async function createProposal(input: CreateProposalInput) {
  const { orgId, userId } = await requireTenantContext();
  const db = createServiceClient();

  const proposal = await insertProposal(db, orgId, userId, input);
  const items = await insertProposalItems(db, orgId, proposal.id, input.items);

  await writeAuditLog({
    orgId,
    actorUserId: userId,
    entityType: 'inventory_proposal',
    entityId: proposal.id,
    action: 'create',
    payload: {
      source_type: proposal.source_type,
      proposal_type: proposal.proposal_type,
      items_count: items.length,
      source_uploaded_document_id: proposal.source_uploaded_document_id,
    },
  });

  return { proposal, items };
}

export async function listProposals(filters?: {
  status?: ProposalStatus;
  proposal_type?: ProposalType;
  source_type?: string;
  limit?: number;
  offset?: number;
}) {
  const { orgId } = await requireTenantContext();
  const db = createServiceClient();
  return listProposalsByOrg(db, orgId, filters);
}

export async function getProposal(proposalId: string) {
  const { orgId } = await requireTenantContext();
  const db = createServiceClient();
  return getProposalWithItemsById(db, orgId, proposalId);
}

export async function updateProposalItem(
  proposalId: string,
  itemId: string,
  input: {
    matched_variant_id?: string | null;
    quantity?: number | null;
    size_raw?: string | null;
    color_raw?: string | null;
    raw_description?: string | null;
    status?: 'pending' | 'matched' | 'unmatched' | 'skipped';
  }
) {
  const { orgId, userId } = await requireTenantContext();
  const db = createServiceClient();
  const { proposal, items } = await getProposalWithItemsById(db, orgId, proposalId);

  if (proposal.status === 'applied' || proposal.status === 'rejected') {
    throw new Error('Forbidden: proposal item cannot be edited after finalization');
  }

  const currentItem = items.find((item) => item.id === itemId);
  if (!currentItem) {
    throw new Error('Not found: proposal item not found');
  }

  const nextPayload = { ...(currentItem.payload ?? {}) } as Record<string, unknown>;
  let matchedVariantId = input.matched_variant_id ?? currentItem.matched_variant_id;
  let matchedProductId = currentItem.matched_product_id;
  let nextStatus = input.status ?? currentItem.status;

  if (input.status === 'skipped') {
    matchedVariantId = null;
    matchedProductId = null;
    nextStatus = 'skipped';
    nextPayload.decision_action = 'skip';
  } else if (matchedVariantId) {
    const variant = await resolveVariantForProposalItem(db, orgId, matchedVariantId);
    matchedVariantId = variant.id;
    matchedProductId = variant.product_id;
    nextStatus = 'matched';
    nextPayload.decision_action = 'link_existing';
    nextPayload.matched_variant_id = variant.id;
    nextPayload.matched_product_id = variant.product_id;
    nextPayload.size = variant.size;
    nextPayload.color = variant.color;
    nextPayload.barcode = variant.barcode;
    nextPayload.supplier_code = variant.sku_supplier;
  } else if (input.matched_variant_id === null) {
    matchedVariantId = null;
    matchedProductId = null;
    nextStatus = 'pending';
    if (nextPayload.decision_action === 'link_existing') {
      nextPayload.decision_action = 'manual_review';
    }
    nextPayload.matched_variant_id = null;
    nextPayload.matched_product_id = null;
  }

  const updated = await updateProposalItemById(db, orgId, proposalId, itemId, {
    matched_product_id: matchedProductId,
    matched_variant_id: matchedVariantId,
    quantity: input.quantity ?? currentItem.quantity,
    size_raw: input.size_raw ?? currentItem.size_raw,
    color_raw: input.color_raw ?? currentItem.color_raw,
    raw_description: input.raw_description ?? currentItem.raw_description,
    status: nextStatus,
    payload: nextPayload,
  });

  await writeAuditLog({
    orgId,
    actorUserId: userId,
    entityType: 'inventory_proposal_item',
    entityId: itemId,
    action: 'update',
    payload: {
      proposal_id: proposalId,
      matched_variant_id: updated.matched_variant_id,
      matched_product_id: updated.matched_product_id,
      quantity: updated.quantity,
      status: updated.status,
    },
  });

  return updated;
}

export async function approveProposal(proposalId: string) {
  const { orgId, userId } = await requireTenantContext();
  const db = createServiceClient();
  const { proposal, items } = await getProposalWithItemsById(db, orgId, proposalId);

  if (proposal.status === 'rejected') {
    throw new Error('Forbidden: rejected proposals cannot be approved');
  }

  if (proposal.status === 'applied') {
    return proposal;
  }

  if (proposal.proposal_type !== 'lookup' && hasBlockingItemsForApproval(items)) {
    throw new Error('Forbidden: proposal still contains unresolved items that require manual review');
  }

  const approved = await updateProposalStatus(db, orgId, proposalId, {
    status: 'approved',
    approved_by: userId,
    approved_at: new Date().toISOString(),
  });

  await writeAuditLog({
    orgId,
    actorUserId: userId,
    entityType: 'inventory_proposal',
    entityId: proposalId,
    action: 'approve',
    payload: {
      proposal_type: approved.proposal_type,
      source_type: approved.source_type,
    },
  });

  return approved;
}

export async function rejectProposal(proposalId: string, reason?: string) {
  const { orgId, userId } = await requireTenantContext();
  const db = createServiceClient();
  const { proposal } = await getProposalWithItemsById(db, orgId, proposalId);

  if (proposal.status === 'applied') {
    throw new Error('Forbidden: applied proposals cannot be rejected');
  }

  const rejected = await updateProposalStatus(db, orgId, proposalId, {
    status: 'rejected',
    rejected_by: userId,
    rejected_at: new Date().toISOString(),
  });

  await updateProposalItemsStatus(db, orgId, proposalId, 'rejected');

  await writeAuditLog({
    orgId,
    actorUserId: userId,
    entityType: 'inventory_proposal',
    entityId: proposalId,
    action: 'reject',
    payload: {
      proposal_type: rejected.proposal_type,
      reason: reason ?? null,
    },
  });

  return rejected;
}

export async function applyProposal(proposalId: string) {
  const { orgId, userId } = await requireTenantContext();
  const db = createServiceClient();
  const { proposal, items } = await getProposalWithItemsById(db, orgId, proposalId);

  if (proposal.proposal_type === 'lookup') {
    return applyLookupProposal(proposalId);
  }

  if (proposal.status === 'applied' || proposal.applied_at) {
    return {
      proposal,
      summary: {
        movements_created: 0,
        items_applied: 0,
      },
    };
  }

  if (proposal.status !== 'approved') {
    throw new Error('Forbidden: proposal must be approved before applying');
  }

  validateMovementProposalItems(proposal.proposal_type, items);

  const defaultStore = proposal.target_store_id ? null : await getOrCreateDefaultStore();
  const targetStoreId = proposal.target_store_id || defaultStore!.id;
  const createdProductIdsByGroupKey = new Map<string, string>();

  let movementsCreated = 0;
  let productsCreated = 0;
  let variantsCreated = 0;
  let variantsUpdated = 0;
  let linesSkipped = 0;

  for (const item of items) {
    const resolution = await resolveProposalItemForApply(item, createdProductIdsByGroupKey);
    if (resolution.skipped) {
      linesSkipped++;
      continue;
    }

    const movementType = (item.interpreted_action ?? proposal.proposal_type) as ProposalType;

    await createMovement({
      store_id: targetStoreId,
      variant_id: resolution.variantId!,
      movement_type: movementType === 'lookup' ? proposal.proposal_type : movementType,
      quantity: Number(item.quantity),
      notes: buildProposalMovementNote(proposal.source_type, proposal.id, item.raw_description),
      source_document_type: 'inventory_proposal',
      source_document_id: proposal.id,
      source_proposal_id: proposal.id,
    });

    if (resolution.createdProduct) productsCreated++;
    if (resolution.createdVariant) variantsCreated++;
    if (resolution.linkedExistingVariant) variantsUpdated++;
    movementsCreated++;

    await syncDocumentLineAfterApply(proposal.source_uploaded_document_id, item, resolution);
  }

  await updateProposalItemsStatus(db, orgId, proposalId, 'applied');
  const applied = await updateProposalStatus(db, orgId, proposalId, {
    status: 'applied',
    applied_by: userId,
    applied_at: new Date().toISOString(),
  });

  let documentSession = null;
  if (proposal.source_uploaded_document_id) {
    documentSession = await createImportSession({
      uploaded_document_id: proposal.source_uploaded_document_id,
      products_created: productsCreated,
      variants_created: variantsCreated,
      variants_updated: variantsUpdated,
      movements_created: movementsCreated,
      lines_skipped: linesSkipped,
    });

    await updateDocumentStatus(proposal.source_uploaded_document_id, 'imported', {
      error_message: null,
    });

    await writeAuditLog({
      orgId,
      actorUserId: userId,
      entityType: 'document',
      entityId: proposal.source_uploaded_document_id,
      action: 'import',
      payload: {
        proposal_id: proposal.id,
        session_id: documentSession.id,
        products_created: productsCreated,
        variants_created: variantsCreated,
        variants_updated: variantsUpdated,
        movements_created: movementsCreated,
        lines_skipped: linesSkipped,
      },
    });
  }

  await writeAuditLog({
    orgId,
    actorUserId: userId,
    entityType: 'inventory_proposal',
    entityId: proposalId,
    action: 'apply',
    payload: {
      proposal_type: proposal.proposal_type,
      movements_created: movementsCreated,
      items_count: items.length,
    },
  });

  return {
    proposal: applied,
    session: documentSession,
    summary: {
      products_created: productsCreated,
      variants_created: variantsCreated,
      variants_updated: variantsUpdated,
      movements_created: movementsCreated,
      items_applied: items.length - linesSkipped,
      lines_skipped: linesSkipped,
    },
  };
}

export async function applyLookupProposal(proposalId: string) {
  const { orgId, userId } = await requireTenantContext();
  const db = createServiceClient();
  const { proposal, items } = await getProposalWithItemsById(db, orgId, proposalId);

  if (proposal.proposal_type !== 'lookup') {
    throw new Error('Forbidden: only lookup proposals can use applyLookupProposal');
  }

  if (proposal.status === 'rejected') {
    throw new Error('Forbidden: rejected proposals cannot be applied');
  }

  const variantIds = [...new Set(items.map((item) => item.matched_variant_id).filter(Boolean))] as string[];
  const results = await Promise.all(
    variantIds.map(async (variantId) => ({
      variant_id: variantId,
      stock_by_store: await getVariantStockByStores(variantId),
    }))
  );

  await updateProposalItemsStatus(db, orgId, proposalId, variantIds.length ? 'applied' : 'skipped');
  const applied = await updateProposalStatus(db, orgId, proposalId, {
    status: 'applied',
    applied_by: userId,
    applied_at: new Date().toISOString(),
  });

  await writeAuditLog({
    orgId,
    actorUserId: userId,
    entityType: 'inventory_proposal',
    entityId: proposalId,
    action: 'apply',
    payload: {
      proposal_type: 'lookup',
      lookups_resolved: results.length,
    },
  });

  return {
    proposal: applied,
    lookup_results: results,
  };
}

function validateMovementProposalItems(proposalType: ProposalType, items: InventoryProposalItem[]) {
  if (!items.length) {
    throw new Error('Forbidden: movement proposals require at least one item');
  }

  for (const item of items) {
    const decisionAction = typeof item.payload?.decision_action === 'string' ? item.payload.decision_action : null;
    const canResolveDuringApply = decisionAction === 'create_product' || decisionAction === 'create_variant';

    if (!item.matched_variant_id && !canResolveDuringApply && item.status !== 'skipped') {
      throw new Error('Forbidden: every proposal item must be matched before apply');
    }

    if (item.status === 'skipped') {
      continue;
    }

    if (item.quantity == null || Number(item.quantity) === 0) {
      throw new Error('Forbidden: every proposal item must include a non-zero quantity before apply');
    }

    if ((proposalType === 'inbound' || proposalType === 'outbound') && Number(item.quantity) < 0) {
      throw new Error('Forbidden: inbound/outbound proposals require positive quantities');
    }
  }
}

function hasBlockingItemsForApproval(items: InventoryProposalItem[]) {
  return items.some((item) => {
    if (item.status === 'skipped') return false;
    if (item.matched_variant_id) return false;

    const decisionAction = typeof item.payload?.decision_action === 'string' ? item.payload.decision_action : null;
    return decisionAction !== 'create_product' && decisionAction !== 'create_variant';
  });
}

async function resolveProposalItemForApply(
  item: InventoryProposalItem,
  createdProductIdsByGroupKey: Map<string, string>
) {
  const payload = (item.payload ?? {}) as Record<string, unknown>;
  const decisionAction = typeof payload.decision_action === 'string' ? payload.decision_action : null;

  if (decisionAction === 'skip' || item.status === 'skipped') {
    return {
      skipped: true,
      variantId: null,
      productId: null,
      createdProduct: false,
      createdVariant: false,
      linkedExistingVariant: false,
      matchStatus: 'skipped' as const,
    };
  }

  if (decisionAction === 'create_product') {
    const productGroupKey = readString(payload.product_group_key) ?? `line-${item.line_index}`;
    let productId = createdProductIdsByGroupKey.get(productGroupKey);
    let createdProduct = false;

    if (!productId) {
      const product = await createProduct({
        brand: readString(payload.brand) ?? 'Sconosciuto',
        model_name: readString(payload.model_name) ?? item.raw_description ?? 'Nuovo prodotto',
        category: readString(payload.category) ?? 'general',
        supplier_name: undefined,
      });
      productId = product.id;
      createdProductIdsByGroupKey.set(productGroupKey, product.id);
      createdProduct = true;
    }

    const variant = await createVariant({
      product_id: productId,
      size: readString(payload.size) ?? item.size_raw ?? 'N/A',
      color: readString(payload.color) ?? item.color_raw ?? 'N/A',
      material: readString(payload.material) ?? undefined,
      barcode: readString(payload.barcode) ?? undefined,
      sku_supplier: readString(payload.supplier_code) ?? undefined,
      cost_price: readNumber(payload.cost_price) ?? undefined,
    });

    return {
      skipped: false,
      variantId: variant.id,
      productId,
      createdProduct,
      createdVariant: true,
      linkedExistingVariant: false,
      matchStatus: 'proposed_new_variant' as const,
    };
  }

  if (decisionAction === 'create_variant') {
    const productId = item.matched_product_id ?? readString(payload.matched_product_id);
    if (!productId) {
      throw new Error('Forbidden: proposal item requires a target product before creating a variant');
    }

    const variant = await createVariant({
      product_id: productId,
      size: readString(payload.size) ?? item.size_raw ?? 'N/A',
      color: readString(payload.color) ?? item.color_raw ?? 'N/A',
      material: readString(payload.material) ?? undefined,
      barcode: readString(payload.barcode) ?? undefined,
      sku_supplier: readString(payload.supplier_code) ?? undefined,
      cost_price: readNumber(payload.cost_price) ?? undefined,
    });

    return {
      skipped: false,
      variantId: variant.id,
      productId,
      createdProduct: false,
      createdVariant: true,
      linkedExistingVariant: false,
      matchStatus: 'proposed_new_variant' as const,
    };
  }

  const variantId = item.matched_variant_id ?? readString(payload.matched_variant_id);
  const productId = item.matched_product_id ?? readString(payload.matched_product_id);

  if (!variantId) {
    throw new Error('Forbidden: every proposal item must be matched before apply');
  }

  return {
    skipped: false,
    variantId,
    productId,
    createdProduct: false,
    createdVariant: false,
    linkedExistingVariant: true,
    matchStatus: 'matched_existing_variant' as const,
  };
}

async function syncDocumentLineAfterApply(
  sourceUploadedDocumentId: string | null,
  item: InventoryProposalItem,
  resolution: {
    skipped: boolean;
    variantId: string | null;
    productId: string | null;
    matchStatus: 'matched_existing_variant' | 'proposed_new_variant' | 'skipped';
  }
) {
  if (!sourceUploadedDocumentId || !item.payload) {
    return;
  }

  const lineId = readString(item.payload.line_id);
  if (!lineId) {
    return;
  }

  await updateLineItem(lineId, {
    matched_product_id: resolution.productId,
    matched_variant_id: resolution.variantId,
    match_status: resolution.matchStatus,
  });
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null;
}

function readNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

async function resolveVariantForProposalItem(
  db: ReturnType<typeof createServiceClient>,
  orgId: string,
  variantId: string
) {
  const { data, error } = await db
    .from('product_variants')
    .select('id, product_id, size, color, barcode, sku_supplier')
    .eq('org_id', orgId)
    .eq('id', variantId)
    .single();

  if (error || !data) {
    throw new Error('Forbidden: selected variant not found in active tenant');
  }

  return data;
}

function buildProposalMovementNote(sourceType: string, proposalId: string, rawDescription: string | null) {
  const suffix = rawDescription ? ` - ${rawDescription}` : '';
  return `Applicato da proposal ${proposalId} (${sourceType})${suffix}`;
}
