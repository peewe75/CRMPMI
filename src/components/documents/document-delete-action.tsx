'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DocumentStatus } from '@/types/database';

export function DocumentDeleteAction({
  documentId,
  documentStatus,
  redirectTo,
  buttonLabel = 'Elimina',
  variant = 'outline',
}: {
  documentId: string;
  documentStatus: DocumentStatus;
  redirectTo?: string;
  buttonLabel?: string;
  variant?: 'outline' | 'destructive';
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const importedWarning =
      documentStatus === 'imported'
        ? '\n\nIl documento risulta gia importato: i movimenti resteranno nel magazzino, ma il collegamento al documento verra rimosso.'
        : '';

    const confirmed = window.confirm(
      `Vuoi eliminare definitivamente questo documento?${importedWarning}`
    );

    if (!confirmed) {
      return;
    }

    setError(null);

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? 'Eliminazione non riuscita');
      }

      startTransition(() => {
        if (redirectTo) {
          router.push(redirectTo);
          return;
        }

        router.refresh();
      });
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Eliminazione non riuscita');
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <Button onClick={handleDelete} disabled={isPending} variant={variant} size="sm">
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        {isPending ? 'Eliminazione...' : buttonLabel}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
