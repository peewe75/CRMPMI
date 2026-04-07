import { NextResponse } from 'next/server';
import { requireFeatureEnabled } from '@/lib/auth/feature-flags';
import { TOOL_DEFINITIONS, executeTool } from '@/modules/assistant/application/assistant-tools';
import {
  executeDailySummary,
  executeCheckStock,
  executeComparePeriod,
} from '@/modules/assistant/application/assistant-tools';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// ─── Rate Limiter ───
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 15;
const RATE_WINDOW = 60_000;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT) return false;

  entry.count++;
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}, 5 * 60_000);

const FREE_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemma-3-27b-it:free',
];
const MAX_TOOL_ROUNDS = 3;

function getModels() {
  const custom = process.env.OPENROUTER_MODEL;
  return custom ? [custom, ...FREE_MODELS] : FREE_MODELS;
}

const TOOL_STATUS_LABELS: Record<string, string> = {
  process_command: 'Interpreto il comando...',
  check_stock: 'Controllo le giacenze...',
  daily_summary: 'Preparo il riassunto...',
  process_document_image: 'Analizzo il documento...',
  search_by_barcode: 'Cerco il prodotto...',
  compare_period: 'Confronto i periodi...',
};

// ─── System prompt ───
// NOTE: We do NOT mention tool names or brackets anywhere.
// The LLM will receive pre-fetched data inline and just needs to talk about it.
const SYSTEM_PROMPT = `Sei "Silhouette", l'assistente AI di un negozio di calzature e pelletteria.

PERSONALITÀ:
- Parli in italiano, dai del "tu", sei amichevole e diretto.
- Risposte CORTISSIME (2-3 frasi al massimo). Mai elenchi puntati. Mai spiegoni.
- Numeri importanti in grassetto: "**20 pezzi**", "**3 modelli**".
- Chiudi con una domanda breve: "Vuoi i dettagli?", "Serve altro?", "Ti dico quali?".

COSA PUOI FARE (ma NON dirlo con termini tecnici):
- Controllare giacenze e stock
- Riassumere vendite e movimenti del giorno
- Caricare/scaricare merce tramite comandi vocali o testuali
- Analizzare fatture/DDT da foto caricate

INTERFACCIA UTENTE — FUNZIONALITÀ DISPONIBILI:
- L'utente ha un tasto 📎 (graffetta) accanto al campo di testo per allegare foto o PDF.
- Se l'utente vuole scansionare un DDT o una fattura, digli di usare il tasto 📎 per allegare la foto. Esempio: "Usa il tasto 📎 qui sotto per allegare la foto del DDT e lo analizzo subito!"
- Se l'utente allega un file, il messaggio conterrà "📎" e un ID traccia. In quel caso analizza il documento.

REGOLE INVIOLABILI:
1. MAI usare termini tecnici: niente "ID documento", "proposal_type", "inbound/outbound/adjustment", "variant_id", "store_id". L'utente è un negoziante, NON un programmatore.
2. MAI mostrare codici, ID o JSON. Se il sistema ti dà un ID proposta, mostralo SOLO come link: [proposta:ID].
3. Quando il messaggio contiene "--- DATI DAL SISTEMA ---", quei dati sono REALI. Usali per formulare una risposta discorsiva. Non ripetere mai il JSON.
4. NON inventare dati. Se non hai info, dì "Non riesco a recuperare i dati al momento."
5. Per un carico merce testuale, chiedi SOLO: marca, modello, taglia, colore e quantità. Nient'altro.
`;

// ─── Intent Detection (keyword-based) ───
// This is the KEY innovation: instead of relying on the LLM to call tools,
// we detect the intent ourselves and pre-fetch the data.

interface PrefetchResult {
  toolName: string;
  data: unknown;
}

