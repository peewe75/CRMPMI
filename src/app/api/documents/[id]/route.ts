import {
  deleteDocumentRecord,
  getDocument,
  getDocumentSignedUrl,
} from '@/modules/documents/application/documents-service';
import { jsonOk, withErrorHandler } from '@/lib/utils/api';

export const GET = withErrorHandler(async (
  _request: Request,
  context: unknown
) => {
  const { id } = (context as { params: Promise<{ id: string }> }).params
    ? await (context as { params: Promise<{ id: string }> }).params
    : { id: '' };

  const document = await getDocument(id);
  const previewUrl = await getDocumentSignedUrl(document.file_path);

  return jsonOk({ document, previewUrl });
});

export const DELETE = withErrorHandler(async (
  _request: Request,
  context: unknown
) => {
  const { id } = (context as { params: Promise<{ id: string }> }).params
    ? await (context as { params: Promise<{ id: string }> }).params
    : { id: '' };

  const document = await deleteDocumentRecord(id);
  return jsonOk({ document });
});
