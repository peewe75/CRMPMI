import { requireTenantContext } from '@/lib/auth/tenant';
import { createServiceClient } from '@/lib/supabase/server';
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
  product_group_key?: string;
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
  db: ReturnType<typeof createServiceClient>,
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
  db: ReturnType<typeof createServiceClient>,
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
  db: ReturnType<typeof createServiceClient>,
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

async function buildAutomaticDecisions(
  db: ReturnType<typeof createServiceClient>,
  orgId: string,
  supplierName: string | null,
  lines: Awaited<ReturnType<typeof getDocumentWithLines>>['lines']
): Promise<LineDecision[]> {
  const existingProductByGroup = new Map<string, string>();

  const decisions = await Promise.all(
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

  return decisions;
}

export const POST = withErrorHandler(async (
  request: Request,
  context: unknown
) => {
  const { orgId, userId } = await requireTenantContext();
  const db = createServiceClient();
  const { id } = await (context as { params: Promise<{ id: string }> }).params;

  const rawBody = await request.text();
  const body = rawBody ? JSON.parse(rawBody) : {};
  const { decisions, store_id } = body as { decisions?: LineDecision[]; store_id?: string };

  const { document, lines } = await getDocumentWithLines(id);

  if (!['parsed', 'needs_review', 'approved'].includes(document.status)) {
    return jsonError(`Documento in stato ${document.status}, non importabile`);
  }

  if (lines.length === 0) {
    return jsonError('Nessuna riga disponibile da importare');
  }

  const decisionsToApply =
    decisions?.length
      ? decisions
      : await buildAutomaticDecisions(db, orgId, document.supplier_name_raw, lines);

  const defaultStore = await getOrCreateDefaultStore();
  const targetStoreId = store_id || defaultStore.id;
  const createdProductIdsByGroupKey = new Map<string, string>();

  let productsCreated = 0;
  let variantsCreated = 0;
  let variantsUpdated = 0;
  let movementsCreated = 0;
  let linesSkipped = 0;

  for (const decision of decisionsToApply) {
    const line = lines.find((l) => l.id === decision.line_id);
    if (!line) continue;

    if (decision.action === 'skip') {
      await updateLineItem(line.id, { match_status: 'skipped' });
      linesSkipped++;
      continue;
    }

    let variantId: string | undefined;
    let productId: string | undefined;
    let matchStatus: 'matched_existing_variant' | 'proposed_new_variant' | 'unresolved' = 'unresolved';

    if (decision.action === 'create_product') {
      const productGroupKey = decision.product_group_key
        ?? normalizeGroupKey(decision.model_name || line.normalized_description || line.raw_description);
      const alreadyCreatedProductId = createdProductIdsByGroupKey.get(productGroupKey);

      if (alreadyCreatedProductId) {
        productId = alreadyCreatedProductId;
      } else {
        const product = await createProduct({
          brand: decision.brand || inferBrand(document.supplier_name_raw, line.raw_description),
          model_name: decision.model_name || line.normalized_description || line.raw_description,
          category: decision.category || inferCategory(line.raw_description),
          supplier_name: document.supplier_name_raw || undefined,
        });
        productId = product.id;
        createdProductIdsByGroupKey.set(productGroupKey, product.id);
        productsCreated++;
      }

      const variant = await createVariant({
        product_id: productId,
        size: decision.size || line.size_raw || 'N/A',
        color: decision.color || line.color_raw || 'N/A',
        barcode: line.barcode || undefined,
        sku_supplier: line.supplier_code || undefined,
        cost_price: decision.cost_price ?? (line.unit_price ? Number(line.unit_price) : undefined),
      });
      variantId = variant.id;
      variantsCreated++;
      matchStatus = 'proposed_new_variant';
    } else if (decision.action === 'create_variant') {
      if (!decision.matched_product_id) {
        throw new Error(`Linea ${line.id}: prodotto di destinazione mancante per la creazione variante`);
      }

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
      matchStatus = 'proposed_new_variant';
    } else if (decision.action === 'link_existing') {
      if (!decision.matched_product_id || !decision.matched_variant_id) {
        throw new Error(`Linea ${line.id}: collegamento incompleto verso prodotto o variante esistente`);
      }

      variantId = decision.matched_variant_id;
      productId = decision.matched_product_id;
      variantsUpdated++;
      matchStatus = 'matched_existing_variant';
    }

    const movementQuantity = decision.quantity ?? line.quantity ?? 0;

    // Create inbound movement if we have a variant and a positive quantity.
    if (variantId && movementQuantity > 0) {
      await createMovement({
        store_id: targetStoreId,
        variant_id: variantId,
        movement_type: 'inbound',
        quantity: movementQuantity,
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
      match_status: matchStatus,
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
  await updateDocumentStatus(id, 'imported', { error_message: null });

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
      decisions_used: decisionsToApply.length,
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
