'use client';

import { useMemo, useState, useTransition, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, MicOff, Check, RotateCcw, Search, ClipboardCheck } from 'lucide-react';
import { useVoiceInput } from '@/hooks/use-voice-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import type { VoiceParseResult } from '@/types/documents';

function AudioWaveform({ isActive }: { isActive: boolean }) {
  const bars = 24;
  return (
    <div className="flex h-16 items-center justify-center gap-0.5">
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className="w-1 rounded-full bg-blue-500"
          style={{
            height: isActive ? undefined : '4px',
            animation: isActive ? `waveform-bar 0.8s ease-in-out ${i * 0.04}s infinite alternate` : undefined,
            minHeight: '4px',
            maxHeight: isActive ? '48px' : '4px',
            transition: isActive ? undefined : 'all 0.3s ease',
          }}
        />
      ))}
    </div>
  );
}

export default function VoicePage() {
  const router = useRouter();
  const { addToast } = useToast();
  const { isListening, transcript, error, isSupported, startListening, stopListening, resetTranscript } =
    useVoiceInput();

  const [parsed, setParsed] = useState<VoiceParseResult | null>(null);
  const [manualText, setManualText] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isParsing, startParsing] = useTransition();
  const [isSaving, startSaving] = useTransition();
  const waveformRef = useRef<HTMLDivElement>(null);
  const isMutationIntent = useMemo(
    () => parsed ? ['inventory_inbound', 'inventory_outbound', 'inventory_adjustment'].includes(parsed.intent) : false,
    [parsed]
  );

  const handleParse = useCallback((text: string) => {
    startParsing(async () => {
      const res = await fetch('/api/voice/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      setParsed(data);
      setSaveError(null);
    });
  }, []);

  function handleReset() {
    setParsed(null);
    resetTranscript();
    setManualText('');
    setSaveError(null);
  }

  function handleConfirmAction() {
    if (!parsed || !isMutationIntent) return;
    setSaveError(null);

    startSaving(async () => {
      const response = await fetch('/api/voice/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: parsed.raw_text,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setSaveError(payload.error ?? 'Creazione non riuscita');
        return;
      }

      addToast({ type: 'success', title: 'Proposta creata', description: 'Vai alla sezione Proposte per approvarla' });
      router.push('/dashboard/proposals');
      router.refresh();
    });
  }

  useEffect(() => {
    if (isListening && navigator.vibrate) {
      navigator.vibrate(30);
    }
  }, [isListening]);

  const INTENT_LABELS: Record<string, string> = {
    inventory_inbound: 'Carico magazzino',
    inventory_outbound: 'Scarico / Vendita',
    inventory_adjustment: 'Rettifica',
    stock_lookup: 'Ricerca giacenza',
    product_search: 'Ricerca prodotto',
    greeting: 'Saluto',
  };

  return (
    <div className="space-y-4 p-4">
      <h1 className="flex items-center gap-2 text-xl font-bold">
        <Mic className="h-5 w-5" /> Input Vocale
      </h1>

      <Card className="flex flex-col items-center py-6">
        {isSupported ? (
          <>
            <button
              onClick={isListening ? stopListening : startListening}
              className={`flex h-20 w-20 items-center justify-center rounded-full transition-all ${
                isListening
                  ? 'animate-pulse bg-red-500 text-white shadow-lg shadow-red-500/30'
                  : 'bg-blue-500 text-white hover:bg-blue-400'
              }`}
            >
              {isListening ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
            </button>
            <p className="mt-3 text-sm text-muted-foreground">
              {isListening ? 'Sto ascoltando...' : 'Tocca per parlare'}
            </p>

            {/* Waveform visualization */}
            <div ref={waveformRef} className="mt-4 w-full px-6">
              <AudioWaveform isActive={isListening} />
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Riconoscimento vocale non supportato. Usa il campo testo.
          </p>
        )}

        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

        {transcript && (
          <div className="mt-4 w-full">
            <p className="mb-1 text-sm font-medium">Trascrizione:</p>
            <p className="rounded-lg bg-muted p-3 text-sm italic">&ldquo;{transcript}&rdquo;</p>
            <Button
              onClick={() => handleParse(transcript)}
              disabled={isParsing}
              className="mt-2 w-full"
            >
              {isParsing ? <Spinner className="h-4 w-4" /> : 'Analizza'}
            </Button>
          </div>
        )}
      </Card>

      <Card>
        <p className="mb-2 text-sm font-medium">Oppure scrivi manualmente</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (manualText.trim()) handleParse(manualText.trim());
          }}
          className="flex gap-2"
        >
          <Input
            value={manualText}
            onChange={(event) => setManualText(event.target.value)}
            placeholder="Es: vendute 2 nike js numero 44"
            className="flex-1"
          />
          <Button type="submit" disabled={isParsing}>
            Analizza
          </Button>
        </form>
      </Card>

      {parsed && (
        <Card className="space-y-3" style={{ animation: 'fade-in-up 0.3s ease-out' }}>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Interpretazione</h2>
            <p className="text-xs text-muted-foreground">
              Confidenza: {(parsed.confidence * 100).toFixed(0)}%
            </p>
          </div>

          <div className="rounded-lg border border-border p-3 text-sm">
            <p>
              <span className="font-medium">Intent:</span>{' '}
              {INTENT_LABELS[parsed.intent] ?? parsed.intent}
            </p>
            <p>
              <span className="font-medium">Richiede review:</span>{' '}
              {parsed.needs_review ? 'sì' : 'no'}
            </p>
            {parsed.command.warnings.length > 0 && (
              <p className="mt-2 text-xs text-amber-700">
                {parsed.command.warnings.join(' - ')}
              </p>
            )}
          </div>

          <div className="space-y-2">
            {parsed.command.items.map((item) => (
              <div key={item.line_index} className="rounded-lg border border-border p-3 text-sm">
                <p className="font-medium">
                  {item.brand ?? 'Articolo'} {item.model_name ?? ''}
                </p>
                <p className="text-muted-foreground">
                  Tg. {item.size ?? '-'} - Colore {item.color ?? '-'} - Qta {item.quantity_delta ?? item.quantity ?? '-'}
                </p>
                <p className="mt-1 text-xs">
                  Match catalogo:{' '}
                  {item.match_status === 'matched'
                    ? `ok${item.matched_label ? ` - ${item.matched_label}` : ''}`
                    : item.match_status === 'weak_match'
                      ? `da verificare${item.matched_label ? ` - ${item.matched_label}` : ''}`
                      : 'nessuna corrispondenza credibile'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Confidenza item: {(item.confidence * 100).toFixed(0)}%
                </p>
              </div>
            ))}
          </div>

          {parsed.lookup_result && (
            <div className="space-y-2 rounded-lg border border-border p-3 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <Search className="h-4 w-4" /> Risultato lookup
              </div>
              <p>{parsed.lookup_result.summary}</p>
              {parsed.lookup_result.exact_matches.map((match) => (
                <p key={match.variant_id} className="text-muted-foreground">
                  {match.brand} {match.model_name} Tg. {match.size} {match.color}: {match.quantity}
                </p>
              ))}
              {parsed.lookup_result.exact_matches.length === 0 &&
                parsed.lookup_result.similar_matches.map((match) => (
                  <p key={match.variant_id} className="text-muted-foreground">
                    Simile: {match.brand} {match.model_name} Tg. {match.size} {match.color}: {match.quantity}
                  </p>
                ))}
            </div>
          )}

          {saveError && <p className="text-sm text-destructive">{saveError}</p>}

          <div className="flex gap-2 pt-2">
            {isMutationIntent ? (
              <Button className="flex-1" onClick={handleConfirmAction} disabled={isSaving}>
                <ClipboardCheck className="mr-1 h-4 w-4" />{' '}
                {isSaving ? 'Creazione proposta...' : 'Conferma e crea proposta'}
              </Button>
            ) : (
              <Button className="flex-1" variant="outline" onClick={() => router.push('/dashboard/inventory')}>
                <Check className="mr-1 h-4 w-4" /> Apri magazzino
              </Button>
            )}
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
