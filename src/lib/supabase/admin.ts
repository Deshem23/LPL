import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Nearly every service function in this app (getArticles, getCurrentUser
// call sites, createUser, updateArticle, getBreakingArticles, ...) calls
// createAdminClient() fresh on every invocation - a single page load can
// easily call it a dozen+ times. Each call was building a brand-new
// @supabase/supabase-js client from scratch, including its own GoTrueClient
// (auth) instance - which, with default options, assumes a BROWSER
// context: persistSession tries to touch localStorage (doesn't exist
// server-side), and autoRefreshToken schedules a recurring timer. None of
// that applies to this client (the service role key doesn't expire and
// isn't a user session), so it was pure wasted work - and in a
// long-running process like `npm run dev` (unlike a stateless serverless
// invocation), those per-call timers/listeners don't get cleaned up
// between requests, so they can accumulate over a dev session.
// A cached singleton removes the repeated construction entirely, and the
// explicit auth options stop it from doing browser-oriented setup work
// it never needed in the first place.
let cachedAdminClient: SupabaseClient | null = null;

/**
 * Supabase admin client with service role key.
 * This bypasses RLS and should ONLY be used in server-side code
 * for admin operations like fetching all users, articles, etc.
 */
export function createAdminClient() {
  if (cachedAdminClient) {
    return cachedAdminClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  // Use service role key for admin operations (bypasses RLS).
  // Intentionally NOT falling back to the anon key: silently degrading to
  // the anon key means every "admin" query gets filtered by RLS as if it
  // were a public request, which is exactly what caused articles other
  // than "published" to disappear from the admin UI.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not defined');
  }

  if (!key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not defined. createAdminClient() must not fall back ' +
      'to the anon key, since that silently reintroduces RLS filtering for admin queries. ' +
      'Also note: this client must only ever run in server-side code (Route Handlers, ' +
      'Server Components, Server Actions) — it will throw here if accidentally imported ' +
      'into a "use client" component, because SUPABASE_SERVICE_ROLE_KEY is never inlined ' +
      'into the browser bundle.'
    );
  }

  cachedAdminClient = createClient(url, key, {
    auth: {
      // No browser/user session involved here at all - this is a static
      // service-role key, so there's nothing to persist or refresh.
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
  return cachedAdminClient;
}
