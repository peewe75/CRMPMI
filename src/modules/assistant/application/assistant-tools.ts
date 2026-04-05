import { interpretVoiceCommand, createVoiceProposalFromInterpretation } from '@/modules/voice/application/voice-service';
import { getStockLevels, listMovements } from '@/modules/inventory/application/inventory-service';
import { createProposalFromDocument } from '@/modules/documents/application/document-proposal-service';
import { resolveBarcode } from '@/modules/products/application/products-service';

/**
 * Tool definitions for the OpenRouter function-calling schema.
 */
export const TOOL_DEFINITIONS = [
  {
    type: 'function' as const,
    function: {
      name: 'process_command',
      description:
        'Interpreta un comando vocale o testuale relativo al magazzino. ' +
        'Può riconoscere intenti come carico merce, scarico, rettifica o ricerca prodotto. ' +
        'Se l\'intento è una mutazione (inbound/outbound/adjustment), crea automaticamente una proposta in stato pending_review.',
      parameters: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'Il testo del comando vocale da interpretare, es. "carica 3 Nike Air Max 44 nere"',
          },
          create_proposal: {
            type: 'boolean',
            description: 'Se true e l\'intento è una mutazione, crea una proposta di magazzino. Default: false per sole ricerche.',
          },
        },
        required: ['text'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'check_stock',
      description:
        'Controlla le giacenze di magazzino. Può filtrare per negozio o per variante specifica.',
      parameters: {
        type: 'object',
        properties: {
          store_id: {
            type: 'string',
            description: 'ID del negozio (opzionale). Se omesso, mostra tutti i negozi.',
          },
          variant_id: {
            type: 'string',
            description: 'ID della variante prodotto (opzionale). Se omesso, mostra tutte le varianti con stock > 0.',
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'daily_summary',
      description:
        'Genera un riassunto dei movimenti di magazzino di oggi: vendite, carichi, rettifiche.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'process_document_image',
      description:
        'Elabora una fattura o DDT caricato come documento. Crea una proposta di magazzino in stato pending_review a partire dal documento.',
      parameters: {
        type: 'object',
        properties: {
          uploaded_document_id: {
            type: 'string',
            description: 'ID del documento caricato nel sistema.',
          },
          proposal_type: {
            type: 'string',
            enum: ['inbound', 'outbound', 'adjustment'],
            description: 'Tipo di proposta da creare. Default: inbound per fatture fornitori.',
          },
        },
        required: ['uploaded_document_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_by_barcode',
      description: 'Cerca un prodotto tramite codice a barre (EAN/UPC). Restituisce prodotto, variante e giacenza.',
      parameters: {
        type: 'object',
        properties: {
          barcode: { type: 'string', description: 'Codice a barre da cercare (EAN-13, UPC, ecc.)' }
        },
        required: ['barcode']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'compare_period',
      description: 'Confronta i movimenti di magazzino tra due periodi. Utile per confrontare vendite di oggi vs ieri, o questa settimana vs la precedente.',
      parameters: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            enum: ['today_vs_yesterday', 'this_week_vs_last_week'],
            description: 'Tipo di confronto temporale'
          }
        },
        required: ['period']
      }
    }
  },
];

// ─── Tool Executors ───

export async function executeProcessCommand(args: { text: string; create_proposal?: boolean }) {
  const parsed = await interpretVoiceCommand(args.text);

  const isMutation = ['inventory_inbound', 'inventory_outbound', 'inventory_adjustment'].includes(parsed.intent);

  if (args.create_proposal && isMutation) {
    const result = await createVoiceProposalFromInterpretation({
      raw_text: args.text,
      parsed,
    });
    return {
      interpretation: parsed,
      proposal_created: true,
      proposal_id: result.proposal.id,
      proposal_status: result.proposal.status,
      items_count: result.items.length,
    };
  }

  if (parsed.intent === 'stock_lookup' || parsed.intent === 'product_search') {
    return {
      interpretation: parsed,
      lookup_summary: parsed.lookup_result?.summary ?? 'Nessun risultato trovato.',
      exact_matches: parsed.lookup_result?.exact_matches?.length ?? 0,
      similar_matches: parsed.lookup_result?.similar_matches?.length ?? 0,
    };
  }

  return {
    interpretation: {
      intent: parsed.intent,
      confidence: parsed.confidence,
      needs_review: parsed.needs_review,
      items: parsed.command.items.map((item) => ({
        description: item.raw_description,
        brand: item.brand,
        model_name: item.model_name,
        size: item.size,
        color: item.color,
        quantity: item.quantity ?? item.quantity_delta,
        match_status: item.match_status,
        matched_label: item.matched_label,
      })),
      warnings: parsed.command.warnings,
    },
    proposal_created: false,
    suggestion: isMutation
      ? 'Vuoi che crei una proposta di magazzino per questo comando?'
      : null,
  };
}

export async function executeCheckStock(args: { store_id?: string; variant_id?: string }) {
  const levels = await getStockLevels({
    store_id: args.store_id,
    variant_id: args.variant_id,
  });

  if (!levels.length) {
    return { summary: 'Nessuna giacenza trovata con i filtri specificati.', items: [] };
  }

  const items = levels.map((level) => ({
    brand: level.product_variants.products.brand,
    model: level.product_variants.products.model_name,
    category: level.product_variants.products.category,
    size: level.product_variants.size,
    color: level.product_variants.color,
    quantity: Number(level.quantity),
  }));

  const totalPieces = items.reduce((sum, i) => sum + i.quantity, 0);

  // Group by category for quick breakdown
  const byCategory: Record<string, { variants: number; pieces: number }> = {};
  for (const item of items) {
    const cat = item.category || 'altro';
    if (!byCategory[cat]) byCategory[cat] = { variants: 0, pieces: 0 };
    byCategory[cat].variants += 1;
    byCategory[cat].pieces += item.quantity;
  }

  return {
    summary: `${items.length} varianti in stock, ${totalPieces} pezzi totali.`,
    by_category: byCategory,
    items: items.slice(0, 30),
    total_variants: items.length,
    total_pieces: totalPieces,
  };
}

export async function executeDailySummary() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { movements, total } = await listMovements({ limit: 200 });

  const todayMovements = movements.filter(
    (m) => new Date(m.created_at) >= today,
  );

  const inbound = todayMovements.filter((m) => m.movement_type === 'inbound');
  const outbound = todayMovements.filter((m) => m.movement_type === 'outbound');
  const adjustments = todayMovements.filter((m) => m.movement_type === 'adjustment');

  const inboundQty = inbound.reduce((s, m) => s + Math.abs(Number(m.quantity)), 0);
  const outboundQty = outbound.reduce((s, m) => s + Math.abs(Number(m.quantity)), 0);
  const adjustmentQty = adjustments.reduce((s, m) => s + Math.abs(Number(m.quantity)), 0);

  const topOutbound = outbound
    .slice(0, 5)
    .map((m) => {
      const v = m.product_variants;
      return `${v.products.brand} ${v.products.model_name} ${v.color} Tg.${v.size}: ${Math.abs(Number(m.quantity))} pz`;
    });

  return {
    date: today.toISOString().split('T')[0],
    summary: `Oggi: ${outboundQty} pezzi venduti, ${inboundQty} pezzi caricati, ${adjustmentQty} pezzi rettificati.`,
    details: {
      sales: { count: outbound.length, quantity: outboundQty },
      inbound: { count: inbound.length, quantity: inboundQty },
      adjustments: { count: adjustments.length, quantity: adjustmentQty },
    },
    top_sales: topOutbound,
    total_movements_in_db: total,
  };
}

export async function executeProcessDocumentImage(args: {
  uploaded_document_id: string;
  proposal_type?: 'inbound' | 'outbound' | 'adjustment';
}) {
  const result = await createProposalFromDocument({
    uploaded_document_id: args.uploaded_document_id,
    proposal_type: args.proposal_type ?? 'inbound',
  });

  return {
    proposal_id: result.proposal.id,
    status: result.proposal.status,
    items_count: result.items.length,
    message: `Proposta creata con ${result.items.length} righe in stato pending_review. L'utente dovrà approvarla.`,
  };
}

export async function executeSearchByBarcode(args: { barcode: string }) {
  const variant = await resolveBarcode(args.barcode);

  if (!variant) {
    return { found: false, barcode: args.barcode };
  }

  const product = variant.products as unknown as { id: string; brand: string; model_name: string };
  const stockLevels = await getStockLevels({ variant_id: variant.id });
  const totalStock = stockLevels.reduce((sum, level) => sum + Number(level.quantity), 0);

  return {
    found: true,
    product: { brand: product.brand, model_name: product.model_name },
    variant: { size: variant.size, color: variant.color },
    stock: totalStock,
  };
}

export async function executeComparePeriod(args: { period: string }) {
  const { movements } = await listMovements({ limit: 500 });

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const tomorrow = new Date(today.getTime() + 86400000);

  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const thisMonday = new Date(today.getTime() + mondayOffset * 86400000);
  const lastMonday = new Date(thisMonday.getTime() - 7 * 86400000);
  const lastSunday = new Date(thisMonday.getTime() - 86400000);

  let periodAStart: Date, periodAEnd: Date, periodBStart: Date, periodBEnd: Date;
  let periodALabel: string, periodBLabel: string;

  if (args.period === 'today_vs_yesterday') {
    periodAStart = today;
    periodAEnd = tomorrow;
    periodBStart = yesterday;
    periodBEnd = today;
    periodALabel = 'Oggi';
    periodBLabel = 'Ieri';
  } else {
    periodAStart = thisMonday;
    periodAEnd = tomorrow;
    periodBStart = lastMonday;
    periodBEnd = lastSunday;
    periodALabel = 'Questa settimana';
    periodBLabel = 'Settimana scorsa';
  }

  const filterByPeriod = (start: Date, end: Date) =>
    movements.filter((m) => {
      const d = new Date(m.created_at);
      return d >= start && d < end;
    });

  const calcStats = (movs: typeof movements) => {
    const outbound = movs.filter((m) => m.movement_type === 'outbound');
    const inbound = movs.filter((m) => m.movement_type === 'inbound');
    const sales = outbound.length;
    const piecesSold = outbound.reduce((s, m) => s + Math.abs(Number(m.quantity)), 0);
    const loads = inbound.length;
    const piecesLoaded = inbound.reduce((s, m) => s + Math.abs(Number(m.quantity)), 0);
    return { sales, piecesSold, loads, piecesLoaded };
  };

  const statsA = calcStats(filterByPeriod(periodAStart, periodAEnd));
  const statsB = calcStats(filterByPeriod(periodBStart, periodBEnd));

  const salesDiff = statsB.sales === 0
    ? statsA.sales > 0 ? '+100%' : '0%'
    : `${((statsA.sales - statsB.sales) / statsB.sales * 100).toFixed(1)}%`;
  const piecesDiff = statsB.piecesSold === 0
    ? statsA.piecesSold > 0 ? '+100%' : '0%'
    : `${((statsA.piecesSold - statsB.piecesSold) / statsB.piecesSold * 100).toFixed(1)}%`;

  return {
    period_a: { label: periodALabel, ...statsA },
    period_b: { label: periodBLabel, ...statsB },
    comparison: {
      sales_change: salesDiff,
      pieces_sold_change: piecesDiff,
      better: statsA.sales >= statsB.sales,
    },
  };
}

/**
 * Dispatch a tool call by name.
 */
export async function executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'process_command':
      return executeProcessCommand(args as Parameters<typeof executeProcessCommand>[0]);
    case 'check_stock':
      return executeCheckStock(args as Parameters<typeof executeCheckStock>[0]);
    case 'daily_summary':
      return executeDailySummary();
    case 'process_document_image':
      return executeProcessDocumentImage(args as Parameters<typeof executeProcessDocumentImage>[0]);
    case 'search_by_barcode':
      return executeSearchByBarcode(args as Parameters<typeof executeSearchByBarcode>[0]);
    case 'compare_period':
      return executeComparePeriod(args as Parameters<typeof executeComparePeriod>[0]);
    default:
      return { error: `Tool sconosciuto: ${name}` };
  }
}