async function detectAndPrefetch(userMessage: string): Promise<PrefetchResult | null> {
  const lower = userMessage.toLowerCase().trim();

  // Daily summary intent
  if (
    lower.includes('andata oggi') ||
    lower.includes('riassunto') ||
    lower.includes('sommario') ||
    lower.includes('com\'è andata') ||
    lower.includes('come è andata') ||
    lower.includes('vendite di oggi') ||
    lower.includes('vendite oggi') ||
    lower.includes('movimenti di oggi') ||
    lower.includes('giornata') ||
    lower.includes('oggi come') ||
    lower.includes('com\'è la giornata') ||
    (lower.includes('oggi') && (lower.includes('vendut') || lower.includes('caricat') || lower.includes('moviment')))
  ) {
    console.log('[Silhouette AI] Intent detected: daily_summary');
    const data = await executeDailySummary();
    return { toolName: 'daily_summary', data };
  }

  // Compare period intent
  if (
    lower.includes('confronta') ||
    lower.includes('confronto') ||
    lower.includes('rispetto a ieri') ||
    lower.includes('vs ieri') ||
    lower.includes('settimana scorsa') ||
    lower.includes('ieri vs oggi') ||
    lower.includes('paragone')
  ) {
    console.log('[Silhouette AI] Intent detected: compare_period');
    const period = lower.includes('settimana') ? 'this_week_vs_last_week' : 'today_vs_yesterday';
    const data = await executeComparePeriod({ period });
    return { toolName: 'compare_period', data };
  }

  // Stock check intent
  if (
    lower.includes('giacenz') ||
    lower.includes('quante ne abbiamo') ||
    lower.includes('quanti ne abbiamo') ||
    lower.includes('in magazzino') ||
    lower.includes('stock') ||
    lower.includes('inventario')
  ) {
    console.log('[Silhouette AI] Intent detected: check_stock');
    const data = await executeCheckStock({});
    return { toolName: 'check_stock', data };
  }

  return null;
}

// ─── Types ───

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

// Non-streaming call — used during tool loop rounds
async function callLLM(messages: ChatMessage[]) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY non configurata');

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  };

  for (const model of getModels()) {
    const res = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages,
        tools: TOOL_DEFINITIONS,
        tool_choice: 'auto',
        temperature: 0.3,
        max_tokens: 1024,
      }),
    });

    if (res.ok) return res.json();

    if (res.status === 429 || res.status === 404 || res.status === 402) {
      console.warn(`[OpenRouter] ${model} → ${res.status}, trying next`);
      continue;
    }

    throw new Error(`LLM non disponibile (${res.status})`);
  }

  throw new Error('Modelli AI temporaneamente non disponibili. Riprova tra poco.');
}

// Simple non-streaming call WITHOUT tools — used for final formatting
async function callLLMSimple(messages: ChatMessage[]) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY non configurata');

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  };

  for (const model of getModels()) {
    const res = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.4,
        max_tokens: 512,
        // NO tools — just text formatting
      }),
    });

    if (res.ok) return res.json();

    if (res.status === 429 || res.status === 404 || res.status === 402) {
      console.warn(`[OpenRouter simple] ${model} → ${res.status}, trying next`);
      continue;
    }

    throw new Error(`LLM non disponibile (${res.status})`);
  }

  throw new Error('Modelli AI temporaneamente non disponibili. Riprova tra poco.');
}

// ─── POST Route Handler ───

