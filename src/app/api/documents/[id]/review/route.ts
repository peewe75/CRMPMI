import { getDocumentWithLines } from '@/modules/documents/application/documents-service';
import { jsonOk, withErrorHandler } from '@/lib/utils/api';

export const GET = withErrorHandler(async (
  _request: Request,
  context: unknown
) => {
  const { id } = await (context as { params: Promise<{ id: string }> }).params;

  const { document, lines } = await getDocumentWithLines(id);

  return jsonOk({ document, lines });
});
