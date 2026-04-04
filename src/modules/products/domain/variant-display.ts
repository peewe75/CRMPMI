import type { ProductVariant } from '@/types/database';

const DEFAULT_VARIANT_COLOR = 'Standard';

export function normalizeVariantColor(value?: string | null) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : DEFAULT_VARIANT_COLOR;
}

export function normalizeVariantMaterial(value?: string | null) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

export function normalizeVariantSize(value?: string | null) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

export function getVariantCommercialLabel(input: Pick<ProductVariant, 'color' | 'material'> | { color?: string | null; material?: string | null }) {
  const color = normalizeVariantColor(input.color);
  const material = normalizeVariantMaterial(input.material);
  return [color !== DEFAULT_VARIANT_COLOR ? color : null, material].filter(Boolean).join(' · ') || DEFAULT_VARIANT_COLOR;
}

export function getVariantSizeLabel(input: Pick<ProductVariant, 'size'> | { size?: string | null }) {
  const size = normalizeVariantSize(input.size);
  return size ? `Tg. ${size}` : 'Taglia unica';
}

export function getVariantFullLabel(input: Pick<ProductVariant, 'size' | 'color' | 'material'> | { size?: string | null; color?: string | null; material?: string | null }) {
  return `${getVariantCommercialLabel(input)} · ${getVariantSizeLabel(input)}`;
}

export function getVariantGroupKey(input: Pick<ProductVariant, 'color' | 'material'> | { color?: string | null; material?: string | null }) {
  return `${normalizeVariantColor(input.color).toLowerCase()}::${normalizeVariantMaterial(input.material)?.toLowerCase() ?? ''}`;
}
