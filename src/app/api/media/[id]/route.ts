import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuth, requirePermission } from '@/lib/auth/require-permission';
import { logAction } from '@/lib/services/audit-service';

// Always fetch fresh from the DB - a GET route handler with no
// request-derived dynamic behavior is otherwise eligible for Next's
// static Route Handler caching, which is what caused this endpoint to
// serve a stale snapshot until a full rebuild/refresh.
export const dynamic = 'force-dynamic';


// Was an empty file - the admin media page never had a working delete
// (or edit/fetch-one) endpoint at all; it only mutated in-memory mock
// state and never touched the database or storage.

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('media')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }
    return NextResponse.json({ media: data });
  } catch (error) {
    console.error('Error fetching media:', error);
    return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requirePermission('canManageMedia');
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const supabase = createAdminClient();

    const row: Record<string, any> = {};
    if (body.altText !== undefined) row.alt_text = body.altText;
    if (body.caption !== undefined) row.caption = body.caption;

    const { data, error } = await supabase
      .from('media')
      .update(row)
      .eq('id', params.id)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    logAction({
      userId: auth.user.id,
      action: 'media.update',
      entityType: 'media',
      entityId: params.id,
      details: row,
    });

    return NextResponse.json({ media: data });
  } catch (error) {
    console.error('Error updating media:', error);
    return NextResponse.json({ error: 'Failed to update media' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requirePermission('canManageMedia');
    if (auth instanceof NextResponse) return auth;

    const supabase = createAdminClient();

    // Look up the row first so the underlying storage file can be
    // cleaned up too - not just the database row - otherwise every
    // delete leaves an orphaned file sitting in the "media" bucket.
    const { data: existing } = await supabase
      .from('media')
      .select('url')
      .eq('id', params.id)
      .single();

    const { error } = await supabase.from('media').delete().eq('id', params.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (existing?.url) {
      // Public Supabase Storage URLs look like
      // ".../storage/v1/object/public/media/<path>" - pull <path> back
      // out to remove the actual file. Best-effort: the DB row is
      // already gone (that's what makes it disappear from the admin
      // grid), so a storage cleanup failure here shouldn't fail the
      // whole delete.
      const marker = '/object/public/media/';
      const idx = existing.url.indexOf(marker);
      if (idx !== -1) {
        const filePath = existing.url.slice(idx + marker.length);
        try {
          await supabase.storage.from('media').remove([filePath]);
        } catch {
          // Non-fatal - the DB row (what the admin grid reflects) is
          // already gone either way.
        }
      }
    }

    logAction({
      userId: auth.user.id,
      action: 'media.delete',
      entityType: 'media',
      entityId: params.id,
      details: existing ? { url: existing.url } : undefined,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting media:', error);
    return NextResponse.json({ error: 'Failed to delete media' }, { status: 500 });
  }
}
