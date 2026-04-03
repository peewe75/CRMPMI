-- ============================================================
-- CRM Negozi — RLS Policies
-- ============================================================
-- Strategy:
--   - All business tables use org_id for tenant isolation
--   - The current_org_id() function reads org_id from JWT claims
--     or request headers (set by the application layer)
--   - Service role bypasses RLS (used by server-side operations)
--   - Anon/authenticated roles are restricted by these policies
-- ============================================================

-- Enable RLS on all tenant-aware tables
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploaded_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_import_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_billing ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STORES
-- ============================================================
CREATE POLICY stores_select ON public.stores
  FOR SELECT USING (org_id = public.current_org_id());

CREATE POLICY stores_insert ON public.stores
  FOR INSERT WITH CHECK (org_id = public.current_org_id());

CREATE POLICY stores_update ON public.stores
  FOR UPDATE USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

CREATE POLICY stores_delete ON public.stores
  FOR DELETE USING (org_id = public.current_org_id());

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE POLICY products_select ON public.products
  FOR SELECT USING (org_id = public.current_org_id());

CREATE POLICY products_insert ON public.products
  FOR INSERT WITH CHECK (org_id = public.current_org_id());

CREATE POLICY products_update ON public.products
  FOR UPDATE USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

CREATE POLICY products_delete ON public.products
  FOR DELETE USING (org_id = public.current_org_id());

-- ============================================================
-- PRODUCT VARIANTS
-- ============================================================
CREATE POLICY variants_select ON public.product_variants
  FOR SELECT USING (org_id = public.current_org_id());

CREATE POLICY variants_insert ON public.product_variants
  FOR INSERT WITH CHECK (org_id = public.current_org_id());

CREATE POLICY variants_update ON public.product_variants
  FOR UPDATE USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

CREATE POLICY variants_delete ON public.product_variants
  FOR DELETE USING (org_id = public.current_org_id());

-- ============================================================
-- INVENTORY MOVEMENTS
-- ============================================================
CREATE POLICY movements_select ON public.inventory_movements
  FOR SELECT USING (org_id = public.current_org_id());

CREATE POLICY movements_insert ON public.inventory_movements
  FOR INSERT WITH CHECK (org_id = public.current_org_id());

-- Movements are append-only: no update or delete
-- If corrections needed, use an 'adjustment' movement

-- ============================================================
-- STOCK LEVELS
-- ============================================================
CREATE POLICY stock_select ON public.stock_levels
  FOR SELECT USING (org_id = public.current_org_id());

-- Stock levels are managed by trigger only, not by direct writes
-- Service role handles inserts/updates via the trigger

-- ============================================================
-- UPLOADED DOCUMENTS
-- ============================================================
CREATE POLICY docs_select ON public.uploaded_documents
  FOR SELECT USING (org_id = public.current_org_id());

CREATE POLICY docs_insert ON public.uploaded_documents
  FOR INSERT WITH CHECK (org_id = public.current_org_id());

CREATE POLICY docs_update ON public.uploaded_documents
  FOR UPDATE USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

-- ============================================================
-- DOCUMENT LINE ITEMS
-- ============================================================
CREATE POLICY line_items_select ON public.document_line_items
  FOR SELECT USING (org_id = public.current_org_id());

CREATE POLICY line_items_insert ON public.document_line_items
  FOR INSERT WITH CHECK (org_id = public.current_org_id());

CREATE POLICY line_items_update ON public.document_line_items
  FOR UPDATE USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

-- ============================================================
-- DOCUMENT IMPORT SESSIONS
-- ============================================================
CREATE POLICY import_sessions_select ON public.document_import_sessions
  FOR SELECT USING (org_id = public.current_org_id());

CREATE POLICY import_sessions_insert ON public.document_import_sessions
  FOR INSERT WITH CHECK (org_id = public.current_org_id());

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE POLICY audit_select ON public.audit_logs
  FOR SELECT USING (org_id = public.current_org_id());

CREATE POLICY audit_insert ON public.audit_logs
  FOR INSERT WITH CHECK (org_id = public.current_org_id());

-- Audit logs are append-only: no update or delete

-- ============================================================
-- TENANT BILLING
-- ============================================================
CREATE POLICY billing_select ON public.tenant_billing
  FOR SELECT USING (org_id = public.current_org_id());

-- Billing updates handled by service role only (webhooks)
