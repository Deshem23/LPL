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

    // Soft delete only - moves the item to the trash (see
    // migrations/20_recycle_bin_and_media_dedup.sql) instead of removing
    // the row and the underlying storage file. The item disappears from
    // the Media Library immediately (GET above filters
    // `.is('deleted_at', null)`) but the actual file stays in Storage,
    // untouched, until it's restored, permanently deleted from the trash
    // view, or the 30-day auto-purge reaches it - at which point the
    // real DELETE + storage cleanup happens (see permanentlyDeleteMedia
    // in trash-service.ts).
    const { data: existing, error } = await supabase
      .from('media')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', params.id)
      .select('url')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
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
