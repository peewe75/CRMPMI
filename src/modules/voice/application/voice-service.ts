'use server';

import { requireTenantContext } from '@/lib/auth/tenant';
import { createServiceClient } from '@/lib/supabase/server';
import { createProposal } from '@/modules/proposals/application/proposals-service';
import type { CreateProposalInput } from '@/modules/proposals/domain/proposal-types';
import { parseVoiceTranscript } from '@/modules/voice/application/voice-intent-parser';
import type { VoiceLookupMatch, VoiceLookupResponse, VoiceParseResult } from '@/types/documents';

export async function interpretVoiceCommand(text: string): Promise<VoiceParseResult> {
  const parsed = parseVoiceTranscript(text);

  if (parsed.intent === 'stock_lookup' || parsed.intent === 'product_search') {
    parsed.lookup_result = await resolveVoiceLookup(parsed);
  }

  return parsed;
}

export async function createVoiceProposalFromInterpretation(input: {
  raw_text: string;
  parsed?: VoiceParseResult;
  target_store_id?: string | null;
}) {
  const parsed = input.parsed ?? (await interpretVoiceCommand(input.raw_text));

  if (parsed.intent === 'stock_lookup' || parsed.intent === 'product_search') {
    throw new Error('Forbidden: lookup intents do not create stock mutation proposals');
  }

  const proposalTypeMap = {
    inventory_inbound: 'inbound',
    inventory_outbound: 'outbound',
    inventory_adjustment: 'adjustment',
  } as const;
  const proposalType =
    parsed.intent === 'inventory_inbound'
      ? proposalTypeMap.inventory_inbound
      : parsed.intent === 'inventory_outbound'
        ? proposalTypeMap.inventory_outbound
        : proposalTypeMap.inventory_adjustment;

  const proposalInput: CreateProposalInput = {
    source_type: 'voice',
    proposal_type: proposalType,
    target_store_id: input.target_store_id ?? null,
    raw_input: parsed.raw_text,
    parsed_json: parsed as unknown as Record<string, unknown>,
    confidence: parsed.confidence,
    source_metadata: {
      intent: parsed.intent,
      warnings: parsed.command.warnings,
      normalized_text: parsed.normalized_text,
      speech_provider: 'browser-native',
    },
    items: parsed.command.items.map((item) => ({
      line_index: item.line_index,
      raw_description: item.raw_description,
      interpreted_action: proposalType,
      quantity: parsed.intent === 'inventory_adjustment' ? item.quantity_delta : item.quantity,
      size_raw: item.size,
      color_raw: item.color,
      status: item.confidence >= 0.8 ? 'pending' : 'unmatched',
      confidence: item.confidence,
      payload: {
        brand: item.brand,
        model_name: item.model_name,
        quantity_delta: item.quantity_delta,
      },
    })),
  };

  return createProposal(proposalInput);
}

async function resolveVoiceLookup(parsed: VoiceParseResult): Promise<VoiceLookupResponse> {
  const { orgId } = await requireTenantContext();
  const db = createServiceClient();
  const requestedItem = parsed.command.items[0];

  if (!requestedItem) {
    return {
      exact_matches: [],
      similar_matches: [],
      summary: 'Non ho rilevato un articolo abbastanza chiaro da cercare.',
    };
  }

  const searchTerms = [requestedItem.brand, requestedItem.model_name].filter(Boolean).join(' ').trim();
  let query = db
    .from('product_variants')
    .select('id, size, color, product_id, products:product_id(id, brand, model_name), stock_levels(quantity, store_id)')
    .eq('org_id', orgId)
    .eq('active', true)
    .limit(50);

  if (requestedItem.size) query = query.eq('size', requestedItem.size);
  if (requestedItem.color) query = query.ilike('color', `%${requestedItem.color}%`);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const flattened = (data ?? []).map((variant) => {
    const product = Array.isArray(variant.products) ? variant.products[0] : variant.products;
    const stockLevels = Array.isArray(variant.stock_levels) ? variant.stock_levels : [];
    const quantity = stockLevels.reduce((sum, level) => sum + Number(level.quantity ?? 0), 0);
    const similarity = scoreLookupMatch(requestedItem, {
      brand: product?.brand ?? '',
      model_name: product?.model_name ?? '',
      size: variant.size,
      color: variant.color,
    });

    return {
      variant_id: variant.id,
      product_id: product?.id ?? variant.product_id,
      brand: product?.brand ?? '',
      model_name: product?.model_name ?? '',
      size: variant.size,
      color: variant.color,
      quantity,
      similarity,
      exact:
        similarity >= 0.95 ||
        (!!requestedItem.size && requestedItem.size === variant.size && compareText(requestedItem.color, variant.color)),
    } satisfies VoiceLookupMatch;
  }).filter((item) => {
    if (!searchTerms) return true;
    const haystack = `${item.brand} ${item.model_name}`.toLowerCase();
    return haystack.includes(searchTerms.toLowerCase());
  });

  const exactMatches = flattened.filter((item) => item.exact).sort(sortLookupMatches);
  const similarMatches = flattened.filter((item) => !item.exact).sort(sortLookupMatches).slice(0, 5);
  const summary = exactMatches.length
    ? buildExactLookupSummary(exactMatches)
    : similarMatches.length
      ? `Nessun match esatto. Ho trovato ${similarMatches.length} varianti simili da controllare.`
      : 'Nessun risultato trovato in catalogo.';

  return {
    exact_matches: exactMatches,
    similar_matches: similarMatches,
    summary,
  };
}

function scoreLookupMatch(
  requestedItem: VoiceParseResult['command']['items'][number],
  candidate: { brand: string; model_name: string; size: string; color: string }
) {
  let score = 0;
  if (compareText(requestedItem.brand, candidate.brand)) score += 0.35;
  if (compareText(requestedItem.model_name, candidate.model_name)) score += 0.3;
  if (!requestedItem.model_name && candidate.model_name) score += 0.1;
  if (requestedItem.size && requestedItem.size === candidate.size) score += 0.2;
  if (requestedItem.color && compareText(requestedItem.color, candidate.color)) score += 0.15;
  return Math.min(1, score);
}

function compareText(expected: string | null | undefined, actual: string | null | undefined) {
  if (!expected || !actual) return false;
  const e = expected.toLowerCase();
  const a = actual.toLowerCase();
  return a.includes(e) || e.includes(a);
}

function sortLookupMatches(a: VoiceLookupMatch, b: VoiceLookupMatch) {
  if (b.similarity !== a.similarity) return b.similarity - a.similarity;
  return b.quantity - a.quantity;
}

function buildExactLookupSummary(matches: VoiceLookupMatch[]) {
  const first = matches[0];
  if (matches.length === 1) {
    return `${first.brand} ${first.model_name} Tg. ${first.size} ${first.color}: ${first.quantity} pezzi disponibili.`;
  }

  const total = matches.reduce((sum, item) => sum + item.quantity, 0);
  return `${matches.length} varianti trovate, per un totale di ${total} pezzi disponibili.`;
}
