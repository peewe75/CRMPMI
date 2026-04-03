'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, MicOff, Check, RotateCcw } from 'lucide-react';
import { useVoiceInput } from '@/hooks/use-voice-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import type { VoiceParseResult } from '@/types/documents';

interface VoiceFormState {
  brand: string;
  model_name: string;
  size: string;
  color: string;
  quantity: string;
  category: string;
}

const EMPTY_FORM: VoiceFormState = {
  brand: '',
  model_name: '',
  size: '',
  color: '',
  quantity: '1',
  category: 'general',
};

export default function VoicePage() {
  const router = useRouter();
  const { isListening, transcript, error, isSupported, startListening, stopListening, resetTranscript } =
    useVoiceInput();

  const [parsed, setParsed] = useState<VoiceParseResult | null>(null);
  const [form, setForm] = useState<VoiceFormState>(EMPTY_FORM);
  const [manualText, setManualText] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isParsing, startParsing] = useTransition();
  const [isSaving, startSaving] = useTransition();

  function updateForm<K extends keyof VoiceFormState>(key: K, value: VoiceFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function syncForm(data: VoiceParseResult) {
    setForm({
      brand: data.brand ?? '',
      model_name: data.model_name ?? '',
      size: data.size ?? '',
      color: data.color ?? '',
      quantity: String(data.quantity ?? 1),
      category: 'general',
    });
  }

  function handleParse(text: string) {
    startParsing(async () => {
      const res = await fetch('/api/voice/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      setParsed(data);
      syncForm(data);
      setSaveError(null);
    });
  }

  function handleReset() {
    setParsed(null);
    resetTranscript();
    setManualText('');
    setSaveError(null);
    setForm(EMPTY_FORM);
  }

  function handleConfirmCreate() {
    setSaveError(null);

    startSaving(async () => {
      const response = await fetch('/api/products/quick-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: form.brand,
          model_name: form.model_name,
          category: form.category,
          size: form.size,
          color: form.color,
          quantity: form.quantity,
          notes: `Creazione da input vocale: ${parsed?.raw_text ?? ''}`,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setSaveError(payload.error ?? 'Creazione non riuscita');
        return;
      }

      router.push(`/dashboard/products/${payload.product_id}`);
      router.refresh();
    });
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <Mic className="h-5 w-5" /> Input Vocale
      </h1>

      <Card className="flex flex-col items-center py-6">
        {isSupported ? (
          <>
            <button
              onClick={isListening ? stopListening : startListening}
              className={`flex h-20 w-20 items-center justify-center rounded-full transition ${
                isListening
                  ? 'bg-destructive text-white animate-pulse'
                  : 'bg-accent text-accent-foreground'
              }`}
            >
              {isListening ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
            </button>
            <p className="mt-3 text-sm text-muted-foreground">
              {isListening ? 'Sto ascoltando...' : 'Tocca per parlare'}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Riconoscimento vocale non supportato. Usa il campo testo.
          </p>
        )}

        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

        {transcript && (
          <div className="mt-4 w-full">
            <p className="text-sm font-medium mb-1">Trascrizione:</p>
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
        <p className="text-sm font-medium mb-2">Oppure scrivi manualmente</p>
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
            placeholder="Es: adidas samba 43 bianca 2 pezzi"
            className="flex-1"
          />
          <Button type="submit" disabled={isParsing}>
            Analizza
          </Button>
        </form>
      </Card>

      {parsed && (
        <Card className="space-y-3">
          <h2 className="font-semibold">Dati estratti</h2>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <label className="text-muted-foreground">Brand</label>
              <Input value={form.brand} onChange={(event) => updateForm('brand', event.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-muted-foreground">Modello</label>
              <Input value={form.model_name} onChange={(event) => updateForm('model_name', event.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-muted-foreground">Taglia</label>
              <Input value={form.size} onChange={(event) => updateForm('size', event.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-muted-foreground">Colore</label>
              <Input value={form.color} onChange={(event) => updateForm('color', event.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-muted-foreground">Quantità</label>
              <Input
                type="number"
                min="0"
                value={form.quantity}
                onChange={(event) => updateForm('quantity', event.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex items-end">
              <p className="text-xs text-muted-foreground">
                Confidenza: {(parsed.confidence * 100).toFixed(0)}%
              </p>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-muted-foreground">Categoria</label>
            <select
              value={form.category}
              onChange={(event) => updateForm('category', event.target.value)}
              className="flex h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
            >
              <option value="general">General</option>
              <option value="scarpe">Scarpe</option>
              <option value="abbigliamento">Abbigliamento</option>
              <option value="accessori">Accessori</option>
            </select>
          </div>

          {saveError ? <p className="text-sm text-destructive">{saveError}</p> : null}

          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={handleConfirmCreate} disabled={isSaving}>
              <Check className="h-4 w-4 mr-1" /> {isSaving ? 'Creazione...' : 'Conferma e crea'}
            </Button>
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
