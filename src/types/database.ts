// ============================================================
// CRM Negozi — Core Database Types
// These types mirror the Supabase schema exactly.
// ============================================================

// ---------- Enums / Unions ----------

export type UserRole = 'owner' | 'manager' | 'staff';

export type Gender = 'M' | 'F' | 'U'; // male, female, unisex

export type MovementType = 'inbound' | 'outbound' | 'adjustment' | 'transfer';

export type DocumentType = 'invoice' | 'ddt' | 'unknown';

export type DocumentStatus =
  | 'uploaded'
  | 'processing'
  | 'parsed'
  | 'needs_review'
  | 'approved'
  | 'imported'
  | 'failed';

export type LineMatchStatus =
  | 'matched_existing_variant'
  | 'proposed_new_variant'
  | 'unresolved'
  | 'skipped';

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'archive'
  | 'import'
  | 'movement';

// ---------- Base ----------

export interface Store {
  id: string;
  org_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// ---------- Catalog ----------

export interface Product {
  id: string;
  org_id: string;
  brand: string;
  model_name: string;
  category: string;
  supplier_name: string | null;
  season: string | null;
  gender: Gender | null;
  notes: string | null;
  archived: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: string;
  org_id: string;
  product_id: string;
  sku_internal: string | null;
  sku_supplier: string | null;
  barcode: string | null;
  size: string;
  color: string;
  cost_price: number | null;
  sale_price: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// ---------- Inventory ----------

export interface InventoryMovement {
  id: string;
  org_id: string;
  store_id: string;
  variant_id: string;
  movement_type: MovementType;
  quantity: number;
  notes: string | null;
  source_document_type: string | null;
  source_document_id: string | null;
  created_by: string;
  created_at: string;
}

export interface StockLevel {
  org_id: string;
  store_id: string;
  variant_id: string;
  quantity: number;
}

// ---------- Documents ----------

export interface UploadedDocument {
  id: string;
  org_id: string;
  store_id: string | null;
  uploaded_by: string;
  file_path: string;
  file_name: string;
  mime_type: string;
  file_size: number | null;
  document_type: DocumentType;
  supplier_name_raw: string | null;
  supplier_name_normalized: string | null;
  supplier_vat_number: string | null;
  document_number: string | null;
  document_date: string | null;
  currency: string | null;
  raw_text: string | null;
  parsed_json: Record<string, unknown> | null;
  status: DocumentStatus;
  parser_confidence: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentLineItem {
  id: string;
  org_id: string;
  uploaded_document_id: string;
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
  matched_product_id: string | null;
  matched_variant_id: string | null;
  match_status: LineMatchStatus;
  match_score: number | null;
  match_reason: string | null;
  confidence: number | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentImportSession {
  id: string;
  org_id: string;
  uploaded_document_id: string;
  imported_by: string;
  products_created: number;
  variants_created: number;
  variants_updated: number;
  movements_created: number;
  lines_skipped: number;
  created_at: string;
}

// ---------- Audit ----------

export interface AuditLog {
  id: string;
  org_id: string;
  actor_user_id: string;
  entity_type: string;
  entity_id: string;
  action: AuditAction;
  payload: Record<string, unknown>;
  created_at: string;
}

// ---------- Billing (placeholder) ----------

export interface TenantBilling {
  id: string;
  org_id: string;
  plan: 'free' | 'starter' | 'pro';
  status: 'active' | 'trialing' | 'past_due' | 'canceled';
  max_products: number;
  max_documents_month: number;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

// ---------- Feature Flags ----------

export interface FeatureFlags {
  voice_input: boolean;
  document_import: boolean;
  barcode_scan: boolean;
  multi_store: boolean;
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  voice_input: true,
  document_import: true,
  barcode_scan: true,
  multi_store: false,
};

export const PLAN_LIMITS: Record<TenantBilling['plan'], { max_products: number; max_documents_month: number }> = {
  free: { max_products: 50, max_documents_month: 5 },
  starter: { max_products: 500, max_documents_month: 50 },
  pro: { max_products: 10000, max_documents_month: 500 },
};
