import {
  getDocument,
  getDocumentSignedUrl,
  updateDocumentStatus,
  saveLineItems,
} from '@/modules/documents/application/documents-service';
import { requireFeatureEnabled } from '@/lib/auth/feature-flags';
import { getDocumentParser } from '@/modules/documents/infrastructure/parser-registry';
import { jsonOk, jsonError, withErrorHandler } from '@/lib/utils/api';

export const POST = withErrorHandler(async (
  _request: Request,
  context: unknown
) => {
  await requireFeatureEnabled('document_import', 'import documenti');
  const { id } = await (context as { params: Promise<{ id: string }> }).params;

  const document = await getDocument(id);

  if (!['uploaded', 'failed', 'needs_review', 'parsed'].includes(document.status)) {
    return jsonError(`Documento in stato ${document.status}, non può essere ri-parsato`);
  }

  // Mark as processing
  await updateDocumentStatus(id, 'processing');

  try {
    const fileUrl = await getDocumentSignedUrl(document.file_path);
    const parser = getDocumentParser();

    const result = await parser.parse({
      fileUrl,
      mimeType: document.mime_type,
      documentType: document.document_type as 'invoice' | 'ddt' | 'unknown',
      captureType: document.capture_type ?? 'unknown',
    });

    // Save parsed data to document
    await updateDocumentStatus(id, result.warnings.length > 0 ? 'needs_review' : 'parsed', {
      raw_text: result.raw_text,
      parsed_json: result as unknown as Record<string, unknown>,
      parser_confidence: result.parser_confidence,
      supplier_name_raw: result.header.supplier_name,
      supplier_name_normalized: result.header.supplier_name,
      supplier_vat_number: result.header.supplier_vat_number,
      document_number: result.header.document_number,
      document_date: result.header.document_date,
      currency: result.header.currency,
    });

    // Save line items
    await saveLineItems(
      id,
      result.line_items.map((line) => ({
        line_index: line.line_index,
        raw_description: line.raw_description,
        normalized_description: line.normalized_description,
        supplier_code: line.supplier_code,
        barcode: line.barcode,
        size_raw: line.size_raw,
        color_raw: line.color_raw,
        quantity: line.quantity,
        unit_price: line.unit_price,
        line_total: line.line_total,
        vat_rate: line.vat_rate,
        match_status: 'unresolved' as const,
        match_score: null,
        match_reason: null,
        matched_product_id: null,
        matched_variant_id: null,
        confidence: line.confidence,
      }))
    );

    return jsonOk({
      status: result.warnings.length > 0 ? 'needs_review' : 'parsed',
      lines_count: result.line_items.length,
      warnings: result.warnings,
    });
  } catch (err) {
    await updateDocumentStatus(id, 'failed', {
      error_message: err instanceof Error ? err.message : 'Parse error',
    });
    return jsonError('Errore nel parsing del documento', 500);
  }
});
