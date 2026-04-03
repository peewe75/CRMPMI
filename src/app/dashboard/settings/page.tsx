import { getTenantSettingsOverview } from '@/modules/organizations/application/settings-service';
import { SettingsManagement } from '@/components/settings/settings-management';

export default async function SettingsPage() {
  const overview = await getTenantSettingsOverview();

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-xl font-bold">Impostazioni</h1>
        <p className="text-sm text-muted-foreground">
          Configurazioni tenant, negozi, limiti piano e attivazione moduli operativi.
        </p>
      </div>

      <SettingsManagement overview={overview} />
    </div>
  );
}
