import { Users } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function UsersPage() {
  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold">Utenti e ruoli</h1>
        <p className="text-sm text-muted-foreground">
          Area pronta per integrare inviti, ruoli Clerk Organizations e permessi applicativi.
        </p>
      </div>

      <Card className="flex items-start gap-3">
        <Users className="mt-0.5 h-5 w-5 text-accent" />
        <div className="text-sm">
          <p className="font-medium">Stato attuale</p>
          <p className="mt-1 text-muted-foreground">
            L&apos;organization switcher è già attivo nel layout. Qui possiamo agganciare il pannello inviti e mapping ruoli.
          </p>
        </div>
      </Card>
    </div>
  );
}
