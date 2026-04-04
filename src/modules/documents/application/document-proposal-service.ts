'use server';

import { createServiceClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/supabase/audit';
import { requireTenantContext } from '@/lib/auth/tenant';
import {
  getDocumentWithLines,
  updateLineItem,
} from '@/modules/documents/application/documents-service';
import { createProposal } from '@/modules/proposals/application/proposals-service';
import type {
  CreateProposalInput,
  CreateProposalItemInput,
} from '@/modules/proposals/domain/proposal-types';
import type { DocumentLineItem, ProposalSourceType } from '@/types/database';

type DbClient = ReturnType<typeof createServiceClient>;

export interface DocumentImportLineDecision {
  line_id: string;
  action: 'create_product' | 'create_variant' | 'link_existing' | 'skip';
  product_group_key?: string;
  matched_product_id?: string;
  matched_variant_id?: string;
  brand?: string;
  model_name?: string;
  category?: string;
  size?: string;
  color?: string;
  cost_price?: number;
  quantity?: number;
}

export interface DocumentProposalSummary {
  products_to_create: number;
  variants_to_create: number;
  existing_variants_linked: number;
  lines_skipped: number;
  proposal_items: number;
}

export async function createProposalFromDocument(input: {
  uploaded_document_id: string;
  proposal_type: 'inbound' | 'outbound' | 'adjustment';
  target_store_id?: string | null;
}) {
  const { document, lines } = await getDocumentWithLines(input.uploaded_document_id);

  const proposalInput: CreateProposalInput = {
    source_type: getProposalSourceType(document.capture_type),
    proposal_type: input.proposal_type,
    target_store_id: input.target_store_id ?? document.store_id,
    raw_input: document.raw_text ?? document.file_name,
    parsed_json: (document.parsed_json as Record<string, unknown> | null) ?? null,
    confidence: document.parser_confidence,
    source_metadata: {
      document_type: document.document_type,
      capture_type: document.capture_type,
      source_channel: document.source_channel,
      requires_review: document.requires_review,
    },
    source_uploaded_document_id: document.id,
    items: lines.length
      ? lines.map((line) => ({
          line_index: line.line_index,
          raw_description: line.raw_description,
          matched_product_id: line.matched_product_id,
          matched_variant_id: line.matched_variant_id,
          interpreted_action: input.proposal_type,
          quantity: line.quantity,
          size_raw: line.size_raw,
          color_raw: line.color_raw,
          match_score: line.match_score,
          confidence: line.confidence,
          status: line.matched_variant_id ? 'matched' : 'unmatched',
          payload: {
            normalized_description: line.normalized_description,
            supplier_code: line.supplier_code,
            barcode: line.barcode,
          },
        }))
      : [
          {
            line_index: 0,
            raw_description: document.raw_text ?? document.file_name,
            interpreted_action: input.proposal_type,
            quantity: null,
            size_raw: null,
            color_raw: null,
            confidence: document.parser_confidence ?? 0.2,
            status: 'unmatched',
            payload: {
              capture_type: document.capture_type,
              requires_manual_review: true,
            },
          },
        ],
  };

  return createProposal(proposalInput);
}

export async function createDocumentImportProposal(input: {
  uploaded_document_id: string;
  store_id?: string | null;
  decisions?: DocumentImportLineDecision[];
}) {
  const { orgId, userId } = await requireTenantContext();
  const db = createServiceClient();
  const { document, lines } = await getDocumentWithLines(input.uploaded_document_id);

  if (!['parsed', 'needs_review', 'approved', 'imported'].includes(document.status)) {
    throw new Error(`Documento in stato ${document.status}, non convertibile in proposta`);
  }

  if (!lines.length) {
    throw new Error('Nessuna riga disponibile da importare');
  }

  const existingProposal = await findExistingOpenProposalForDocument(db, orgId, document.id);
  if (existingProposal) {
    return {
      proposal: existingProposal.proposal,
      items: existingProposal.items,
      summary: summarizeExistingProposal(existingProposal.items),
      already_exists: true,
    };
  }

  const decisions =
    input.decisions?.length
      ? input.decisions
      : await buildAutomaticDecisions(db, orgId, document.supplier_name_raw, lines);

  const proposalItems = buildProposalItemsFromDecisions(lines, decisions);
  const summary = summarizeProposalItems(proposalItems);

  for (const line of lines) {
    const decision = decisions.find((candidate) => candidate.line_id === line.id);
    if (!decision) continue;

    await updateLineItem(line.id, getLineItemPatchFromDecision(decision));
  }

  const created = await createProposal({
    source_type: getProposalSourceType(document.capture_type),
    proposal_type: 'inbound',
    target_store_id: input.store_id ?? document.store_id,
    raw_input: document.raw_text ?? document.file_name,
    parsed_json: (document.parsed_json as Record<string, unknown> | null) ?? null,
    confidence: document.parser_confidence,
    source_metadata: {
      document_type: document.document_type,
      capture_type: document.capture_type,
      source_channel: document.source_channel,
      requires_review: document.requires_review,
      import_mode: 'document_review_confirm',
      planned_summary: summary,
    },
    source_uploaded_document_id: document.id,
    items: proposalItems,
  });

  await writeAuditLog({
    orgId,
    actorUserId: userId,
    entityType: 'document',
    entityId: document.id,
    action: 'import',
    payload: {
      mode: 'proposal_created',
      proposal_id: created.proposal.id,
      summary,
      decisions_used: decisions.length,
    },
  });

  return {
    ...created,
    summary,
    already_exists: false,
  };
}

export async function findExistingOpenProposalForDocument(db: DbClient, orgId: string, uploadedDocumentId: string) {
  const proposalResult = await db
    .from('inventory_proposals')
    .select('*')
    .eq('org_id', orgId)
    .eq('source_uploaded_document_id', uploadedDocumentId)
    .neq('status', 'rejected')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (proposalResult.error) {
    throw new Error(proposalResult.error.message);
  }

  if (!proposalResult.data) {
    return null;
  }

  const itemsResult = await db
    .from('inventory_proposal_items')
    .select('*')
    .eq('org_id', orgId)
    .eq('proposal_id', proposalResult.data.id)
    .order('line_index', { ascending: true });

  if (itemsResult.error) {
    throw new Error(itemsResult.error.message);
  }

  return {
    proposal: proposalResult.data,
    items: itemsResult.data ?? [],
  };
}

async function buildAutomaticDecisions(
  db: DbClient,
  orgId: string,
  supplierName: string | null,
  lines: DocumentLineItem[]
): Promise<DocumentImportLineDecision[]> {
  const existingProductByGroup = new Map<string, string>();

  return Promise.all(
    lines.map(async (line) => {
      const existingVariant = await findExistingVariantForLine(db, orgId, {
        barcode: line.barcode,
        supplier_code: line.supplier_code,
      });

      if (existingVariant) {
        return {
          line_id: line.id,
          action: 'link_existing' as const,
          matched_product_id: existingVariant.product_id,
          matched_variant_id: existingVariant.id,
          quantity: line.quantity ?? undefined,
        };
      }

      const modelName = line.normalized_description || line.raw_description;
      const groupKey = normalizeGroupKey(modelName);
      const knownProductId = existingProductByGroup.get(groupKey);

      if (knownProductId) {
        const existingVariantForProduct = await findExistingVariantForProduct(db, orgId, knownProductId, {
          size_raw: line.size_raw,
          color_raw: line.color_raw,
        });

        if (existingVariantForProduct) {
          return {
            line_id: line.id,
            action: 'link_existing' as const,
            matched_product_id: existingVariantForProduct.product_id,
            matched_variant_id: existingVariantForProduct.id,
            quantity: line.quantity ?? undefined,
          };
        }

        return {
          line_id: line.id,
          action: 'create_variant' as const,
          matched_product_id: knownProductId,
          size: line.size_raw ?? undefined,
          color: line.color_raw ?? undefined,
          cost_price: line.unit_price ?? undefined,
          quantity: line.quantity ?? undefined,
        };
      }

      const existingProduct = await findExistingProductForModel(db, orgId, supplierName, modelName);

      if (existingProduct) {
        existingProductByGroup.set(groupKey, existingProduct.id);

        const existingVariantForProduct = await findExistingVariantForProduct(db, orgId, existingProduct.id, {
          size_raw: line.size_raw,
          color_raw: line.color_raw,
        });

        if (existingVariantForProduct) {
          return {
            line_id: line.id,
            action: 'link_existing' as const,
            matched_product_id: existingVariantForProduct.product_id,
            matched_variant_id: existingVariantForProduct.id,
            quantity: line.quantity ?? undefined,
          };
        }

        return {
          line_id: line.id,
          action: 'create_variant' as const,
          matched_product_id: existingProduct.id,
          size: line.size_raw ?? undefined,
          color: line.color_raw ?? undefined,
          cost_price: line.unit_price ?? undefined,
          quantity: line.quantity ?? undefined,
        };
      }

      return {
        line_id: line.id,
        action: 'create_product' as const,
        product_group_key: groupKey,
        brand: inferBrand(supplierName, modelName),
        model_name: modelName,
        category: inferCategory(modelName),
        size: line.size_raw ?? undefined,
        color: line.color_raw ?? undefined,
        cost_price: line.unit_price ?? undefined,
        quantity: line.quantity ?? undefined,
      };
    })
  );
}

function buildProposalItemsFromDecisions(
  lines: DocumentLineItem[],
  decisions: DocumentImportLineDecision[]
): CreateProposalItemInput[] {
  return decisions.reduce<CreateProposalItemInput[]>((items, decision, index) => {
    const line = lines.find((candidate) => candidate.id === decision.line_id);
    if (!line) {
      return items;
    }

    if (decision.action === 'skip') {
      items.push(
        {
          line_index: line.line_index,
          raw_description: line.raw_description,
          matched_product_id: null,
          matched_variant_id: null,
          interpreted_action: 'inbound',
          quantity: decision.quantity ?? line.quantity,
          size_raw: line.size_raw,
          color_raw: line.color_raw,
          match_score: line.match_score,
          confidence: line.confidence,
          status: 'skipped',
          payload: {
            line_id: line.id,
            decision_action: decision.action,
          },
        },
      );

      return items;
    }

    items.push(
      {
        line_index: line.line_index ?? index,
        raw_description: line.raw_description,
        matched_product_id: decision.matched_product_id ?? line.matched_product_id,
        matched_variant_id: decision.matched_variant_id ?? line.matched_variant_id,
        interpreted_action: 'inbound',
        quantity: decision.quantity ?? line.quantity,
        size_raw: decision.size ?? line.size_raw,
        color_raw: decision.color ?? line.color_raw,
        match_score: line.match_score,
        confidence: line.confidence,
        status: inferProposalItemStatus(decision),
        payload: {
          line_id: line.id,
          decision_action: decision.action,
          product_group_key: decision.product_group_key ?? normalizeGroupKey(line.normalized_description || line.raw_description),
          brand: decision.brand ?? null,
          model_name: decision.model_name ?? line.normalized_description ?? line.raw_description,
          category: decision.category ?? inferCategory(line.raw_description),
          matched_product_id: decision.matched_product_id ?? null,
          matched_variant_id: decision.matched_variant_id ?? null,
          size: decision.size ?? line.size_raw,
          color: decision.color ?? line.color_raw,
          cost_price: decision.cost_price ?? line.unit_price,
          quantity: decision.quantity ?? line.quantity,
          barcode: line.barcode,
          supplier_code: line.supplier_code,
          normalized_description: line.normalized_description,
        },
      },
    );

    return items;
  }, []);
}

function summarizeProposalItems(items: CreateProposalItemInput[]): DocumentProposalSummary {
  return items.reduce<DocumentProposalSummary>(
    (summary, item) => {
      const action = typeof item.payload?.decision_action === 'string' ? item.payload.decision_action : null;

      if (action === 'create_product') summary.products_to_create += 1;
      if (action === 'create_product' || action === 'create_variant') summary.variants_to_create += 1;
      if (action === 'link_existing') summary.existing_variants_linked += 1;
      if (action === 'skip' || item.status === 'skipped') summary.lines_skipped += 1;

      summary.proposal_items += 1;
      return summary;
    },
    {
      products_to_create: 0,
      variants_to_create: 0,
      existing_variants_linked: 0,
      lines_skipped: 0,
      proposal_items: 0,
    }
  );
}

function summarizeExistingProposal(items: Array<{ payload: Record<string, unknown> | null; status: string }>) {
  return summarizeProposalItems(
    items.map((item, index) => ({
      line_index: index,
      status: item.status === 'skipped' ? 'skipped' : 'pending',
      payload: item.payload,
    }))
  );
}

function getLineItemPatchFromDecision(decision: DocumentImportLineDecision) {
  switch (decision.action) {
    case 'skip':
      return {
        match_status: 'skipped' as const,
      };
    case 'link_existing':
      return {
        matched_product_id: decision.matched_product_id ?? null,
        matched_variant_id: decision.matched_variant_id ?? null,
        match_status: 'matched_existing_variant' as const,
      };
    case 'create_product':
    case 'create_variant':
      return {
        matched_product_id: decision.matched_product_id ?? null,
        matched_variant_id: null,
        match_status: 'proposed_new_variant' as const,
      };
  }
}

function inferProposalItemStatus(decision: DocumentImportLineDecision) {
  if (decision.action === 'skip') return 'skipped' as const;
  if (decision.action === 'link_existing' && decision.matched_variant_id) return 'matched' as const;
  return 'pending' as const;
}

function getProposalSourceType(captureType: string | null): ProposalSourceType {
  return captureType === 'handwritten_note' ? 'handwritten_photo' : 'document';
}

function normalizeGroupKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\s-]/gu, '');
}

