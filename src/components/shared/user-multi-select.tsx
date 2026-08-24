'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface SelectableUser {
  id: string;
  name: string;
  email?: string;
}

interface UserMultiSelectProps {
  users: SelectableUser[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  /** Shown before the summary, e.g. "Utilisateur". Omit for just the summary. */
  label?: string;
  className?: string;
  triggerClassName?: string;
}

// Shared multi-user picker - used by the audit log's per-user filter and
// the reports page's per-user report generator, so both support scoping
// to one user or several at once the same way. Not built on the shadcn
// Popover/Checkbox primitives - both ui/popover.tsx and ui/checkbox.tsx
// are still 0-byte scaffolds in this project - so this is a plain toggle
// button + panel with native checkboxes instead.
export function UserMultiSelect({
  users,
  selectedIds,
  onChange,
  label,
  className = '',
  triggerClassName = '',
}: UserMultiSelectProps) {
  const [open, setOpen] = useState(false);

  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((u) => u !== id) : [...selectedIds, id]);
  };

  const summary =
    selectedIds.length === 0
      ? 'Tous les utilisateurs'
      : selectedIds.length === 1
      ? users.find((u) => u.id === selectedIds[0])?.name || '1 utilisateur'
      : `${selectedIds.length} utilisateurs`;

  return (
    <div className={`relative ${className}`}>
      <Button
        type="button"
        variant="outline"
        className={`w-full justify-between gap-2 ${triggerClassName}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="truncate">{label ? `${label} : ${summary}` : summary}</span>
        <ChevronDown className="h-4 w-4 flex-shrink-0" />
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 max-h-64 w-full min-w-[240px] overflow-y-auto rounded-md border bg-popover p-2 shadow-md">
            {users.length === 0 ? (
              <p className="px-2 py-1.5 text-sm text-muted-foreground">Aucun utilisateur</p>
            ) : (
              users.map((u) => (
                <label
                  key={u.id}
                  className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(u.id)}
                    onChange={() => toggle(u.id)}
                    className="h-4 w-4 rounded border-muted-foreground/40"
                  />
                  <span className="truncate">{u.name}</span>
                </label>
              ))
            )}
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="mt-1 w-full rounded-sm px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted"
              >
                Effacer la sélection
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
