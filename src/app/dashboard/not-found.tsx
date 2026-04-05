import Link from 'next/link';
import { FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-4 text-center">
      <FileQuestion className="mb-4 h-16 w-16 text-muted-foreground" />
      <h2 className="mb-2 text-xl font-semibold text-gray-900">
        Pagina non trovata
      </h2>
      <p className="mb-6 max-w-md text-sm text-gray-500">
        La pagina che cerchi non esiste o è stata spostata.
      </p>
      <Button asChild>
        <Link href="/dashboard">Torna alla dashboard</Link>
      </Button>
    </div>
  );
}
