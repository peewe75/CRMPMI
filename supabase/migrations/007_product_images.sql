-- ============================================================
-- Product Images
-- ============================================================

CREATE TABLE public.product_images (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        text NOT NULL,
  product_id    uuid REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id    uuid REFERENCES public.product_variants(id) ON DELETE CASCADE,
  file_path     text NOT NULL,
  file_name     text NOT NULL,
  mime_type     text NOT NULL,
  is_primary    boolean NOT NULL DEFAULT false,
  sort_order    integer NOT NULL DEFAULT 0,
  created_by    text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_images_owner_check CHECK (
    product_id IS NOT NULL OR variant_id IS NOT NULL
  )
);

CREATE INDEX idx_product_images_org ON public.product_images(org_id, created_at DESC);
CREATE INDEX idx_product_images_product ON public.product_images(org_id, product_id, sort_order);
CREATE INDEX idx_product_images_variant ON public.product_images(org_id, variant_id, sort_order);
CREATE UNIQUE INDEX idx_product_images_primary_product
  ON public.product_images(org_id, product_id)
  WHERE product_id IS NOT NULL AND is_primary = true;
CREATE UNIQUE INDEX idx_product_images_primary_variant
  ON public.product_images(org_id, variant_id)
  WHERE variant_id IS NOT NULL AND is_primary = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', false)
ON CONFLICT (id) DO NOTHING;
