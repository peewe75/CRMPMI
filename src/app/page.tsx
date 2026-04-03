import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function LandingPage() {
  const session = await auth();
  if (session?.userId) redirect('/dashboard');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-primary p-6 text-primary-foreground">
      <div className="max-w-md text-center">
        <h1 className="text-4xl font-bold tracking-tight">CRM Negozi</h1>
        <p className="mt-3 text-lg text-gray-300">
          Gestionale mobile per negozi di scarpe e abbigliamento.
          Carica documenti, scansiona barcode, usa la voce.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/sign-up"
            className="rounded-lg bg-accent px-6 py-3 text-center font-semibold text-accent-foreground transition hover:opacity-90"
          >
            Inizia gratis
          </Link>
          <Link
            href="/sign-in"
            className="rounded-lg border border-gray-500 px-6 py-3 text-center font-semibold transition hover:bg-white/10"
          >
            Accedi
          </Link>
        </div>
      </div>
    </div>
  );
}
