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
  material_raw?: string | null;
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
  captureType?: 'pdf_document' | 'printed_document_photo' | 'handwritten_note' | 'mixed_document' | 'unknown';
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
  raw_text: string;
  normalized_text: string;
  intent: VoiceIntent;
  confidence: number;
  needs_review: boolean;
  command: {
    intent: VoiceIntent;
    confidence: number;
    subject_text: string;
    warnings: string[];
    items: VoiceCommandItem[];
  };
  lookup_result?: VoiceLookupResponse | null;
}

export type VoiceIntent =
  | 'inventory_inbound'
  | 'inventory_outbound'
  | 'inventory_adjustment'
  | 'stock_lookup'
  | 'product_search';

export interface VoiceCommandItem {
  line_index: number;
  brand: string | null;
  model_name: string | null;
  size: string | null;
  color: string | null;
  material: string | null;
  quantity: number | null;
  quantity_delta: number | null;
  raw_description: string;
  confidence: number;
  match_status?: 'matched' | 'weak_match' | 'unmatched';
  matched_product_id?: string | null;
  matched_variant_id?: string | null;
  match_score?: number | null;
  matched_label?: string | null;
}

export interface VoiceLookupMatch {
  variant_id: string;
  product_id: string;
  brand: string;
  model_name: string;
  size: string | null;
  color: string;
  material?: string | null;
  quantity: number;
  similarity: number;
  exact: boolean;
}

export interface VoiceLookupResponse {
  exact_matches: VoiceLookupMatch[];
  similar_matches: VoiceLookupMatch[];
  summary: string;
}
