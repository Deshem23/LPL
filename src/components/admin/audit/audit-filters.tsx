'use client';

import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserMultiSelect, type SelectableUser } from '@/components/shared/user-multi-select';

export type AuditFilterUser = SelectableUser;

export interface AuditFiltersValue {
  search: string;
  action: string;
  dateFrom: string;
  dateTo: string;
  /** One or more user ids to scope the log (and its export) to - see the
   *  "Utilisateur" dropdown below. Empty = every user. */
  userIds: string[];
}

interface AuditFiltersProps {
  value: AuditFiltersValue;
  onChange: (value: AuditFiltersValue) => void;
  users: AuditFilterUser[];
}

const ACTION_OPTIONS = [
  { value: 'all', label: 'Toutes les actions' },
  { value: 'auth', label: 'Connexions / déconnexions' },
  { value: 'article', label: 'Articles' },
  { value: 'category', label: 'Catégories' },
  { value: 'user', label: 'Utilisateurs' },
  { value: 'media', label: 'Médias' },
  { value: 'ad', label: 'Publicités' },
  { value: 'settings', label: 'Paramètres' },
];

export function AuditFilters({ value, onChange, users }: AuditFiltersProps) {
  const hasFilters = Boolean(
    value.search || value.action !== 'all' || value.dateFrom || value.dateTo || value.userIds.length > 0
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative min-w-[220px] flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher par utilisateur ou action..."
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
          className="pl-9"
        />
      </div>

      <Select value={value.action} onValueChange={(v) => onChange({ ...value, action: v })}>
        <SelectTrigger className="w-full sm:w-[200px]">
          <SelectValue placeholder="Type d'action" />
        </SelectTrigger>
        <SelectContent>
          {ACTION_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Selecting one or several users here scopes both the table below
          and the "Exporter" buttons on the page to just those users,
          which is how this page supports a single-user or multi-user
          audit export. */}
      <UserMultiSelect
        users={users}
        selectedIds={value.userIds}
        onChange={(userIds) => onChange({ ...value, userIds })}
        className="w-full sm:w-[200px]"
      />

      <Input
        type="date"
        value={value.dateFrom}
        onChange={(e) => onChange({ ...value, dateFrom: e.target.value })}
        className="w-full sm:w-[160px]"
        aria-label="Du"
      />
      <Input
        type="date"
        value={value.dateTo}
        onChange={(e) => onChange({ ...value, dateTo: e.target.value })}
        className="w-full sm:w-[160px]"
        aria-label="Au"
      />

      {hasFilters && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onChange({ search: '', action: 'all', dateFrom: '', dateTo: '', userIds: [] })}
          title="Effacer les filtres"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
