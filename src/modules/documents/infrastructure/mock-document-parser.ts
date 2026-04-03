import type {
  DocumentParser,
  DocumentParserInput,
  ParsedDocumentResult,
} from '@/types/documents';

function extractBaseName(fileUrl: string) {
  try {
    const url = new URL(fileUrl);
    const path = url.pathname.split('/').pop() ?? 'document';
    return decodeURIComponent(path).replace(/\.[^.]+$/, '');
  } catch {
    return 'document';
  }
}

function normalizeDocumentType(input?: 'invoice' | 'ddt' | 'unknown') {
  return input ?? 'unknown';
}

export class MockDocumentParser implements DocumentParser {
  readonly name = 'mock-document-parser';

  async parse(input: DocumentParserInput): Promise<ParsedDocumentResult> {
    const documentType = normalizeDocumentType(input.documentType);
    const baseName = extractBaseName(input.fileUrl);

    return {
      header: {
        supplier_name: 'Fornitore Demo',
        supplier_vat_number: null,
        document_number: `MOCK-${baseName.slice(0, 8).toUpperCase()}`,
        document_date: new Date().toISOString().slice(0, 10),
        document_type: documentType,
        currency: 'EUR',
        totals: {
          subtotal: 120,
          tax: 26.4,
          total: 146.4,
        },
      },
      line_items: [
        {
          line_index: 1,
          raw_description: 'Sneaker pelle bianca taglia 42',
          normalized_description: 'Sneaker pelle bianca',
          supplier_code: 'MOCK-SNK-42',
          barcode: null,
          size_raw: '42',
          color_raw: 'Bianco',
          quantity: 2,
          unit_price: 60,
          line_total: 120,
          vat_rate: 22,
          confidence: 0.86,
        },
      ],
      raw_text: `Mock parse result for ${baseName}`,
      parser_confidence: 0.78,
      warnings: ['Parser mock attivo: verificare manualmente prima dell’import.'],
    };
  }
}
