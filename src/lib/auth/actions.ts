'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { logAction } from '@/lib/services/audit-service';

// Best-effort caller IP for the audit log - same header proxies/Vercel
// already set for the rate limiter (see src/lib/rate-limit.ts). Server
// Actions don't receive a Request object the way a route handler does,
// so this reads it off next/headers instead.
function getRequestIp(): string | null {
  try {
    const h = headers();
    return h.get('x-forwarded-for')?.split(',')[0].trim() || h.get('x-real-ip') || null;
  } catch {
    return null;
  }
}

/**
 * Login with email and password
 */
export async function loginWithEmail(email: string, password: string) {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.user) {
    return { error: 'Login failed' };
  }

  // Role and the first-login flag both live in public.users, not the
  // JWT's user_metadata - the metadata is only set at signup and can
  // drift out of sync with an admin-changed role (see updateUser() in
  // user-service.ts), so it's read here as a fallback only.
  const { data: profile } = await supabase
    .from('users')
    .select('role, must_change_password')
    .eq('id', data.user.id)
    .single();

  const role = profile?.role || data.user.user_metadata?.role || 'contributor';

  // Keep the JWT's role claim in sync so middleware's role-based route
  // gating doesn't lag behind an admin-made role change.
  if (profile?.role && profile.role !== data.user.user_metadata?.role) {
    await supabase.auth.updateUser({ data: { role: profile.role } }).catch(() => {});
  }

  const redirectTo = profile?.must_change_password ? '/complete-profile' : getDashboardPath(role);

  // This is the login path the actual login form uses (login-form.tsx
  // calls this Server Action directly) - the separate /api/auth/login
  // route also logs 'auth.login', but nothing in the app calls it, so it
  // was never actually recording real logins. Fire-and-forget - logAction()
  // swallows its own errors, so a logging hiccup can never block a login.
  logAction({
    userId: data.user.id,
    action: 'auth.login',
    entityType: 'user',
    entityId: data.user.id,
    details: { email, role },
    ipAddress: getRequestIp(),
  });

  return {
    user: data.user,
    role: role,
    redirectTo,
  };
}

/**
 * Sign up with email and password
 */
export async function signupWithEmail(email: string, password: string, name: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        role: 'contributor', // Default role
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    logAction({
      userId: data.user.id,
      action: 'auth.register',
      entityType: 'user',
      entityId: data.user.id,
      details: { email, name },
      ipAddress: getRequestIp(),
    });
  }

  return { user: data.user };
}

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle() {
  const supabase = createClient();
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.url) {
    redirect(data.url);
  }
}

/**
 * Sign out
 */
export async function signOut() {
  const supabase = createClient();

  // Must read the user before signOut() clears the session - there's
  // nothing left to attribute the log entry to afterward. Same
  // dead-route gap as loginWithEmail(): /api/auth/logout logs
  // 'auth.logout', but the actual logout button in panel/layout.tsx
  // calls this Server Action, not that route.
  const { data: { user } } = await supabase.auth.getUser();

  await supabase.auth.signOut();

  if (user) {
    logAction({
      userId: user.id,
      action: 'auth.logout',
      entityType: 'user',
      entityId: user.id,
      ipAddress: getRequestIp(),
    });
  }

  redirect('/lpl-access-2026');
}

/**
 * Get current user
 */
export async function getCurrentUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Get the current user together with their DB-authoritative role.
 *
 * getCurrentUser() alone only returns the Supabase auth user, whose
 * user_metadata.role claim can lag behind an admin-made role change
 * (see loginWithEmail()'s resync above - the JWT claim is refreshed on
 * login, but not on every request). Route handlers that need to make an
 * authorization decision should look up public.users.role fresh instead
 * of trusting the JWT claim, the same way loginWithEmail() does.
 */
export async function getCurrentUserWithRole() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profile?.role || user.user_metadata?.role || 'contributor';

  return { user, role };
}

/**
 * Get current session
 */
export async function getSession() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/**
 * Reset password
 */
export async function resetPassword(email: string) {
  const supabase = createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  // No authenticated actor yet at this point (that's the whole point of
  // "forgot password") - logged with a null userId, same as any
  // no-actor action (see LogActionParams). Worth recording since it's a
  // security-relevant event even though it's just the request, not the
  // actual change - see updatePassword() below for that.
  logAction({
    userId: null,
    action: 'auth.password_reset_requested',
    entityType: 'user',
    details: { email },
    ipAddress: getRequestIp(),
  });

  return { success: true };
}

/**
 * Update password (after reset)
 */
export async function updatePassword(password: string) {
  const supabase = createClient();

  // Read the actor before updateUser() - matches signOut()'s reasoning
  // above, though a password update doesn't clear the session the way
  // sign-out does.
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return { error: error.message };
  }

  if (user) {
    logAction({
      userId: user.id,
      action: 'auth.password_change',
      entityType: 'user',
      entityId: user.id,
      ipAddress: getRequestIp(),
    });
  }

  return { success: true };
}

/**
 * Get dashboard path based on role
 */
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
