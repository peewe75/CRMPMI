'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-4 text-center">
      <AlertTriangle className="mb-4 h-16 w-16 text-amber-500" />
      <h2 className="mb-2 text-xl font-semibold text-gray-900">
        Qualcosa è andato storto
      </h2>
      <p className="mb-6 max-w-md text-sm text-gray-500">
        {error.message || '        Si è verificato un errore imprevisto durante il caricamento della pagina.'}
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button onClick={reset} variant="default">
          Riprova
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">Torna alla dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
