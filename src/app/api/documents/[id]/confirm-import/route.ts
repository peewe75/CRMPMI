import { requireTenantContext } from '@/lib/auth/tenant';
import {
  getDocumentWithLines,
  updateDocumentStatus,
  updateLineItem,
  createImportSession,
} from '@/modules/documents/application/documents-service';
import { createProduct, createVariant } from '@/modules/products/application/products-service';
import { createMovement, getOrCreateDefaultStore } from '@/modules/inventory/application/inventory-service';
import { writeAuditLog } from '@/lib/supabase/audit';
import { jsonOk, jsonError, withErrorHandler } from '@/lib/utils/api';

interface LineDecision {
  line_id: string;
  action: 'create_product' | 'create_variant' | 'link_existing' | 'skip';
  matched_product_id?: string;
  matched_variant_id?: string;
  // For new product/variant creation
  brand?: string;
  model_name?: string;
  category?: string;
  size?: string;
  color?: string;
  cost_price?: number;
  quantity?: number;
}

export const POST = withErrorHandler(async (
  request: Request,
  context: unknown
) => {
  const { orgId, userId } = await requireTenantContext();
  const { id } = await (context as { params: Promise<{ id: string }> }).params;

  const body = await request.json();
  const { decisions, store_id } = body as { decisions: LineDecision[]; store_id?: string };

  if (!decisions?.length) {
    return jsonError('decisions array is required');
  }

  const { document, lines } = await getDocumentWithLines(id);

  if (!['parsed', 'needs_review', 'approved'].includes(document.status)) {
    return jsonError(`Documento in stato ${document.status}, non importabile`);
  }

  const defaultStore = await getOrCreateDefaultStore();
  const targetStoreId = store_id || defaultStore.id;

  let productsCreated = 0;
  let variantsCreated = 0;
  let variantsUpdated = 0;
  let movementsCreated = 0;
  let linesSkipped = 0;

  for (const decision of decisions) {
    const line = lines.find((l) => l.id === decision.line_id);
    if (!line) continue;

    if (decision.action === 'skip') {
      await updateLineItem(line.id, { match_status: 'skipped' });
      linesSkipped++;
      continue;
    }

    let variantId: string | undefined;
    let productId: string | undefined;

    if (decision.action === 'create_product') {
      // Create new product + variant
      const product = await createProduct({
        brand: decision.brand || 'Sconosciuto',
        model_name: decision.model_name || line.normalized_description || line.raw_description,
        category: decision.category || 'general',
      });
      productId = product.id;
      productsCreated++;

      const variant = await createVariant({
        product_id: product.id,
        size: decision.size || line.size_raw || 'N/A',
        color: decision.color || line.color_raw || 'N/A',
        barcode: line.barcode || undefined,
        sku_supplier: line.supplier_code || undefined,
        cost_price: decision.cost_price ?? (line.unit_price ? Number(line.unit_price) : undefined),
      });
      variantId = variant.id;
      variantsCreated++;
    } else if (decision.action === 'create_variant') {
      // Create variant for existing product
      productId = decision.matched_product_id;
      const variant = await createVariant({
        product_id: decision.matched_product_id!,
        size: decision.size || line.size_raw || 'N/A',
        color: decision.color || line.color_raw || 'N/A',
        barcode: line.barcode || undefined,
        sku_supplier: line.supplier_code || undefined,
        cost_price: decision.cost_price ?? (line.unit_price ? Number(line.unit_price) : undefined),
      });
      variantId = variant.id;
      variantsCreated++;
    } else if (decision.action === 'link_existing') {
      variantId = decision.matched_variant_id;
      productId = decision.matched_product_id;
      variantsUpdated++;
    }

    // Create inbound movement if we have a variant and quantity
    if (variantId && (decision.quantity || line.quantity)) {
      await createMovement({
        store_id: targetStoreId,
        variant_id: variantId,
        movement_type: 'inbound',
        quantity: decision.quantity || Number(line.quantity) || 0,
        notes: `Import da ${document.document_type} ${document.document_number || document.file_name}`,
        source_document_type: 'uploaded_document',
        source_document_id: document.id,
      });
      movementsCreated++;
    }

    // Update line item with match info
    await updateLineItem(line.id, {
      matched_product_id: productId || null,
      matched_variant_id: variantId || null,
      match_status: variantId ? 'matched_existing_variant' : 'unresolved',
    });
  }

  // Create import session
  const session = await createImportSession({
    uploaded_document_id: id,
    products_created: productsCreated,
    variants_created: variantsCreated,
    variants_updated: variantsUpdated,
    movements_created: movementsCreated,
    lines_skipped: linesSkipped,
  });

  // Update document status
  await updateDocumentStatus(id, 'imported');

  // Audit
  await writeAuditLog({
    orgId,
    actorUserId: userId,
    entityType: 'document',
    entityId: id,
    action: 'import',
    payload: {
      session_id: session.id,
      products_created: productsCreated,
      variants_created: variantsCreated,
      movements_created: movementsCreated,
      lines_skipped: linesSkipped,
    },
  });

  return jsonOk({
    session,
    summary: {
      products_created: productsCreated,
      variants_created: variantsCreated,
      variants_updated: variantsUpdated,
      movements_created: movementsCreated,
      lines_skipped: linesSkipped,
    },
  });
});
