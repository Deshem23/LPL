import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuth } from '@/lib/auth/require-permission';

// Always fetch fresh from the DB - a GET route handler with no
// request-derived dynamic behavior is otherwise eligible for Next's
// static Route Handler caching, which is what caused this endpoint to
// serve a stale snapshot until a full rebuild/refresh.
export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const offset = (page - 1) * limit;

    // Uses the service-role client, not createClient() - the "viewable
    // by everyone" SELECT policy on media would work with the regular
    // client too, but every other admin list in this app goes through
    // the service-role client rather than relying on auth.jwt() ->>
    // 'role' RLS checks (see src/lib/supabase/admin.ts), so this stays
    // consistent with that and isn't tripped up by cookie/session state.
    const supabase = createAdminClient();

    let query = supabase
      .from('media')
      .select('*', { count: 'exact' })
      // Excludes trashed media (see the DELETE handler in
      // [id]/route.ts) from the Media Library - trashed items are only
      // ever returned by the trash listing.
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (type && type !== 'all') {
      query = query.eq('type', type);
    }

    if (search) {
      query = query.ilike('alt_text', `%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      media: data,
      total: count,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch media' },
      { status: 500 }
    );
  }
}
