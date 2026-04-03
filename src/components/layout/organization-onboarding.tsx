'use client';

import { CreateOrganization, UserButton } from '@clerk/nextjs';

export function OrganizationOnboarding() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-4xl rounded-3xl border border-border bg-white p-6 shadow-sm md:grid md:grid-cols-[1.1fr_0.9fr] md:gap-8 md:p-8">
        <div className="flex flex-col justify-between gap-6">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
              CRM Negozi
            </p>
            <div className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tight text-primary">
                Crea il tuo primo negozio
              </h1>
              <p className="max-w-md text-sm leading-6 text-muted-foreground">
                Prima di entrare nella dashboard serve un&apos;organizzazione attiva.
                La useremo per separare catalogo, movimenti, documenti e utenti del tuo account.
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-primary/5 p-4 text-sm text-muted-foreground">
            Dopo la creazione potrai iniziare subito con quick add, scanner barcode,
            caricamento documenti e gestione magazzino.
          </div>
        </div>

        <div className="mt-6 space-y-4 md:mt-0">
          <div className="flex justify-end">
            <UserButton />
          </div>
          <CreateOrganization
            afterCreateOrganizationUrl="/dashboard"
            appearance={{
              elements: {
                rootBox: 'w-full',
                cardBox: 'w-full shadow-none',
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
