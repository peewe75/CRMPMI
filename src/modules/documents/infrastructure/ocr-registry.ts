import type { ParsedDocumentResult } from '@/types/documents';

export interface OcrAdapterInput {
  fileUrl: string;
  mimeType: string;
  captureType?: string;
}

export interface OcrAdapter {
  readonly name: string;
  preprocess(input: OcrAdapterInput): Promise<OcrAdapterInput>;
  extract(input: OcrAdapterInput): Promise<ParsedDocumentResult>;
}

class LowCostOcrAdapter implements OcrAdapter {
  readonly name = 'low-cost-photo-ocr-adapter';

  async preprocess(input: OcrAdapterInput) {
    return input;
  }

  async extract(input: OcrAdapterInput): Promise<ParsedDocumentResult> {
    const response = await fetch(input.fileUrl);
    if (!response.ok) {
      throw new Error(`Download immagine documento fallito (${response.status})`);
    }

    return {
      header: {
        supplier_name: null,
        supplier_vat_number: null,
        document_number: null,
        document_date: null,
        document_type: 'unknown',
        currency: 'EUR',
        totals: {
          subtotal: null,
          tax: null,
          total: null,
        },
      },
      line_items: [],
      raw_text: input.captureType === 'handwritten_note'
        ? 'Rilevata foto di appunto scritto a mano. Necessaria revisione manuale.'
        : 'Rilevata foto documento. Necessaria revisione manuale.',
      parser_confidence: input.captureType === 'handwritten_note' ? 0.15 : 0.25,
      warnings: [
        input.captureType === 'handwritten_note'
          ? 'Scrittura a mano rilevata: review obbligatoria prima di qualsiasi mutazione.'
          : 'Foto documento rilevata: review obbligatoria prima di qualsiasi mutazione.',
      ],
    };
  }
}

let adapter: OcrAdapter | null = null;

export function getOcrAdapter(): OcrAdapter {
  if (!adapter) {
    adapter = new LowCostOcrAdapter();
  }

  return adapter;
}

export async function parseDocumentPhotoFallback(input: OcrAdapterInput): Promise<ParsedDocumentResult> {
  const adapter = getOcrAdapter();
  const preprocessed = await adapter.preprocess(input);
  return adapter.extract(preprocessed);
}
