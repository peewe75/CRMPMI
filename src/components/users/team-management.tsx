'use client';

import { useMemo, useState, useTransition } from 'react';
import { Loader2, MailPlus, Shield, Trash2, UserCog, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { UserRole } from '@/types/database';
import type {
  OrganizationTeamInvitation,
  OrganizationTeamMember,
} from '@/modules/organizations/application/team-service';

const APP_ROLE_OPTIONS: UserRole[] = ['owner', 'manager', 'staff'];

const APP_ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Owner',
  manager: 'Manager',
  staff: 'Staff',
};

const CLERK_ROLE_LABELS: Record<string, string> = {
  'org:admin': 'Admin Clerk',
  'org:member': 'Member Clerk',
};

export function TeamManagement({
  members,
  invitations,
  canManage,
  currentUserId,
}: {
  members: OrganizationTeamMember[];
  invitations: OrganizationTeamInvitation[];
  canManage: boolean;
  currentUserId: string;
}) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('staff');
  const [roleDrafts, setRoleDrafts] = useState<Record<string, UserRole>>(
    () => Object.fromEntries(members.map((member) => [member.userId, member.appRole]))
  );
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [isRefreshing, startTransition] = useTransition();

  const sortedMembers = useMemo(
    () =>
      [...members].sort((left, right) => {
        if (left.userId === currentUserId) return -1;
        if (right.userId === currentUserId) return 1;
        return left.displayName.localeCompare(right.displayName, 'it');
      }),
    [currentUserId, members]
  );

  function setSuccess(text: string) {
    setFeedback({ type: 'success', text });
  }

  function setError(text: string) {
    setFeedback({ type: 'error', text });
  }

  function refreshPage() {
    startTransition(() => {
      window.location.reload();
    });
  }

  async function handleInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setBusyKey('invite');

    try {
      const response = await fetch('/api/organization/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email_address: inviteEmail,
          app_role: inviteRole,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? 'Invito non riuscito');
      }

      setInviteEmail('');
      setInviteRole('staff');
      setSuccess(`Invito inviato a ${payload.invitation.emailAddress}.`);
      refreshPage();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Invito non riuscito');
    } finally {
      setBusyKey(null);
    }
  }

  async function handleRoleUpdate(userId: string) {
    setFeedback(null);
    setBusyKey(`role:${userId}`);

    try {
      const response = await fetch(`/api/organization/members/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_role: roleDrafts[userId],
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? 'Aggiornamento ruolo non riuscito');
      }

      setSuccess(`Ruolo aggiornato per ${payload.member.displayName}.`);
      refreshPage();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Aggiornamento ruolo non riuscito');
    } finally {
      setBusyKey(null);
    }
  }

  async function handleMemberRemoval(userId: string, displayName: string) {
    if (!window.confirm(`Vuoi davvero rimuovere ${displayName} dall'organizzazione?`)) {
      return;
    }

    setFeedback(null);
    setBusyKey(`remove:${userId}`);

    try {
      const response = await fetch(`/api/organization/members/${userId}`, {
        method: 'DELETE',
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? 'Rimozione membro non riuscita');
      }

      setSuccess(`${displayName} rimosso dall'organizzazione.`);
      refreshPage();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Rimozione membro non riuscita');
    } finally {
      setBusyKey(null);
    }
  }

  async function handleInvitationRevoke(invitationId: string, emailAddress: string) {
    if (!window.confirm(`Revocare l'invito inviato a ${emailAddress}?`)) {
      return;
    }

    setFeedback(null);
    setBusyKey(`invite-revoke:${invitationId}`);

    try {
      const response = await fetch(`/api/organization/invitations/${invitationId}`, {
        method: 'DELETE',
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? 'Revoca invito non riuscita');
      }

      setSuccess(`Invito revocato per ${payload.invitation.emailAddress}.`);
      refreshPage();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Revoca invito non riuscita');
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">Team del negozio</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestisci membri e inviti dell&apos;organizzazione attiva. `owner` e `manager` condividono accesso admin in Clerk;
            la distinzione applicativa resta pronta per policy piu&apos; fini.
          </p>
        </div>

        {feedback ? (
          <p className={feedback.type === 'success' ? 'text-sm text-green-700' : 'text-sm text-destructive'}>
            {feedback.text}
          </p>
        ) : null}

        {canManage ? (
          <form onSubmit={handleInvite} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px_auto]">
            <Input
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="email@negozio.it"
              required
            />
            <select
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value as UserRole)}
              className="h-10 rounded-lg border border-border bg-white px-3 text-sm"
            >
              {APP_ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {APP_ROLE_LABELS[role]}
                </option>
              ))}
            </select>
            <Button type="submit" disabled={busyKey === 'invite' || isRefreshing}>
              {busyKey === 'invite' ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailPlus className="h-4 w-4" />}
              Invia invito
            </Button>
          </form>
        ) : (
          <div className="rounded-lg border border-border bg-gray-50 p-3 text-sm text-muted-foreground">
            Hai accesso in sola lettura. Per invitare membri o cambiare ruoli serve un profilo admin dell&apos;organizzazione.
          </div>
        )}
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">Membri attivi</h3>
            <Badge variant="outline">{members.length}</Badge>
          </div>

          <ul className="space-y-3">
            {sortedMembers.map((member) => {
              const isSelf = member.userId === currentUserId;
              const memberBusy = busyKey === `role:${member.userId}` || busyKey === `remove:${member.userId}`;

              return (
                <li key={member.membershipId} className="rounded-lg border border-border p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <UserRound className="h-4 w-4 text-accent" />
                        <p className="text-sm font-semibold">{member.displayName}</p>
                        {isSelf ? <Badge variant="outline">Tu</Badge> : null}
                      </div>
                      <p className="text-sm text-muted-foreground">{member.emailAddress}</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge>{APP_ROLE_LABELS[member.appRole]}</Badge>
                        <Badge variant="outline">{CLERK_ROLE_LABELS[member.clerkRole] ?? member.clerkRole}</Badge>
                        <Badge variant="outline">
                          Dal {new Date(member.joinedAt).toLocaleDateString('it-IT')}
                        </Badge>
                      </div>
                    </div>

                    {canManage && !isSelf ? (
                      <div className="flex flex-col gap-2 sm:min-w-64">
                        <select
                          value={roleDrafts[member.userId] ?? member.appRole}
                          onChange={(event) =>
                            setRoleDrafts((current) => ({
                              ...current,
                              [member.userId]: event.target.value as UserRole,
                            }))
                          }
                          className="h-10 rounded-lg border border-border bg-white px-3 text-sm"
                        >
                          {APP_ROLE_OPTIONS.map((role) => (
                            <option key={role} value={role}>
                              {APP_ROLE_LABELS[role]}
                            </option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleRoleUpdate(member.userId)}
                            disabled={memberBusy || isRefreshing}
                          >
                            {busyKey === `role:${member.userId}` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <UserCog className="h-4 w-4" />
                            )}
                            Aggiorna
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMemberRemoval(member.userId, member.displayName)}
                            disabled={memberBusy || isRefreshing}
                          >
                            {busyKey === `remove:${member.userId}` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                            Rimuovi
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">Inviti pendenti</h3>
            <Badge variant="outline">{invitations.length}</Badge>
          </div>

          {invitations.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              Nessun invito pendente. Quando inviti un collaboratore, lo vedrai qui fino all&apos;accettazione.
            </div>
          ) : (
            <ul className="space-y-3">
              {invitations.map((invitation) => {
                const invitationBusy = busyKey === `invite-revoke:${invitation.id}`;

                return (
                  <li key={invitation.id} className="rounded-lg border border-border p-3">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">{invitation.emailAddress}</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge>{APP_ROLE_LABELS[invitation.appRole]}</Badge>
                        <Badge variant="outline">{CLERK_ROLE_LABELS[invitation.clerkRole] ?? invitation.clerkRole}</Badge>
                        <Badge variant="outline">
                          Scade {new Date(invitation.expiresAt).toLocaleDateString('it-IT')}
                        </Badge>
                      </div>
                      {canManage ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleInvitationRevoke(invitation.id, invitation.emailAddress)}
                          disabled={invitationBusy || isRefreshing}
                        >
                          {invitationBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                          Revoca
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
