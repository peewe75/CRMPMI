-- ============================================================
-- CRM Negozi - Document capture metadata
-- ============================================================

ALTER TABLE public.uploaded_documents
  ADD COLUMN IF NOT EXISTS source_channel text
    CHECK (source_channel IN ('upload', 'camera', 'gmail', 'manual')),
  ADD COLUMN IF NOT EXISTS capture_type text
    CHECK (capture_type IN ('pdf_document', 'printed_document_photo', 'handwritten_note', 'mixed_document', 'unknown')),
  ADD COLUMN IF NOT EXISTS requires_review boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_uploaded_documents_capture
  ON public.uploaded_documents(org_id, capture_type, status);
