'use client';

import Link from 'next/link';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ScanBarcode, Search, Package } from 'lucide-react';
import { useBarcodeScanner } from '@/hooks/use-barcode-scanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';

export default function ScanPage() {
  const router = useRouter();
  const [manualCode, setManualCode] = useState('');
  const [resolvedCode, setResolvedCode] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [result, setResult] = useState<{
    found: boolean;
    product?: { brand: string; model_name: string; id: string };
    variant?: { size: string; color: string; id: string };
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [movementMessage, setMovementMessage] = useState<string | null>(null);

  const resolveBarcode = useCallback(async (code: string) => {
    setLoading(true);
    setResult(null);
    setResolvedCode(code);
    setMovementMessage(null);

    try {
      const res = await fetch('/api/barcode/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode: code }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ found: false });
    } finally {
      setLoading(false);
    }
  }, []);

  const registerInbound = useCallback(async () => {
    if (!result?.found || !result.variant?.id) return;

    setMovementMessage(null);
    setLoading(true);

    try {
      const response = await fetch('/api/inventory/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variant_id: result.variant.id,
          movement_type: 'inbound',
          quantity,
          notes: `Carico da scanner barcode ${resolvedCode}`,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? 'Registrazione non riuscita');
      }

      setMovementMessage('Entrata di magazzino registrata con successo.');
    } catch (err) {
      setMovementMessage(err instanceof Error ? err.message : 'Registrazione non riuscita');
    } finally {
      setLoading(false);
    }
  }, [quantity, resolvedCode, result]);

  const { videoRef, isScanning, error, startScanning, stopScanning } =
    useBarcodeScanner(resolveBarcode);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <ScanBarcode className="h-5 w-5" /> Scanner Barcode
      </h1>

      <Card className="overflow-hidden">
        {isScanning ? (
          <div className="relative">
            <video
              ref={videoRef}
              className="w-full rounded-lg"
              playsInline
              muted
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-48 w-48 rounded-lg border-2 border-accent opacity-60" />
            </div>
            <Button
              onClick={stopScanning}
              variant="destructive"
              className="absolute bottom-3 left-1/2 -translate-x-1/2"
            >
              Ferma scansione
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center py-8">
            <ScanBarcode className="h-12 w-12 text-muted-foreground mb-3" />
            <Button onClick={startScanning}>Avvia Scanner</Button>
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          </div>
        )}
      </Card>

      <Card>
        <p className="text-sm font-medium mb-2">Inserimento manuale</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (manualCode.trim()) resolveBarcode(manualCode.trim());
          }}
          className="flex gap-2"
        >
          <Input
            value={manualCode}
            onChange={(event) => setManualCode(event.target.value)}
            placeholder="Digita barcode o SKU..."
            className="flex-1"
          />
          <Button type="submit" size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </form>
      </Card>

      {loading && (
        <div className="flex justify-center py-4">
          <Spinner />
        </div>
      )}

      {result && (
        <Card>
          {result.found ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-success" />
                <span className="font-semibold text-success">Trovato!</span>
              </div>
              <p className="text-sm font-medium">
                {result.product?.brand} {result.product?.model_name}
              </p>
              <p className="text-xs text-muted-foreground">
                Tg. {result.variant?.size} — {result.variant?.color}
              </p>
              <div className="pt-2">
                <label className="mb-1 block text-xs text-muted-foreground">Quantità da caricare</label>
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={() => router.push(`/dashboard/products/${result.product?.id}`)}
                >
                  Vedi prodotto
                </Button>
                <Button size="sm" variant="outline" onClick={registerInbound}>
                  Registra movimento
                </Button>
              </div>
              {movementMessage ? (
                <p className="pt-2 text-xs text-muted-foreground">{movementMessage}</p>
              ) : null}
            </div>
          ) : (
            <div className="text-center py-2">
              <p className="text-sm text-muted-foreground">Barcode non trovato nel catalogo.</p>
              <Button asChild size="sm" variant="outline" className="mt-2">
                <Link href={`/dashboard/quick-add?barcode=${encodeURIComponent(resolvedCode || manualCode)}`}>
                  Associa o crea variante
                </Link>
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
