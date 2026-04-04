'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Search, Slash, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { InventoryProposal, InventoryProposalItem } from '@/types/database';

interface VariantCandidate {
  id: string;
  product_id: string;
  brand: string;
  model_name: string;
  size: string;
  color: string;
  barcode: string | null;
  sku_supplier: string | null;
  active: boolean;
  total_stock: number;
}

type EditableProposalItem = InventoryProposalItem & {
  searchQuery: string;
  candidates: VariantCandidate[];
  searchLoading: boolean;
  saving: boolean;
  error: string | null;
};

export function ProposalReviewEditor({
  proposal,
  items,
}: {
  proposal: InventoryProposal;
  items: InventoryProposalItem[];
}) {
  const router = useRouter();
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [activeAction, setActiveAction] = useState<'approve' | 'apply' | 'reject' | null>(null);
  const [editableItems, setEditableItems] = useState<EditableProposalItem[]>(
    items.map((item) => ({
      ...item,
      searchQuery: buildInitialSearchQuery(item),
      candidates: [],
      searchLoading: false,
      saving: false,
      error: null,
    }))
  );

  const blockingItems = useMemo(
    () =>
      editableItems.filter((item) => {
        if (item.status === 'skipped') return false;
        if (item.matched_variant_id) return false;
        const decisionAction = typeof item.payload?.decision_action === 'string' ? item.payload.decision_action : null;
        return decisionAction !== 'create_product' && decisionAction !== 'create_variant';
      }),
    [editableItems]
  );

  async function handleProposalAction(action: 'approve' | 'apply' | 'reject') {
    setActionError(null);

    try {
      setActiveAction(action);
      const response = await fetch(`/api/proposals/${proposal.id}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: action === 'reject' ? JSON.stringify({ reason: 'Rifiutata da review proposta' }) : undefined,
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? `Operazione ${action} non riuscita`);
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Operazione non riuscita');
    } finally {
      setActiveAction(null);
    }
  }

  async function searchCandidates(itemId: string) {
    const item = editableItems.find((candidate) => candidate.id === itemId);
    if (!item) return;

    setEditableItems((current) =>
      current.map((candidate) =>
        candidate.id === itemId ? { ...candidate, searchLoading: true, error: null } : candidate
      )
    );

    try {
      const searchParams = new URLSearchParams();
      if (item.searchQuery.trim()) searchParams.set('q', item.searchQuery.trim());
      if (item.size_raw?.trim()) searchParams.set('size', item.size_raw.trim());
      if (item.color_raw?.trim()) searchParams.set('color', item.color_raw.trim());

      const response = await fetch(`/api/products/variants/search?${searchParams.toString()}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? 'Ricerca varianti non riuscita');
      }

      setEditableItems((current) =>
        current.map((candidate) =>
          candidate.id === itemId
            ? {
                ...candidate,
                searchLoading: false,
                candidates: payload.variants as VariantCandidate[],
                error: (payload.variants as VariantCandidate[]).length === 0 ? 'Nessuna variante compatibile trovata.' : null,
              }
            : candidate
        )
      );
    } catch (error) {
      setEditableItems((current) =>
        current.map((candidate) =>
          candidate.id === itemId
            ? {
                ...candidate,
                searchLoading: false,
                error: error instanceof Error ? error.message : 'Ricerca non riuscita',
              }
            : candidate
        )
      );
    }
  }

  async function saveItem(itemId: string, payload: Record<string, unknown>) {
    setEditableItems((current) =>
      current.map((candidate) =>
        candidate.id === itemId ? { ...candidate, saving: true, error: null } : candidate
      )
    );

    try {
      const response = await fetch(`/api/proposals/${proposal.id}/items/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? 'Aggiornamento riga non riuscito');
      }

      const updatedItem = data.item as InventoryProposalItem;
      setEditableItems((current) =>
        current.map((candidate) =>
          candidate.id === itemId
            ? {
                ...candidate,
                ...updatedItem,
                saving: false,
                error: null,
                candidates: candidate.candidates,
                searchQuery: candidate.searchQuery,
                searchLoading: false,
              }
            : candidate
        )
      );

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setEditableItems((current) =>
        current.map((candidate) =>
          candidate.id === itemId
            ? {
                ...candidate,
                saving: false,
                error: error instanceof Error ? error.message : 'Aggiornamento non riuscito',
              }
            : candidate
        )
      );
    }
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-bold">Review proposta</h1>
            <p className="text-sm text-muted-foreground">
              {proposal.proposal_type} da {proposal.source_type}
            </p>
            <p className="text-xs text-muted-foreground">
              Creata il {new Date(proposal.created_at).toLocaleString('it-IT')}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{proposal.status}</Badge>
            <Badge variant="outline">
              {proposal.confidence != null ? `${Math.round(proposal.confidence * 100)}%` : 'n/d'}
            </Badge>
          </div>
        </div>

        {proposal.raw_input ? <p className="text-sm text-muted-foreground">{proposal.raw_input}</p> : null}

        {proposal.source_uploaded_document_id ? (
          <Link
            href={`/dashboard/documents/${proposal.source_uploaded_document_id}/review`}
            className="text-sm text-accent underline underline-offset-2"
          >
            Apri documento sorgente
          </Link>
        ) : null}

        {blockingItems.length > 0 ? (
          <Badge variant="warning">
            {blockingItems.length} righe richiedono ancora match manuale o skip prima dell&apos;approvazione
          </Badge>
        ) : (
          <Badge variant="success">La proposta e pronta per l&apos;approvazione</Badge>
        )}

        <div className="flex flex-wrap gap-2">
          {proposal.status === 'pending_review' ? (
            <Button
              size="sm"
              onClick={() => handleProposalAction('approve')}
              disabled={isPending || blockingItems.length > 0}
            >
              {activeAction === 'approve' ? 'Approvo...' : 'Approva proposta'}
            </Button>
          ) : null}
          {proposal.status === 'approved' ? (
            <Button size="sm" onClick={() => handleProposalAction('apply')} disabled={isPending}>
              {activeAction === 'apply' ? 'Applico...' : 'Applica movimenti'}
            </Button>
          ) : null}
          {proposal.status !== 'applied' && proposal.status !== 'rejected' ? (
            <Button size="sm" variant="outline" onClick={() => handleProposalAction('reject')} disabled={isPending}>
              {activeAction === 'reject' ? 'Rifiuto...' : 'Rifiuta'}
            </Button>
          ) : null}
        </div>

        {actionError ? <p className="text-xs text-destructive">{actionError}</p> : null}
      </Card>

      <div className="space-y-3">
        {editableItems.map((item) => {
          const decisionAction = typeof item.payload?.decision_action === 'string' ? item.payload.decision_action : null;
          const isResolved = item.status === 'skipped' || Boolean(item.matched_variant_id) || decisionAction === 'create_product' || decisionAction === 'create_variant';

          return (
            <Card
              key={item.id}
              className={isResolved ? 'space-y-3' : 'space-y-3 border-amber-300 bg-amber-50'}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">{item.raw_description ?? 'Voce senza descrizione'}</p>
                  <p className="text-xs text-muted-foreground">
                    Riga {item.line_index + 1} - stato {item.status}
                    {item.matched_variant_id ? ` - variante ${item.matched_variant_id}` : ''}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant={isResolved ? 'success' : 'warning'}>
                    {isResolved ? 'pronta' : 'da risolvere'}
                  </Badge>
                  <Badge variant="outline">
                    {item.confidence != null ? `${Math.round(item.confidence * 100)}%` : 'n/d'}
                  </Badge>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="space-y-1 text-sm">
                  <span className="text-muted-foreground">Quantita</span>
                  <Input
                    type="number"
                    step="1"
                    value={item.quantity ?? ''}
                    onChange={(event) => {
                      const value = event.target.value;
                      setEditableItems((current) =>
                        current.map((candidate) =>
                          candidate.id === item.id
                            ? { ...candidate, quantity: value ? Number(value) : null }
                            : candidate
                        )
                      );
                    }}
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-muted-foreground">Taglia</span>
                  <Input
                    value={item.size_raw ?? ''}
                    onChange={(event) =>
                      setEditableItems((current) =>
                        current.map((candidate) =>
                          candidate.id === item.id ? { ...candidate, size_raw: event.target.value || null } : candidate
                        )
                      )
                    }
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-muted-foreground">Colore</span>
                  <Input
                    value={item.color_raw ?? ''}
                    onChange={(event) =>
                      setEditableItems((current) =>
                        current.map((candidate) =>
                          candidate.id === item.id ? { ...candidate, color_raw: event.target.value || null } : candidate
                        )
                      )
                    }
                  />
                </label>
              </div>

              <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
                <Input
                  placeholder="Cerca variante per brand, modello, barcode o sku"
                  value={item.searchQuery}
                  onChange={(event) =>
                    setEditableItems((current) =>
                      current.map((candidate) =>
                        candidate.id === item.id ? { ...candidate, searchQuery: event.target.value } : candidate
                      )
                    )
                  }
                />
                <Button size="sm" variant="outline" onClick={() => searchCandidates(item.id)} disabled={item.searchLoading}>
                  <Search className="h-4 w-4" />
                  {item.searchLoading ? 'Ricerca...' : 'Suggerisci'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    saveItem(item.id, {
                      quantity: item.quantity,
                      size_raw: item.size_raw,
                      color_raw: item.color_raw,
                      status: 'skipped',
                    })
                  }
                  disabled={item.saving}
                >
                  <Slash className="h-4 w-4" />
                  Salta riga
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    saveItem(item.id, {
                      quantity: item.quantity,
                      size_raw: item.size_raw,
                      color_raw: item.color_raw,
                    })
                  }
                  disabled={item.saving}
                >
                  <Check className="h-4 w-4" />
                  Salva
                </Button>
              </div>

              {item.candidates.length > 0 ? (
                <ul className="space-y-2">
                  {item.candidates.map((candidate) => (
                    <li
                      key={candidate.id}
                      className="flex flex-col gap-2 rounded-lg border border-border bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {candidate.brand} {candidate.model_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Tg. {candidate.size} - {candidate.color} - stock {candidate.total_stock}
                          {candidate.barcode ? ` - barcode ${candidate.barcode}` : ''}
                          {candidate.sku_supplier ? ` - sku ${candidate.sku_supplier}` : ''}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() =>
                          saveItem(item.id, {
                            matched_variant_id: candidate.id,
                            quantity: item.quantity,
                            size_raw: candidate.size,
                            color_raw: candidate.color,
                          })
                        }
                        disabled={item.saving}
                      >
                        {item.saving ? 'Salvo...' : 'Usa questa'}
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}

              {item.matched_variant_id ? (
                <div className="flex flex-wrap gap-2">
                  <Badge variant="success">Match selezionato</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      saveItem(item.id, {
                        matched_variant_id: null,
                        quantity: item.quantity,
                        size_raw: item.size_raw,
                        color_raw: item.color_raw,
                        status: 'pending',
                      })
                    }
                    disabled={item.saving}
                  >
                    <X className="h-4 w-4" />
                    Rimuovi match
                  </Button>
                </div>
              ) : null}

              {decisionAction === 'create_product' || decisionAction === 'create_variant' ? (
                <p className="text-xs text-muted-foreground">
                  Questa riga puo essere applicata anche senza match manuale: il proposal engine creera
                  {decisionAction === 'create_product' ? ' prodotto e variante' : ' una nuova variante'} durante l&apos;apply.
                </p>
              ) : null}

              {item.error ? <p className="text-xs text-destructive">{item.error}</p> : null}
              {!item.error && item.candidates.length === 0 && !isResolved ? (
                <p className="text-xs text-muted-foreground">
                  Cerca una variante esistente oppure marca la riga come skip se non va importata.
                </p>
              ) : null}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function buildInitialSearchQuery(item: InventoryProposalItem) {
  const payload = (item.payload ?? {}) as Record<string, unknown>;
  const brand = typeof payload.brand === 'string' ? payload.brand : null;
  const modelName = typeof payload.model_name === 'string' ? payload.model_name : null;

  const parts = [brand, modelName].filter(Boolean);

  if (parts.length === 0 && item.raw_description) {
    parts.push(item.raw_description);
  }

  return parts.join(' ').trim();
}
