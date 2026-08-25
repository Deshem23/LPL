'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { useAuditLog, fetchAllAuditLogs, type AuditLogEntry } from '@/hooks/use-audit-log';
import {
  AuditFilters,
  type AuditFiltersValue,
  type AuditFilterUser,
} from '@/components/admin/audit/audit-filters';
import { AuditTable } from '@/components/admin/audit/audit-table';
import { ExportButtons } from '@/components/shared/export-buttons';
import type { ExportColumn } from '@/lib/export-utils';

const AUDIT_EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'when', label: 'Quand' },
  { key: 'userName', label: 'Utilisateur' },
  { key: 'userEmail', label: 'E-mail' },
  { key: 'action', label: 'Action' },
  { key: 'entityType', label: 'Type' },
  { key: 'details', label: 'Détails' },
  { key: 'ipAddress', label: 'Adresse IP' },
];

function toExportRow(log: AuditLogEntry) {
  return {
    when: new Date(log.createdAt).toLocaleString('fr-FR'),
    userName: log.userName,
    userEmail: log.userEmail || '',
    action: log.action,
    entityType: log.entityType || '',
    details: log.details ? Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(', ') : '',
    ipAddress: log.ipAddress || '',
  };
}

// Admin-only journal of who did what - see src/middleware.ts (roleMap)
// for the route gate and src/lib/services/audit-service.ts for how
// entries get written (from the article/category/user/auth API routes).
export default function AuditLogPage() {
  const [filters, setFilters] = useState<AuditFiltersValue>({
    search: '',
    action: 'all',
    dateFrom: '',
    dateTo: '',
    userIds: [],
  });
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<AuditFilterUser[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  // Full user list for the multi-user filter/export - not just whoever
  // happens to show up in the current page of logs.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/users', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setUsers((data.users || []).map((u: any) => ({ id: u.id, name: u.name, email: u.email })));
      })
      .catch(() => {
        if (!cancelled) setUsers([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const { logs, total, totalPages, loading, error, refresh } = useAuditLog({
    page,
    limit: 30,
    search: filters.search || undefined,
    action: filters.action !== 'all' ? filters.action : undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    userIds: filters.userIds.length > 0 ? filters.userIds : undefined,
  });

  const handleFiltersChange = (value: AuditFiltersValue) => {
    setFilters(value);
    setPage(1);
    setSelectedIds([]);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const toggleSelectAll = (idsOnPage: string[]) => {
    const allSelected = idsOnPage.every((id) => selectedIds.includes(id));
    setSelectedIds((prev) =>
      allSelected ? prev.filter((id) => !idsOnPage.includes(id)) : [...new Set([...prev, ...idsOnPage])]
    );
  };

  // Deletes exactly the selected entries. Irreversible - the audit trail
  // has no recycle bin, unlike articles/media/users - so this confirms
  // first, same pattern as the trash page's permanent-delete action.
  // The deletion itself gets logged as a fresh 'audit.delete' entry (see
  // the API route), so purging old history doesn't erase the fact that
  // it happened.
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (
      !confirm(
        `Supprimer définitivement ${selectedIds.length} entrée${selectedIds.length !== 1 ? 's' : ''} du journal d'audit ? Cette action est irréversible.`
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch('/api/audit', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Une erreur est survenue.');

      toast({ title: 'Supprimé', description: `${json.count ?? selectedIds.length} entrée(s) supprimée(s).` });
      setSelectedIds([]);
      refresh();
    } catch (err: any) {
      toast({
        title: 'Erreur',
        description: err?.message || 'Impossible de supprimer ces entrées.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  // Exports every entry matching the active filters, across every page -
  // not just the 30 rows currently on screen. Selecting one or more
  // users in the filters above is how this page supports a single-user
  // or multi-user audit export; this is what makes that export actually
  // contain their full matching history instead of whatever happened to
  // be on the visible page when "Exporter" was clicked.
  const getExportRows = async () => {
    const all = await fetchAllAuditLogs({
      search: filters.search || undefined,
      action: filters.action !== 'all' ? filters.action : undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      userIds: filters.userIds.length > 0 ? filters.userIds : undefined,
    });
    return all.map(toExportRow);
  };

  const exportTitle =
    filters.userIds.length === 1
      ? `Journal d'audit — ${users.find((u) => u.id === filters.userIds[0])?.name || 'utilisateur'}`
      : filters.userIds.length > 1
      ? `Journal d'audit — ${filters.userIds.length} utilisateurs`
      : "Journal d'audit";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Journal d&apos;audit</h2>
          <p className="text-muted-foreground">
            Historique des actions effectuées dans l&apos;administration : connexions, déconnexions,
            création, modification et suppression d&apos;articles, de catégories et d&apos;utilisateurs.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectedIds.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={deleting}
              onClick={handleDeleteSelected}
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Supprimer la sélection ({selectedIds.length})
            </Button>
          )}
          <ExportButtons
            title={exportTitle}
            filename={`journal-audit-${new Date().toISOString().slice(0, 10)}`}
            columns={AUDIT_EXPORT_COLUMNS}
            getRows={getExportRows}
            disabled={total === 0}
          />
        </div>
      </div>

      <AuditFilters value={filters} onChange={handleFiltersChange} users={users} />

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <AuditTable
          logs={logs}
          loading={loading}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
        />
      )}

      {totalPages > 1 && (
        <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-center text-sm text-muted-foreground sm:text-left">
            Page {page} sur {totalPages} ({total} entrées au total)
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Suivant
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
