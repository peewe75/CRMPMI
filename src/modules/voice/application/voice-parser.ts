import type { VoiceParseResult } from '@/types/documents';

/**
 * Parse a voice transcript into structured product data.
 *
 * Examples:
 *   "adidas samba taglia 43 bianca quantità 2"
 *   "nike air max 90 nero 42 3 pezzi"
 *   "converse all star 38 rossa"
 */
export function parseVoiceTranscript(text: string): VoiceParseResult {
  const normalized = text.toLowerCase().trim();

  // Extract quantity
  let quantity: number | null = null;
  const qtyMatch = normalized.match(/(?:quantit[àa]|qt[àa]?|pezzi?)\s*(\d+)/);
  if (qtyMatch) {
    quantity = parseInt(qtyMatch[1], 10);
  } else {
    // Try trailing number
    const trailingNum = normalized.match(/\s(\d+)\s*$/);
    if (trailingNum) {
      quantity = parseInt(trailingNum[1], 10);
    }
  }

  // Extract size
  let size: string | null = null;
  const sizeMatch = normalized.match(/(?:taglia|tg\.?|size|misura)\s*(\d{2,3}(?:[.,]\d)?)/);
  if (sizeMatch) {
    size = sizeMatch[1].replace(',', '.');
  } else {
    // Look for standalone number that could be a shoe size (35-50)
    const sizeNumbers = normalized.match(/\b(3[5-9]|4\d|50)\b/);
    if (sizeNumbers) size = sizeNumbers[1];
  }

  // Extract color
  const COLORS: Record<string, string> = {
    bianco: 'Bianco', bianca: 'Bianco', white: 'Bianco',
    nero: 'Nero', nera: 'Nero', black: 'Nero',
    rosso: 'Rosso', rossa: 'Rosso', red: 'Rosso',
    blu: 'Blu', blue: 'Blu',
    verde: 'Verde', green: 'Verde',
    giallo: 'Giallo', gialla: 'Giallo', yellow: 'Giallo',
    grigio: 'Grigio', grigia: 'Grigio', gray: 'Grigio', grey: 'Grigio',
    marrone: 'Marrone', brown: 'Marrone',
    rosa: 'Rosa', pink: 'Rosa',
    beige: 'Beige',
    arancione: 'Arancione', orange: 'Arancione',
  };

  let color: string | null = null;
  for (const [key, value] of Object.entries(COLORS)) {
    if (normalized.includes(key)) {
      color = value;
      break;
    }
  }

  // Extract brand — take the first word as brand
  const words = normalized
    .replace(/(?:taglia|tg\.?|size|misura|quantit[àa]|qt[àa]?|pezzi?)\s*\d+/g, '')
    .replace(new RegExp(Object.keys(COLORS).join('|'), 'g'), '')
    .replace(/\d+/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const brand = words[0] ? capitalize(words[0]) : null;
  const model_name = words.slice(1).map(capitalize).join(' ') || null;

  // Confidence based on how many fields we extracted
  const filled = [brand, model_name, size, color, quantity].filter(Boolean).length;
  const confidence = filled / 5;

  return {
    brand,
    model_name,
    size,
    color,
    quantity,
    raw_text: text,
    confidence,
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
