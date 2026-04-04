'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function DocumentProposalActions({
  documentId,
  disabled,
}: {
  documentId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [proposalType, setProposalType] = useState<'inbound' | 'outbound' | 'adjustment'>('inbound');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleCreateProposal() {
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/documents/${documentId}/create-proposal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposal_type: proposalType }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? 'Creazione proposta non riuscita');
      }

      setMessage('Proposal creata con successo.');
      startTransition(() => {
        router.push('/dashboard/proposals');
        router.refresh();
      });
    } catch (proposalError) {
      setError(proposalError instanceof Error ? proposalError.message : 'Creazione proposta non riuscita');
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <select
        value={proposalType}
        onChange={(event) => setProposalType(event.target.value as 'inbound' | 'outbound' | 'adjustment')}
        className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm sm:w-auto"
        disabled={disabled || isPending}
      >
        <option value="inbound">Carico (inbound)</option>
        <option value="outbound">Scarico (outbound)</option>
        <option value="adjustment">Rettifica (adjustment)</option>
      </select>

      <Button onClick={handleCreateProposal} disabled={disabled || isPending} size="sm">
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
        {isPending ? 'Creazione proposal...' : 'Crea inventory proposal'}
      </Button>

      {message ? <p className="text-xs text-green-700">{message}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
