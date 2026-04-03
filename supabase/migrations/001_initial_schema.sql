-- ============================================================
-- CRM Negozi — Initial Schema
-- Multi-tenant SaaS for fashion retail stores
-- ============================================================

-- ============================================================
-- HELPER: get current org_id from request header
-- Clerk org_id is passed via x-org-id header or JWT claim
-- ============================================================
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'org_id',
    current_setting('request.headers', true)::json->>'x-org-id',
    ''
  );
$$;

-- ============================================================
-- STORES
-- ============================================================
CREATE TABLE public.stores (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      text NOT NULL,
  name        text NOT NULL,
  address     text,
  phone       text,
  is_default  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_stores_org ON public.stores(org_id);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE public.products (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          text NOT NULL,
  brand           text NOT NULL,
  model_name      text NOT NULL,
  category        text NOT NULL DEFAULT 'general',
  supplier_name   text,
  season          text,
  gender          text CHECK (gender IN ('M', 'F', 'U')),
  notes           text,
  archived        boolean NOT NULL DEFAULT false,
  created_by      text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_org ON public.products(org_id);
CREATE INDEX idx_products_brand ON public.products(org_id, brand);
CREATE INDEX idx_products_search ON public.products(org_id, brand, model_name, category);

-- ============================================================
-- PRODUCT VARIANTS
-- ============================================================
CREATE TABLE public.product_variants (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          text NOT NULL,
  product_id      uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku_internal    text,
  sku_supplier    text,
  barcode         text,
  size            text NOT NULL,
  color           text NOT NULL,
  cost_price      numeric(10,2),
  sale_price      numeric(10,2),
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (org_id, product_id, size, color)
);

CREATE INDEX idx_variants_org ON public.product_variants(org_id);
CREATE INDEX idx_variants_product ON public.product_variants(product_id);
CREATE INDEX idx_variants_barcode ON public.product_variants(org_id, barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_variants_sku_supplier ON public.product_variants(org_id, sku_supplier) WHERE sku_supplier IS NOT NULL;

-- ============================================================
-- INVENTORY MOVEMENTS
-- ============================================================
CREATE TABLE public.inventory_movements (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                text NOT NULL,
  store_id              uuid NOT NULL REFERENCES public.stores(id),
  variant_id            uuid NOT NULL REFERENCES public.product_variants(id),
  movement_type         text NOT NULL CHECK (movement_type IN ('inbound', 'outbound', 'adjustment', 'transfer')),
  quantity              numeric(10,2) NOT NULL,
  notes                 text,
  source_document_type  text,
  source_document_id    uuid,
  created_by            text NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_movements_org ON public.inventory_movements(org_id);
CREATE INDEX idx_movements_variant ON public.inventory_movements(variant_id);
CREATE INDEX idx_movements_store ON public.inventory_movements(store_id);
CREATE INDEX idx_movements_source ON public.inventory_movements(source_document_id) WHERE source_document_id IS NOT NULL;

-- ============================================================
-- STOCK LEVELS (materialized view approach via table + trigger)
-- Using a table for fast lookups with trigger-based updates
-- ============================================================
CREATE TABLE public.stock_levels (
  org_id      text NOT NULL,
  store_id    uuid NOT NULL REFERENCES public.stores(id),
  variant_id  uuid NOT NULL REFERENCES public.product_variants(id),
  quantity    numeric(10,2) NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (store_id, variant_id)
);

CREATE INDEX idx_stock_org ON public.stock_levels(org_id);
CREATE INDEX idx_stock_variant ON public.stock_levels(variant_id);

-- Trigger function to update stock levels on movement insert
CREATE OR REPLACE FUNCTION public.update_stock_on_movement()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  qty_delta numeric;
BEGIN
  -- Determine delta based on movement type
  CASE NEW.movement_type
    WHEN 'inbound' THEN qty_delta := NEW.quantity;
    WHEN 'outbound' THEN qty_delta := -NEW.quantity;
    WHEN 'adjustment' THEN qty_delta := NEW.quantity; -- can be negative
    WHEN 'transfer' THEN qty_delta := -NEW.quantity;  -- source store
    ELSE qty_delta := 0;
  END CASE;

  INSERT INTO public.stock_levels (org_id, store_id, variant_id, quantity, updated_at)
  VALUES (NEW.org_id, NEW.store_id, NEW.variant_id, qty_delta, now())
  ON CONFLICT (store_id, variant_id)
  DO UPDATE SET
    quantity = public.stock_levels.quantity + qty_delta,
    updated_at = now();

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_movement_stock
  AFTER INSERT ON public.inventory_movements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_stock_on_movement();

-- ============================================================
-- UPLOADED DOCUMENTS
-- ============================================================
CREATE TABLE public.uploaded_documents (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                    text NOT NULL,
  store_id                  uuid REFERENCES public.stores(id),
  uploaded_by               text NOT NULL,
  file_path                 text NOT NULL,
  file_name                 text NOT NULL,
  mime_type                 text NOT NULL,
  file_size                 bigint,
  document_type             text NOT NULL DEFAULT 'unknown' CHECK (document_type IN ('invoice', 'ddt', 'unknown')),
  supplier_name_raw         text,
  supplier_name_normalized  text,
  supplier_vat_number       text,
  document_number           text,
  document_date             date,
  currency                  text DEFAULT 'EUR',
  raw_text                  text,
  parsed_json               jsonb,
  status                    text NOT NULL DEFAULT 'uploaded'
                            CHECK (status IN ('uploaded', 'processing', 'parsed', 'needs_review', 'approved', 'imported', 'failed')),
  parser_confidence         numeric(5,4),
  error_message             text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_docs_org ON public.uploaded_documents(org_id);
CREATE INDEX idx_docs_status ON public.uploaded_documents(org_id, status);

-- ============================================================
-- DOCUMENT LINE ITEMS
-- ============================================================
CREATE TABLE public.document_line_items (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  text NOT NULL,
  uploaded_document_id    uuid NOT NULL REFERENCES public.uploaded_documents(id) ON DELETE CASCADE,
  line_index              integer NOT NULL,
  raw_description         text NOT NULL,
  normalized_description  text,
  supplier_code           text,
  barcode                 text,
  size_raw                text,
  color_raw               text,
  quantity                numeric(10,2),
  unit_price              numeric(10,2),
  line_total              numeric(10,2),
  vat_rate                numeric(5,2),
  matched_product_id      uuid REFERENCES public.products(id),
  matched_variant_id      uuid REFERENCES public.product_variants(id),
  match_status            text NOT NULL DEFAULT 'unresolved'
                          CHECK (match_status IN ('matched_existing_variant', 'proposed_new_variant', 'unresolved', 'skipped')),
  match_score             numeric(5,4),
  match_reason            text,
  confidence              numeric(5,4),
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_line_items_doc ON public.document_line_items(uploaded_document_id);
CREATE INDEX idx_line_items_org ON public.document_line_items(org_id);

-- ============================================================
-- DOCUMENT IMPORT SESSIONS
-- ============================================================
CREATE TABLE public.document_import_sessions (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  text NOT NULL,
  uploaded_document_id    uuid NOT NULL REFERENCES public.uploaded_documents(id),
  imported_by             text NOT NULL,
  products_created        integer NOT NULL DEFAULT 0,
  variants_created        integer NOT NULL DEFAULT 0,
  variants_updated        integer NOT NULL DEFAULT 0,
  movements_created       integer NOT NULL DEFAULT 0,
  lines_skipped           integer NOT NULL DEFAULT 0,
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_import_sessions_org ON public.document_import_sessions(org_id);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE public.audit_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          text NOT NULL,
  actor_user_id   text NOT NULL,
  entity_type     text NOT NULL,
  entity_id       text NOT NULL,
  action          text NOT NULL,
  payload         jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_org ON public.audit_logs(org_id);
CREATE INDEX idx_audit_entity ON public.audit_logs(org_id, entity_type, entity_id);
CREATE INDEX idx_audit_created ON public.audit_logs(org_id, created_at DESC);

-- ============================================================
-- TENANT BILLING (placeholder)
-- ============================================================
CREATE TABLE public.tenant_billing (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                text NOT NULL UNIQUE,
  plan                  text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro')),
  status                text NOT NULL DEFAULT 'trialing' CHECK (status IN ('active', 'trialing', 'past_due', 'canceled')),
  max_products          integer NOT NULL DEFAULT 50,
  max_documents_month   integer NOT NULL DEFAULT 5,
  current_period_end    timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- updated_at trigger helper
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply updated_at triggers
CREATE TRIGGER trg_stores_updated BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_variants_updated BEFORE UPDATE ON public.product_variants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_docs_updated BEFORE UPDATE ON public.uploaded_documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_line_items_updated BEFORE UPDATE ON public.document_line_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_billing_updated BEFORE UPDATE ON public.tenant_billing FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
