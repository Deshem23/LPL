import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/actions';
import { getUserById, updateOwnProfile } from '@/lib/services/user-service';
import { logAction } from '@/lib/services/audit-service';

// Always fetch fresh from the DB - a GET route handler with no
// request-derived dynamic behavior is otherwise eligible for Next's
// static Route Handler caching, which is what caused this endpoint to
// serve a stale snapshot until a full rebuild/refresh.
export const dynamic = 'force-dynamic';

// Was an empty file. Self-service "my own profile" endpoint - used by
// the first-login "complete your profile" gate (src/app/complete-profile)
// and any future account-settings page. Identity comes from the
// session (getCurrentUser()), never from a client-supplied id, so a user
// can only ever read/write their own row here.

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

export async function GET() {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await getUserById(authUser.id);
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({ user: profile });
  } catch (error) {
    console.error('Error fetching own profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, bio, role_title, twitter, linkedin, website, avatar_url, completeFirstLogin } = body;

    const result = await updateOwnProfile(
      authUser.id,
      { name, bio, role_title, twitter, linkedin, website, avatar_url },
      // Set only when the first-login gate is submitting - never let a
      // regular profile edit accidentally clear this flag for someone
      // else's session.
      completeFirstLogin === true
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    const redirectTo = completeFirstLogin === true
      ? getDashboardPath(result.user?.role || 'contributor')
      : undefined;

    // Diagnostic log for the first-login redirect - the client only gets
    // as far as `redirectTo`, so when someone reports "it didn't land on
    // my dashboard" this line (in the terminal running `npm run dev`) is
    // what actually tells us whether the role/path computed here was
    // right, rather than guessing blind.
    if (completeFirstLogin === true) {
    }

    logAction({
      userId: authUser.id,
      action: 'user.profile_update',
      entityType: 'user',
      entityId: authUser.id,
      details: { name, completeFirstLogin: completeFirstLogin === true },
    });

    return NextResponse.json({ user: result.user, redirectTo });
  } catch (error) {
    console.error('Error updating own profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
