import { requireTenantContext } from '@/lib/auth/tenant';
import { createServiceClient } from '@/lib/supabase/server';
import { createDocumentRecord } from '@/modules/documents/application/documents-service';
import { jsonOk, jsonError, withErrorHandler } from '@/lib/utils/api';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export const POST = withErrorHandler(async (request: Request) => {
  const { orgId } = await requireTenantContext();

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const documentType = (formData.get('document_type') as string) || 'unknown';
  const storeId = formData.get('store_id') as string | null;

  if (!file) {
    return jsonError('file is required');
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return jsonError(`Tipo file non supportato: ${file.type}`);
  }

  if (file.size > MAX_FILE_SIZE) {
    return jsonError('File troppo grande (max 20 MB)');
  }

  // Generate non-predictable storage path
  const ext = file.name.split('.').pop() || 'bin';
  const uuid = crypto.randomUUID();
  const storagePath = `org/${orgId}/documents/${uuid}.${ext}`;

  // Upload to Supabase Storage private bucket
  const db = createServiceClient();
  const { error: uploadError } = await db.storage
    .from('documents')
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error('[Upload Error]', uploadError);
    return jsonError('Errore nel caricamento del file');
  }

  // Create DB record
  const document = await createDocumentRecord({
    file_path: storagePath,
    file_name: file.name,
    mime_type: file.type,
    file_size: file.size,
    document_type: documentType as 'invoice' | 'ddt' | 'unknown',
    store_id: storeId || undefined,
  });

  return jsonOk({ document }, 201);
});
