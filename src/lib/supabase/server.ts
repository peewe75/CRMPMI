import { auth } from '@clerk/nextjs/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client using the service role key.
 * Used in route handlers and server actions where we manage
 * RLS context via org_id filtering in queries.
 *
 * IMPORTANT: Never expose the service role key to the client.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Server-side Supabase client using the anon key.
 * For operations that should respect RLS policies.
 * We set the active org via a custom header for compatibility with
 * app-level queries while Supabase enforces RLS from Clerk's token.
 */
export function createAnonClient(orgId?: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const client = createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: orgId ? { 'x-org-id': orgId } : {},
    },
  });

  return client;
}

/**
 * RLS-ready client for Clerk + Supabase native third-party auth integration.
 * It uses the standard Clerk session token and forwards the active org header
 * so our SQL helper can support both native token claims and header fallback.
 */
export async function createRlsClientForCurrentUser() {
  const session = await auth();
  const token = await session.getToken();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const headers: Record<string, string> = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (session.orgId) {
    headers['x-org-id'] = session.orgId;
  }

  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers },
  });
}
