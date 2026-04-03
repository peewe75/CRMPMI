'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DocumentStatus } from '@/types/database';

export function DocumentImportActions({
  documentId,
  status,
  lineCount,
}: {
  documentId: string;
  status: DocumentStatus;
  lineCount: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const canImport = lineCount > 0 && ['parsed', 'needs_review', 'approved'].includes(status);

  async function handleImport() {
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/documents/${documentId}/confirm-import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? 'Import non riuscito');
      }

      const summary = payload.summary as {
        products_created: number;
        variants_created: number;
        variants_updated: number;
        movements_created: number;
        lines_skipped: number;
      };

      setMessage(
        `Import completato: ${summary.products_created} prodotti, ${summary.variants_created} varianti nuove, ${summary.movements_created} movimenti.`
      );

      startTransition(() => {
        router.refresh();
      });
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Import non riuscito');
    }
  }

  if (!canImport) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <Button onClick={handleImport} disabled={isPending} size="sm">
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        {isPending ? 'Import in corso...' : 'Importa in catalogo'}
      </Button>

      {message ? <p className="text-xs text-green-700">{message}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
