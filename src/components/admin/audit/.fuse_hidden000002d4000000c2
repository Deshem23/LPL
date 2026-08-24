'use client';

import { FileText, FolderOpen, Users, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import type { AuditLogEntry } from '@/hooks/use-audit-log';

interface AuditTableProps {
  logs: AuditLogEntry[];
  loading: boolean;
}

const ACTION_LABELS: Record<string, string> = {
  'article.create': 'Article créé',
  'article.update': 'Article modifié',
  'article.delete': 'Article supprimé',
  'category.create': 'Catégorie créée',
  'category.update': 'Catégorie modifiée',
  'category.delete': 'Catégorie supprimée',
  'user.create': 'Utilisateur créé',
  'user.update': 'Utilisateur modifié',
  'user.delete': 'Utilisateur supprimé',
  'user.role_change': 'Rôle modifié',
};

const ENTITY_ICONS: Record<string, typeof FileText> = {
  article: FileText,
  category: FolderOpen,
  user: Users,
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function actionVariant(action: string): 'default' | 'destructive' | 'secondary' {
  if (action.endsWith('.delete')) return 'destructive';
  if (action.endsWith('.create')) return 'default';
  return 'secondary';
}

export function AuditTable({ logs, loading }: AuditTableProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="Aucune activité"
        description="Aucune entrée ne correspond à ces filtres."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Quand</th>
            <th className="px-4 py-3 font-medium">Utilisateur</th>
            <th className="px-4 py-3 font-medium">Action</th>
            <th className="px-4 py-3 font-medium">Détails</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {logs.map((log) => {
            const entityType = log.entityType || log.action.split('.')[0];
            const Icon = ENTITY_ICONS[entityType] || Activity;
            return (
              <tr key={log.id} className="hover:bg-muted/30">
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                  {formatWhen(log.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">{log.userName}</div>
                  {log.userEmail && (
                    <div className="text-xs text-muted-foreground">{log.userEmail}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={actionVariant(log.action)} className="gap-1">
                    <Icon className="h-3 w-3" />
                    {ACTION_LABELS[log.action] || log.action}
                  </Badge>
                </td>
                <td className="max-w-xs px-4 py-3 text-muted-foreground">
                  {log.details ? (
                    <span className="line-clamp-1">
                      {Object.entries(log.details)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(', ')}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
