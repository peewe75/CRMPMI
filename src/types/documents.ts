// ============================================================
// Document Parser Types — Provider-agnostic abstraction
// ============================================================

export interface ParsedDocumentHeader {
  supplier_name: string | null;
  supplier_vat_number: string | null;
  document_number: string | null;
  document_date: string | null;
  document_type: 'invoice' | 'ddt' | 'unknown';
  currency: string | null;
  totals: {
    subtotal: number | null;
    tax: number | null;
    total: number | null;
  } | null;
}

export interface ParsedDocumentLineItem {
  line_index: number;
  raw_description: string;
  normalized_description: string | null;
  supplier_code: string | null;
  barcode: string | null;
  size_raw: string | null;
  color_raw: string | null;
  quantity: number | null;
  unit_price: number | null;
  line_total: number | null;
  vat_rate: number | null;
  confidence: number | null;
}

export interface ParsedDocumentResult {
  header: ParsedDocumentHeader;
  line_items: ParsedDocumentLineItem[];
  raw_text: string;
  parser_confidence: number;
  warnings: string[];
}

export interface DocumentParserInput {
  fileUrl: string;
  mimeType: string;
  documentType?: 'invoice' | 'ddt' | 'unknown';
}

/**
 * Provider-agnostic interface for document parsing.
 * Implementations can wrap OCR providers, LLMs, or regex pipelines.
 */
export interface DocumentParser {
  readonly name: string;
  parse(input: DocumentParserInput): Promise<ParsedDocumentResult>;
}

// ---------- Matching ----------

export interface MatchResult {
  match_status: 'matched_existing_variant' | 'proposed_new_variant' | 'unresolved';
  score: number;
  reason: string;
  matched_product_id: string | null;
  matched_variant_id: string | null;
}

// ---------- Voice ----------

export interface VoiceParseResult {
  brand: string | null;
  model_name: string | null;
  size: string | null;
  color: string | null;
  quantity: number | null;
  raw_text: string;
  confidence: number;
}
