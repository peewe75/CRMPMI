'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Loader2, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';

type MovementType = 'inbound' | 'outbound' | 'adjustment';

const MOVEMENT_OPTIONS: Array<{ value: MovementType; label: string }> = [
  { value: 'inbound', label: 'Entrata' },
  { value: 'outbound', label: 'Uscita' },
  { value: 'adjustment', label: 'Rettifica' },
];

export function MovementQuickForm({
  variantId,
  defaultStoreId,
  compact = false,
}: {
  variantId: string;
  defaultStoreId?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const [movementType, setMovementType] = useState<MovementType>('inbound');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function getIcon() {
    if (movementType === 'inbound') return <ArrowDown className="h-4 w-4" />;
    if (movementType === 'outbound') return <ArrowUp className="h-4 w-4" />;
    return <SlidersHorizontal className="h-4 w-4" />;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch('/api/inventory/movements', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            variant_id: variantId,
            movement_type: movementType,
            quantity: Number(quantity),
            store_id: defaultStoreId,
            notes: notes || undefined,
          }),
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? 'Registrazione movimento non riuscita');
        }

        setQuantity('1');
        setNotes('');
        addToast({ type: 'success', title: 'Movimento registrato' });
        router.refresh();
      } catch (submitError) {
        const msg = submitError instanceof Error ? submitError.message : 'Registrazione movimento non riuscita';
        setError(msg);
        addToast({ type: 'error', title: 'Errore', description: msg });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className={compact ? 'space-y-3' : 'space-y-4'}>
      <div className={compact ? 'grid gap-3' : 'grid gap-3 md:grid-cols-[180px_120px_minmax(0,1fr)]'}>
        <Select
          value={movementType}
          onChange={(event) => setMovementType(event.target.value as MovementType)}
          options={MOVEMENT_OPTIONS}
          className="md:w-[180px]"
        />
        <Input
          type="number"
          min="0.01"
          step="0.01"
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          placeholder="Quantità"
        />
        <Input
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Note opzionali"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : getIcon()}
          Registra movimento
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </form>
  );
}
