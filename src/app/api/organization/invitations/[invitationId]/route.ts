import { revokeOrganizationInvitation } from '@/modules/organizations/application/team-service';
import { jsonOk, withErrorHandler } from '@/lib/utils/api';

export const DELETE = withErrorHandler(async (
  _request: Request,
  context: unknown
) => {
  const { invitationId } = await (context as { params: Promise<{ invitationId: string }> }).params;
  const invitation = await revokeOrganizationInvitation(invitationId);

  return jsonOk({ invitation });
});
