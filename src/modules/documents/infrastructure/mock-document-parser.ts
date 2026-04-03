import type {
  DocumentParser,
  DocumentParserInput,
  ParsedDocumentHeader,
  ParsedDocumentLineItem,
  ParsedDocumentResult,
} from '@/types/documents';

function normalizeDocumentType(input?: 'invoice' | 'ddt' | 'unknown') {
  return input ?? 'unknown';
}

function parseItalianNumber(value: string | undefined) {
  if (!value) return null;

  const normalized = value
    .replace(/EUR/gi, '')
    .replace(/\s+/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim();

  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function toIsoDate(value: string | null) {
  if (!value) return null;

  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return value;

  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

function compactLines(rawText: string) {
  return rawText
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function readValueAfterLabel(lines: string[], label: string) {
  const index = lines.findIndex((line) => line.toLowerCase() === label.toLowerCase());
  if (index === -1) return null;
  return lines[index + 1] ?? null;
}

function matchGroup(rawText: string, pattern: RegExp) {
  const match = rawText.match(pattern);
  return match?.[1]?.trim() ?? null;
}

function extractVatRate(rawText: string) {
  const match = rawText.match(/IVA\s+(\d{1,2})(?:[.,](\d{1,2}))?%/i);
  if (!match) return null;

  const decimal = match[2] ? `.${match[2]}` : '';
  return Number(`${match[1]}${decimal}`);
}

function extractHeader(lines: string[], documentType: 'invoice' | 'ddt' | 'unknown', rawText: string): ParsedDocumentHeader {
  const supplierName = lines[1] ?? null;
  const supplierVat =
    lines.find((line) => line.toLowerCase().startsWith('p. iva '))?.replace(/^p\.\s*iva\s+/i, '') ?? null;
  const subtotal = parseItalianNumber(
    matchGroup(rawText, /Imponibile\s+([\d.,]+)\s+EUR/i) ?? readValueAfterLabel(lines, 'Imponibile') ?? undefined
  );
  const total = parseItalianNumber(
    matchGroup(rawText, /Totale fattura\s+([\d.,]+)\s+EUR/i) ?? readValueAfterLabel(lines, 'Totale fattura') ?? undefined
  );
  const tax =
    parseItalianNumber(
      matchGroup(rawText, /IVA\s+\d{1,2}(?:[.,]\d{1,2})?%\s+([\d.,]+)\s+EUR/i) ??
        readValueAfterLabel(lines, 'IVA 22%') ??
        undefined
    ) ??
    (subtotal !== null && total !== null ? Number((total - subtotal).toFixed(2)) : null);

  return {
    supplier_name: supplierName,
    supplier_vat_number: supplierVat,
    document_number: matchGroup(rawText, /Numero fattura\s+([A-Z0-9-]+)/i) ?? readValueAfterLabel(lines, 'Numero fattura'),
    document_date: toIsoDate(
      matchGroup(rawText, /Data\s+(\d{2}\/\d{2}\/\d{4})/i) ?? readValueAfterLabel(lines, 'Data')
    ),
    document_type: documentType,
    currency: matchGroup(rawText, /Valuta\s+([A-Z]{3})/i) ?? readValueAfterLabel(lines, 'Valuta'),
    totals: {
      subtotal,
      tax,
      total,
    },
  };
}

function extractLineItems(lines: string[], rawText: string): ParsedDocumentLineItem[] {
  const tableHeaderIndex = lines.findIndex((line) =>
    line.toLowerCase().includes('codice descrizione taglia colore qta prezzo totale')
  );

  if (tableHeaderIndex === -1) {
    return [];
  }

  const rawRows = lines.slice(tableHeaderIndex + 1);
  const vatRate = extractVatRate(rawText);
  const items: ParsedDocumentLineItem[] = [];

  for (const row of rawRows) {
    if (/^(Imponibile|IVA\s|Totale fattura|Note:|Coordinate bancarie:|--\s)/i.test(row)) {
      break;
    }

    const match = row.match(/^([A-Z0-9-]+)\s+(.+?)\s+([A-Z0-9]+)\s+([A-Za-zÀ-ÿ]+)\s+(\d+)\s+([\d.,]+)\s+([\d.,]+)$/);
    if (!match) {
      continue;
    }

    const [, supplierCode, description, sizeRaw, colorRaw, quantityRaw, unitPriceRaw, lineTotalRaw] = match;
    const quantity = Number(quantityRaw);

    items.push({
      line_index: items.length + 1,
      raw_description: description.trim(),
      normalized_description: description.trim(),
      supplier_code: supplierCode,
      barcode: /^\d{8,14}$/.test(supplierCode) ? supplierCode : null,
      size_raw: sizeRaw || null,
      color_raw: colorRaw || null,
      quantity,
      unit_price: parseItalianNumber(unitPriceRaw),
      line_total: parseItalianNumber(lineTotalRaw),
      vat_rate: vatRate,
      confidence: 0.96,
    });
  }

  return items;
}

async function extractRawText(input: DocumentParserInput) {
  const response = await fetch(input.fileUrl);

  if (!response.ok) {
    throw new Error(`Download documento fallito (${response.status})`);
  }

  if (input.mimeType.includes('pdf') || input.fileUrl.toLowerCase().includes('.pdf')) {
    const canvas = await import('@napi-rs/canvas');
    const worker = await import('pdf-parse/worker');
    const runtimeGlobals = globalThis as Record<string, unknown>;

    runtimeGlobals.DOMMatrix ??= canvas.DOMMatrix;
    runtimeGlobals.ImageData ??= canvas.ImageData;
    runtimeGlobals.Path2D ??= canvas.Path2D;

    const { PDFParse } = await import('pdf-parse');
    const buffer = Buffer.from(await response.arrayBuffer());
    PDFParse.setWorker(worker.getData());

    const parser = new PDFParse({
      data: new Uint8Array(buffer),
      CanvasFactory: worker.CanvasFactory,
    });

    try {
      const parsed = await parser.getText();
      return parsed.text;
    } finally {
      await parser.destroy();
    }
  }

  return await response.text();
}

function buildFallbackResult(documentType: 'invoice' | 'ddt' | 'unknown', rawText: string): ParsedDocumentResult {
  return {
    header: {
      supplier_name: null,
      supplier_vat_number: null,
      document_number: null,
      document_date: null,
      document_type: documentType,
      currency: 'EUR',
      totals: {
        subtotal: null,
        tax: null,
        total: null,
      },
    },
    line_items: [],
    raw_text: rawText,
    parser_confidence: 0.2,
    warnings: ['Nessuna riga rilevata automaticamente. Verifica il formato del documento.'],
  };
}

export class MockDocumentParser implements DocumentParser {
  readonly name = 'basic-pdf-document-parser';

  async parse(input: DocumentParserInput): Promise<ParsedDocumentResult> {
    const documentType = normalizeDocumentType(input.documentType);
    const rawText = await extractRawText(input);
    const lines = compactLines(rawText);
    const lineItems = extractLineItems(lines, rawText);

    if (lineItems.length === 0) {
      return buildFallbackResult(documentType, rawText);
    }

    return {
      header: extractHeader(lines, documentType, rawText),
      line_items: lineItems,
      raw_text: rawText,
      parser_confidence: 0.94,
      warnings: [],
    };
  }
}
