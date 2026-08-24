import { NextRequest, NextResponse } from 'next/server';
import { getAuthorProfile } from '@/lib/services/user-service';

// Always fetch fresh from the DB - a GET route handler with no
// request-derived dynamic behavior is otherwise eligible for Next's
// static Route Handler caching, which is what caused this endpoint to
// serve a stale snapshot until a full rebuild/refresh.
export const dynamic = 'force-dynamic';


// Public author profile endpoint - the real user (any role: admin,
// editor, writer, contributor) behind an article's author_id. Used by
// /author/[id]/page.tsx, a 'use client' component, which can't call
// getAuthorProfile() directly (service-role client, server-only - see
// src/lib/supabase/admin.ts).
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const author = await getAuthorProfile(params.id);
    if (!author) {
      return NextResponse.json({ error: 'Author not found' }, { status: 404 });
    }
    return NextResponse.json({ author });
  } catch (error) {
    console.error('Error fetching author profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch author profile' },
      { status: 500 }
    );
  }
}
