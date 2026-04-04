'use server';

import { createServiceClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/supabase/audit';
import { requireTenantContext } from '@/lib/auth/tenant';
import type { ProductImage } from '@/types/database';

export async function listProductImages(input: {
  product_id?: string | null;
  variant_id?: string | null;
}) {
  const { orgId } = await requireTenantContext();
  const db = createServiceClient();

  let query = db
    .from('product_images')
    .select('*')
    .eq('org_id', orgId)
    .order('is_primary', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (input.product_id) {
    query = query.eq('product_id', input.product_id);
  }

  if (input.variant_id) {
    query = query.eq('variant_id', input.variant_id);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return data as ProductImage[];
}

export async function listProductImagesWithSignedUrls(input: {
  product_id?: string | null;
  variant_id?: string | null;
}) {
  const db = createServiceClient();
  const images = await listProductImages(input);

  const signed = await Promise.all(
    images.map(async (image) => {
      const { data, error } = await db.storage
        .from('product-images')
        .createSignedUrl(image.file_path, 300);

      if (error) {
        return {
          ...image,
          signed_url: null,
        };
      }

      return {
        ...image,
        signed_url: data.signedUrl,
      };
    })
  );

  return signed;
}

export async function createProductImageRecord(input: {
  product_id?: string | null;
  variant_id?: string | null;
  file_path: string;
  file_name: string;
  mime_type: string;
  is_primary?: boolean;
}) {
  const { orgId, userId } = await requireTenantContext();
  const db = createServiceClient();

  if (!input.product_id && !input.variant_id) {
    throw new Error('Forbidden: product_id or variant_id is required');
  }

  if (input.product_id) {
    await validateProductOwnership(db, orgId, input.product_id);
  }

  const variantProductId = input.variant_id ? await getProductIdFromVariant(db, orgId, input.variant_id) : null;
  const resolvedProductId = input.product_id ?? variantProductId;

  if (input.product_id && variantProductId && input.product_id !== variantProductId) {
    throw new Error('Forbidden: variant does not belong to the selected product');
  }

  if (!resolvedProductId) {
    throw new Error('Forbidden: unable to resolve product for image association');
  }

  const nextSortOrder = await getNextSortOrder(db, orgId, resolvedProductId, input.variant_id ?? null);

  if (input.is_primary) {
    await clearPrimaryFlags(db, orgId, resolvedProductId, input.variant_id ?? null);
  }

  const { data, error } = await db
    .from('product_images')
    .insert({
      org_id: orgId,
      product_id: resolvedProductId,
      variant_id: input.variant_id ?? null,
      file_path: input.file_path,
      file_name: input.file_name,
      mime_type: input.mime_type,
      is_primary: Boolean(input.is_primary),
      sort_order: nextSortOrder,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await writeAuditLog({
    orgId,
    actorUserId: userId,
    entityType: 'product_image',
    entityId: data.id,
    action: 'create',
    payload: {
      product_id: resolvedProductId,
      variant_id: input.variant_id ?? null,
      is_primary: Boolean(input.is_primary),
      file_name: input.file_name,
    },
  });

  return data as ProductImage;
}

export async function getProductImage(imageId: string) {
  const { orgId } = await requireTenantContext();
  const db = createServiceClient();

  const { data, error } = await db
    .from('product_images')
    .select('*')
    .eq('org_id', orgId)
    .eq('id', imageId)
    .single();

  if (error) throw new Error('Product image not found');
  return data as ProductImage;
}

export async function getProductImageSignedUrl(imageId: string) {
  const image = await getProductImage(imageId);
  const db = createServiceClient();

  const { data, error } = await db.storage
    .from('product-images')
    .createSignedUrl(image.file_path, 300);

  if (error) throw new Error('Could not generate product image preview URL');

  return {
    image,
    signedUrl: data.signedUrl,
  };
}

export async function deleteProductImage(imageId: string) {
  const { orgId, userId } = await requireTenantContext();
  const db = createServiceClient();
  const image = await getProductImage(imageId);

  const { error: storageError } = await db.storage
    .from('product-images')
    .remove([image.file_path]);

  if (storageError) {
    throw new Error(`Errore nella rimozione immagine: ${storageError.message}`);
  }

  const { error } = await db
    .from('product_images')
    .delete()
    .eq('org_id', orgId)
    .eq('id', imageId);

  if (error) throw new Error(error.message);

  await normalizeSortOrder(db, orgId, image.product_id, image.variant_id);

  await writeAuditLog({
    orgId,
    actorUserId: userId,
    entityType: 'product_image',
    entityId: imageId,
    action: 'delete',
    payload: {
      product_id: image.product_id,
      variant_id: image.variant_id,
      file_name: image.file_name,
    },
  });

  return image;
}

export async function setPrimaryProductImage(imageId: string) {
  const { orgId, userId } = await requireTenantContext();
  const db = createServiceClient();
  const image = await getProductImage(imageId);

  await clearPrimaryFlags(db, orgId, image.product_id, image.variant_id);

  const { data, error } = await db
    .from('product_images')
    .update({ is_primary: true })
    .eq('org_id', orgId)
    .eq('id', imageId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await writeAuditLog({
    orgId,
    actorUserId: userId,
    entityType: 'product_image',
    entityId: imageId,
    action: 'update',
    payload: {
      product_id: image.product_id,
      variant_id: image.variant_id,
      is_primary: true,
    },
  });

  return data as ProductImage;
}

async function getProductIdFromVariant(
  db: ReturnType<typeof createServiceClient>,
  orgId: string,
  variantId: string
) {
  const { data, error } = await db
    .from('product_variants')
    .select('product_id')
    .eq('org_id', orgId)
    .eq('id', variantId)
    .single();

  if (error || !data) {
    throw new Error('Forbidden: variant not found for image association');
  }

  return data.product_id as string;
}

async function validateProductOwnership(
  db: ReturnType<typeof createServiceClient>,
  orgId: string,
  productId: string
) {
  const { data, error } = await db
    .from('products')
    .select('id')
    .eq('org_id', orgId)
    .eq('id', productId)
    .single();

  if (error || !data) {
    throw new Error('Forbidden: product not found in active tenant');
  }
}

async function getNextSortOrder(
  db: ReturnType<typeof createServiceClient>,
  orgId: string,
  productId: string,
  variantId: string | null
) {
  let query = db
    .from('product_images')
    .select('sort_order')
    .eq('org_id', orgId)
    .eq('product_id', productId)
    .order('sort_order', { ascending: false })
    .limit(1);

  if (variantId) {
    query = query.eq('variant_id', variantId);
  } else {
    query = query.is('variant_id', null);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);

  return data ? Number(data.sort_order) + 1 : 0;
}

async function clearPrimaryFlags(
  db: ReturnType<typeof createServiceClient>,
  orgId: string,
  productId: string | null,
  variantId: string | null
) {
  let query = db
    .from('product_images')
    .update({ is_primary: false })
    .eq('org_id', orgId);

  if (variantId) {
    query = query.eq('variant_id', variantId);
  } else if (productId) {
    query = query.eq('product_id', productId).is('variant_id', null);
  }

  const { error } = await query;
  if (error) throw new Error(error.message);
}

async function normalizeSortOrder(
  db: ReturnType<typeof createServiceClient>,
  orgId: string,
  productId: string | null,
  variantId: string | null
) {
  if (!productId) return;

  let query = db
    .from('product_images')
    .select('id')
    .eq('org_id', orgId)
    .eq('product_id', productId)
    .order('is_primary', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (variantId) {
    query = query.eq('variant_id', variantId);
  } else {
    query = query.is('variant_id', null);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  for (const [index, image] of (data ?? []).entries()) {
    await db
      .from('product_images')
      .update({ sort_order: index })
      .eq('org_id', orgId)
      .eq('id', image.id);
  }
}
