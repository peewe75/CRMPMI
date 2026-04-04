import { requireTenantContext } from '@/lib/auth/tenant';
import { createServiceClient } from '@/lib/supabase/server';
import { jsonError, jsonOk, withErrorHandler } from '@/lib/utils/api';
import {
  createProductImageRecord,
  listProductImagesWithSignedUrls,
} from '@/modules/products/application/product-images-service';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const MAX_FILE_SIZE = 12 * 1024 * 1024;

export const GET = withErrorHandler(async (
  request: Request,
  context: unknown
) => {
  const { id } = await (context as { params: Promise<{ id: string }> }).params;
  const { searchParams } = new URL(request.url);
  const variantId = searchParams.get('variant_id');
  const images = await listProductImagesWithSignedUrls({
    product_id: id,
    variant_id: variantId || null,
  });
  return jsonOk({ images });
});

export const POST = withErrorHandler(async (
  request: Request,
  context: unknown
) => {
  const { orgId } = await requireTenantContext();
  const { id } = await (context as { params: Promise<{ id: string }> }).params;
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const variantId = (formData.get('variant_id') as string | null) || null;
  const isPrimary = (formData.get('is_primary') as string | null) === 'true';

  if (!file) {
    return jsonError('file is required');
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return jsonError(`Tipo file non supportato: ${file.type}`);
  }

  if (file.size > MAX_FILE_SIZE) {
    return jsonError('File troppo grande (max 12 MB)');
  }

  const extension = file.name.split('.').pop() || 'bin';
  const uuid = crypto.randomUUID();
  const variantSegment = variantId ? `/variants/${variantId}` : '/product';
  const storagePath = `org/${orgId}/products/${id}${variantSegment}/${uuid}.${extension}`;

  const db = createServiceClient();
  const { error: uploadError } = await db.storage
    .from('product-images')
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return jsonError('Errore nel caricamento dell\'immagine');
  }

  const image = await createProductImageRecord({
    product_id: id,
    variant_id: variantId,
    file_path: storagePath,
    file_name: file.name,
    mime_type: file.type,
    is_primary: isPrimary,
  });

  return jsonOk({ image }, 201);
});
