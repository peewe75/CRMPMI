import Link from 'next/link';
import { ArrowDown, ArrowUp, AlertTriangle, Clock, Package } from 'lucide-react';
import { listMovements } from '@/modules/inventory/application/inventory-service';
import { listProposals } from '@/modules/proposals/application/proposals-service';
import { getStockLevels } from '@/modules/inventory/application/inventory-service';

export async function DashboardKPIs() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [movementsResult, proposalsResult, stockLevels] = await Promise.allSettled([
    listMovements({ limit: 200 }),
    listProposals({ limit: 100 }),
    getStockLevels(),
  ]);

  const todayMovements = movementsResult.status === 'fulfilled'
    ? movementsResult.value.movements.filter((m) => new Date(m.created_at) >= today)
    : [];

  const proposals = proposalsResult.status === 'fulfilled' ? proposalsResult.value.proposals : [];
  const pendingProposals = proposals.filter((p) => p.status === 'pending_review').length;

  const stockData = stockLevels.status === 'fulfilled' ? stockLevels.value : [];
  const totalVariants = stockData.length;
  const totalPieces = stockData.reduce((sum, item) => sum + Number(item.quantity), 0);

  const todayOutbound = todayMovements.filter((m) => m.movement_type === 'outbound');
  const todayInbound = todayMovements.filter((m) => m.movement_type === 'inbound');
  const todaySales = todayOutbound.length;
  const todayPiecesSold = todayOutbound.reduce((s, m) => s + Math.abs(Number(m.quantity)), 0);
  const todayLoads = todayInbound.length;
  const todayPiecesLoaded = todayInbound.reduce((s, m) => s + Math.abs(Number(m.quantity)), 0);

  const recentMovements = todayMovements.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Link href="/dashboard/movements" className="rounded-xl border border-border bg-white p-4 shadow-sm transition active:scale-[0.98] hover:shadow-md">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
              <ArrowUp className="h-4 w-4 text-green-600" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{todaySales}</p>
          <p className="text-xs text-muted-foreground">Vendite oggi</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">{todayPiecesSold} pezzi</p>
        </Link>

        <Link href="/dashboard/movements" className="rounded-xl border border-border bg-white p-4 shadow-sm transition active:scale-[0.98] hover:shadow-md">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
              <ArrowDown className="h-4 w-4 text-blue-600" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{todayLoads}</p>
          <p className="text-xs text-muted-foreground">Carichi oggi</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">{todayPiecesLoaded} pezzi</p>
        </Link>

        <Link href="/dashboard/proposals" className="rounded-xl border border-border bg-white p-4 shadow-sm transition active:scale-[0.98] hover:shadow-md">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{pendingProposals}</p>
          <p className="text-xs text-muted-foreground">Proposte in attesa</p>
        </Link>

        <Link href="/dashboard/inventory" className="rounded-xl border border-border bg-white p-4 shadow-sm transition active:scale-[0.98] hover:shadow-md">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
              <Package className="h-4 w-4 text-purple-600" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{totalVariants}</p>
          <p className="text-xs text-muted-foreground">Varianti in stock</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">{totalPieces} pezzi totali</p>
        </Link>
      </div>

      {/* Recent Activity */}
      {recentMovements.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Attività recente
          </h2>
          <div className="rounded-xl border border-border bg-white shadow-sm">
            <ul className="divide-y divide-border">
              {recentMovements.map((movement) => {
                const variant = movement.product_variants;
                const isInbound = movement.movement_type === 'inbound';
                const isOutbound = movement.movement_type === 'outbound';
                return (
                  <li key={movement.id} className="flex items-center justify-between px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {variant?.products?.brand} {variant?.products?.model_name}
                        <span className="ml-1 text-muted-foreground">
                          {variant?.color} {variant?.size}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(movement.created_at).toLocaleTimeString('it-IT', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${isOutbound ? 'text-red-600' : isInbound ? 'text-green-600' : 'text-amber-600'}`}>
                        {isOutbound ? '-' : '+'}{movement.quantity}
                      </span>
                      <div className={`flex h-6 w-6 items-center justify-center rounded-full ${
                        isOutbound ? 'bg-red-100' : isInbound ? 'bg-green-100' : 'bg-amber-100'
                      }`}>
                        {isOutbound ? (
                          <ArrowUp className="h-3 w-3 text-red-600" />
                        ) : isInbound ? (
                          <ArrowDown className="h-3 w-3 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-3 w-3 text-amber-600" />
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