function inferCategory(description: string) {
  const normalized = description.toLowerCase();

  if (/(sneaker|scarpa|stivale|sandalo|mocassino|decollet|tronchetto)/i.test(normalized)) {
    return 'scarpe';
  }

  if (/(borsa|tracolla|zaino|pochette)/i.test(normalized)) {
    return 'borse';
  }

  if (/(cintura|sciarpa|cappello|accessorio|portafoglio)/i.test(normalized)) {
    return 'accessori';
  }

  if (/(maglia|abito|giacca|pantalone|camicia|tshirt|t-shirt|gonna)/i.test(normalized)) {
    return 'abbigliamento';
  }

  return 'general';
}

function inferBrand(supplierName: string | null, fallbackModelName: string) {
  const cleanedSupplier = supplierName
    ?.replace(/\b(s\.?r\.?l\.?|s\.?p\.?a\.?|sas|snc|srl|spa)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  return cleanedSupplier || fallbackModelName.split(' ')[0] || 'Sconosciuto';
}

async function findExistingVariantForLine(
  db: DbClient,
  orgId: string,
  line: {
    barcode: string | null;
    supplier_code: string | null;
  }
) {
  if (line.barcode) {
    const { data } = await db
      .from('product_variants')
      .select('id, product_id')
      .eq('org_id', orgId)
      .eq('barcode', line.barcode)
      .maybeSingle();

    if (data) return data;
  }

  if (line.supplier_code) {
    const { data } = await db
      .from('product_variants')
      .select('id, product_id')
      .eq('org_id', orgId)
      .eq('sku_supplier', line.supplier_code)
      .maybeSingle();

    if (data) return data;
  }

  return null;
}

async function findExistingProductForModel(
  db: DbClient,
  orgId: string,
  supplierName: string | null,
  modelName: string
) {
  if (supplierName) {
    const { data } = await db
      .from('products')
      .select('id')
      .eq('org_id', orgId)
      .eq('supplier_name', supplierName)
      .eq('model_name', modelName)
      .maybeSingle();

    if (data) return data;
  }

  const { data } = await db
    .from('products')
    .select('id')
    .eq('org_id', orgId)
    .eq('model_name', modelName)
    .maybeSingle();

  return data;
}

async function findExistingVariantForProduct(
  db: DbClient,
  orgId: string,
  productId: string,
  line: {
    size_raw: string | null;
    color_raw: string | null;
  }
) {
  if (!line.size_raw || !line.color_raw) {
    return null;
  }

  const { data } = await db
    .from('product_variants')
    .select('id, product_id')
    .eq('org_id', orgId)
    .eq('product_id', productId)
    .eq('size', line.size_raw)
    .eq('color', line.color_raw)
    .maybeSingle();

  return data;
}
