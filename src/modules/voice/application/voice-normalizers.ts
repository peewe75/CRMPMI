const COLOR_SYNONYMS: Record<string, string> = {
  nero: 'Nero',
  nera: 'Nero',
  neri: 'Nero',
  nere: 'Nero',
  black: 'Nero',
  bianco: 'Bianco',
  bianca: 'Bianco',
  bianchi: 'Bianco',
  bianche: 'Bianco',
  white: 'Bianco',
  rosso: 'Rosso',
  rossa: 'Rosso',
  rossi: 'Rosso',
  rosse: 'Rosso',
  red: 'Rosso',
  blu: 'Blu',
  blue: 'Blu',
  verdi: 'Verde',
  verde: 'Verde',
  marrone: 'Marrone',
  marroni: 'Marrone',
  beige: 'Beige',
  rosa: 'Rosa',
  grigio: 'Grigio',
  grigia: 'Grigio',
  grigi: 'Grigio',
  grigie: 'Grigio',
};

const FILLER_WORDS = new Set([
  'quante', 'quanto', 'quanti', 'quanta', 'ho', 'sono', 'rimaste', 'rimasti', 'rimasta', 'rimasto',
  'c', 'ce', 'dei', 'delle', 'della', 'del', 'di', 'la', 'le', 'il', 'lo', 'gli', 'un', 'una', 'uno',
  'in', 'magazzino', 'numero', 'num', 'n', 'taglia', 'tg',
]);

export function normalizeVoiceText(input: string) {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[?.,;:!]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenizeVoiceText(text: string) {
  return normalizeVoiceText(text).split(' ').filter(Boolean);
}

export function extractColor(text: string) {
  const tokens = tokenizeVoiceText(text);
  for (const token of tokens) {
    if (COLOR_SYNONYMS[token]) return COLOR_SYNONYMS[token];
  }
  return null;
}

export function removeColorTokens(text: string) {
  return tokenizeVoiceText(text).filter((token) => !COLOR_SYNONYMS[token]).join(' ').trim();
}

export function extractSize(text: string) {
  const labeled = text.match(/\b(?:numero|num|n|taglia|tg)\s*(\d{2,3}(?:[.,]\d)?)\b/);
  if (labeled) return labeled[1].replace(',', '.');

  const standalone = text.match(/\b(3[0-9]|4[0-9]|50)\b/);
  return standalone?.[1] ?? null;
}

export function removeSizeTokens(text: string) {
  return text
    .replace(/\b(?:numero|num|n|taglia|tg)\s*\d{2,3}(?:[.,]\d)?\b/g, ' ')
    .replace(/\b(3[0-9]|4[0-9]|50)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function splitBrandAndModel(text: string) {
  const tokens = tokenizeVoiceText(text).filter((token) => !FILLER_WORDS.has(token));
  if (!tokens.length) return { brand: null, model_name: null };

  return {
    brand: capitalize(tokens[0]),
    model_name: tokens.slice(1).map(capitalize).join(' ') || null,
  };
}

export function stripIntentPrefix(text: string) {
  return normalizeVoiceText(text)
    .replace(/^(vendut[oeia]|scaricat[oeia]|caricat[oeia]|rettifica|rettificare|quante|quanti|quanto|quanta|c e disponibilita|ce disponibilita|disponibilita)\b/, '')
    .trim();
}

export function compactWhitespace(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

export function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
