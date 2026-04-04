import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  hasClerkFrontendConfig,
  hasClerkServerConfig,
} from '@/lib/auth/clerk-config';

export default async function LandingPage() {
  let tenantContext: { userId: string } | null = null;

  if (hasClerkServerConfig()) {
    const { getTenantContext } = await import('@/lib/auth/tenant');
    tenantContext = await getTenantContext();
  }

  if (tenantContext?.userId) {
    redirect('/dashboard');
  }

  const hasAuthUi = hasClerkFrontendConfig();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-primary p-6 text-primary-foreground">
      <div className="max-w-md text-center">
        <h1 className="text-4xl font-bold tracking-tight">CRM Negozi</h1>
        <p className="mt-3 text-lg text-gray-300">
          Gestionale mobile per negozi di scarpe e abbigliamento.
          Carica documenti, scansiona barcode, usa la voce.
        </p>
        {!hasAuthUi ? (
          <p className="mt-4 rounded-lg border border-yellow-400/50 bg-yellow-400/10 px-4 py-3 text-sm text-yellow-100">
            Anteprima pubblica disponibile, ma autenticazione non configurata
            completamente su questo deployment.
          </p>
        ) : null}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href={hasAuthUi ? '/sign-up' : '/'}
            className="rounded-lg bg-accent px-6 py-3 text-center font-semibold text-accent-foreground transition hover:opacity-90"
          >
            Inizia gratis
          </Link>
          <Link
            href={hasAuthUi ? '/sign-in' : '/'}
            className="rounded-lg border border-gray-500 px-6 py-3 text-center font-semibold transition hover:bg-white/10"
          >
            Accedi
          </Link>
        </div>
      </div>
    </div>
  );
}
