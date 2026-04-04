import type { VoiceCommandItem, VoiceIntent, VoiceParseResult } from '@/types/documents';
import {
  compactWhitespace,
  extractColor,
  extractSize,
  normalizeVoiceText,
  removeColorTokens,
  removeSizeTokens,
  splitBrandAndModel,
  stripIntentPrefix,
} from '@/modules/voice/application/voice-normalizers';

const ITEM_PATTERN = /(\d+)\s+(?:numero|num|n|taglia|tg)\s*(\d{2,3}(?:[.,]\d)?)/g;

export function parseVoiceTranscript(text: string): VoiceParseResult {
  const normalizedText = normalizeVoiceText(text);
  const intent = detectVoiceIntent(normalizedText);
  const subjectText = stripIntentPrefix(normalizedText);
  const warnings: string[] = [];

  const items =
    intent === 'inventory_adjustment'
      ? parseAdjustmentItems(subjectText, warnings)
      : parseVoiceItems(subjectText, intent, warnings);

  const confidence = computeIntentConfidence(intent, items, warnings);
  const needsReview = confidence < 0.75 || warnings.length > 0 || items.some((item) => item.confidence < 0.75);

  return {
    raw_text: text,
    normalized_text: normalizedText,
    intent,
    confidence,
    needs_review: needsReview,
    command: {
      intent,
      confidence,
      subject_text: subjectText,
      warnings,
      items,
    },
    lookup_result: null,
  };
}

function detectVoiceIntent(text: string): VoiceIntent {
  if (/\b(vendut[oeia]|scaricat[oeia])\b/.test(text)) return 'inventory_outbound';
  if (/\b(caricat[oeia]|aggiunt[oeia]|entrat[oeia])\b/.test(text)) return 'inventory_inbound';
  if (/\b(rettifica|rettificare|aggiusta|correggi)\b/.test(text)) return 'inventory_adjustment';
  if (/\b(quante|quanti|quanto|quanta|disponibilita|rimaste|rimasti|ho)\b/.test(text)) return 'stock_lookup';
  return 'product_search';
}

function parseVoiceItems(subjectText: string, intent: VoiceIntent, warnings: string[]) {
  const repeatedItems = [...subjectText.matchAll(ITEM_PATTERN)];
  if (repeatedItems.length > 1) {
    const baseText = compactWhitespace(subjectText.replace(ITEM_PATTERN, ' '));
    return repeatedItems.map((match, index) =>
      buildItem({
        lineIndex: index,
        baseText,
        rawDescription: `${baseText} numero ${match[2]}`.trim(),
        quantity: Number(match[1]),
        size: match[2].replace(',', '.'),
        intent,
      })
    );
  }

  const quantityMatch = subjectText.match(/^(\d+)\s+/);
  const quantity = quantityMatch ? Number(quantityMatch[1]) : intent === 'stock_lookup' ? null : 1;
  const withoutLeadingQuantity = quantityMatch ? subjectText.slice(quantityMatch[0].length) : subjectText;

  if (!withoutLeadingQuantity.trim()) {
    warnings.push('comando troppo incompleto');
  }

  return [
    buildItem({
      lineIndex: 0,
      baseText: withoutLeadingQuantity,
      rawDescription: withoutLeadingQuantity,
      quantity,
      size: extractSize(withoutLeadingQuantity),
      intent,
    }),
  ];
}

function parseAdjustmentItems(subjectText: string, warnings: string[]) {
  const deltaMatch = subjectText.match(/\b(?:meno|-)\s*(\d+)\b/) ?? subjectText.match(/\b(?:piu|\+)\s*(\d+)\b/);
  const baseText = subjectText
    .replace(/\b(?:meno|-|piu|\+)\s*\d+\b/g, ' ')
    .replace(/\brettifica\b/g, ' ')
    .trim();

  if (!deltaMatch) warnings.push('rettifica senza delta esplicito');

  const sign = /\b(?:meno|-)\s*\d+\b/.test(subjectText) ? -1 : 1;
  const quantityDelta = deltaMatch ? Number(deltaMatch[1]) * sign : null;

  return [
    buildItem({
      lineIndex: 0,
      baseText,
      rawDescription: baseText,
      quantity: quantityDelta,
      size: extractSize(baseText),
      intent: 'inventory_adjustment',
    }),
  ];
}

function buildItem(params: {
  lineIndex: number;
  baseText: string;
  rawDescription: string;
  quantity: number | null;
  size: string | null;
  intent: VoiceIntent;
}): VoiceCommandItem {
  const color = extractColor(params.baseText);
  const textWithoutColor = removeColorTokens(params.baseText);
  const textWithoutSize = removeSizeTokens(textWithoutColor);
  const descriptorText = compactWhitespace(textWithoutSize.replace(/^\d+\s+/, ''));
  const { brand, model_name } = splitBrandAndModel(descriptorText);

  const confidence =
    (brand ? 0.25 : 0) +
    (model_name ? 0.2 : 0.1) +
    (params.size ? 0.2 : params.intent === 'product_search' ? 0.1 : 0) +
    (color ? 0.15 : 0) +
    (params.quantity != null ? 0.2 : params.intent === 'stock_lookup' ? 0.1 : 0);

  return {
    line_index: params.lineIndex,
    brand,
    model_name,
    size: params.size,
    color,
    quantity: params.intent === 'inventory_adjustment' ? Math.abs(params.quantity ?? 0) || null : params.quantity,
    quantity_delta: params.intent === 'inventory_adjustment' ? params.quantity : null,
    raw_description: compactWhitespace(params.rawDescription),
    confidence: Math.min(1, confidence),
  };
}

function computeIntentConfidence(_intent: VoiceIntent, items: VoiceCommandItem[], warnings: string[]) {
  const base = items.length ? items.reduce((sum, item) => sum + item.confidence, 0) / items.length : 0.2;
  return Math.max(0, Math.min(1, base - warnings.length * 0.1));
}
