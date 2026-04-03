'use client';

import { useState, useTransition } from 'react';
import { Building2, Loader2, Save, Settings2, Store as StoreIcon, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PLAN_LIMITS, type FeatureFlags, type TenantBilling } from '@/types/database';
import type { TenantSettingsOverview } from '@/modules/organizations/application/settings-service';

const FEATURE_LABELS: Record<keyof FeatureFlags, { title: string; description: string }> = {
  voice_input: {
    title: 'Input vocale',
    description: 'Abilita parsing e quick add via voce.',
  },
  document_import: {
    title: 'Import documenti',
    description: 'Abilita upload, parsing e import guidato da fatture e DDT.',
  },
  barcode_scan: {
    title: 'Scanner barcode',
    description: 'Abilita lookup barcode e carico rapido dal telefono.',
  },
  multi_store: {
    title: 'Multi-store',
    description: 'Permette piu&apos; punti vendita oltre al negozio principale.',
  },
};

export function SettingsManagement({
  overview,
}: {
  overview: TenantSettingsOverview;
}) {
  const [organizationName, setOrganizationName] = useState(overview.organization.name);
  const [newStore, setNewStore] = useState({
    name: '',
    address: '',
    phone: '',
  });
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>(overview.featureFlags);
  const [billingForm, setBillingForm] = useState({
    plan: overview.billing.plan,
    status: overview.billing.status,
    max_products: String(overview.billing.max_products),
    max_documents_month: String(overview.billing.max_documents_month),
  });
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [isRefreshing, startTransition] = useTransition();

  function refreshPage() {
    startTransition(() => {
      window.location.reload();
    });
  }

  function setSuccess(text: string) {
    setFeedback({ type: 'success', text });
  }

  function setError(text: string) {
    setFeedback({ type: 'error', text });
  }

  async function handleOrganizationSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setBusyKey('organization');

    try {
      const response = await fetch('/api/settings/organization', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: organizationName,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? 'Aggiornamento organizzazione non riuscito');
      }

      setOrganizationName(payload.organization.name);
      setSuccess('Profilo organizzazione aggiornato.');
      refreshPage();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Aggiornamento organizzazione non riuscito');
    } finally {
      setBusyKey(null);
    }
  }

  async function handleFeatureFlagsSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setBusyKey('feature-flags');

    try {
      const response = await fetch('/api/settings/feature-flags', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(featureFlags),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? 'Salvataggio feature flags non riuscito');
      }

      setFeatureFlags(payload.feature_flags);
      setSuccess('Feature flags aggiornate.');
      refreshPage();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Salvataggio feature flags non riuscito');
    } finally {
      setBusyKey(null);
    }
  }

  async function handleStoreCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setBusyKey('store');

    try {
      const response = await fetch('/api/settings/stores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newStore),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? 'Creazione negozio non riuscita');
      }

      setNewStore({ name: '', address: '', phone: '' });
      setSuccess(`Negozio creato: ${payload.store.name}.`);
      refreshPage();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Creazione negozio non riuscita');
    } finally {
      setBusyKey(null);
    }
  }

  async function handleBillingSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setBusyKey('billing');

    try {
      const response = await fetch('/api/settings/billing', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...billingForm,
          max_products: Number(billingForm.max_products),
          max_documents_month: Number(billingForm.max_documents_month),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? 'Aggiornamento billing non riuscito');
      }

      setBillingForm({
        plan: payload.billing.plan,
        status: payload.billing.status,
        max_products: String(payload.billing.max_products),
        max_documents_month: String(payload.billing.max_documents_month),
      });
      setSuccess('Billing placeholder aggiornato.');
      refreshPage();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Aggiornamento billing non riuscito');
    } finally {
      setBusyKey(null);
    }
  }

  const canAddExtraStore = overview.canManage && (featureFlags.multi_store || overview.stores.length === 0);
  const currentPeriodEndLabel = overview.billing.current_period_end
    ? new Date(overview.billing.current_period_end).toLocaleDateString('it-IT')
    : 'Non disponibile';

  return (
    <div className="space-y-4">
      {feedback ? (
        <Card className={feedback.type === 'success' ? 'border-green-200' : 'border-red-200'}>
          <p className={feedback.type === 'success' ? 'text-sm text-green-700' : 'text-sm text-destructive'}>
            {feedback.text}
          </p>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card className="space-y-4">
          <div className="flex items-start gap-3">
            <Building2 className="mt-0.5 h-5 w-5 text-accent" />
            <div>
              <h2 className="text-base font-semibold">Organizzazione</h2>
              <p className="text-sm text-muted-foreground">
                Dati principali del tenant collegato a Clerk Organizations.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Slug</p>
              <p className="mt-1 text-sm font-medium">{overview.organization.slug ?? 'Non impostato'}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Creata il</p>
              <p className="mt-1 text-sm font-medium">
                {new Date(overview.organization.createdAt).toLocaleDateString('it-IT')}
              </p>
            </div>
          </div>

          {overview.canManage ? (
            <form onSubmit={handleOrganizationSave} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Nome organizzazione</label>
                <Input
                  value={organizationName}
                  onChange={(event) => setOrganizationName(event.target.value)}
                  placeholder="Nome del negozio"
                />
              </div>
              <Button type="submit" disabled={busyKey === 'organization' || isRefreshing}>
                {busyKey === 'organization' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salva organizzazione
              </Button>
            </form>
          ) : null}
        </Card>

        <Card className="space-y-4">
          <div className="flex items-start gap-3">
            <Zap className="mt-0.5 h-5 w-5 text-accent" />
            <div>
              <h2 className="text-base font-semibold">Billing placeholder</h2>
              <p className="text-sm text-muted-foreground">
                Limiti tenant e utilizzo attuale. Il collegamento a billing reale verra&apos; poi alimentato da webhook.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge>{overview.billing.plan.toUpperCase()}</Badge>
            <Badge variant="outline">{overview.billing.status}</Badge>
            <Badge variant="outline">Fine periodo: {currentPeriodEndLabel}</Badge>
          </div>

          <div className="grid gap-3">
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Prodotti</p>
              <p className="mt-1 text-lg font-semibold">
                {overview.usage.productsCount} / {overview.billing.max_products}
              </p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Documenti del mese</p>
              <p className="mt-1 text-lg font-semibold">
                {overview.usage.documentsThisMonth} / {overview.billing.max_documents_month}
              </p>
            </div>
          </div>

          {overview.canManage ? (
            <form onSubmit={handleBillingSave} className="space-y-3 border-t border-border pt-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Piano placeholder</label>
                  <select
                    value={billingForm.plan}
                    onChange={(event) => {
                      const nextPlan = event.target.value as TenantBilling['plan'];
                      const limits = PLAN_LIMITS[nextPlan];
                      setBillingForm((current) => ({
                        ...current,
                        plan: nextPlan,
                        max_products: String(limits.max_products),
                        max_documents_month: String(limits.max_documents_month),
                      }));
                    }}
                    className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
                  >
                    <option value="free">Free</option>
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Stato</label>
                  <select
                    value={billingForm.status}
                    onChange={(event) =>
                      setBillingForm((current) => ({
                        ...current,
                        status: event.target.value as TenantBilling['status'],
                      }))
                    }
                    className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
                  >
                    <option value="trialing">Trialing</option>
                    <option value="active">Active</option>
                    <option value="past_due">Past due</option>
                    <option value="canceled">Canceled</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Max prodotti</label>
                  <Input
                    type="number"
                    min="1"
                    value={billingForm.max_products}
                    onChange={(event) =>
                      setBillingForm((current) => ({
                        ...current,
                        max_products: event.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Max documenti / mese</label>
                  <Input
                    type="number"
                    min="1"
                    value={billingForm.max_documents_month}
                    onChange={(event) =>
                      setBillingForm((current) => ({
                        ...current,
                        max_documents_month: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Questo pannello serve per i test finché non colleghiamo Stripe o webhook reali.
              </p>

              <Button type="submit" disabled={busyKey === 'billing' || isRefreshing}>
                {busyKey === 'billing' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salva billing placeholder
              </Button>
            </form>
          ) : null}
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card className="space-y-4">
          <div className="flex items-start gap-3">
            <StoreIcon className="mt-0.5 h-5 w-5 text-accent" />
            <div>
              <h2 className="text-base font-semibold">Negozi</h2>
              <p className="text-sm text-muted-foreground">
                Gestisci il punto vendita principale e, quando serve, piu&apos; sedi con il flag `multi-store`.
              </p>
            </div>
          </div>

          <ul className="space-y-3">
            {overview.stores.map((store) => (
              <li key={store.id} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{store.name}</p>
                  {store.is_default ? <Badge variant="outline">Predefinito</Badge> : null}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{store.address ?? 'Nessun indirizzo'}</p>
                <p className="text-sm text-muted-foreground">{store.phone ?? 'Nessun telefono'}</p>
              </li>
            ))}
          </ul>

          {overview.canManage ? (
            <form onSubmit={handleStoreCreate} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Nome negozio</label>
                <Input
                  value={newStore.name}
                  onChange={(event) => setNewStore((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Es. Outlet centro"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Indirizzo</label>
                <Input
                  value={newStore.address}
                  onChange={(event) => setNewStore((current) => ({ ...current, address: event.target.value }))}
                  placeholder="Via Roma 10"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Telefono</label>
                <Input
                  value={newStore.phone}
                  onChange={(event) => setNewStore((current) => ({ ...current, phone: event.target.value }))}
                  placeholder="+39 000 000000"
                />
              </div>
              {!featureFlags.multi_store && overview.stores.length >= 1 ? (
                <p className="text-sm text-muted-foreground">
                  Per aggiungere un secondo negozio devi prima attivare `multi-store`.
                </p>
              ) : null}
              <Button type="submit" disabled={!canAddExtraStore || busyKey === 'store' || isRefreshing}>
                {busyKey === 'store' ? <Loader2 className="h-4 w-4 animate-spin" /> : <StoreIcon className="h-4 w-4" />}
                Aggiungi negozio
              </Button>
            </form>
          ) : null}
        </Card>

        <Card className="space-y-4">
          <div className="flex items-start gap-3">
            <Settings2 className="mt-0.5 h-5 w-5 text-accent" />
            <div>
              <h2 className="text-base font-semibold">Feature flags</h2>
              <p className="text-sm text-muted-foreground">
                I moduli disattivati vengono bloccati lato API. Le modifiche entrano subito in vigore.
              </p>
            </div>
          </div>

          <form onSubmit={handleFeatureFlagsSave} className="space-y-3">
            {(Object.keys(featureFlags) as (keyof FeatureFlags)[]).map((key) => (
              <label key={key} className="flex items-start gap-3 rounded-lg border border-border p-3">
                <input
                  type="checkbox"
                  checked={featureFlags[key]}
                  disabled={!overview.canManage}
                  onChange={(event) =>
                    setFeatureFlags((current) => ({
                      ...current,
                      [key]: event.target.checked,
                    }))
                  }
                  className="mt-1 h-4 w-4 rounded border-border"
                />
                <div>
                  <p className="text-sm font-medium">{FEATURE_LABELS[key].title}</p>
                  <p className="text-sm text-muted-foreground">{FEATURE_LABELS[key].description}</p>
                </div>
              </label>
            ))}

            {overview.canManage ? (
              <Button type="submit" disabled={busyKey === 'feature-flags' || isRefreshing}>
                {busyKey === 'feature-flags' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salva feature flags
              </Button>
            ) : null}
          </form>
        </Card>
      </div>
    </div>
  );
}
