import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { logAction } from '@/lib/services/audit-service';
import { checkRateLimit } from '@/lib/rate-limit';

// Always fetch fresh from the DB - a GET route handler with no
// request-derived dynamic behavior is otherwise eligible for Next's
// static Route Handler caching, which is what caused this endpoint to
// serve a stale snapshot until a full rebuild/refresh.
export const dynamic = 'force-dynamic';


export async function POST(request: Request) {
  try {
    // 10 attempts / 5 minutes per IP - generous enough for a genuine user
    // who mistypes a password a few times, tight enough to blunt a
    // credential-stuffing script. See src/lib/rate-limit.ts for caveats.
    const rl = checkRateLimit('auth.login', request, 10, 5 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Trop de tentatives de connexion. Réessayez dans quelques minutes.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON format. Please send a valid JSON body.' },
        { status: 400 }
      );
    }

    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    // Get role from database (not metadata)
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', data.user.id)
      .single();

    let role = 'contributor';
    
    if (profileError) {
      console.error('❌ Error fetching profile:', profileError);
      // Fallback to metadata
      role = data.user?.user_metadata?.role || 'contributor';
    } else {
      role = profile?.role || 'contributor';
      // Sync role to auth metadata if different
      if (role !== data.user?.user_metadata?.role) {
        console.log(`🔄 Syncing role: ${role} for user ${data.user.id}`);
        const { error: updateError } = await supabase.auth.updateUser({
          data: { role: role }
        });
        if (updateError) {
          console.error('❌ Error syncing role:', updateError);
        } else {
          console.log(`✅ Role synced: ${role}`);
        }
      }
    }

    const redirectMap: Record<string, string> = {
      admin: '/lpl-access-2026/panel',
      editor: '/lpl-access-2026/panel/editor',
      writer: '/lpl-access-2026/panel/writer',
      contributor: '/lpl-access-2026/panel/contributor',
    };

    const redirectTo = redirectMap[role] || '/lpl-access-2026/panel';

    // Fire-and-forget - logAction() swallows its own errors, so a
    // logging hiccup can never block or fail a successful login.
    logAction({
      userId: data.user.id,
      action: 'auth.login',
      entityType: 'user',
      entityId: data.user.id,
      details: { email, role },
    });

    return NextResponse.json({
      user: data.user,
      role: role,
      redirectTo: redirectTo,
      message: `Welcome ${role}!`,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
