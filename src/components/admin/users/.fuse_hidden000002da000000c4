'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter, X } from 'lucide-react';

interface UserFilterProps {
  onFilter: (filters: { role: string; status: string; search: string }) => void;
  initialRole?: string;
  initialStatus?: string;
  initialSearch?: string;
}

export function UserFilter({ onFilter, initialRole = 'all', initialStatus = 'all', initialSearch = '' }: UserFilterProps) {
  const [role, setRole] = useState(initialRole);
  const [status, setStatus] = useState(initialStatus);
  const [search, setSearch] = useState(initialSearch);

  const handleFilter = () => {
    onFilter({ role, status, search });
  };

  const handleClear = () => {
    setRole('all');
    setStatus('all');
    setSearch('');
    onFilter({ role: 'all', status: 'all', search: '' });
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher des utilisateurs par nom ou e-mail..."
          className="pl-8"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            if (e.target.value === '') {
              onFilter({ role, status, search: '' });
            }
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
        />
      </div>
      <div className="flex gap-2">
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Tous les rôles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les rôles</SelectItem>
            <SelectItem value="admin">Administrateur</SelectItem>
            <SelectItem value="editor">Éditeur</SelectItem>
            <SelectItem value="writer">Rédacteur</SelectItem>
            <SelectItem value="contributor">Contributeur</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="active">Actif</SelectItem>
            <SelectItem value="inactive">Inactif</SelectItem>
            <SelectItem value="suspended">Suspendu</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleFilter} className="gap-2">
          <Filter className="h-4 w-4" />
          Filtrer
        </Button>
        {(role !== 'all' || status !== 'all' || search) && (
          <Button variant="outline" onClick={handleClear} className="gap-2">
            <X className="h-4 w-4" />
            Effacer
          </Button>
        )}
      </div>
    </div>
  );
}
