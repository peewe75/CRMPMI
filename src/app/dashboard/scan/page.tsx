'use client';

import Link from 'next/link';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ScanBarcode, Search, Package, CheckCircle, XCircle } from 'lucide-react';
import { useBarcodeScanner } from '@/hooks/use-barcode-scanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';

export default function ScanPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [manualCode, setManualCode] = useState('');
  const [resolvedCode, setResolvedCode] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [result, setResult] = useState<{
    found: boolean;
    product?: { brand: string; model_name: string; id: string };
    variant?: { size: string; color: string; id: string };
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [justScanned, setJustScanned] = useState(false);

  const resolveBarcode = useCallback(async (code: string) => {
    setLoading(true);
    setResult(null);
    setResolvedCode(code);
    setJustScanned(false);

    if (navigator.vibrate) navigator.vibrate(50);

    try {
      const res = await fetch('/api/barcode/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode: code }),
      });
      const data = await res.json();
      setResult(data);
      setJustScanned(true);
      setTimeout(() => setJustScanned(false), 1000);

      if (data.found && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
    } catch {
      setResult({ found: false });
    } finally {
      setLoading(false);
    }
  }, []);

  const registerInbound = useCallback(async () => {
    if (!result?.found || !result.variant?.id) return;

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

      addToast({ type: 'success', title: 'Movimento registrato', description: `${quantity} pezzi caricati a magazzino` });
      if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registrazione non riuscita';
      addToast({ type: 'error', title: 'Errore', description: msg });
    } finally {
      setLoading(false);
    }
  }, [quantity, resolvedCode, result, addToast]);

  const { videoRef, isScanning, error, startScanning, stopScanning } =
    useBarcodeScanner(resolveBarcode);

  return (
    <div className="space-y-4 p-4">
      <h1 className="flex items-center gap-2 text-xl font-bold">
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
            {/* Viewfinder overlay with corner brackets */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative h-48 w-48">
                {/* Scan line animation */}
                <div
                  className="absolute left-0 right-0 h-0.5 bg-blue-400/80"
                  style={{
                    animation: 'scan-line 2s ease-in-out infinite',
                    boxShadow: '0 0 8px rgba(59,130,246,0.5)',
                  }}
                />
                {/* Corner brackets */}
                <div className="absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-blue-500" />
                <div className="absolute right-0 top-0 h-6 w-6 border-r-2 border-t-2 border-blue-500" />
                <div className="absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-blue-500" />
                <div className="absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-blue-500" />
                {/* Dimmed edges */}
                <div className="absolute inset-0 rounded-lg border-2 border-blue-500/30" />
              </div>
            </div>
            {/* Success flash */}
            {justScanned && (
              <div
                className="absolute inset-0 bg-green-500/20"
                style={{ animation: 'fade-in-up 0.3s ease-out' }}
              />
            )}
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
            <ScanBarcode className="mb-3 h-12 w-12 text-muted-foreground" />
            <Button onClick={startScanning}>Avvia Scanner</Button>
            {error && (
              <div className="mt-3 text-center">
                <p className="text-sm text-destructive">{error}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Consenti l&apos;accesso alla fotocamera nelle impostazioni del browser.
                </p>
              </div>
            )}
          </div>
        )}
      </Card>

      <Card>
        <p className="mb-2 text-sm font-medium">Inserimento manuale</p>
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
        <Card
          className="transition-all duration-300"
          style={{ animation: 'fade-in-up 0.3s ease-out' }}
        >
          {result.found ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-semibold text-green-600">Trovato!</span>
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
            </div>
          ) : (
            <div className="space-y-2 py-2 text-center">
              <div className="flex items-center justify-center gap-2">
                <XCircle className="h-5 w-5 text-red-400" />
                <p className="text-sm text-muted-foreground">Barcode non trovato nel catalogo.</p>
              </div>
              <Button asChild size="sm" variant="outline">
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
