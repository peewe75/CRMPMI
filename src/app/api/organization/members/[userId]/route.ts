import type { UserRole } from '@/types/database';
import {
  removeOrganizationMember,
  updateOrganizationMemberRole,
} from '@/modules/organizations/application/team-service';
import { jsonError, jsonOk, withErrorHandler } from '@/lib/utils/api';

const ALLOWED_ROLES: UserRole[] = ['owner', 'manager', 'staff'];

export const PATCH = withErrorHandler(async (
  request: Request,
  context: unknown
) => {
  const { userId } = await (context as { params: Promise<{ userId: string }> }).params;
  const body = await request.json();
  const appRole = body.app_role as UserRole;

  if (!ALLOWED_ROLES.includes(appRole)) {
    return jsonError('Ruolo non valido');
  }

  const member = await updateOrganizationMemberRole({
    targetUserId: userId,
    appRole,
  });

  return jsonOk({ member });
});

export const DELETE = withErrorHandler(async (
  _request: Request,
  context: unknown
) => {
  const { userId } = await (context as { params: Promise<{ userId: string }> }).params;
  await removeOrganizationMember(userId);

  return jsonOk({ success: true });
});
