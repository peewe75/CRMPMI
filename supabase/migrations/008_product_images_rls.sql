-- ============================================================
-- Product Images RLS
-- ============================================================

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY product_images_select ON public.product_images
  FOR SELECT USING (org_id = public.current_org_id());

CREATE POLICY product_images_insert ON public.product_images
  FOR INSERT WITH CHECK (org_id = public.current_org_id());

CREATE POLICY product_images_update ON public.product_images
  FOR UPDATE USING (org_id = public.current_org_id())
  WITH CHECK (org_id = public.current_org_id());

CREATE POLICY product_images_delete ON public.product_images
  FOR DELETE USING (org_id = public.current_org_id());

CREATE POLICY product_images_storage_select ON storage.objects
  FOR SELECT USING (
    bucket_id = 'product-images'
    AND name LIKE 'org/' || public.current_org_id() || '/%'
  );

CREATE POLICY product_images_storage_insert ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'product-images'
    AND name LIKE 'org/' || public.current_org_id() || '/%'
  );

CREATE POLICY product_images_storage_update ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'product-images'
    AND name LIKE 'org/' || public.current_org_id() || '/%'
  )
  WITH CHECK (
    bucket_id = 'product-images'
    AND name LIKE 'org/' || public.current_org_id() || '/%'
  );

CREATE POLICY product_images_storage_delete ON storage.objects
  FOR DELETE USING (
    bucket_id = 'product-images'
    AND name LIKE 'org/' || public.current_org_id() || '/%'
  );
