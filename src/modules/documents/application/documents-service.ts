'use server';

import { createServiceClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/supabase/audit';
import { requireTenantContext } from '@/lib/auth/tenant';
import type {
  DocumentCaptureType,
  DocumentLineItem,
  DocumentImportSession,
  DocumentSourceChannel,
  UploadedDocument,
} from '@/types/database';

// ---------- Upload ----------

export async function createDocumentRecord(input: {
  file_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  document_type?: 'invoice' | 'ddt' | 'unknown';
  store_id?: string;
  source_channel?: DocumentSourceChannel;
  capture_type?: DocumentCaptureType;
  requires_review?: boolean;
}) {
  const { orgId, userId } = await requireTenantContext();
  const db = createServiceClient();

  const { data, error } = await db
    .from('uploaded_documents')
    .insert({
      org_id: orgId,
      uploaded_by: userId,
      file_path: input.file_path,
      file_name: input.file_name,
      mime_type: input.mime_type,
      file_size: input.file_size,
      document_type: input.document_type ?? 'unknown',
      store_id: input.store_id || null,
      source_channel: input.source_channel ?? 'upload',
      capture_type: input.capture_type ?? inferCaptureType(input.mime_type),
      requires_review: input.requires_review ?? true,
      status: 'uploaded',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await writeAuditLog({
    orgId,
    actorUserId: userId,
    entityType: 'document',
    entityId: data.id,
    action: 'create',
    payload: {
      file_name: input.file_name,
      document_type: input.document_type,
      source_channel: input.source_channel ?? 'upload',
      capture_type: input.capture_type ?? inferCaptureType(input.mime_type),
    },
  });

  return data as UploadedDocument;
}

// ---------- List / Get ----------

export async function listDocuments(filters?: {
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const { orgId } = await requireTenantContext();
  const db = createServiceClient();

  let query = db
    .from('uploaded_documents')
    .select('*', { count: 'exact' })
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .range(filters?.offset ?? 0, (filters?.offset ?? 0) + (filters?.limit ?? 50) - 1);

  if (filters?.status) query = query.eq('status', filters.status);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return { documents: data as UploadedDocument[], total: count ?? 0 };
}

export async function getDocument(documentId: string) {
  const { orgId } = await requireTenantContext();
  const db = createServiceClient();

  const { data, error } = await db
    .from('uploaded_documents')
    .select('*')
    .eq('id', documentId)
    .eq('org_id', orgId)
    .single();

  if (error) throw new Error('Document not found');
  return data as UploadedDocument;
}

export async function getDocumentWithLines(documentId: string) {
  const { orgId } = await requireTenantContext();
  const db = createServiceClient();

  const [docResult, linesResult] = await Promise.all([
    db.from('uploaded_documents')
      .select('*')
      .eq('id', documentId)
      .eq('org_id', orgId)
      .single(),
    db.from('document_line_items')
      .select('*')
      .eq('uploaded_document_id', documentId)
      .eq('org_id', orgId)
      .order('line_index'),
  ]);

  if (docResult.error) throw new Error('Document not found');
  if (linesResult.error) throw new Error(linesResult.error.message);

  return {
    document: docResult.data as UploadedDocument,
    lines: linesResult.data as DocumentLineItem[],
  };
}

// ---------- Update status ----------

export async function updateDocumentStatus(
  documentId: string,
  status: UploadedDocument['status'],
  extra?: Partial<UploadedDocument>
) {
  const { orgId } = await requireTenantContext();
  const db = createServiceClient();

  const { error } = await db
    .from('uploaded_documents')
    .update({ status, ...extra })
    .eq('id', documentId)
    .eq('org_id', orgId);

  if (error) throw new Error(error.message);
}

// ---------- Line Items ----------

export async function saveLineItems(
  documentId: string,
  lines: Omit<DocumentLineItem, 'id' | 'org_id' | 'uploaded_document_id' | 'created_at' | 'updated_at'>[]
) {
  const { orgId } = await requireTenantContext();
  const db = createServiceClient();

  // Delete existing lines first (idempotent re-parse)
  await db
    .from('document_line_items')
    .delete()
    .eq('uploaded_document_id', documentId)
    .eq('org_id', orgId);

  if (lines.length === 0) return;

  const rows = lines.map((line) => ({
    ...line,
    org_id: orgId,
    uploaded_document_id: documentId,
  }));

  const { error } = await db.from('document_line_items').insert(rows);
  if (error) throw new Error(error.message);
}

// ---------- Update single line ----------

export async function updateLineItem(
  lineId: string,
  input: Partial<Pick<DocumentLineItem,
    'matched_product_id' | 'matched_variant_id' | 'match_status' | 'match_score' | 'match_reason' |
    'size_raw' | 'color_raw' | 'quantity' | 'unit_price'
  >>
) {
  const { orgId } = await requireTenantContext();
  const db = createServiceClient();

  const { error } = await db
    .from('document_line_items')
    .update(input)
    .eq('id', lineId)
    .eq('org_id', orgId);

  if (error) throw new Error(error.message);
}

// ---------- Import Session ----------

export async function createImportSession(input: {
  uploaded_document_id: string;
  products_created: number;
  variants_created: number;
  variants_updated: number;
  movements_created: number;
  lines_skipped: number;
}) {
  const { orgId, userId } = await requireTenantContext();
  const db = createServiceClient();

  const { data, error } = await db
    .from('document_import_sessions')
    .insert({
      org_id: orgId,
      uploaded_document_id: input.uploaded_document_id,
      imported_by: userId,
      products_created: input.products_created,
      variants_created: input.variants_created,
      variants_updated: input.variants_updated,
      movements_created: input.movements_created,
      lines_skipped: input.lines_skipped,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as DocumentImportSession;
}

// ---------- Signed URL ----------

export async function getDocumentSignedUrl(filePath: string) {
  const db = createServiceClient();

  const { data, error } = await db.storage
    .from('documents')
    .createSignedUrl(filePath, 300); // 5 minutes

  if (error) throw new Error('Could not generate preview URL');
  return data.signedUrl;
}

export async function deleteDocumentRecord(documentId: string) {
  const { orgId, userId } = await requireTenantContext();
  const db = createServiceClient();

  const { data: document, error: documentError } = await db
    .from('uploaded_documents')
    .select('*')
    .eq('id', documentId)
    .eq('org_id', orgId)
    .single();

  if (documentError || !document) {
    throw new Error('Document not found');
  }

  const { error: storageError } = await db.storage
    .from('documents')
    .remove([document.file_path]);

  if (storageError) {
    throw new Error(`Errore nella rimozione file: ${storageError.message}`);
  }

  const { error: movementError } = await db
    .from('inventory_movements')
    .update({
      source_document_id: null,
      source_document_type: null,
      notes: document.document_number
        ? `Movimento originato da documento eliminato (${document.document_number})`
        : 'Movimento originato da documento eliminato',
    })
    .eq('org_id', orgId)
    .eq('source_document_id', documentId);

  if (movementError) {
    throw new Error(movementError.message);
  }

  const { error: sessionError } = await db
    .from('document_import_sessions')
    .delete()
    .eq('org_id', orgId)
    .eq('uploaded_document_id', documentId);

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  const { error: deleteError } = await db
    .from('uploaded_documents')
    .delete()
    .eq('id', documentId)
    .eq('org_id', orgId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  await writeAuditLog({
    orgId,
    actorUserId: userId,
    entityType: 'document',
    entityId: documentId,
    action: 'delete',
    payload: {
      file_name: document.file_name,
      file_path: document.file_path,
      status: document.status,
      imported_cleanup: true,
    },
  });

  return document as UploadedDocument;
}

function inferCaptureType(mimeType: string): DocumentCaptureType {
  if (mimeType.includes('pdf')) return 'pdf_document';
  if (mimeType.startsWith('image/')) return 'printed_document_photo';
  return 'unknown';
}
