-- ============================================================
-- CRM Negozi - Inventory Proposals
-- Unifies multimodal or low-confidence inputs before stock writes
-- ============================================================

ALTER TABLE public.inventory_movements
  ADD COLUMN IF NOT EXISTS source_proposal_id uuid;

CREATE INDEX IF NOT EXISTS idx_movements_source_proposal
  ON public.inventory_movements(source_proposal_id)
  WHERE source_proposal_id IS NOT NULL;

CREATE TABLE public.inventory_proposals (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                    text NOT NULL,
  source_type               text NOT NULL
                            CHECK (source_type IN ('voice', 'document', 'handwritten_photo', 'gmail_attachment', 'manual')),
  proposal_type             text NOT NULL
                            CHECK (proposal_type IN ('inbound', 'outbound', 'adjustment', 'lookup')),
  status                    text NOT NULL DEFAULT 'pending_review'
                            CHECK (status IN ('pending_review', 'approved', 'rejected', 'applied')),
  target_store_id           uuid REFERENCES public.stores(id),
  raw_input                 text,
  parsed_json               jsonb,
  confidence                numeric(5,4),
  source_metadata           jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_document_id        uuid,
  source_uploaded_document_id uuid REFERENCES public.uploaded_documents(id) ON DELETE SET NULL,
  source_email_ingestion_id uuid,
  created_by                text,
  approved_by               text,
  rejected_by               text,
  applied_by                text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  approved_at               timestamptz,
  rejected_at               timestamptz,
  applied_at                timestamptz,
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_proposals_org
  ON public.inventory_proposals(org_id);

CREATE INDEX idx_inventory_proposals_status
  ON public.inventory_proposals(org_id, status, created_at DESC);

CREATE INDEX idx_inventory_proposals_source
  ON public.inventory_proposals(org_id, source_type, proposal_type);

CREATE INDEX idx_inventory_proposals_uploaded_document
  ON public.inventory_proposals(source_uploaded_document_id)
  WHERE source_uploaded_document_id IS NOT NULL;

CREATE TABLE public.inventory_proposal_items (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                text NOT NULL,
  proposal_id           uuid NOT NULL REFERENCES public.inventory_proposals(id) ON DELETE CASCADE,
  line_index            integer NOT NULL DEFAULT 0,
  raw_description       text,
  matched_product_id    uuid REFERENCES public.products(id) ON DELETE SET NULL,
  matched_variant_id    uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  interpreted_action    text
                        CHECK (interpreted_action IN ('inbound', 'outbound', 'adjustment', 'lookup')),
  quantity              numeric(10,2),
  size_raw              text,
  color_raw             text,
  match_score           numeric(5,4),
  confidence            numeric(5,4),
  status                text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'matched', 'unmatched', 'applied', 'rejected', 'skipped')),
  payload               jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_proposal_items_org
  ON public.inventory_proposal_items(org_id);

CREATE INDEX idx_inventory_proposal_items_proposal
  ON public.inventory_proposal_items(proposal_id, line_index);

CREATE INDEX idx_inventory_proposal_items_variant
  ON public.inventory_proposal_items(matched_variant_id)
  WHERE matched_variant_id IS NOT NULL;

ALTER TABLE public.inventory_movements
  ADD CONSTRAINT fk_inventory_movements_source_proposal
  FOREIGN KEY (source_proposal_id)
  REFERENCES public.inventory_proposals(id)
  ON DELETE SET NULL;

CREATE TRIGGER trg_inventory_proposals_updated
  BEFORE UPDATE ON public.inventory_proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_inventory_proposal_items_updated
  BEFORE UPDATE ON public.inventory_proposal_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
