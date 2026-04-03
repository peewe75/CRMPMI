import { createClient } from '@supabase/supabase-js';

/**
 * Client-side Supabase instance using the anon key.
 * Only used for Realtime subscriptions and public reads.
 * All mutations go through server route handlers.
 */
export function createBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
