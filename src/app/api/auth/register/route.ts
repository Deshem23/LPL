import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getSiteSettings } from '@/lib/services/settings-service';
import { validatePassword } from '@/lib/auth/password-policy';
import { checkRateLimit } from '@/lib/rate-limit';
import { logAction } from '@/lib/services/audit-service';

// Always fetch fresh from the DB - a GET route handler with no
// request-derived dynamic behavior is otherwise eligible for Next's
// static Route Handler caching, which is what caused this endpoint to
// serve a stale snapshot until a full rebuild/refresh.
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {

  try {
    // 5 accounts / hour per IP - registration abuse is lower-frequency by
    // nature than login guessing, but still worth capping. See
    // src/lib/rate-limit.ts for caveats.
    const rl = checkRateLimit('auth.register', request, 5, 60 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Trop de tentatives d\'inscription. Réessayez plus tard.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }

    const settings = await getSiteSettings();

    // Settings > General > "Inscriptions activées" - was saved but never
    // actually blocked anything, so turning it off in the admin had no
    // effect on this endpoint.
    if (!settings.registration_enabled) {
      return NextResponse.json(
        { error: 'Les inscriptions sont actuellement désactivées.' },
        { status: 403 }
      );
    }

    const body = await request.json();

    const { email, password, name } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    // Settings > Security's password policy (min length, uppercase,
    // numbers, special chars) - same story: saved, never enforced.
    const passwordCheck = validatePassword(password, settings);
    if (!passwordCheck.valid) {
      return NextResponse.json(
        { error: passwordCheck.errors.join(' ') },
        { status: 400 }
      );
    }

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role: 'contributor',
        },
      },
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    if (data.user) {
      logAction({
        userId: data.user.id,
        action: 'auth.register',
        entityType: 'user',
        entityId: data.user.id,
        details: { email, name },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || null,
      });
    }

    return NextResponse.json({
      user: data.user,
      message: 'User created successfully. Please check your email for verification.',
    });
  } catch (error: any) {
    console.error('❌ Registration error:', error.message);
    console.error('Stack:', error.stack);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
