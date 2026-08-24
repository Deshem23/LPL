'use client';

import { useState, useEffect, useCallback } from 'react';

// Client-side data hook for the /admin/audit-log page - fetches from
// /api/audit (admin-only route, see src/app/api/audit/route.ts). Was an
// empty file.

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

export interface AuditLogFilters {
  page?: number;
  limit?: number;
  action?: string;
  entityType?: string;
  userIds?: string[];
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

function buildAuditParams(filters: AuditLogFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.action) params.set('action', filters.action);
  if (filters.entityType) params.set('entityType', filters.entityType);
  if (filters.userIds && filters.userIds.length > 0) params.set('userIds', filters.userIds.join(','));
  if (filters.search) params.set('search', filters.search);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  return params;
}

// Safety cap on how many pages fetchAllAuditLogs will walk, so a runaway
// loop (e.g. a backend bug that never reports the right `total`) can't
// hang the browser tab fetching forever. 200 pages * 1000 rows/page =
// 200,000 entries, far past any realistic single export.
const MAX_EXPORT_PAGES = 200;
const EXPORT_PAGE_SIZE = 1000;

/**
 * Fetches every audit log entry matching `filters`, across every page -
 * not just one page's worth. Used by the "Exporter" buttons on the audit
 * log and reports pages: the table on screen is paginated (30 rows/page)
 * for browsing, but an export of "this user's audit trail" should mean
 * their whole matching history, not whatever 30 rows happen to be
 * currently displayed. Ignores any `page`/`limit` passed in `filters` -
 * those are for the on-screen table, not this.
 */
export async function fetchAllAuditLogs(
  filters: Omit<AuditLogFilters, 'page' | 'limit'>
): Promise<AuditLogEntry[]> {
  const all: AuditLogEntry[] = [];
  let page = 1;

  while (page <= MAX_EXPORT_PAGES) {
    const params = buildAuditParams({ ...filters, page, limit: EXPORT_PAGE_SIZE });
    const res = await fetch(`/api/audit?${params.toString()}`, { cache: 'no-store' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Impossible de charger le journal d’audit.');
    }
    const json = await res.json();
    const pageLogs: AuditLogEntry[] = json.logs || [];
    all.push(...pageLogs);

    const total = json.total || 0;
    if (all.length >= total || pageLogs.length < EXPORT_PAGE_SIZE) break;
    page += 1;
  }

  return all;
}

export function useAuditLog(filters: AuditLogFilters) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    page,
    limit,
    action,
    entityType,
    userIds,
    search,
    dateFrom,
    dateTo,
  } = filters;
  // Stable string key for the effect/callback deps below - an array
  // reference (even with the same contents) would otherwise re-trigger
  // the fetch on every render.
  const userIdsKey = (userIds || []).join(',');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = buildAuditParams({
        page,
        limit,
        action,
        entityType,
        userIds: userIdsKey ? userIdsKey.split(',') : undefined,
        search,
        dateFrom,
        dateTo,
      });

      const res = await fetch(`/api/audit?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Impossible de charger le journal d’audit.');
      }
      const json = await res.json();
      setLogs(json.logs || []);
      setTotal(json.total || 0);
      setTotalPages(json.totalPages || 0);
    } catch (err: any) {
      setError(err.message || 'Impossible de charger le journal d’audit.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, action, entityType, userIdsKey, search, dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  return { logs, total, totalPages, loading, error, refresh: load };
}
