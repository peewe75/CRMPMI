'use server';

import { clerkClient } from '@clerk/nextjs/server';
import { requireTenantContext } from '@/lib/auth/tenant';
import { writeAuditLog } from '@/lib/supabase/audit';
import type { UserRole } from '@/types/database';

type MetadataWithAppRole = Record<string, unknown> & {
  appRole?: UserRole;
};

export interface OrganizationTeamMember {
  membershipId: string;
  userId: string;
  emailAddress: string;
  displayName: string;
  imageUrl: string;
  clerkRole: string;
  appRole: UserRole;
  joinedAt: string;
}

export interface OrganizationTeamInvitation {
  id: string;
  emailAddress: string;
  clerkRole: string;
  appRole: UserRole;
  status: string;
  createdAt: string;
  expiresAt: string;
}

function canManageTeam(orgRole?: string) {
  return orgRole === 'org:admin';
}

function normalizeAppRole(value: unknown, clerkRole: string): UserRole {
  if (value === 'owner' || value === 'manager' || value === 'staff') {
    return value;
  }

  if (clerkRole === 'org:admin') {
    return 'owner';
  }

  return 'staff';
}

function toClerkRole(appRole: UserRole) {
  return appRole === 'staff' ? 'org:member' : 'org:admin';
}

function buildDisplayName(member: {
  publicUserData?: {
    firstName?: string | null;
    lastName?: string | null;
    identifier?: string;
  } | null;
}) {
  const fullName = [
    member.publicUserData?.firstName ?? null,
    member.publicUserData?.lastName ?? null,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return fullName || member.publicUserData?.identifier || 'Utente';
}

function mapTeamMember(member: {
  id: string;
  role: string;
  createdAt: number;
  publicMetadata?: MetadataWithAppRole;
  publicUserData?: {
    userId: string;
    identifier: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string;
  } | null;
}): OrganizationTeamMember {
  return {
    membershipId: member.id,
    userId: member.publicUserData?.userId ?? '',
    emailAddress: member.publicUserData?.identifier ?? '',
    displayName: buildDisplayName(member),
    imageUrl: member.publicUserData?.imageUrl ?? '',
    clerkRole: member.role,
    appRole: normalizeAppRole(member.publicMetadata?.appRole, member.role),
    joinedAt: new Date(member.createdAt).toISOString(),
  };
}

function mapInvitation(invitation: {
  id: string;
  emailAddress: string;
  role: string;
  status?: string;
  createdAt: number;
  expiresAt: number;
  publicMetadata?: MetadataWithAppRole;
}): OrganizationTeamInvitation {
  return {
    id: invitation.id,
    emailAddress: invitation.emailAddress,
    clerkRole: invitation.role,
    appRole: normalizeAppRole(invitation.publicMetadata?.appRole, invitation.role),
    status: invitation.status ?? 'pending',
    createdAt: new Date(invitation.createdAt).toISOString(),
    expiresAt: new Date(invitation.expiresAt).toISOString(),
  };
}

async function getOrganizationMembershipByUserId(orgId: string, userId: string) {
  const clerk = await clerkClient();
  const response = await clerk.organizations.getOrganizationMembershipList({
    organizationId: orgId,
    userId: [userId],
    limit: 1,
  });

  return response.data[0] ?? null;
}

export async function listOrganizationTeam() {
  const ctx = await requireTenantContext();
  const clerk = await clerkClient();

  const [memberships, invitations] = await Promise.all([
    clerk.organizations.getOrganizationMembershipList({
      organizationId: ctx.orgId,
      limit: 100,
      orderBy: '+created_at',
    }),
    clerk.organizations.getOrganizationInvitationList({
      organizationId: ctx.orgId,
      status: ['pending'],
      limit: 100,
    }),
  ]);

  return {
    members: memberships.data.map(mapTeamMember),
    invitations: invitations.data.map(mapInvitation),
    canManage: canManageTeam(ctx.orgRole),
    currentUserId: ctx.userId,
    currentOrgRole: ctx.orgRole,
  };
}

export async function inviteOrganizationMember(input: {
  emailAddress: string;
  appRole: UserRole;
  redirectUrl?: string;
}) {
  const ctx = await requireTenantContext();

  if (!canManageTeam(ctx.orgRole)) {
    throw new Error('Forbidden: requires organization admin');
  }

  const emailAddress = input.emailAddress.trim().toLowerCase();
  if (!emailAddress) {
    throw new Error('Email obbligatoria');
  }

  const clerk = await clerkClient();
  const invitation = await clerk.organizations.createOrganizationInvitation({
    organizationId: ctx.orgId,
    emailAddress,
    role: toClerkRole(input.appRole),
    inviterUserId: ctx.userId,
    redirectUrl: input.redirectUrl,
    publicMetadata: {
      appRole: input.appRole,
    },
  });

  await writeAuditLog({
    orgId: ctx.orgId,
    actorUserId: ctx.userId,
    entityType: 'organization_invitation',
    entityId: invitation.id,
    action: 'create',
    payload: {
      email_address: invitation.emailAddress,
      app_role: input.appRole,
      clerk_role: invitation.role,
    },
  });

  return mapInvitation(invitation);
}

export async function updateOrganizationMemberRole(input: {
  targetUserId: string;
  appRole: UserRole;
}) {
  const ctx = await requireTenantContext();

  if (!canManageTeam(ctx.orgRole)) {
    throw new Error('Forbidden: requires organization admin');
  }

  if (input.targetUserId === ctx.userId) {
    throw new Error('Forbidden: non puoi modificare il tuo ruolo da questa schermata');
  }

  const clerk = await clerkClient();
  const existingMembership = await getOrganizationMembershipByUserId(ctx.orgId, input.targetUserId);

  if (!existingMembership) {
    throw new Error('Not found: membership not found');
  }

  await clerk.organizations.updateOrganizationMembership({
    organizationId: ctx.orgId,
    userId: input.targetUserId,
    role: toClerkRole(input.appRole),
  });

  const updatedMembership = await clerk.organizations.updateOrganizationMembershipMetadata({
    organizationId: ctx.orgId,
    userId: input.targetUserId,
    publicMetadata: {
      ...(existingMembership.publicMetadata ?? {}),
      appRole: input.appRole,
    },
  });

  await writeAuditLog({
    orgId: ctx.orgId,
    actorUserId: ctx.userId,
    entityType: 'organization_member',
    entityId: input.targetUserId,
    action: 'update',
    payload: {
      app_role: input.appRole,
      clerk_role: updatedMembership.role,
    },
  });

  return mapTeamMember(updatedMembership);
}

export async function removeOrganizationMember(targetUserId: string) {
  const ctx = await requireTenantContext();

  if (!canManageTeam(ctx.orgRole)) {
    throw new Error('Forbidden: requires organization admin');
  }

  if (targetUserId === ctx.userId) {
    throw new Error('Forbidden: non puoi rimuovere te stesso da questa schermata');
  }

  const existingMembership = await getOrganizationMembershipByUserId(ctx.orgId, targetUserId);

  if (!existingMembership) {
    throw new Error('Not found: membership not found');
  }

  const clerk = await clerkClient();
  await clerk.organizations.deleteOrganizationMembership({
    organizationId: ctx.orgId,
    userId: targetUserId,
  });

  await writeAuditLog({
    orgId: ctx.orgId,
    actorUserId: ctx.userId,
    entityType: 'organization_member',
    entityId: targetUserId,
    action: 'delete',
    payload: {
      email_address: existingMembership.publicUserData?.identifier ?? null,
      app_role: normalizeAppRole(existingMembership.publicMetadata?.appRole, existingMembership.role),
      clerk_role: existingMembership.role,
    },
  });
}

export async function revokeOrganizationInvitation(invitationId: string) {
  const ctx = await requireTenantContext();

  if (!canManageTeam(ctx.orgRole)) {
    throw new Error('Forbidden: requires organization admin');
  }

  const clerk = await clerkClient();
  const invitation = await clerk.organizations.revokeOrganizationInvitation({
    organizationId: ctx.orgId,
    invitationId,
    requestingUserId: ctx.userId,
  });

  await writeAuditLog({
    orgId: ctx.orgId,
    actorUserId: ctx.userId,
    entityType: 'organization_invitation',
    entityId: invitation.id,
    action: 'delete',
    payload: {
      email_address: invitation.emailAddress,
      app_role: normalizeAppRole(invitation.publicMetadata?.appRole, invitation.role),
      clerk_role: invitation.role,
      status: invitation.status ?? 'revoked',
    },
  });

  return mapInvitation(invitation);
}
