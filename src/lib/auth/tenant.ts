import { auth } from '@clerk/nextjs/server';

/**
 * Get the current authenticated user's tenant context.
 * Returns orgId, userId and role from Clerk.
 *
 * Throws if not authenticated or no active organization.
 */
export async function requireTenantContext() {
  const session = await auth();

  if (!session?.userId) {
    throw new Error('Unauthorized: no authenticated user');
  }

  if (!session.orgId) {
    throw new Error('Unauthorized: no active organization');
  }

  return {
    userId: session.userId,
    orgId: session.orgId,
    orgRole: session.orgRole as string | undefined,
  };
}

/**
 * Get tenant context without throwing — returns null if not authenticated.
 */
export async function getTenantContext() {
  try {
    return await requireTenantContext();
  } catch {
    return null;
  }
}

/**
 * Check if user has one of the required roles.
 */
export async function requireRole(...roles: string[]) {
  const ctx = await requireTenantContext();

  if (!ctx.orgRole || !roles.includes(ctx.orgRole)) {
    throw new Error(`Forbidden: requires role ${roles.join(' or ')}`);
  }

  return ctx;
}
