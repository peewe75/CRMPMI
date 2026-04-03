import type { UserRole } from '@/types/database';
import { inviteOrganizationMember } from '@/modules/organizations/application/team-service';
import { jsonError, jsonOk, withErrorHandler } from '@/lib/utils/api';

const ALLOWED_ROLES: UserRole[] = ['owner', 'manager', 'staff'];

export const POST = withErrorHandler(async (request: Request) => {
  const body = await request.json();
  const emailAddress = typeof body.email_address === 'string' ? body.email_address : '';
  const appRole = body.app_role as UserRole;

  if (!ALLOWED_ROLES.includes(appRole)) {
    return jsonError('Ruolo non valido');
  }

  const redirectUrl = new URL('/dashboard', request.url).toString();
  const invitation = await inviteOrganizationMember({
    emailAddress,
    appRole,
    redirectUrl,
  });

  return jsonOk({ invitation }, 201);
});
