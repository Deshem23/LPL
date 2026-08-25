import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { updateUser, deleteUser } from '@/lib/services/user-service';
import { logAction } from '@/lib/services/audit-service';
import { requirePermission } from '@/lib/auth/require-permission';

// Always fetch fresh from the DB - a GET route handler with no
// request-derived dynamic behavior is otherwise eligible for Next's
// static Route Handler caching, which is what caused this endpoint to
// serve a stale snapshot until a full rebuild/refresh.
export const dynamic = 'force-dynamic';


export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requirePermission('canViewUsers');
    if (auth instanceof NextResponse) return auth;

    // Service-role client, not createClient() - the "admins can view all
    // users" RLS policy keys off auth.jwt() ->> 'role', which the
    // session JWT may not carry as a top-level claim (same gap already
    // worked around everywhere else in this app - see admin.ts).
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ user: data });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // A role change here is a privilege-escalation vector (this endpoint
    // accepts `role` directly in the body) - require canManageRoles
    // whenever the caller is trying to change it, and the lower bar of
    // canEditUser for a plain profile edit.
    const body = await request.json();
    const { name, role, status, bio, role_title, twitter, linkedin, website, avatar_url } = body;

    const auth = await requirePermission(role !== undefined ? 'canManageRoles' : 'canEditUser');
    if (auth instanceof NextResponse) return auth;
    const actor = auth.user;

    const result = await updateUser(params.id, {
      name,
      role,
      status,
      bio,
      role_title,
      twitter,
      linkedin,
      website,
      avatar_url,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    logAction({
      userId: actor.id,
      action: 'user.update',
      entityType: 'user',
      entityId: params.id,
      details: { name: result.user?.name, role: result.user?.role, status: result.user?.status },
    });

    return NextResponse.json({ user: result.user });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requirePermission('canDeleteUser');
    if (auth instanceof NextResponse) return auth;
    const actor = auth.user;

    // Deleting your own account here would immediately sign you out
    // mid-request (getCurrentUserWithRole() in actions.ts treats a
    // trashed account as unauthenticated) - the account can still be
    // deleted from the Trash view by a *different* admin if that's
    // really the intent, just not by itself.
    if (params.id === actor.id) {
      return NextResponse.json(
        { error: 'Vous ne pouvez pas supprimer votre propre compte.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: existing } = await supabase
      .from('users')
      .select('email, name')
      .eq('id', params.id)
      .single();

    // Soft delete - moves the user to the trash (see
    // migrations/20_recycle_bin_and_media_dedup.sql /
    // recycle-bin-service.ts) instead of removing the row outright. This
    // used to DELETE the row directly here, bypassing deleteUser()'s
    // trash logic entirely - restorable from the trash view for 30 days
    // instead of being gone the instant "Supprimer" was clicked.
    const result = await deleteUser(params.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    logAction({
      userId: actor.id,
      action: 'user.delete',
      entityType: 'user',
      entityId: params.id,
      details: existing ? { email: existing.email, name: existing.name } : undefined,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