export async function POST(request: Request) {
  try {
    await requireFeatureEnabled('voice_input', 'assistente vocale');
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unauthorized';
    return NextResponse.json({ error: msg }, { status: 403 });
  }

  const clientId = request.headers.get('x-clerk-user-id') ?? request.headers.get('x-forwarded-for') ?? 'anonymous';
  if (!checkRateLimit(clientId)) {
    return NextResponse.json(
      { error: 'Troppe richieste. Riprova tra qualche secondo.' },
      { status: 429 }
    );
  }

  let body: { messages?: Array<{ role: string; content: string }> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON non valido' }, { status: 400 });
  }

  const userMessages = body.messages;
  if (!Array.isArray(userMessages) || !userMessages.length) {
    return NextResponse.json({ error: 'messages è obbligatorio' }, { status: 400 });
  }

  // Get the last user message for intent detection
  const lastUserMsg = userMessages[userMessages.length - 1]?.content ?? '';

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // ══════════════════════════════════════════════════════
        // STEP 1: Try to detect intent and pre-fetch data
        // This bypasses unreliable LLM tool calling entirely.
        // ══════════════════════════════════════════════════════
        const prefetched = await detectAndPrefetch(lastUserMsg).catch((err) => {
          console.warn('[Silhouette AI] Prefetch failed:', err);
          return null;
        });

        if (prefetched) {
          // We got data! Now send it to the LLM as inline context
          // and ask it to just format a nice response.
          send('status', { text: TOOL_STATUS_LABELS[prefetched.toolName] ?? 'Elaboro...' });

          const dataJson = JSON.stringify(prefetched.data, null, 2);
          console.log(`[Silhouette AI] Prefetched ${prefetched.toolName}:`, dataJson.substring(0, 300));

          const messagesForLLM: ChatMessage[] = [
            { role: 'system', content: SYSTEM_PROMPT },
            // Include conversation history (all but the last message)
            ...userMessages.slice(0, -1).map((m) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
            })),
            // Inject the last user message with pre-fetched data appended
            {
              role: 'user',
              content: `${lastUserMsg}\n\n--- DATI DAL SISTEMA ---\n${dataJson}\n--- FINE DATI ---\n\nRispondimi in modo discorsivo usando i dati qui sopra. NON scrivere JSON, NON scrivere nomi di funzioni. Solo una risposta naturale in italiano.`,
            },
          ];

          send('status', { text: 'Preparo la risposta...' });

          const completion = await callLLMSimple(messagesForLLM);
          const reply = completion.choices?.[0]?.message?.content ?? 'Non sono riuscito a elaborare i dati.';

          // Sanitize: remove any accidental bracket tool names
          const cleanReply = reply
            .replace(/\[daily_summary\]/gi, '')
            .replace(/\[check_stock\]/gi, '')
            .replace(/\[compare_period\]/gi, '')
            .replace(/\[process_command\]/gi, '')
            .trim();

          send('done', { reply: cleanReply || 'Dati elaborati ma nessuna risposta generata.' });
          controller.close();
          return;
        }

        // ══════════════════════════════════════════════════════
        // STEP 2: No prefetch match — fall back to standard
        // tool-calling flow for complex commands (process_command,
        // process_document_image, search_by_barcode).
        // ══════════════════════════════════════════════════════

        const conversation: ChatMessage[] = [
          { role: 'system', content: SYSTEM_PROMPT },
          ...userMessages.map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
        ];

        let round = 0;
        while (round < MAX_TOOL_ROUNDS) {
          round++;

          const completion = await callLLM(conversation);
          const choice = completion.choices?.[0];
          if (!choice) {
            send('done', { reply: 'Non sono riuscito a elaborare la richiesta.' });
            controller.close();
            return;
          }

          const message = choice.message;
          let toolCalls: ToolCall[] | undefined = message.tool_calls;

          console.log('[Silhouette AI] LLM message (round', round, '):', JSON.stringify(message).substring(0, 500));

          // HACK: Fallback parser for models that write [tool_name] as text
          if (!toolCalls?.length && message.content) {
            const foundTools: ToolCall[] = [];
            for (const def of TOOL_DEFINITIONS) {
              const name = def.function.name;
              if (message.content.includes(`[${name}]`) || message.content.includes(`call ${name}`)) {
                foundTools.push({
                  id: `call_${Math.random().toString(36).substring(2)}`,
                  type: 'function',
                  function: { name, arguments: '{}' },
                });
              }
            }
            if (foundTools.length > 0) {
              console.log('[Silhouette AI] Intercepted text-based tool calls:', foundTools.map(t => t.function.name));
              toolCalls = foundTools;
            }
          }

          // No tool calls → final response
          if (!toolCalls?.length) {
            let finalReply = message.content ?? 'Non ho una risposta.';
            // Clean any stray bracket artifacts
            finalReply = finalReply.replace(/\[(daily_summary|check_stock|compare_period|process_command|search_by_barcode|process_document_image)\]/gi, '');
            send('done', { reply: finalReply.trim() });
            controller.close();
            return;
          }

          // Execute tool calls
          conversation.push({
            role: 'assistant',
            content: null, // Don't pass hallucinated text back
            tool_calls: toolCalls,
          });

          for (const toolCall of toolCalls) {
            const toolName = toolCall.function.name;
            send('status', { text: TOOL_STATUS_LABELS[toolName] ?? 'Elaboro...' });

            let args: Record<string, unknown>;
            try {
              args = JSON.parse(toolCall.function.arguments);
            } catch {
              args = {};
            }

            let result: unknown;
            try {
              result = await executeTool(toolName, args);
            } catch (err) {
              result = { error: err instanceof Error ? err.message : 'Errore tool' };
            }

            conversation.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(result),
            });
          }

          // Continue loop — next round will generate final response
        }

        // After max tool rounds, get final response without tools
        send('status', { text: 'Preparo la risposta...' });
        const finalCompletion = await callLLMSimple(conversation);
        const finalText = finalCompletion.choices?.[0]?.message?.content ?? 'Ho completato le operazioni.';
        send('done', { reply: finalText });

      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Errore sconosciuto';
        console.error('[Chat API Error]', msg);
        send('error', { text: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
