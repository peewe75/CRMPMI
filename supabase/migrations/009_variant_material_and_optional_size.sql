-- ============================================================
-- Variants refactor: commercial variant + optional size
-- Color/material identify the commercial variant.
-- Size becomes an optional stock dimension.
-- ============================================================

ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS material text;

ALTER TABLE public.product_variants
  ALTER COLUMN size DROP NOT NULL;

ALTER TABLE public.product_variants
  ALTER COLUMN color SET DEFAULT 'Standard';

UPDATE public.product_variants
SET color = 'Standard'
WHERE color IS NULL OR btrim(color) = '';

ALTER TABLE public.product_variants
  DROP CONSTRAINT IF EXISTS product_variants_org_id_product_id_size_color_key;

DROP INDEX IF EXISTS public.idx_variants_identity_unique;

CREATE UNIQUE INDEX idx_variants_identity_unique
ON public.product_variants (
  org_id,
  product_id,
  lower(coalesce(color, 'standard')),
  lower(coalesce(material, '')),
  lower(coalesce(size, ''))
);

CREATE INDEX IF NOT EXISTS idx_variants_material
ON public.product_variants (org_id, material)
WHERE material IS NOT NULL;
