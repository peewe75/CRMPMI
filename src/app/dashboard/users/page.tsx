import { ShieldCheck, Users } from 'lucide-react';
import { TeamManagement } from '@/components/users/team-management';
import { listOrganizationTeam } from '@/modules/organizations/application/team-service';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

export default async function UsersPage() {
  const { members, invitations, canManage, currentUserId } = await listOrganizationTeam();

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Utenti e ruoli</h1>
          <p className="text-sm text-muted-foreground">
            Gestione membri del negozio con inviti reali Clerk Organizations e ruolo applicativo `owner / manager / staff`.
          </p>
        </div>
        <Badge variant={canManage ? 'outline' : 'destructive'}>
          {canManage ? 'Accesso admin' : 'Solo lettura'}
        </Badge>
      </div>

      <Card className="flex items-start gap-3">
        <Users className="mt-0.5 h-5 w-5 text-accent" />
        <div className="text-sm">
          <p className="font-medium">Organizzazione attiva</p>
          <p className="mt-1 text-muted-foreground">
            L&apos;organization switcher e&apos; gia&apos; attivo nel layout. Qui puoi gestire collaboratori, inviti pendenti
            e distinzione tra ruolo tecnico Clerk e ruolo business dell&apos;app.
          </p>
        </div>
      </Card>

      <Card className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 text-accent" />
        <div className="text-sm text-muted-foreground">
          I permessi Clerk restano il livello tecnico di accesso all&apos;organizzazione, mentre il ruolo app e&apos; gia&apos;
          pronto per policy dedicate su documenti, inventario e billing.
        </div>
      </Card>

      <TeamManagement
        members={members}
        invitations={invitations}
        canManage={canManage}
        currentUserId={currentUserId}
      />
    </div>
  );
}
