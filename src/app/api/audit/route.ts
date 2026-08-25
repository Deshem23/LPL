import { NextResponse } from 'next/server';
import { getAuditLogs, deleteAuditLogs, logAction } from '@/lib/services/audit-service';
import { getCurrentUser } from '@/lib/auth/actions';
import { createAdminClient } from '@/lib/supabase/admin';

// Admin-only, paginated audit log reader. Was an empty file - see
// audit-service.ts for the DB logic this wraps.

// Reads request.url search params on every call and must never serve a
// stale page of results, so this can't be statically optimized - same
// reasoning as the 'force-dynamic' export added across the [locale] pages.
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role lives in public.users, not always in sync with the session
    // JWT's user_metadata.role (see the note in src/lib/auth/actions.ts) -
    // check the DB directly instead of trusting the JWT claim alone for
    // an admin-only endpoint.
    const supabase = createAdminClient();
    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
    const role = profile?.role || user.user_metadata?.role;

    if (role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '30');
    const action = searchParams.get('action') || undefined;
    const entityType = searchParams.get('entityType') || undefined;
    const userId = searchParams.get('userId') || undefined;
    // Comma-separated list of user ids - lets the audit log page scope
    // the table (and its export) to one or several specific users.
    const userIdsParam = searchParams.get('userIds');
    const userIds = userIdsParam ? userIdsParam.split(',').filter(Boolean) : undefined;
    const search = searchParams.get('search') || undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;

    const result = await getAuditLogs({
      page,
      limit,
      action,
      entityType,
      userId,
      userIds,
      search,
      dateFrom,
      dateTo,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}

// Permanently deletes audit log entries - either an explicit id
// selection or a bulk "purge everything on/before this date". Admin-only,
// same gate as GET above. The deletion itself is recorded as a new audit
// entry (action: 'audit.delete') so purging history doesn't erase the
// fact that it happened - that new entry is written AFTER the delete
// query runs, so it can't delete itself.
export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
    const role = profile?.role || user.user_metadata?.role;

    if (role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const ids: string[] | undefined = Array.isArray(body.ids) && body.ids.length > 0 ? body.ids : undefined;
    const before: string | undefined = typeof body.before === 'string' ? body.before : undefined;

    const result = await deleteAuditLogs({ ids, before });
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to delete audit logs' }, { status: 400 });
    }

    await logAction({
      userId: user.id,
      action: 'audit.delete',
      entityType: 'audit_log',
      details: ids ? { count: result.count, mode: 'selection' } : { count: result.count, mode: 'purge', before },
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent'),
    });

    return NextResponse.json({ success: true, count: result.count });
  } catch (error) {
    console.error('Error deleting audit logs:', error);
    return NextResponse.json({ error: 'Failed to delete audit logs' }, { status: 500 });
  }
}
