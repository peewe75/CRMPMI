import { NextResponse } from 'next/server';
import { requireFeatureEnabled } from '@/lib/auth/feature-flags';
import { TOOL_DEFINITIONS, executeTool } from '@/modules/assistant/application/assistant-tools';

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
  'arcee-ai/trinity-large-preview:free',
  'stepfun/step-3.5-flash:free',
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

const SYSTEM_PROMPT = `Sei "Silhouette", l'assistente di un negozio di calzature e pelletteria. Parli con il titolare o un commesso che lavora in negozio.

PERSONALITÀ:
- Sei colloquiale, simpatico e professionale. Come un collega fidato.
- Se l'utente ti saluta, rispondi con naturalezza: "Ciao! Dimmi pure" o "Eccomi, cosa ti serve?". Non elencare le tue funzionalità a meno che non te lo chieda.
- Usa il "tu". Niente formalità eccessive.
- Rispondi SEMPRE in italiano.

STILE:
- Risposte brevi e dirette, come se parlassi ad alta voce. No tabelle, no elenchi puntati.
- Quando dai un dato numerico importante, mettilo in grassetto con **numero**. Esempi: "Hai **143 scarpe**", "Oggi hai venduto **8 pezzi**", "Restano **3 paia** del 42".
- Metti in grassetto anche nomi di categorie chiave se utile: "**Scarpe donna**: 89 pezzi, **Scarpe uomo**: 54 pezzi."
- Usa il grassetto con parsimonia: solo per numeri e termini davvero importanti, non per tutto.
- Alla fine chiedi sempre se vuole saperne di più: "Vuoi i dettagli?", "Ti dico quali?", "Serve altro?".
- Quando l'utente conferma ("sì", "ok", "vai", "crea la proposta"), esegui subito senza richiedere conferma.

REGOLE:
- NON creare MAI movimenti di magazzino direttamente. Crea sempre una Proposta in stato "pending_review" e avvisa l'utente di approvarla dalla sezione Proposte.
- Quando crei una proposta, includi SEMPRE nella risposta il testo esatto "[proposta:ID]" sostituendo ID con il proposal_id restituito dal tool. Esempio: "Ho creato la proposta [proposta:abc-123]. Vai nella sezione Proposte per approvarla!"
- IMPORTANTE: Non usare MAI parentesi quadre inventando tag come "[daily_summary]" o "[check_stock]". Usa le parentesi quadre SOLO ed ESCLUSIVAMENTE per le proposte. Per il resto, leggi i dati restituiti dal tool e scrivili a parole tue.

TOOL:
- Giacenze e stock: usa check_stock. Filtra per categoria usando "by_category" (scarpe, borse, accessori, abbigliamento).
- Carico/scarico/rettifica: usa process_command. Quando l'utente vuole procedere, passa create_proposal=true.
- Riassunto giornata: usa daily_summary. Riporta i numeri effettivi restituiti ("venduti:", "caricati:").
- Fattura o documento caricato: usa process_document_image.
- Codice a barre: usa search_by_barcode. L'utente dice "cerca barcode 8012345678901" o simile.
- Confronto periodi: usa compare_period. L'utente chiede "com'è andata oggi rispetto a ieri?" o "confronta questa settimana con la scorsa".
- Domande generiche, saluti, chiacchiere: rispondi direttamente senza tool.`;

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

    if (res.status === 429 || res.status === 404) {
      console.warn(`[OpenRouter] ${model} → ${res.status}, trying next`);
      continue;
    }

    throw new Error(`LLM non disponibile (${res.status})`);
  }

  throw new Error('Modelli AI temporaneamente non disponibili. Riprova tra poco.');
}

// Streaming call — used for final response
async function callLLMStream(messages: ChatMessage[]) {
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
        stream: true,
      }),
    });

    if (res.ok) return res;

    if (res.status === 429 || res.status === 404) {
      console.warn(`[OpenRouter] stream ${model} → ${res.status}, trying next`);
      continue;
    }

    throw new Error(`LLM non disponibile (${res.status})`);
  }

  throw new Error('Modelli AI temporaneamente non disponibili. Riprova tra poco.');
}

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

  const conversation: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...userMessages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  ];

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // Tool loop — non-streaming rounds
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
          const toolCalls: ToolCall[] | undefined = message.tool_calls;

          // No tool calls → stream the final response
          if (!toolCalls?.length) {
            // This round already gave us a complete text response — send it and exit
            send('done', { reply: message.content ?? 'Non ho una risposta.' });
            controller.close();
            return;
          }

          // Execute tools
          conversation.push({
            role: 'assistant',
            content: message.content ?? null,
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

        // After tool rounds, stream the final LLM response
        send('status', { text: 'Preparo la risposta...' });

        const streamRes = await callLLMStream(conversation);
        const reader = streamRes.body?.getReader();
        if (!reader) {
          send('done', { reply: 'Errore nella risposta.' });
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const payload = line.slice(6).trim();
            if (payload === '[DONE]') continue;

            try {
              const chunk = JSON.parse(payload);
              const delta = chunk.choices?.[0]?.delta?.content;
              if (delta) {
                fullText += delta;
                send('delta', { text: delta });
              }
            } catch {
              // skip malformed chunks
            }
          }
        }

        send('done', { reply: fullText || 'Ho completato le operazioni.' });
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
