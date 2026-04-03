'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DocumentStatus } from '@/types/database';

export function DocumentReviewActions({
  documentId,
  status,
}: {
  documentId: string;
  status: DocumentStatus;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const canParse = status !== 'processing' && status !== 'imported' && status !== 'approved';

  async function handleParse() {
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/documents/${documentId}/parse`, {
        method: 'POST',
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? 'Parsing non riuscito');
      }

      setMessage(`Parsing completato: ${payload.lines_count} righe rilevate.`);
      startTransition(() => {
        router.refresh();
      });
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : 'Parsing non riuscito');
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <div className="flex gap-2">
        {canParse ? (
          <Button onClick={handleParse} disabled={isPending} size="sm">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {isPending ? 'Parsing...' : status === 'uploaded' || status === 'failed' ? 'Avvia parsing' : 'Rilancia parsing'}
          </Button>
        ) : null}

        {!canParse ? (
          <Button
            onClick={() => startTransition(() => router.refresh())}
            disabled={isPending}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4" />
            Aggiorna
          </Button>
        ) : null}
      </div>

      {message ? <p className="text-xs text-green-700">{message}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
