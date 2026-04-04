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
        products_to_create: number;
        variants_to_create: number;
        existing_variants_linked: number;
        lines_skipped: number;
      };
      const alreadyExists = Boolean(payload.already_exists);

      setMessage(
        alreadyExists
          ? `Esiste gia una proposta collegata a questo documento. Aprila nella inbox per confermare e applicare i movimenti.`
          : `Proposta creata: ${summary.products_to_create} prodotti da creare, ${summary.variants_to_create} varianti da creare, ${summary.existing_variants_linked} righe gia collegate.`
      );

      startTransition(() => {
        router.push(`/dashboard/proposals`);
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
        {isPending ? 'Creazione proposta...' : 'Genera proposta da revisione'}
      </Button>

      {message ? <p className="text-xs text-green-700">{message}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
