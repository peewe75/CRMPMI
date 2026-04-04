'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function ProposalCardActions({
  proposalId,
  status,
}: {
  proposalId: string;
  status: 'pending_review' | 'approved' | 'rejected' | 'applied';
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function runAction(action: 'approve' | 'apply' | 'reject') {
    setError(null);

    try {
      const response = await fetch(`/api/proposals/${proposalId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: action === 'reject' ? JSON.stringify({ reason: 'Rifiutata da inbox proposta' }) : undefined,
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? `Operazione ${action} non riuscita`);
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Operazione non riuscita');
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {status === 'pending_review' ? (
          <Button asChild size="sm" variant="outline">
            <Link href={`/dashboard/proposals/${proposalId}`}>Apri review</Link>
          </Button>
        ) : null}
        {status === 'approved' ? (
          <Button size="sm" disabled={isPending} onClick={() => runAction('apply')}>
            Applica
          </Button>
        ) : null}
        {status !== 'rejected' && status !== 'applied' ? (
          <Button size="sm" variant="outline" disabled={isPending} onClick={() => runAction('reject')}>
            Rifiuta
          </Button>
        ) : null}
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
