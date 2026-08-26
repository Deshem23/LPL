import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { logAction } from '@/lib/services/audit-service';

// Always fetch fresh from the DB - a GET route handler with no
// request-derived dynamic behavior is otherwise eligible for Next's
// static Route Handler caching, which is what caused this endpoint to
// serve a stale snapshot until a full rebuild/refresh.
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {

  try {
    const supabase = createClient();
    // Capture who's logging out BEFORE signOut() tears down the session -
    // there's no user to attribute the audit entry to afterward.
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    if (user) {
      logAction({
        userId: user.id,
        action: 'auth.logout',
        entityType: 'user',
        entityId: user.id,
      });
    }

    return NextResponse.json({
      message: 'Logged out successfully',
    });
  } catch (error: any) {
    console.error('❌ Logout error:', error.message);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
