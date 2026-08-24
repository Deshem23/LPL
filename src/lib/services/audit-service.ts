import { createAdminClient } from '@/lib/supabase/admin';

// Writer + reader for the `audit_logs` table (migrations/01_create_tables.sql
// - was already in the schema but never used anywhere in the app: this
// file, its API route, and its admin UI were all 0-byte scaffolds before
// this). Every admin mutation (article/category/user create/update/delete)
// calls logAction() right after it succeeds, from the API route handler
// that already has the acting user from getCurrentUser() - see
// src/app/api/articles/route.ts etc.

export interface LogActionParams {
  /** The acting user's id (public.users.id, same as auth.users.id). Null
   *  is allowed for actions with no authenticated actor (should be rare -
   *  every route this is called from already requires a logged-in user). */
  userId?: string | null;
  /** Dot-namespaced action, e.g. 'article.create', 'user.role_change'. */
  action: string;
  entityType?: string;
  entityId?: string;
  /** Small JSON blob of what changed - e.g. { title, status } for an
   *  article, { role: 'editor' } for a role change. Keep it short; this
   *  is shown inline in the audit table, not as a full diff. */
  details?: Record<string, any>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Writes one row to audit_logs. Deliberately swallows its own errors -
 * a logging failure must never fail (or roll back) the real mutation it's
 * recording, so every call site can fire this without wrapping it in its
 * own try/catch.
 */
export async function logAction(params: LogActionParams): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('audit_logs').insert([
      {
        user_id: params.userId || null,
        action: params.action,
        entity_type: params.entityType || null,
        entity_id: params.entityId || null,
        details: params.details || null,
        ip_address: params.ipAddress || null,
        user_agent: params.userAgent || null,
      },
    ]);
    if (error) {
      console.error('Error writing audit log:', error);
    }
  } catch (err) {
    console.error('Unexpected error writing audit log:', err);
  }
}

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  userName: string;
  userEmail: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface GetAuditLogsParams {
  page?: number;
  limit?: number;
  /** Matches the action column by prefix, e.g. 'article' matches
   *  'article.create', 'article.update', 'article.delete'. */
  action?: string;
  entityType?: string;
  userId?: string;
  /** Scope to several users at once (e.g. a multi-user export from the
   *  audit log page) - takes precedence over `userId` when both are set. */
  userIds?: string[];
  /** Free-text match against the acting user's name/email, or the action
   *  itself - resolved into user ids server-side so it stays part of the
   *  same paginated query instead of filtering already-paginated rows
   *  (which would make `total`/`totalPages` lie). */
  search?: string;
  /** 'YYYY-MM-DD' */
  dateFrom?: string;
  /** 'YYYY-MM-DD' */
  dateTo?: string;
}

export async function getAuditLogs(
  params: GetAuditLogsParams = {}
): Promise<{ logs: AuditLogEntry[]; total: number; totalPages: number; currentPage: number }> {
  const supabase = createAdminClient();

  const page = params.page || 1;
  const limit = params.limit || 30;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('audit_logs')
    .select('*, user:user_id ( id, name, email )', { count: 'exact' });

  if (params.action) {
    query = query.ilike('action', `${params.action}%`);
  }
  if (params.entityType) {
    query = query.eq('entity_type', params.entityType);
  }
  if (params.userIds && params.userIds.length > 0) {
    query = query.in('user_id', params.userIds);
  } else if (params.userId) {
    query = query.eq('user_id', params.userId);
  }
  if (params.dateFrom) {
    query = query.gte('created_at', `${params.dateFrom}T00:00:00.000Z`);
  }
  if (params.dateTo) {
    query = query.lte('created_at', `${params.dateTo}T23:59:59.999Z`);
  }

  if (params.search) {
    const escaped = params.search.replace(/[%,]/g, '');
    const { data: matchingUsers } = await supabase
      .from('users')
      .select('id')
      .or(`name.ilike.%${escaped}%,email.ilike.%${escaped}%`);
    const userIds = (matchingUsers || []).map((u: { id: string }) => u.id);

    const orParts = [`action.ilike.%${escaped}%`, `entity_type.ilike.%${escaped}%`];
    if (userIds.length > 0) {
      orParts.push(`user_id.in.(${userIds.join(',')})`);
    }
    query = query.or(orParts.join(','));
  }

  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching audit logs:', error);
    return { logs: [], total: 0, totalPages: 0, currentPage: page };
  }

  const logs: AuditLogEntry[] = (data || []).map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    userName: row.user?.name || 'Système',
    userEmail: row.user?.email || null,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    details: row.details,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  }));

  const total = count || 0;

  return { logs, total, totalPages: Math.ceil(total / limit), currentPage: page };
}
