import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { logAction } from '@/lib/services/audit-service';

function getDashboardPath(role: string): string {
  switch (role) {
    case 'admin':
      return '/lpl-access-2026/panel';
    case 'editor':
      return '/lpl-access-2026/panel/editor';
    case 'writer':
      return '/lpl-access-2026/panel/writer';
    case 'contributor':
      return '/lpl-access-2026/panel/contributor';
    default:
      return '/lpl-access-2026/panel';
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');

  if (error) {
    // Handle OAuth error
    console.error('OAuth error:', error);
    return NextResponse.redirect(new URL('/lpl-access-2026?error=oauth_failed', request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/lpl-access-2026', request.url));
  }

  const supabase = createClient();
  let userId: string | undefined;
  try {
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) throw exchangeError;
    userId = data.user?.id;
  } catch (err) {
    console.error('Auth callback error:', err);
    return NextResponse.redirect(new URL('/lpl-access-2026?error=auth_callback_failed', request.url));
  }

  if (!userId) {
    return NextResponse.redirect(new URL('/lpl-access-2026/panel', request.url));
  }

  // This is where a Google sign-in actually completes - signInWithGoogle()
  // in actions.ts only kicks off the redirect to Google, so that's the
  // wrong place to log 'auth.login' for the OAuth path.
  logAction({
    userId,
    action: 'auth.login',
    entityType: 'user',
    entityId: userId,
    details: { method: 'google' },
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || null,
  });

  // A first-time Google sign-in already has a public.users row by now
  // (the on_auth_user_created DB trigger creates it the moment
  // exchangeCodeForSession() inserts into auth.users - see
  // migrations/01_create_tables.sql) with role defaulting to
  // 'contributor'. Google sign-ins never go through the admin-created
  // "generic password" flow, so must_change_password is never set here -
  // this lookup is only for role, to land them on the right dashboard
  // instead of always /admin.
  const { data: profile } = await supabase
    .from('users')
    .select('role, must_change_password')
    .eq('id', userId)
    .single();

  if (profile?.must_change_password) {
    return NextResponse.redirect(new URL('/complete-profile', request.url));
  }

  const role = profile?.role || 'contributor';
  return NextResponse.redirect(new URL(getDashboardPath(role), request.url));
}
