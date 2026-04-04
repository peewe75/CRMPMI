import type { DocumentParser } from '@/types/documents';
import { MockDocumentParser } from '@/modules/documents/infrastructure/mock-document-parser';
import { parseDocumentPhotoFallback } from '@/modules/documents/infrastructure/ocr-registry';

let parserInstance: DocumentParser | null = null;

export function getDocumentParser(): DocumentParser {
  if (!parserInstance) {
    parserInstance = {
      name: 'composite-document-parser',
      async parse(input) {
        if (input.mimeType.startsWith('image/')) {
          return parseDocumentPhotoFallback({
            fileUrl: input.fileUrl,
            mimeType: input.mimeType,
            captureType: input.captureType,
          });
        }

        const parser = new MockDocumentParser();
        return parser.parse(input);
      },
    };
  }

  return parserInstance;
}
