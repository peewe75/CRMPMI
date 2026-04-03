import { listMovements } from '@/modules/inventory/application/inventory-service';
import { Badge } from '@/components/ui/badge';

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

export default async function MovementsPage() {
  const { movements } = await listMovements({ limit: 50 });

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Movimenti</h1>

      {movements.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nessun movimento registrato.</p>
      ) : (
        <ul className="space-y-2">
          {movements.map((m) => {
            const variant = (m as unknown as { product_variants: { size: string; color: string; products: { brand: string; model_name: string } } }).product_variants;
            return (
              <li key={m.id} className="flex items-center justify-between rounded-lg border border-border bg-white p-3">
                <div>
                  <p className="text-sm font-medium">
                    {variant?.products?.brand} {variant?.products?.model_name}
                    <span className="text-muted-foreground ml-1">
                      Tg.{variant?.size} {variant?.color}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(m.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    {m.notes && ` · ${m.notes}`}
                  </p>
                </div>
                <div className="text-right flex items-center gap-2">
                  <span className="text-sm font-semibold">
                    {m.movement_type === 'outbound' ? '-' : '+'}{m.quantity}
                  </span>
                  <Badge variant={TYPE_COLORS[m.movement_type]}>
                    {TYPE_LABELS[m.movement_type]}
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
