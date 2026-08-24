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

interface MediaFilterProps {
  onFilter: (filters: { type: string; search: string }) => void;
  initialType?: string;
  initialSearch?: string;
}

export function MediaFilter({ onFilter, initialType = 'all', initialSearch = '' }: MediaFilterProps) {
  const [type, setType] = useState(initialType);
  const [search, setSearch] = useState(initialSearch);

  const handleFilter = () => {
    onFilter({ type, search });
  };

  const handleClear = () => {
    setType('all');
    setSearch('');
    onFilter({ type: 'all', search: '' });
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un média..."
          className="pl-8"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            if (e.target.value === '') {
              onFilter({ type, search: '' });
            }
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
        />
      </div>
      <div className="flex gap-2">
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Tous les types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="image">Images</SelectItem>
            <SelectItem value="video">Vidéos</SelectItem>
            <SelectItem value="audio">Audio</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleFilter} className="gap-2">
          <Filter className="h-4 w-4" />
          Filtrer
        </Button>
        {(type !== 'all' || search) && (
          <Button variant="outline" onClick={handleClear} className="gap-2">
            <X className="h-4 w-4" />
            Effacer
          </Button>
        )}
      </div>
    </div>
  );
}
