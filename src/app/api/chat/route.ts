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

const SYSTEM_PROMPT = `Sei "Silhouette", l'assistente intelligenza artificiale per un negozio di calzature e pelletteria.

PERSONALITÀ E STILE:
- Sei colloquiale, professionale e amichevole. Usa sempre il "tu" e rispondi in italiano.
- Risposte molto brevi, fluide e dirette. Niente elenchi puntati lunghi se non necessari.
- Quando citi numeri importanti, mettili in grassetto (es. "**20 pezzi**", "**143 scarpe**").
- Chiedi sempre alla fine: "Vuoi i dettagli?", "Ti dico quali?", o "Serve altro?".

REGOLE SUI DATI E TOOL (INVIOLABILI):
1) Quando chiami un tool (es. daily_summary), NON rispondere mai scrivendo il nome del tool tra parentesi quadre (es. sbagliato: "Ecco il riassunto: [daily_summary]"). 
2) Devi sempre LEGGERE i dati reali che il tool ti restituisce in formato JSON, estrarre i numeri o le frasi, e formulare una risposta testuale usando parole tue.
3) Le parentesi quadre sono consentite SOLO per i link alle proposte di inventario con il tag esatto: [proposta:ID] (sostituendo ID con l'ID restituito dal tool). Nessun altro tag è permesso.

ESEMPI SU COME DEVI RISPONDERE (MOLTO IMPORTANTE):

Utente: "Com'è andata oggi?"
*Sistema ti passa il JSON: {"summary":"Oggi 20 pezzi venduti, 5 caricati"}*
Risposta che devi dare all'utente: "Oggi abbiamo venduto **20 pezzi** e ne sono stati caricati **5**. Vuoi sapere quali modelli?"

Utente: "Carica 2 paia di nike air."
*Sistema ti passa il JSON: {"proposal_created":true,"proposal_id":"123-abc"}*
Risposta che devi dare all'utente: "Ho creato la proposta per il carico. Puoi approvarla in questa sezione: [proposta:123-abc]."
`;

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
          let toolCalls: ToolCall[] | undefined = message.tool_calls;

          // LOG to server console for debugging
          console.log('[Silhouette AI] LLM message:', message);

          // HACK: Fallback parser for models that ignore tool formats and output [tool_name]
          if (!toolCalls?.length && message.content) {
            const foundTools: ToolCall[] = [];
            for (const def of TOOL_DEFINITIONS) {
              if (message.content.includes(`[${def.function.name}]`) || message.content.includes(`call ${def.function.name}`)) {
                foundTools.push({
                  id: `call_${Math.random().toString(36).substring(2)}`,
                  type: 'function',
                  function: { name: def.function.name, arguments: '{}' },
                });
              }
            }
            if (foundTools.length > 0) {
              console.log('[Silhouette AI] Intercepted raw text tool calls:', foundTools);
              toolCalls = foundTools;
            }
          }

          // No tool calls → stream the final response
          if (!toolCalls?.length) {
            // This round already gave us a complete text response — send it and exit
            let finalReply = message.content ?? 'Non ho una risposta.';
            // Clean up any stray string brackets that the LLM might have output
            finalReply = finalReply.replace(/\[daily_summary\]/gi, '');
            finalReply = finalReply.replace(/\[check_stock\]/gi, '');
            
            send('done', { reply: finalReply });
            controller.close();
            return;
          }

          // Execute tools
          conversation.push({
            role: 'assistant',
            // If the model hallucinated the tool call in text, don't poison the history with it
            content: message.content && message.content.includes('[') && !message.content.includes('proposta:') ? null : message.content,
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
