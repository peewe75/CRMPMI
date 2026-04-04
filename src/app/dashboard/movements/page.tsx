import Link from 'next/link';
import { listMovements } from '@/modules/inventory/application/inventory-service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getVariantCommercialLabel, getVariantSizeLabel } from '@/modules/products/domain/variant-display';

const TYPE_LABELS: Record<string, string> = {
  inbound: 'Entrata',
  outbound: 'Uscita',
  adjustment: 'Rettifica',
  transfer: 'Trasferimento',
};

const TYPE_COLORS: Record<string, 'success' | 'destructive' | 'warning' | 'default'> = {
  inbound: 'success',
  outbound: 'destructive',
  adjustment: 'warning',
  transfer: 'default',
};

export default async function MovementsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const params = await searchParams;
  const selectedType = params.type && params.type in TYPE_LABELS ? params.type : undefined;
  const { movements } = await listMovements({
    limit: 50,
    movement_type: selectedType,
  });

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Movimenti</h1>
          <p className="text-sm text-muted-foreground">Storico carichi, scarichi e rettifiche.</p>
        </div>
        <div className="flex gap-2 overflow-x-auto">
          <Button asChild size="sm" variant={!selectedType ? 'default' : 'outline'}>
            <Link href="/dashboard/movements">Tutti</Link>
          </Button>
          {Object.entries(TYPE_LABELS).map(([type, label]) => (
            <Button key={type} asChild size="sm" variant={selectedType === type ? 'default' : 'outline'}>
              <Link href={`/dashboard/movements?type=${type}`}>{label}</Link>
            </Button>
          ))}
        </div>
      </div>

      {movements.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nessun movimento registrato.</p>
      ) : (
        <ul className="space-y-2">
          {movements.map((movement) => {
            const variant = movement.product_variants;
            return (
              <li key={movement.id} className="flex items-center justify-between rounded-lg border border-border bg-white p-3">
                <div>
                  <p className="text-sm font-medium">
                    {variant?.products?.brand} {variant?.products?.model_name}
                    <span className="ml-1 text-muted-foreground">
                      {variant ? `${getVariantCommercialLabel(variant)} - ${getVariantSizeLabel(variant)}` : '-'}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(movement.created_at).toLocaleDateString('it-IT', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {movement.notes ? ` - ${movement.notes}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-right">
                  <span className="text-sm font-semibold">
                    {movement.movement_type === 'outbound' ? '-' : '+'}
                    {movement.quantity}
                  </span>
                  <Badge variant={TYPE_COLORS[movement.movement_type]}>
                    {TYPE_LABELS[movement.movement_type]}
                  </Badge>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
