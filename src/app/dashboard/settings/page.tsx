import { Settings } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function SettingsPage() {
  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold">Impostazioni</h1>
        <p className="text-sm text-muted-foreground">
          Spazio base per configurazioni tenant, negozi, preferenze operative e billing placeholder.
        </p>
      </div>

      <Card className="flex items-start gap-3">
        <Settings className="mt-0.5 h-5 w-5 text-accent" />
        <div className="text-sm text-muted-foreground">
          La struttura di navigazione è ora allineata; qui potremo inserire limiti piano, feature flags e dati del negozio.
        </div>
      </Card>
    </div>
  );
}
