import type { DocumentParser } from '@/types/documents';
import { MockDocumentParser } from '@/modules/documents/infrastructure/mock-document-parser';

let parserInstance: DocumentParser | null = null;

export function getDocumentParser(): DocumentParser {
  if (!parserInstance) {
    parserInstance = new MockDocumentParser();
  }

  return parserInstance;
}
