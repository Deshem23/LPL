import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Refreshes the Supabase auth session and keeps cookies in sync, reading
 * and writing them directly off THIS request/response pair instead of
 * going through next/headers' cookies() (which lib/supabase/server.ts's
 * createClient() uses, and which middleware.ts was calling by mistake).
 *
 * This was written but never actually wired into middleware.ts - it was
 * still calling the Server Component client instead, which is not
 * reliably bound to the specific incoming request inside Middleware.
 * That was a real cross-session leak: an admin logged in in one window,
 * then a brand-new INCOGNITO window (sharing no cookies at all) visiting
 * /lpl-access-2026 got redirected straight into the admin's own panel
 * with no login prompt, because supabase.auth.getUser() in middleware
 * was resolving to whichever session the server process had last
 * authenticated rather than this request's own (cookie-less) session.
 * Now wired in below.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // supabase.auth.getUser() always makes a real network round trip to the
  // Supabase Auth server to re-validate the token - that's exactly why
  // it's the correct, secure call to use here instead of getSession()
  // (see this file's header comment on the incognito-session leak
  // getSession() alone would have let back in). But this now runs on
  // every single non-static request site-wide (see middleware.ts's
  // matcher), and the overwhelming majority of requests to a public news
  // site are anonymous readers with no Supabase session cookie at all -
  // for those, that round trip only ever learns "there's no user", paid
  // for on every page view. Supabase's own auth cookies are always
  // prefixed "sb-", so a request carrying none of them can never resolve
  // to a logged-in user regardless - skip the Auth-server call (not the
  // client construction above, which does no network I/O by itself) in
  // that case, rather than paying for a network round trip whose answer
  // is already known.
  const hasSupabaseCookie = request.cookies.getAll().some((c) => c.name.startsWith('sb-'));
  const user = hasSupabaseCookie ? (await supabase.auth.getUser()).data.user : null;

  // Returned as a getter-like plain object rather than just `response` -
  // middleware.ts needs the authenticated `user` (and `supabase`, to run
  // the must_change_password / role lookups) for its own auth-gating
  // logic, not just the refreshed-cookie response.
  return { response, supabase, user };
}
